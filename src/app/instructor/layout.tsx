import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { InstructorShell } from "./_components/instructor-shell";

/**
 * Server-side role guard for the instructor portal.
 * Only users with role "instructor" or "admin" may access /instructor/*.
 * Learners are redirected back to /learn.
 */
export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionId = (await cookies()).get("lms_session")?.value;
  if (!sessionId) {
    redirect("/login?redirect=/instructor");
  }

  const session = await getSession(sessionId);
  if (!session) {
    redirect("/login?redirect=/instructor");
  }

  if (session.role !== "instructor" && session.role !== "admin") {
    redirect("/learn");
  }

  return (
    <InstructorShell showAdminLink={session.role === "admin"}>
      {children}
    </InstructorShell>
  );
}
