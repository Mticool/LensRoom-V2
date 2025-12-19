import { NextResponse } from "next/server";
import type { TelegramSession } from "@/types/telegram";
import { getSession, getAuthUserId } from "@/lib/telegram/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AppRole = "user" | "manager" | "admin";

class HttpError extends Error {
  status: number;
  body: any;

  constructor(status: number, body: any) {
    super(body?.error || "Error");
    this.status = status;
    this.body = body;
  }
}

function normalizeRole(role: any): AppRole {
  const v = String(role || "").toLowerCase();
  if (v === "admin") return "admin";
  if (v === "manager") return "manager";
  return "user";
}

function roleMeets(required: AppRole, actual: AppRole): boolean {
  const rank: Record<AppRole, number> = { user: 0, manager: 1, admin: 2 };
  return rank[actual] >= rank[required];
}

export async function requireAuth(): Promise<{ session: TelegramSession; authUserId: string; role: AppRole }> {
  const session = await getSession();
  if (!session) throw new HttpError(401, { error: "Unauthorized" });

  const authUserId = await getAuthUserId(session);
  if (!authUserId) throw new HttpError(404, { error: "User account not found" });

  // Prefer DB role (source of truth), fallback to session flags.
  let role: AppRole = session.isAdmin ? "admin" : normalizeRole((session as any).role);
  try {
    const supabase = getSupabaseAdmin();
    // 1) New roles table (auth.users.id -> role)
    try {
      const { data: r } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authUserId)
        .maybeSingle();
      if ((r as any)?.role) {
        role = normalizeRole((r as any).role);
        // If role exists, we can return early.
        return { session, authUserId, role };
      }
    } catch {
      // ignore: table may not exist yet
    }

    // 2) Legacy: telegram_profiles role/is_admin (by profileId)
    const { data } = await supabase
      .from("telegram_profiles")
      .select("role, is_admin")
      .eq("id", session.profileId)
      .maybeSingle();
    if ((data as any)?.is_admin) role = "admin";
    else if ((data as any)?.role) role = normalizeRole((data as any).role);
  } catch {
    // ignore
  }

  return { session, authUserId, role };
}

export async function requireRole(required: AppRole): Promise<{ session: TelegramSession; authUserId: string; role: AppRole }> {
  const ctx = await requireAuth();
  // Prefer DB function (migration 015_admin_roles.sql) if available.
  // This keeps role checks consistent with RLS policies, but we fall back to local role string.
  try {
    const supabase = getSupabaseAdmin();
    const rolesAllowed: string[] =
      required === "admin" ? ["admin"] : required === "manager" ? ["admin", "manager"] : ["admin", "manager", "user"];
    const { data, error } = await supabase.rpc("has_role", { uid: ctx.authUserId, roles: rolesAllowed });
    if (!error && data === true) return ctx;
    if (!error && data === false) throw new HttpError(403, { error: "Forbidden" });
    // If rpc fails (missing function / schema), fallback below.
  } catch (e) {
    if (e instanceof HttpError) throw e;
  }

  if (!roleMeets(required, ctx.role)) throw new HttpError(403, { error: "Forbidden" });
  return ctx;
}

export function respondAuthError(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json(e.body, { status: e.status });
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}


