"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-8" style={{ backgroundColor: "var(--bg-page)" }}>
      <div className="text-center max-w-[400px]">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--amber-50)" }}>
          <span style={{ fontSize: "32px" }}>!</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-m)", color: "var(--text-primary)" }}>
          Something went wrong
        </h1>
        <p className="mt-2 mb-6" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-[5px] px-5 py-2.5"
            style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
          >
            Try Again
          </button>
          <Link
            href="/learn"
            className="rounded-[5px] px-5 py-2.5"
            style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
