import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { REFERRAL_REWARDS } from "@/lib/referrals/referral-helper";

function looksLikeMissingRelation(err: any) {
  const msg = String(err?.message || err?.details || err || "");
  return msg.includes("does not exist") && msg.includes("relation");
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  let hasReferralCodesTable = true;
  let hasReferralAttributionsTable = true;
  let hasReferralEventsTable = true;

  // Tables check
  try {
    const { error } = await supabase
      .from("referral_codes")
      .select("code", { head: true, count: "exact" })
      .limit(1);
    if (error && looksLikeMissingRelation(error)) hasReferralCodesTable = false;
  } catch {
    hasReferralCodesTable = false;
  }

  try {
    const { error } = await supabase
      .from("referral_attributions")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (error && looksLikeMissingRelation(error)) hasReferralAttributionsTable = false;
  } catch {
    hasReferralAttributionsTable = false;
  }

  try {
    const { error } = await supabase
      .from("referral_events")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (error && looksLikeMissingRelation(error)) hasReferralEventsTable = false;
  } catch {
    hasReferralEventsTable = false;
  }

  // Get stats
  const { count: codesCount } = await supabase
    .from("referral_codes")
    .select("*", { count: "exact", head: true });

  const { count: attributionsCount } = await supabase
    .from("referral_attributions")
    .select("*", { count: "exact", head: true });

  const { count: eventsCount } = await supabase
    .from("referral_events")
    .select("*", { count: "exact", head: true });

  const configured = hasReferralCodesTable && hasReferralAttributionsTable && hasReferralEventsTable;

  return NextResponse.json({
    ok: configured,
    tables: {
      referral_codes: hasReferralCodesTable,
      referral_attributions: hasReferralAttributionsTable,
      referral_events: hasReferralEventsTable,
    },
    stats: {
      totalCodes: codesCount || 0,
      totalAttributions: attributionsCount || 0,
      totalEvents: eventsCount || 0,
    },
    rewards: REFERRAL_REWARDS,
    info: {
      signupBonus: `Referrer: +${REFERRAL_REWARDS.signup.referrer}⭐, Invitee: +${REFERRAL_REWARDS.signup.invitee}⭐`,
      firstGenBonus: `Referrer: +${REFERRAL_REWARDS.first_generation.referrer}⭐`,
    },
  });
}



