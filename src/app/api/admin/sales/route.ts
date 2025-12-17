import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";
import { getAdminSchemaMapping } from "@/lib/admin/schema-mapping";
import { adminSchemaMismatch } from "@/lib/http/admin-schema-error";

function parseIso(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function GET(request: Request) {
  try {
    await requireRole("admin");
    const supabase = getSupabaseAdmin();
    const schema = await getAdminSchemaMapping();

    const url = new URL(request.url);
    const from = parseIso(url.searchParams.get("from")) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const to = parseIso(url.searchParams.get("to")) || new Date().toISOString();
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 200)));

    if (!schema.payments) {
      return adminSchemaMismatch({
        hint: "Could not find a payments/orders/purchases table in public schema",
        missing: ["payments.table"],
      });
    }
    const { mapping: pMap, missing: pMissing } = schema.payments;
    if (pMissing.length) {
      return adminSchemaMismatch({
        hint: "Payments schema is missing required columns for sales listing",
        missing: pMissing,
      });
    }

    const c = pMap.columns;
    const select = [
      c.id,
      c.userId,
      c.type,
      c.packId,
      c.amount,
      c.credits,
      c.status,
      c.createdAt,
      c.metadata,
    ]
      .filter(Boolean)
      .join(", ");

    const { data: rows, error } = await supabase
      .from(pMap.table.name)
      .select(select)
      .gte(c.createdAt, from)
      .lte(c.createdAt, to)
      .order(c.createdAt, { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[Admin sales] payments error:", error);
      return NextResponse.json({ error: "Failed to load sales" }, { status: 500 });
    }

    const rowsAny = (rows as any[]) || [];
    const userIds = Array.from(new Set(rowsAny.map((r: any) => String(r?.[c.userId])).filter(Boolean)));
    let userMap: Record<string, any> = {};
    if (schema.users && userIds.length) {
      const u = schema.users;
      const uTable = u.table.name;
      const uCols = u.columns;
      const selectUsers = [
        uCols.id,
        uCols.authUserId,
        uCols.telegramId,
        uCols.username,
        uCols.firstName,
        uCols.lastName,
      ]
        .filter(Boolean)
        .join(", ");

      // Best-effort join: payments.userId usually equals auth_user_id. Fallback to users.id.
      if (uCols.authUserId) {
        const { data: profiles } = await supabase.from(uTable).select(selectUsers).in(uCols.authUserId, userIds);
        (profiles as any[] | null | undefined)?.forEach((p: any) => {
          userMap[String(p[uCols.authUserId!])] = {
            telegram_id: uCols.telegramId ? p[uCols.telegramId] : undefined,
            telegram_username: uCols.username ? p[uCols.username] : undefined,
            first_name: uCols.firstName ? p[uCols.firstName] : undefined,
            last_name: uCols.lastName ? p[uCols.lastName] : undefined,
          };
        });
      }
      if (!Object.keys(userMap).length) {
        const { data: profiles } = await supabase.from(uTable).select(selectUsers).in(uCols.id, userIds);
        (profiles as any[] | null | undefined)?.forEach((p: any) => {
          userMap[String(p[uCols.id])] = {
            telegram_id: uCols.telegramId ? p[uCols.telegramId] : undefined,
            telegram_username: uCols.username ? p[uCols.username] : undefined,
            first_name: uCols.firstName ? p[uCols.firstName] : undefined,
            last_name: uCols.lastName ? p[uCols.lastName] : undefined,
          };
        });
      }
    }

    const sales = rowsAny.map((r: any) => {
      const meta = c.metadata ? r?.[c.metadata] || {} : {};
      const packId = (c.packId ? r?.[c.packId] : undefined) || meta.package_id || meta.pack_id || null;
      const u = userMap[String(r?.[c.userId])] || null;
      return {
        id: String(r?.[c.id || "id"] || `${r?.[c.userId]}_${r?.[c.createdAt]}`),
        user: u
          ? {
              telegram_id: u.telegram_id,
              username: u.telegram_username || null,
              name: [u.first_name, u.last_name]
                .filter(Boolean)
                .join(" "),
            }
          : { user_id: r?.[c.userId] },
        packId,
        rub: Number(r?.[c.amount] || 0),
        stars: c.credits ? Number(r?.[c.credits] || 0) : 0,
        type: c.type ? r?.[c.type] : null,
        status: c.status ? r?.[c.status] : null,
        created_at: r?.[c.createdAt],
      };
    });

    return NextResponse.json({ from, to, sales });
  } catch (e) {
    console.error("[Admin sales] error:", e);
    return respondAuthError(e);
  }
}


