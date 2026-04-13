"use client";

import { Suspense, useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CoursePlayerHeader } from "@/components/player/course-player-header";

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

// Mock credential — will come from auth system
// Using the credential created during LRS setup
const MOCK_AUTH = {
  apiKey: "ak_54583e3537ec75a878be7823f5d2aca0e2df4b60bbe6bc33",
  apiSecret: "as_70dd641f398b8fdeee43a6c24f0ed563441865698a256b8da8e9dfb0b2b72fa0",
  actor: {
    account: {
      homePage: "https://lms.creativeminds.com",
      name: "EMP-001",
    },
    name: "Jane Smith",
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
  const searchParams = useSearchParams();
  const courseId = searchParams.get("courseId") || "dementia";

  const [course, setCourse] = useState(
    fallbackCourses[courseId] || fallbackCourses["dementia"]
  );
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Try to load course from API (Blob Storage), fall back to /public
  useEffect(() => {
    setMounted(true);
    fetch("/api/admin/courses")
      .then((r) => r.json())
      .then((data) => {
        const apiCourse = (data.courses || []).find(
          (c: { rowKey: string }) => c.rowKey === courseId
        );
        if (apiCourse) {
          setCourse({
            title: apiCourse.title,
            category: apiCourse.category,
            activityId: apiCourse.activityId,
            contentPath: apiCourse.launchUrl,
          });
        }
      })
      .catch(() => {}); // Silently fall back to hardcoded
  }, [courseId]);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Build xAPI launch URL with Tin Can params
  const buildLaunchUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("endpoint", getLrsEndpoint());
    params.set("actor", JSON.stringify(MOCK_AUTH.actor));
    params.set("activity_id", course.activityId);

    // If we have credentials, add auth
    if (MOCK_AUTH.apiKey && MOCK_AUTH.apiSecret) {
      const auth = btoa(`${MOCK_AUTH.apiKey}:${MOCK_AUTH.apiSecret}`);
      params.set("auth", `Basic ${auth}`);
    }

    return `${course.contentPath}?${params.toString()}`;
  }, [course]);

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

  // Listen for xAPI messages from iframe (progress updates)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "xapi-progress") {
        setProgress(event.data.progress || 0);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

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
        {mounted && (
          <iframe
            ref={iframeRef}
            src={buildLaunchUrl()}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; fullscreen; microphone; camera"
            title={course.title}
            onLoad={() => setIframeLoaded(true)}
          />
        )}

        {/* Loading overlay — fades out when iframe loads */}
        {!iframeLoaded && (
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
    </div>
  );
}
