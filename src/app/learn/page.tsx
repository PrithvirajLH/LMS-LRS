"use client";

export default function LearnPage() {
  return (
    <div className="p-6 md:p-10">
      {/* Placeholder — ready for your next command */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-display-l)",
          fontStyle: "italic",
          color: "var(--text-primary)",
          lineHeight: "var(--leading-tight)",
        }}
      >
        My Training
      </h1>
      <p
        className="mt-2"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-body-m)",
          color: "var(--text-body)",
          lineHeight: "var(--leading-relaxed)",
        }}
      >
        Welcome back, Jane. Your assigned courses will appear here.
      </p>
    </div>
  );
}
