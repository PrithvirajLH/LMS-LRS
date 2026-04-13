"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconLayoutDashboard,
  IconBooks,
  IconUsers,
  IconCertificate,
  IconReportAnalytics,
  IconUser,
  IconArrowLeft,
  IconSettings,
  IconShieldCheck,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const ICON_CLASS = "h-6 w-6 shrink-0";
const ICON_STYLE = { color: "var(--deep-900, #0A1628)" };

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userInitials, setUserInitials] = useState("U");
  const [userRole, setUserRole] = useState<string>("learner");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.name) {
          setUserName(data.user.name);
          setUserInitials(data.user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase());
        }
        if (data.user?.role) setUserRole(data.user.role);
      })
      .catch(() => {});
  }, []);

  const links = [
    {
      label: "Dashboard",
      href: "/learn",
      icon: <IconLayoutDashboard className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} />,
    },
    {
      label: "My Training",
      href: "/learn/training",
      icon: <IconBooks className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} />,
    },
    {
      label: "Course Catalog",
      href: "/learn/courses",
      icon: <IconUsers className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} />,
    },
    {
      label: "Completions",
      href: "/learn/completions",
      icon: <IconCertificate className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} />,
    },
    {
      label: "Training Reports",
      href: "/learn/reports",
      icon: <IconReportAnalytics className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} />,
    },
  ];

  const bottomLinks = [
    // Instructor portal — visible to instructor and admin
    ...(userRole === "instructor" || userRole === "admin"
      ? [{ label: "Instructor", href: "/instructor", icon: <IconSettings className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} /> }]
      : []),
    // Admin portal — visible to admin only
    ...(userRole === "admin"
      ? [{ label: "Admin", href: "/admin", icon: <IconShieldCheck className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} /> }]
      : []),
    {
      label: "My Profile",
      href: "/learn/profile",
      icon: <IconUser className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} />,
    },
    {
      label: "Sign Out",
      href: "/logout",
      icon: <IconArrowLeft className={ICON_CLASS} style={ICON_STYLE} stroke={1.5} />,
    },
  ];

  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col overflow-hidden md:flex-row",
        "h-screen"
      )}
      style={{ backgroundColor: "var(--bg-page)" }}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody
          className="justify-between gap-10"
          style={{
            backgroundColor: "var(--bg-raised)",
            borderRight: "1px solid var(--border-default)",
          }}
        >
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <div className="h-10 flex items-center shrink-0 overflow-hidden">
              {open ? <Logo /> : <LogoIcon />}
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

const Logo = () => {
  return (
    <Link
      href="/learn"
      className="relative z-20 flex items-center space-x-2 py-1"
    >
      <div
        className="h-6 w-7 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm"
        style={{ backgroundColor: "var(--teal-400)" }}
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="whitespace-pre"
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "18px",
          color: "var(--teal-400)",
          letterSpacing: "0.04em",
        }}
      >
        Creative Minds
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      href="/learn"
      className="relative z-20 flex items-center space-x-2 py-1"
    >
      <div
        className="h-6 w-7 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm"
        style={{ backgroundColor: "var(--teal-400)" }}
      />
    </Link>
  );
};
