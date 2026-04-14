"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconLayoutDashboard,
  IconUpload,
  IconBooks,
  IconReportAnalytics,
  IconUsers,
  IconArrowLeft,
  IconShieldCog,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const ICON_CLASS = "h-6 w-6 shrink-0";
const ICON_STYLE = { color: "var(--deep-900, #0A1628)" };

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const links = [
    { label: "Dashboard", href: "/instructor", icon: <IconLayoutDashboard className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} /> },
    { label: "Upload Course", href: "/instructor/courses/upload", icon: <IconUpload className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} /> },
    { label: "Manage Courses", href: "/instructor/courses", icon: <IconBooks className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} /> },
    { label: "Learner Reports", href: "/instructor/reports", icon: <IconReportAnalytics className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} /> },
    { label: "Learners", href: "/instructor/learners", icon: <IconUsers className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} /> },
  ];

  const bottomLinks = [
    { label: "Admin Console", href: "/admin", icon: <IconShieldCog className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} /> },
    { label: "Back to LMS", href: "/learn", icon: <IconArrowLeft className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} /> },
  ];

  return (
    <div className={cn("flex w-full flex-1 flex-col overflow-hidden md:flex-row", "h-screen")} style={{ backgroundColor: "var(--bg-page)" }}>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10" style={{ backgroundColor: "var(--bg-raised)", borderRight: "1px solid var(--border-default)" }}>
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <div className="h-10 flex items-center shrink-0 overflow-hidden">
              {open ? (
                <Link href="/instructor" className="relative z-20 flex items-center space-x-2 py-1">
                  <div className="h-6 w-7 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm" style={{ backgroundColor: "var(--btn-primary)" }} />
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-pre" style={{ fontFamily: "var(--font-label)", fontSize: "18px", color: "var(--btn-primary)", letterSpacing: "0.04em" }}>
                    Instructor
                  </motion.span>
                </Link>
              ) : (
                <Link href="/instructor" className="relative z-20 flex items-center space-x-2 py-1">
                  <div className="h-6 w-7 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm" style={{ backgroundColor: "var(--btn-primary)" }} />
                </Link>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-1">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {bottomLinks.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>
        </SidebarBody>
      </Sidebar>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
