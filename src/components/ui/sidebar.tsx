"use client";

import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  IconLayoutDashboard,
  IconBooks,
  IconUser,
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
} from "@tabler/icons-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const learnerNav: NavItem[] = [
  { label: "My Training", href: "/learn", icon: <IconLayoutDashboard size={20} stroke={1.5} /> },
  { label: "Course Catalog", href: "/learn/courses", icon: <IconBooks size={20} stroke={1.5} /> },
  { label: "My Profile", href: "/learn/profile", icon: <IconUser size={20} stroke={1.5} /> },
];

export function LearnerSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="h-screen bg-white border-r border-gray-100 flex flex-col shrink-0 relative"
    >
      {/* Logo area */}
      <div className="h-16 flex items-center px-5 border-b border-gray-100">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">L</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 leading-none">Learning Hub</div>
                <div className="text-[10px] text-gray-400 mt-0.5">SecureCare Training</div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto"
            >
              <span className="text-white text-sm font-bold">L</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {learnerNav.map((item) => {
          const active = item.href === "/learn"
            ? pathname === "/learn"
            : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 relative group",
                  active
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 rounded-full"
                    transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                )}
                <span className={cn("shrink-0", collapsed && "mx-auto")}>{item.icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User + collapse */}
      <div className="border-t border-gray-100 p-3 space-y-2">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 px-3 py-2"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                JS
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">Jane Smith</div>
                <div className="text-[10px] text-gray-400 truncate">CNA · Sunrise Dallas</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button className={cn(
          "flex items-center gap-3 w-full rounded-xl px-3 py-2 text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors",
          collapsed && "justify-center"
        )}>
          <IconLogout size={18} stroke={1.5} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 hover:shadow transition-all z-10"
      >
        {collapsed ? <IconChevronRight size={12} /> : <IconChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}
