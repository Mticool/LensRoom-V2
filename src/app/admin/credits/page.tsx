import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/requireRole";
import AdminCreditsClient from "./credits-client";

export default async function AdminCreditsPage() {
  try {
    await requireRole("admin");
  } catch {
    redirect("/admin");
  }
  return <AdminCreditsClient />;
}

