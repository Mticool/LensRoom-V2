import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";

export default async function AdminStylesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Only manager and admin can access this page
    await requireRole("manager");
    return <>{children}</>;
  } catch (error: any) {
    // Redirect to home if unauthorized
    redirect("/");
  }
}

