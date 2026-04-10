"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface AppSidebarProps {
  brandName: string;
  navItems: SidebarNavItem[];
  bottomItems?: SidebarNavItem[];
}

export function AppSidebar({ brandName, navItems, bottomItems }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="w-[240px] shrink-0 h-full flex flex-col border-r"
      style={{
        backgroundColor: "var(--bg-raised)",
        borderColor: "var(--border-default)",
      }}
    >
      {/* Brand */}
      <div className="px-6 pt-8 pb-6">
        <span
          style={{
            fontFamily: "var(--font-label)",
            fontSize: "16px",
            color: "var(--teal-400)",
            letterSpacing: "0.04em",
          }}
        >
          {brandName}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 flex flex-col gap-1">
        {navItems.map((item) => {
          const active = item.href === "/learn"
            ? pathname === "/learn"
            : pathname.startsWith(item.href);

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 cursor-pointer",
                  active
                    ? ""
                    : "hover:bg-[var(--stone-100)]"
                )}
                style={
                  active
                    ? { backgroundColor: "var(--teal-50)", color: "var(--teal-600)" }
                    : { color: "var(--stone-600)" }
                }
              >
                <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                  {item.icon}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "14px",
                    letterSpacing: "0.04em",
                  }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom items */}
      {bottomItems && bottomItems.length > 0 && (
        <div
          className="px-3 pb-6 pt-3 border-t"
          style={{ borderColor: "var(--border-default)" }}
        >
          {bottomItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 cursor-pointer hover:bg-[var(--stone-100)]"
                style={{ color: "var(--stone-400)" }}
              >
                <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                  {item.icon}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: "14px",
                    letterSpacing: "0.04em",
                  }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </aside>
  );
}
