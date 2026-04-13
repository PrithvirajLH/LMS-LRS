"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" })
      .then(() => router.push("/login"))
      .catch(() => router.push("/login"));
  }, [router]);

  return (
    <div className="h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-page)" }}>
      <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "var(--text-muted)" }}>
        Signing out...
      </p>
    </div>
  );
}
