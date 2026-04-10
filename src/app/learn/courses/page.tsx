"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import {
  IconSearch,
  IconClock,
  IconBookmark,
  IconBookmarkFilled,
  IconPlayerPlay,
  IconCircleCheck,
} from "@tabler/icons-react";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  thumbnail: string;
  enrolled: boolean;
  completed: boolean;
}

const categories = ["All", "Compliance", "Clinical Skills", "Safety", "Policy", "Wellness"];

const mockCourses: Course[] = [
  {
    id: "1",
    title: "What is Dementia: Etiology and Treatment",
    description: "Understanding dementia causes, symptoms, brain changes, and how to provide compassionate, effective care.",
    category: "Clinical Skills",
    duration: "30 min",
    thumbnail: "from-violet-500 to-purple-600",
    enrolled: true,
    completed: false,
  },
  {
    id: "2",
    title: "Facebook Expectations",
    description: "Social media guidelines for representing our facilities online with professionalism and compliance.",
    category: "Policy",
    duration: "15 min",
    thumbnail: "from-blue-500 to-cyan-500",
    enrolled: true,
    completed: false,
  },
  {
    id: "3",
    title: "Infection Control Annual Review",
    description: "Best practices for preventing infections, hand hygiene protocols, and PPE usage in senior care settings.",
    category: "Compliance",
    duration: "25 min",
    thumbnail: "from-emerald-500 to-teal-500",
    enrolled: true,
    completed: true,
  },
  {
    id: "4",
    title: "Abuse & Neglect Prevention",
    description: "Recognizing signs of abuse and neglect, mandatory reporting requirements, and creating a safe environment.",
    category: "Compliance",
    duration: "45 min",
    thumbnail: "from-red-500 to-orange-500",
    enrolled: true,
    completed: false,
  },
  {
    id: "5",
    title: "HIPAA Privacy & Security",
    description: "Protecting patient health information, understanding privacy rules, and avoiding common HIPAA violations.",
    category: "Compliance",
    duration: "20 min",
    thumbnail: "from-indigo-500 to-blue-600",
    enrolled: true,
    completed: false,
  },
  {
    id: "6",
    title: "Fire Safety & Emergency Procedures",
    description: "Emergency evacuation procedures, fire extinguisher use, and life safety protocols for healthcare facilities.",
    category: "Safety",
    duration: "20 min",
    thumbnail: "from-amber-500 to-orange-500",
    enrolled: false,
    completed: false,
  },
  {
    id: "7",
    title: "Bloodborne Pathogens",
    description: "OSHA requirements for exposure control, safe handling of sharps, and post-exposure procedures.",
    category: "Safety",
    duration: "20 min",
    thumbnail: "from-rose-500 to-pink-600",
    enrolled: false,
    completed: false,
  },
  {
    id: "8",
    title: "Resident Rights",
    description: "Understanding and upholding the rights of residents in long-term care, including dignity, privacy, and autonomy.",
    category: "Compliance",
    duration: "30 min",
    thumbnail: "from-sky-500 to-blue-500",
    enrolled: false,
    completed: false,
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const cardAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

export default function CourseCatalog() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  const filtered = mockCourses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  function toggleBookmark(id: string) {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-semibold text-gray-900">Course Catalog</h1>
        <p className="text-gray-400 mt-1 text-[15px]">
          Browse available training courses. Assigned courses appear in My Training.
        </p>
      </motion.div>

      {/* Search + filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 space-y-4"
      >
        {/* Search bar */}
        <div className="relative">
          <IconSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all"
          />
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                activeCategory === cat
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-500 border border-gray-100 hover:border-gray-200 hover:text-gray-700"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Course grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        key={activeCategory + search}
        className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        <AnimatePresence>
          {filtered.map((course) => (
            <motion.div
              key={course.id}
              variants={cardAnim}
              layout
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden group hover:shadow-lg hover:shadow-gray-100/80 transition-shadow duration-300"
            >
              {/* Thumbnail gradient */}
              <div className={cn(
                "h-32 bg-gradient-to-br flex items-end p-4 relative",
                course.thumbnail
              )}>
                {/* Bookmark */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleBookmark(course.id); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  {bookmarked.has(course.id) ? (
                    <IconBookmarkFilled size={14} />
                  ) : (
                    <IconBookmark size={14} />
                  )}
                </button>

                {/* Completed badge */}
                {course.completed && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1">
                    <IconCircleCheck size={12} className="text-white" />
                    <span className="text-[10px] text-white font-medium">Completed</span>
                  </div>
                )}

                {/* Category */}
                <span className="text-[10px] text-white/80 font-medium bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  {course.category}
                </span>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed line-clamp-2">
                  {course.description}
                </p>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <IconClock size={13} />
                    <span>{course.duration}</span>
                  </div>

                  {course.enrolled ? (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <IconPlayerPlay size={12} />
                      {course.completed ? "Review" : "Start"}
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-3.5 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Enroll
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-sm text-gray-400">
          No courses match your search.
        </div>
      )}
    </div>
  );
}
