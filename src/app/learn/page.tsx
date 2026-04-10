"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import {
  IconAlertTriangle,
  IconClock,
  IconCircleCheck,
  IconPlayerPlay,
  IconRotateClockwise,
  IconFlame,
} from "@tabler/icons-react";

// ── Mock data — will be replaced with API calls ──
interface Assignment {
  id: string;
  title: string;
  category: string;
  dueDate: string | null;
  status: "overdue" | "due_soon" | "in_progress" | "not_started" | "completed";
  progress: number; // 0-100
  score: number | null;
  duration: string;
  completedAt: string | null;
}

const mockAssignments: Assignment[] = [
  {
    id: "1",
    title: "Abuse & Neglect Prevention",
    category: "Compliance",
    dueDate: "2026-04-05",
    status: "overdue",
    progress: 60,
    score: null,
    duration: "45 min",
    completedAt: null,
  },
  {
    id: "2",
    title: "What is Dementia: Etiology and Treatment",
    category: "Clinical Skills",
    dueDate: "2026-04-15",
    status: "in_progress",
    progress: 35,
    score: null,
    duration: "30 min",
    completedAt: null,
  },
  {
    id: "3",
    title: "HIPAA Privacy & Security",
    category: "Compliance",
    dueDate: "2026-04-20",
    status: "not_started",
    progress: 0,
    score: null,
    duration: "20 min",
    completedAt: null,
  },
  {
    id: "4",
    title: "Facebook Expectations",
    category: "Policy",
    dueDate: "2026-04-30",
    status: "not_started",
    progress: 0,
    score: null,
    duration: "15 min",
    completedAt: null,
  },
  {
    id: "5",
    title: "Infection Control Annual Review",
    category: "Compliance",
    dueDate: null,
    status: "completed",
    progress: 100,
    score: 92,
    duration: "25 min",
    completedAt: "2026-03-28",
  },
  {
    id: "6",
    title: "Fire Safety & Emergency Procedures",
    category: "Safety",
    dueDate: null,
    status: "completed",
    progress: 100,
    score: 88,
    duration: "20 min",
    completedAt: "2026-03-15",
  },
];

const statusConfig = {
  overdue: {
    label: "Overdue",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
    icon: <IconAlertTriangle size={16} />,
    accent: "bg-red-500",
  },
  due_soon: {
    label: "Due Soon",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    icon: <IconFlame size={16} />,
    accent: "bg-amber-500",
  },
  in_progress: {
    label: "In Progress",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
    icon: <IconRotateClockwise size={16} />,
    accent: "bg-blue-500",
  },
  not_started: {
    label: "Not Started",
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-100",
    icon: <IconClock size={16} />,
    accent: "bg-gray-400",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    icon: <IconCircleCheck size={16} />,
    accent: "bg-emerald-500",
  },
};

function getDueLabel(dueDate: string | null, status: string): string | null {
  if (!dueDate || status === "completed") return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) > 1 ? "s" : ""} overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff} days`;
}

function getActionLabel(status: Assignment["status"]): string {
  switch (status) {
    case "overdue":
    case "in_progress":
      return "Continue";
    case "not_started":
    case "due_soon":
      return "Start";
    case "completed":
      return "Review";
  }
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

export default function LearnerHome() {
  const active = mockAssignments.filter((a) => a.status !== "completed");
  const completed = mockAssignments.filter((a) => a.status === "completed");

  const overdueCount = active.filter((a) => a.status === "overdue").length;
  const completedCount = completed.length;
  const totalCount = mockAssignments.length;

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-semibold text-gray-900">
          Good morning, Jane
        </h1>
        <p className="text-gray-400 mt-1 text-[15px]">
          {overdueCount > 0
            ? `You have ${overdueCount} overdue training${overdueCount > 1 ? "s" : ""} that need${overdueCount === 1 ? "s" : ""} attention.`
            : `You've completed ${completedCount} of ${totalCount} assigned courses. Keep it up.`
          }
        </p>
      </motion.div>

      {/* Progress summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 flex items-center gap-6"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-xs text-gray-500">{overdueCount} Overdue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-500">{active.filter(a => a.status === "in_progress").length} In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-300" />
          <span className="text-xs text-gray-500">{active.filter(a => a.status === "not_started").length} Not Started</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-500">{completedCount} Completed</span>
        </div>
      </motion.div>

      {/* Active assignments */}
      {active.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-8 space-y-3"
        >
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Your Training
          </h2>
          {active.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))}
        </motion.div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-10 space-y-3"
        >
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Completed
          </h2>
          {completed.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const config = statusConfig[assignment.status];
  const dueLabel = getDueLabel(assignment.dueDate, assignment.status);
  const actionLabel = getActionLabel(assignment.status);

  return (
    <motion.div
      variants={item}
      whileHover={{ scale: 1.005, transition: { duration: 0.2 } }}
      className={cn(
        "bg-white rounded-2xl border p-5 flex items-center gap-5 cursor-pointer group transition-shadow duration-300 hover:shadow-lg hover:shadow-gray-100/80",
        assignment.status === "overdue" ? "border-red-200" : "border-gray-100"
      )}
    >
      {/* Status accent */}
      <div className={cn("w-1 h-12 rounded-full shrink-0", config.accent)} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[15px] font-medium text-gray-900 truncate">
            {assignment.title}
          </h3>
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
            config.bg, config.color
          )}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1.5">
          <span className="text-xs text-gray-400">{assignment.category}</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{assignment.duration}</span>
          {dueLabel && (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className={cn(
                "text-xs font-medium",
                assignment.status === "overdue" ? "text-red-500" : "text-gray-400"
              )}>
                {dueLabel}
              </span>
            </>
          )}
          {assignment.score !== null && (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-emerald-600 font-medium">
                Score: {assignment.score}%
              </span>
            </>
          )}
          {assignment.completedAt && (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400">
                {new Date(assignment.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </>
          )}
        </div>

        {/* Progress bar for in-progress */}
        {assignment.progress > 0 && assignment.progress < 100 && (
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden w-48">
            <motion.div
              className={cn("h-full rounded-full", config.accent)}
              initial={{ width: 0 }}
              animate={{ width: `${assignment.progress}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>
        )}
      </div>

      {/* Action button */}
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200",
          assignment.status === "completed"
            ? "bg-gray-50 text-gray-600 hover:bg-gray-100"
            : assignment.status === "overdue"
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-gray-900 text-white hover:bg-gray-800"
        )}
      >
        <IconPlayerPlay size={14} />
        {actionLabel}
      </motion.button>
    </motion.div>
  );
}
