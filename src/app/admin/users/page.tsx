import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import AdminUsersClient from "./users-client";

export default async function AdminUsersPage() {
  try {
    await requireRole("admin");
  } catch {
    redirect("/admin");
  }
  return <AdminUsersClient />;
}


