import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";
import { getAdminSchemaMapping } from "@/lib/admin/schema-mapping";

function toInt(v: string | null, def: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(0, Math.floor(n));
}

export async function GET(request: Request) {
  try {
    await requireRole("admin");
    const supabase = getSupabaseAdmin();

    const url = new URL(request.url);
    const limit = Math.min(200, Math.max(1, toInt(url.searchParams.get("limit"), 50)));
    const offset = toInt(url.searchParams.get("offset"), 0);

    const { data: rows, error } = await supabase
      .from("admin_audit_log")
      .select("id, actor_user_id, target_user_id, action, old_role, new_role, meta, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[Admin audit] query error:", error);
      return NextResponse.json({ error: "Failed to load audit" }, { status: 500 });
    }

    const auditAny = (rows as any[]) || [];
    const ids = Array.from(
      new Set(
        auditAny
          .flatMap((r: any) => [String(r.actor_user_id || ""), String(r.target_user_id || "")])
          .filter(Boolean)
      )
    );

    let userMap: Record<string, any> = {};
    try {
      const schema = await getAdminSchemaMapping();
      if (schema.users && schema.users.table.name === "telegram_profiles" && schema.users.columns.authUserId) {
        const u = schema.users;
        const select = [u.columns.authUserId, u.columns.telegramId, u.columns.username, u.columns.firstName, u.columns.lastName]
          .filter(Boolean)
          .join(", ");
        const { data: profs } = await supabase
          .from(u.table.name)
          .select(select)
          .in(u.columns.authUserId, ids);

        (profs as any[] | null | undefined)?.forEach((p: any) => {
          const k = String(p[u.columns.authUserId!]);
          userMap[k] = {
            telegram_id: u.columns.telegramId ? p[u.columns.telegramId] : undefined,
            username: u.columns.username ? p[u.columns.username] : undefined,
            name: [u.columns.firstName ? p[u.columns.firstName] : undefined, u.columns.lastName ? p[u.columns.lastName] : undefined]
              .filter(Boolean)
              .join(" "),
          };
        });
      }
    } catch {
      // ignore best-effort
    }

    const out = auditAny.map((r: any) => {
      const actor = userMap[String(r.actor_user_id)] || null;
      const target = userMap[String(r.target_user_id)] || null;
      return {
        ...r,
        actor,
        target,
      };
    });

    return NextResponse.json({ limit, offset, rows: out });
  } catch (e) {
    return respondAuthError(e);
  }
}


