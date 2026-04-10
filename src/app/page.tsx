// Root page — this file exists so Next.js doesn't 404 on /
// The (learner) route group handles / via its own page.tsx
// This file should not be reached if the route group is set up correctly
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/admin");
}
