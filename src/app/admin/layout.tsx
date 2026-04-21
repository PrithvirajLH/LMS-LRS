import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AdminShell } from "./_components/admin-shell";

/**
 * Server-side role guard for the admin console.
 * Only users with role "admin" may access /admin/*.
 * Instructors are redirected to their portal; learners to the LMS.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionId = (await cookies()).get("lms_session")?.value;
  if (!sessionId) {
    redirect("/login?redirect=/admin");
  }

  const session = await getSession(sessionId);
  if (!session) {
    redirect("/login?redirect=/admin");
  }

  if (session.role !== "admin") {
    redirect(session.role === "instructor" ? "/instructor" : "/learn");
  }

  return <AdminShell>{children}</AdminShell>;
}
