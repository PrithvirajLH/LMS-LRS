"use client";

import { Suspense, useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CoursePlayerHeader } from "@/components/player/course-player-header";
import { CompletionCelebration } from "@/components/celebration/completion-celebration";

/**
 * Course Player Page
 *
 * Launches Storyline xAPI content in an iframe with Tin Can launch parameters.
 * URL: /learn/play?courseId=1&title=...&category=...
 *
 * The iframe loads the Storyline index_lms.html with xAPI params:
 *   endpoint, auth, actor, activity_id
 *
 * Storyline's built-in xAPI wrapper reads these from the URL and sends
 * statements to our LRS automatically.
 */

// LRS endpoint — must be absolute URL for Storyline's xAPI driver
function getLrsEndpoint() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/xapi/`;
  }
  return "/api/xapi/";
}

// Fallback course data for legacy /public paths
const fallbackCourses: Record<string, { title: string; category: string; activityId: string; contentPath: string }> = {
  "dementia": {
    title: "What is Dementia: Etiology and Treatment",
    category: "Clinical Skills",
    activityId: "urn:articulate:storyline:6ekXD50Aeuv",
    contentPath: "/courses/dementia/index_lms.html",
  },
  "facebook": {
    title: "Facebook Expectations",
    category: "Policy",
    activityId: "urn:articulate:storyline:6OF2ndzeYy4",
    contentPath: "/courses/facebook/index_lms.html",
  },
};

export default function CoursePlayerPage() {
  return (
    <Suspense fallback={<div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: "#0A1628" }}>
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--teal-400)", borderTopColor: "transparent" }} />
    </div>}>
      <CoursePlayer />
    </Suspense>
  );
}

function CoursePlayer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") || "dementia";

  const [course, setCourse] = useState(
    fallbackCourses[courseId] || fallbackCourses["dementia"]
  );
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [actor, setActor] = useState<{ account: { homePage: string; name: string }; name: string } | null>(null);
  // Per-launch credentials minted by /api/learner/launch. The browser no
  // longer carries a shared LRS API key — these are scoped to one user, one
  // course, one registration, with a server-enforced expiry.
  const [authString, setAuthString] = useState<string | null>(null);
  const [registration, setRegistration] = useState<string | null>(null);

  // Celebration state — populated when we detect course completion. We only
  // celebrate once per session (per page mount) so that subsequent xAPI
  // statements from a course replay or a final lesson page don't re-fire it.
  const [celebration, setCelebration] = useState<{
    courseTitle: string;
    score?: number;
    credits: number;
  } | null>(null);
  const celebratedRef = useRef(false);
  // Course credit total (returned by /api/learner/launch). Stored in a ref so
  // the polling loop can read the latest value without restarting.
  const creditsRef = useRef<number>(0);

  // Load course + user data from launch API
  useEffect(() => {
    setMounted(true);

    fetch(`/api/learner/launch?courseId=${encodeURIComponent(courseId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;

        // Set actor from session
        setActor(data.actor);

        // Per-launch credential and registration from the server
        if (data.auth) setAuthString(data.auth);
        if (data.registration) setRegistration(data.registration);

        // Initialize progress from server (derived from xAPI statements)
        // so the player shows the actual completion % on load.
        if (typeof data.progress === "number") {
          setProgress(data.progress);
        }

        if (typeof data.credits === "number") {
          creditsRef.current = data.credits;
        }

        // Set course — use proxy URL (serves through Next.js server).
        // SAS URLs don't work when public access is disabled on the storage
        // account because Storyline loads relative assets (CSS/JS) without
        // the SAS token. The proxy reads via connection string server-side.
        setCourse({
          title: data.title,
          category: data.category,
          activityId: data.activityId,
          contentPath: data.proxyUrl || data.sasUrl || data.publicUrl,
        });
      })
      .catch(() => {
        // Fall back to /api/auth/me for actor
        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((d) => {
            if (d.user) {
              setActor({
                account: { homePage: "https://lms.creativeminds.com", name: d.user.email },
                name: d.user.name,
              });
            }
          })
          .catch(() => {});
      });
  }, [courseId]);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Build xAPI launch URL with Tin Can params
  const buildLaunchUrl = useCallback(() => {
    // Wait for user data AND the per-launch credential
    if (!actor || !authString) return "";

    const params = new URLSearchParams();
    params.set("endpoint", getLrsEndpoint());
    params.set("actor", JSON.stringify(actor));
    params.set("activity_id", course.activityId);
    params.set("auth", authString);
    if (registration) params.set("registration", registration);

    // If contentPath already has query params (SAS token), append with &
    const separator = course.contentPath.includes("?") ? "&" : "?";
    return `${course.contentPath}${separator}${params.toString()}`;
  }, [course, actor, authString, registration]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Trigger the celebration modal — guarded so it only ever fires once per
  // page mount, even if both the postMessage path and the polling path
  // detect completion at the same time.
  const triggerCelebration = useCallback(
    (opts: { score?: number; credits?: number; title?: string }) => {
      if (celebratedRef.current) return;
      celebratedRef.current = true;
      setCelebration({
        courseTitle: opts.title || course.title,
        score: opts.score,
        credits: opts.credits ?? creditsRef.current,
      });
    },
    [course.title]
  );

  // Listen for xAPI messages from iframe.
  //
  // Storyline's built-in xAPI driver POSTs statements directly to our LRS
  // and does NOT postMessage to the parent — but custom course wrappers,
  // analytics frames, and future content packages can. We support two
  // message shapes:
  //   { type: "xapi-progress", progress: number }
  //   { type: "xapi-completed", score?: number }
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "xapi-progress") {
        const next = Number(event.data.progress) || 0;
        setProgress(next);
        if (next >= 100) {
          triggerCelebration({ score: event.data.score });
        }
      } else if (event.data?.type === "xapi-completed") {
        setProgress(100);
        triggerCelebration({ score: event.data.score });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [triggerCelebration]);

  // Poll the server for completion. Storyline writes xAPI statements
  // directly to the LRS; the launch endpoint re-derives progress from those
  // statements (running the score gate, module-coverage check, etc.). When
  // progress hits 100 the server has decided the course is complete — fire
  // the celebration. Polls every 8s while the player is mounted, stops as
  // soon as completion is detected.
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || celebratedRef.current) return;
      try {
        const res = await fetch(
          `/api/learner/launch?courseId=${encodeURIComponent(courseId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (cancelled || data?.error) return;

        if (typeof data.credits === "number") {
          creditsRef.current = data.credits;
        }
        if (typeof data.progress === "number") {
          setProgress((prev) => (data.progress > prev ? data.progress : prev));
          if (data.progress >= 100) {
            triggerCelebration({
              title: data.title,
              credits: data.credits,
            });
          }
        }
      } catch {
        // Ignore transient network errors — we'll try again next tick.
      }
    };

    const interval = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mounted, courseId, triggerCelebration]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full"
      style={{ backgroundColor: "var(--bg-obsidian, #0A1628)" }}
    >
      {/* Header */}
      <CoursePlayerHeader
        title={course.title}
        category={course.category}
        progress={progress}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* Course iframe — only rendered on client to avoid hydration mismatch */}
      <div className="flex-1 relative">
        {mounted && actor && authString && buildLaunchUrl() && (
          <iframe
            ref={iframeRef}
            src={buildLaunchUrl()}
            className="absolute inset-0 w-full h-full border-0"
            // Sandbox restricts what course content can do. We keep
            // allow-same-origin so cookie-authed asset loading works
            // through the proxy. Top-level navigation and popups are
            // intentionally NOT granted, so a malicious course can't
            // navigate the browser to an external page or open one to
            // exfiltrate data via URL.
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            allow="autoplay; fullscreen; microphone; camera"
            title={course.title}
            onLoad={() => setIframeLoaded(true)}
          />
        )}

        {/* Loading overlay — fades out when iframe loads */}
        {(!iframeLoaded || !actor || !authString) && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-500"
            style={{ backgroundColor: "var(--bg-obsidian, #0A1628)" }}
          >
            <div className="text-center">
              <div
                className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto"
                style={{ borderColor: "var(--teal-400)", borderTopColor: "transparent" }}
              />
              <p
                className="mt-4"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "13px",
                  color: "var(--text-on-dark-muted, var(--stone-400))",
                }}
              >
                Loading course...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Completion celebration — fires once per player session */}
      <CompletionCelebration
        open={!!celebration}
        courseTitle={celebration?.courseTitle || course.title}
        score={celebration?.score}
        credits={celebration?.credits ?? creditsRef.current}
        onClose={() => setCelebration(null)}
        onViewCertificate={() => {
          setCelebration(null);
          router.push("/learn/completions");
        }}
      />
    </div>
  );
}
