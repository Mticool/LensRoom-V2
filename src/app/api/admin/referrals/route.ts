import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";
import { getAdminSchemaMapping } from "@/lib/admin/schema-mapping";
import { adminSchemaMismatch } from "@/lib/http/admin-schema-error";

const INVITER_BONUS_STARS = 50;

export async function GET() {
  try {
    await requireRole("admin");
    const supabase = getSupabaseAdmin();
    const schema = await getAdminSchemaMapping();

    if (!schema.referrals) {
      return adminSchemaMismatch({
        hint: "Could not find a referrals table in public schema",
        missing: ["referrals.table"],
      });
    }
    const { mapping: rMap, missing: rMissing } = schema.referrals;
    if (rMissing.length) {
      return adminSchemaMismatch({
        hint: "Referrals schema is missing required columns",
        missing: rMissing,
      });
    }

    if (!schema.payments) {
      return adminSchemaMismatch({
        hint: "Could not find a payments/orders/purchases table in public schema (required to compute referral purchases/revenue)",
        missing: ["payments.table"],
      });
    }
    const { mapping: pMap, missing: pMissing } = schema.payments;
    const missingRequired = [
      ...pMissing,
      ...(pMap.columns.status ? [] : ["payments.status"]),
    ];
    if (missingRequired.length) {
      return adminSchemaMismatch({
        hint: "Payments schema is missing required columns for referral analytics",
        missing: missingRequired,
      });
    }

    const rc = rMap.columns;
    const refSelect = [rc.id, rc.inviterUserId, rc.inviteeUserId, rc.createdAt].filter(Boolean).join(", ");
    const { data: refs, error: refErr } = await supabase
      .from(rMap.table.name)
      .select(refSelect)
      .order(rc.createdAt, { ascending: false })
      .limit(1000);

    if (refErr) {
      console.error("[Admin referrals] referrals query error:", refErr);
      return NextResponse.json({ error: "Failed to load referrals" }, { status: 500 });
    }

    const refsAny = (refs as any[]) || [];
    const inviterIds = Array.from(new Set(refsAny.map((r: any) => String(r?.[rc.inviterUserId])).filter(Boolean)));
    const inviteeIds = Array.from(new Set(refsAny.map((r: any) => String(r?.[rc.inviteeUserId])).filter(Boolean)));

    // Pull inviter profiles for nicer output (best-effort)
    let profileMap: Record<string, any> = {};
    const allUserIds = Array.from(new Set([...inviterIds, ...inviteeIds]));
    if (schema.users && allUserIds.length) {
      const u = schema.users;
      const uTable = u.table.name;
      const uCols = u.columns;
      const selectUsers = [uCols.id, uCols.authUserId, uCols.telegramId, uCols.username, uCols.firstName, uCols.lastName]
        .filter(Boolean)
        .join(", ");

      if (uCols.authUserId) {
        const { data: profiles } = await supabase.from(uTable).select(selectUsers).in(uCols.authUserId, allUserIds);
        (profiles as any[] | null | undefined)?.forEach((p: any) => {
          profileMap[String(p[uCols.authUserId!])] = {
            telegram_id: uCols.telegramId ? p[uCols.telegramId] : undefined,
            telegram_username: uCols.username ? p[uCols.username] : undefined,
            first_name: uCols.firstName ? p[uCols.firstName] : undefined,
            last_name: uCols.lastName ? p[uCols.lastName] : undefined,
          };
        });
      }
      if (!Object.keys(profileMap).length) {
        const { data: profiles } = await supabase.from(uTable).select(selectUsers).in(uCols.id, allUserIds);
        (profiles as any[] | null | undefined)?.forEach((p: any) => {
          profileMap[String(p[uCols.id])] = {
            telegram_id: uCols.telegramId ? p[uCols.telegramId] : undefined,
            telegram_username: uCols.username ? p[uCols.username] : undefined,
            first_name: uCols.firstName ? p[uCols.firstName] : undefined,
            last_name: uCols.lastName ? p[uCols.lastName] : undefined,
          };
        });
      }
    }

    // Purchases by invitees (completed only)
    let purchasesByInvitee: Record<string, { purchases: number; revenue: number }> = {};
    if (inviteeIds.length) {
      const pc = pMap.columns;
      const completedStatuses = ["completed", "success", "paid"];
      const selectPays = [pc.userId, pc.amount, pc.status!].filter(Boolean).join(", ");
      const { data: pays } = await supabase
        .from(pMap.table.name)
        .select(selectPays)
        .in(pc.userId, inviteeIds)
        .in(pc.status!, completedStatuses);
      (pays || []).forEach((p: any) => {
        const k = String(p?.[pMap.columns.userId]);
        const cur = purchasesByInvitee[k] || { purchases: 0, revenue: 0 };
        cur.purchases += 1;
        cur.revenue += Number(p?.[pMap.columns.amount] || 0);
        purchasesByInvitee[k] = cur;
      });
    }

    const byInviter: Record<
      string,
      {
        inviter_user_id: string;
        inviter: any | null;
        invited_count: number;
        earned_stars: number;
        invitees: Array<{ invitee_user_id: string; invitee: any | null; purchases: number; revenue_rub: number }>;
        purchases_count: number;
        revenue_rub: number;
      }
    > = {};

    for (const r of refsAny) {
      const inviterId = String((r as any)?.[rc.inviterUserId] || "");
      const inviteeId = String((r as any)?.[rc.inviteeUserId] || "");
      if (!inviterId || !inviteeId) continue;

      const inviterProfile = profileMap[inviterId] || null;
      const inviteeProfile = profileMap[inviteeId] || null;
      const inviteePurchase = purchasesByInvitee[inviteeId] || { purchases: 0, revenue: 0 };

      const cur =
        byInviter[inviterId] ||
        (byInviter[inviterId] = {
          inviter_user_id: inviterId,
          inviter: inviterProfile
            ? {
                telegram_id: inviterProfile.telegram_id,
                username: inviterProfile.telegram_username || null,
                name: [inviterProfile.first_name, inviterProfile.last_name].filter(Boolean).join(" "),
              }
            : null,
          invited_count: 0,
          earned_stars: 0,
          invitees: [],
          purchases_count: 0,
          revenue_rub: 0,
        });

      cur.invited_count += 1;
      cur.earned_stars = cur.invited_count * INVITER_BONUS_STARS;
      cur.invitees.push({
        invitee_user_id: inviteeId,
        invitee: inviteeProfile
          ? {
              telegram_id: inviteeProfile.telegram_id,
              username: inviteeProfile.telegram_username || null,
              name: [inviteeProfile.first_name, inviteeProfile.last_name].filter(Boolean).join(" "),
            }
          : null,
        purchases: inviteePurchase.purchases,
        revenue_rub: inviteePurchase.revenue,
      });
      cur.purchases_count += inviteePurchase.purchases;
      cur.revenue_rub += inviteePurchase.revenue;
    }

    const rows = Object.values(byInviter).sort((a, b) => b.revenue_rub - a.revenue_rub);
    return NextResponse.json({
      inviter_bonus_stars: INVITER_BONUS_STARS,
      total_referrals: (refs || []).length,
      rows,
    });
  } catch (e) {
    console.error("[Admin referrals] error:", e);
    return respondAuthError(e);
  }
}



