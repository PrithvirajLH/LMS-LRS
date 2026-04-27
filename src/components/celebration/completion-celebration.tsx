"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { IconTrophy, IconCertificate, IconClock, IconAward } from "@tabler/icons-react";

interface CompletionCelebrationProps {
  /** Whether the celebration modal is visible. */
  open: boolean;
  /** Course title to display. */
  courseTitle: string;
  /** Optional assessment score (0-100). */
  score?: number;
  /** CE credits earned for this course. */
  credits?: number;
  /** Called when the user closes the modal (Continue / backdrop / Esc). */
  onClose: () => void;
  /** Called when the user clicks "View Certificate". Falls back to onClose if omitted. */
  onViewCertificate?: () => void;
}

// Healthcare-appropriate palette pulled from the design system tokens.
// We resolve to literal hex values because canvas-confetti rasterizes to a
// canvas and CSS variables aren't available at draw time.
const CONFETTI_COLORS = [
  "#647A93", // teal-400
  "#2E7EC0", // sky / slate accent
  "#A06830", // amber-600
  "#FFFFFF", // white sparkle
  "#445A73", // deeper teal
];

/**
 * Fire a short, tasteful confetti sequence.
 *
 * Three quick bursts (left, right, center) over ~2.5s — long enough to feel
 * celebratory, short enough to stay professional in a clinical context.
 * Returns a cleanup function that cancels any pending bursts on unmount.
 */
function fireConfetti(): () => void {
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  const defaults = {
    startVelocity: 32,
    spread: 70,
    ticks: 200,
    zIndex: 100,
    colors: CONFETTI_COLORS,
    disableForReducedMotion: true,
  };

  // Burst 1: left edge, immediate
  confetti({
    ...defaults,
    particleCount: 60,
    angle: 60,
    origin: { x: 0, y: 0.7 },
  });

  // Burst 2: right edge, +200ms
  timeouts.push(
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 60,
        angle: 120,
        origin: { x: 1, y: 0.7 },
      });
    }, 200)
  );

  // Burst 3: center pop, +500ms
  timeouts.push(
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 80,
        spread: 100,
        startVelocity: 28,
        origin: { x: 0.5, y: 0.55 },
      });
    }, 500)
  );

  return () => {
    timeouts.forEach(clearTimeout);
    confetti.reset();
  };
}

export function CompletionCelebration({
  open,
  courseTitle,
  score,
  credits,
  onClose,
  onViewCertificate,
}: CompletionCelebrationProps) {
  // Guard so confetti only fires once per mount of the modal.
  const firedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    const cleanup = fireConfetti();
    return cleanup;
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-celebration-title"
        >
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
          />

          {/* Modal card */}
          <motion.div
            className="relative rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            style={{
              backgroundColor: "var(--bg-raised)",
              border: "1px solid var(--border-default)",
            }}
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 24,
              delay: 0.05,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative gradient header */}
            <div
              className="absolute inset-x-0 top-0 h-32 opacity-90 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 0%, rgba(100, 122, 147, 0.18), transparent 60%), radial-gradient(ellipse at 80% 0%, rgba(160, 104, 48, 0.14), transparent 55%)",
              }}
            />

            <div className="relative px-8 pt-9 pb-7">
              {/* Trophy icon with halo */}
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 280,
                    damping: 18,
                    delay: 0.15,
                  }}
                  className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{
                    backgroundColor: "var(--teal-50, rgba(100, 122, 147, 0.1))",
                    border: "1px solid var(--teal-100, rgba(100, 122, 147, 0.2))",
                  }}
                >
                  <IconTrophy
                    size={36}
                    stroke={1.5}
                    style={{ color: "var(--amber-600, #A06830)" }}
                  />
                  {/* Subtle ring pulse */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{ border: "1px solid var(--amber-600, #A06830)" }}
                    initial={{ opacity: 0.6, scale: 1 }}
                    animate={{ opacity: 0, scale: 1.35 }}
                    transition={{
                      duration: 1.6,
                      repeat: 1,
                      delay: 0.4,
                      ease: "easeOut",
                    }}
                  />
                </motion.div>
              </div>

              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="text-center mt-6"
              >
                <span
                  style={{
                    fontFamily: "var(--font-label, var(--font-body))",
                    fontSize: "10px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--text-muted, var(--slate-600))",
                    fontWeight: 600,
                  }}
                >
                  Course Completed
                </span>
              </motion.div>

              {/* Title — Source Serif 4 italic */}
              <motion.h2
                id="completion-celebration-title"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3 }}
                className="text-center mt-2"
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "30px",
                  lineHeight: 1.15,
                  color: "var(--text-primary)",
                }}
              >
                Course Complete!
              </motion.h2>

              {/* Course name */}
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="text-center mt-3 px-2"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "15px",
                  color: "var(--text-body)",
                  lineHeight: 1.5,
                }}
              >
                {courseTitle}
              </motion.p>

              {/* Stats row */}
              {typeof score === "number" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="grid gap-3 mt-6"
                  style={{ gridTemplateColumns: "1fr" }}
                >
                  {typeof score === "number" && (
                    <div
                      className="rounded-xl px-4 py-3 flex items-center gap-3"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: "var(--teal-50, rgba(100, 122, 147, 0.1))" }}
                      >
                        <IconAward
                          size={18}
                          stroke={1.5}
                          style={{ color: "var(--teal-400, #647A93)" }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div
                          style={{
                            fontFamily: "var(--font-label, var(--font-body))",
                            fontSize: "9px",
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          Score
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: "18px",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {Math.round(score)}%
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>
              )}

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="flex items-center gap-3 mt-7"
              >
                <button
                  onClick={onClose}
                  className="flex-1 rounded-[5px] px-5 py-3 transition-colors duration-150"
                  style={{
                    fontFamily: "var(--font-label, var(--font-body))",
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-body)",
                    border: "1px solid var(--border-default)",
                    fontWeight: 600,
                  }}
                >
                  Continue
                </button>
                <button
                  onClick={onViewCertificate || onClose}
                  className="flex-1 rounded-[5px] px-5 py-3 transition-colors duration-150 hover:opacity-90 flex items-center justify-center gap-2"
                  style={{
                    fontFamily: "var(--font-label, var(--font-body))",
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    backgroundColor: "var(--btn-primary, var(--teal-400, #647A93))",
                    color: "var(--deep-50, #FFFFFF)",
                    fontWeight: 600,
                  }}
                >
                  <IconCertificate size={14} stroke={2} />
                  View Certificate
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
