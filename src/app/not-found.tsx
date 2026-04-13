import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-8" style={{ backgroundColor: "var(--bg-page)" }}>
      <div className="text-center max-w-[400px]">
        <div style={{ fontFamily: "var(--font-body)", fontSize: "64px", fontWeight: 700, color: "var(--border-default)" }}>404</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "var(--text-display-m)", color: "var(--text-primary)" }}>
          Page not found
        </h1>
        <p className="mt-2 mb-6" style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-body)" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/learn"
          className="inline-block rounded-[5px] px-5 py-2.5"
          style={{ fontFamily: "var(--font-label)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: "var(--btn-primary)", color: "var(--teal-50)" }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
