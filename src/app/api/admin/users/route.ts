import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";
import { getAdminSchemaMapping } from "@/lib/admin/schema-mapping";
import { adminSchemaMismatch } from "@/lib/http/admin-schema-error";

/**
 * GET /api/admin/users
 * Get all users with their notification status (admin only)
 */
export async function GET(request: Request) {
  try {
    await requireRole("admin");

    const supabase = getSupabaseAdmin();
    const schema = await getAdminSchemaMapping();

    const url = new URL(request.url);
    const q = (url.searchParams.get("query") || "").trim();
    const roleFilter = (url.searchParams.get("role") || "all").toLowerCase(); // all|admin|manager|user
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

    // We expect users to be in telegram_profiles; resolve columns via information_schema mapping.
    if (!schema.users || schema.users.table.name !== "telegram_profiles") {
      return adminSchemaMismatch({
        hint: "Expected a public.telegram_profiles table for admin users list",
        missing: ["telegram_profiles.table"],
      });
    }

    const uCols = schema.users.columns;
    const missing: string[] = [];
    if (!uCols.authUserId) missing.push("telegram_profiles.auth_user_id");
    if (!uCols.createdAt) missing.push("telegram_profiles.created_at");
    if (missing.length) {
      return adminSchemaMismatch({
        hint: "telegram_profiles schema missing required columns for admin users list",
        missing,
      });
    }

    const selectCols = [
      uCols.id,
      uCols.authUserId!,
      uCols.createdAt!,
      uCols.telegramId,
      uCols.username,
      uCols.firstName,
      uCols.lastName,
    ]
      .filter(Boolean)
      .join(", ");

    let query = supabase
      .from(schema.users.table.name)
      .select(selectCols)
      .order(uCols.createdAt!, { ascending: false })
      .range(offset, offset + limit - 1);

    if (q) {
      const like = `%${q}%`;
      const ors: string[] = [];
      if (uCols.username) ors.push(`${uCols.username}.ilike.${like}`);
      if (uCols.firstName) ors.push(`${uCols.firstName}.ilike.${like}`);
      if (uCols.lastName) ors.push(`${uCols.lastName}.ilike.${like}`);
      if (/^\\d+$/.test(q) && uCols.telegramId) ors.push(`${uCols.telegramId}.eq.${q}`);
      if (ors.length) query = query.or(ors.join(","));
    }

    const { data: profiles, error } = await query;

    if (error) {
      console.error('[Admin Users] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    const profilesAny = (profiles as any[]) || [];
    const authIds = profilesAny.map((p: any) => String(p?.[uCols.authUserId!])).filter(Boolean);

    // Roles: default to 'user' if no row in user_roles.
    const roleMap: Record<string, "user" | "manager" | "admin"> = {};
    if (authIds.length) {
      const { data: rolesRows } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", authIds);
      (rolesRows as any[] | null | undefined)?.forEach((r: any) => {
        const uid = String(r.user_id || "");
        const role = String(r.role || "user").toLowerCase();
        roleMap[uid] = role === "admin" ? "admin" : role === "manager" ? "manager" : "user";
      });
    }

    const users = profilesAny
      .map((p: any) => {
        const authUserId = String(p?.[uCols.authUserId!] || "");
        const role = roleMap[authUserId] || "user";
        const username = uCols.username ? (p?.[uCols.username] as string | null) : null;
        const firstName = uCols.firstName ? (p?.[uCols.firstName] as string | null) : null;
        const lastName = uCols.lastName ? (p?.[uCols.lastName] as string | null) : null;
        const telegramId = uCols.telegramId ? (p?.[uCols.telegramId] as number | null) : null;

        const displayName =
          (username && username.trim() ? `@${username.trim()}` : "") ||
          [firstName, lastName].filter(Boolean).join(" ").trim() ||
          (telegramId ? `TG ${telegramId}` : "") ||
          authUserId;

        return {
          auth_user_id: authUserId,
          telegram_id: telegramId,
          telegram_username: username,
          first_name: firstName,
          last_name: lastName,
          created_at: p?.[uCols.createdAt!],
          role,
          display_name: displayName,
        };
      })
      .filter((u: any) => {
        if (roleFilter === "all") return true;
        if (roleFilter === "admin" || roleFilter === "manager" || roleFilter === "user") return u.role === roleFilter;
        return true;
      });

    return NextResponse.json({ users, limit, offset, query: q, role: roleFilter });
  } catch (error) {
    console.error('[Admin Users] Error:', error);
    return respondAuthError(error);
  }
}


