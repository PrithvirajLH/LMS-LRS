"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { usePathname } from "next/navigation";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-full py-4 hidden md:flex md:flex-col shrink-0 overflow-hidden",
        className
      )}
      animate={{
        width: animate ? (open ? 280 : 72) : 280,
        paddingLeft: 12,
        paddingRight: 12,
      }}
      transition={{
        width: { duration: 0.3, ease: [0.2, 0, 0, 1] },
        paddingLeft: { duration: 0.3, ease: [0.2, 0, 0, 1] },
        paddingRight: { duration: 0.3, ease: [0.2, 0, 0, 1] },
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className={cn(
        "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between w-full"
      )}
      style={{ backgroundColor: "var(--bg-raised)" }}
      {...props}
    >
      <div className="flex justify-end z-20 w-full">
        <IconMenu2
          className="text-neutral-800 dark:text-neutral-200"
          onClick={() => setOpen(!open)}
        />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
              className
            )}
          >
            <div
              className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200"
              onClick={() => setOpen(!open)}
            >
              <IconX />
            </div>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
}) => {
  const { open, animate } = useSidebar();
  const pathname = usePathname();

  const active = link.href === "/learn"
    ? pathname === "/learn"
    : pathname.startsWith(link.href) && link.href !== "/learn";

  return (
    <a
      href={link.href}
      className={cn(
        "flex items-center gap-3 group/sidebar h-12 px-3 rounded-xl transition-colors duration-200 overflow-hidden",
        className
      )}
      style={
        active
          ? { backgroundColor: "var(--teal-100)" }
          : undefined
      }
      {...props}
    >
      <span
        className="shrink-0"
        style={{ color: active ? "var(--teal-400)" : "var(--stone-600)" }}
      >
        {link.icon}
      </span>

      <motion.span
        animate={{
          opacity: animate ? (open ? 1 : 0) : 1,
          x: animate ? (open ? 0 : -8) : 0,
        }}
        transition={{
          opacity: {
            duration: open ? 0.2 : 0.1,
            delay: open ? 0.12 : 0,
            ease: "easeOut",
          },
          x: {
            duration: open ? 0.25 : 0.15,
            delay: open ? 0.08 : 0,
            ease: [0.2, 0, 0, 1],
          },
        }}
        className="whitespace-pre !p-0 !m-0"
        style={{
          color: active ? "var(--teal-600)" : "var(--stone-800)",
          fontFamily: "var(--font-label)",
          fontSize: "16px",
          letterSpacing: "0.04em",
          fontWeight: 500,
        }}
      >
        {link.label}
      </motion.span>
    </a>
  );
};
