import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";

type Role = "user" | "manager" | "admin";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireRole("admin");
    const body = (await request.json().catch(() => null)) as
      | { targetUserId?: string; role?: Role }
      | null;

    const targetUserId = String(body?.targetUserId || "").trim();
    const newRole = String(body?.role || "").toLowerCase() as Role;

    if (!targetUserId || !isUuid(targetUserId)) {
      return NextResponse.json({ error: "Invalid targetUserId" }, { status: 400 });
    }
    if (!(["user", "manager", "admin"] as const).includes(newRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Read old role (default user)
    const { data: oldRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .maybeSingle();
    const oldRole = (String((oldRow as any)?.role || "user").toLowerCase() as Role) || "user";

    // Upsert new role
    const { error: upErr } = await supabase
      .from("user_roles")
      .upsert({ user_id: targetUserId, role: newRole }, { onConflict: "user_id" });
    if (upErr) {
      console.error("[Admin role] upsert error:", upErr);
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    // Audit log (server-only)
    const { error: auditErr } = await supabase.from("admin_audit_log").insert({
      actor_user_id: ctx.authUserId,
      target_user_id: targetUserId,
      action: "role_change",
      old_role: oldRole,
      new_role: newRole,
      meta: {},
    });
    if (auditErr) {
      console.error("[Admin role] audit insert error:", auditErr);
      // Do not rollback role change; return success but note audit failure.
      return NextResponse.json({ ok: true, targetUserId, role: newRole, audit: "failed" });
    }

    return NextResponse.json({ ok: true, targetUserId, role: newRole });
  } catch (e) {
    return respondAuthError(e);
  }
}


