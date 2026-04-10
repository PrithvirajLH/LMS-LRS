"use client";

import { LearnerSidebar } from "@/components/ui/sidebar";

export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#FAFBFC] overflow-hidden">
      <LearnerSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
