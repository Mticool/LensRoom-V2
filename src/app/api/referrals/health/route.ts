import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function looksLikeMissingRelation(err: any) {
  const msg = String(err?.message || err?.details || err || "");
  return msg.includes("does not exist") && msg.includes("relation");
}

function looksLikeMissingFunction(err: any) {
  const msg = String(err?.message || err?.details || err || "");
  return msg.includes("Could not find the function") || msg.includes("PGRST202");
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  let hasReferralCodesTable = true;
  let hasReferralsTable = true;
  let hasEnsureFn = true;
  let hasClaimFn = true;

  // Tables
  try {
    const { error } = await supabase
      .from("referral_codes")
      .select("code", { head: true, count: "exact" })
      .limit(1);
    if (error) {
      if (looksLikeMissingRelation(error)) hasReferralCodesTable = false;
    }
  } catch {
    hasReferralCodesTable = false;
  }

  try {
    const { error } = await supabase
      .from("referrals")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (error) {
      if (looksLikeMissingRelation(error)) hasReferralsTable = false;
    }
  } catch {
    hasReferralsTable = false;
  }

  // Functions (probe with a dummy UUID)
  const dummyUserId = "00000000-0000-0000-0000-000000000000";

  try {
    const { data, error } = await supabase.rpc("claim_referral", {
      p_code: "x",
      p_invitee_user_id: dummyUserId,
    });
    if (error) {
      if (looksLikeMissingFunction(error)) hasClaimFn = false;
      // If function exists but table missing, it may error too; table checks cover that.
    } else {
      // If it returns invalid_code, that's a good sign too.
      void data;
    }
  } catch (e) {
    if (looksLikeMissingFunction(e)) hasClaimFn = false;
  }

  try {
    const { error } = await supabase.rpc("ensure_referral_code", { p_user_id: dummyUserId });
    if (error) {
      if (looksLikeMissingFunction(error)) hasEnsureFn = false;
      // If function exists, we expect FK violation because dummy user doesn't exist.
    }
  } catch (e) {
    if (looksLikeMissingFunction(e)) hasEnsureFn = false;
  }

  const configured = hasReferralCodesTable && hasReferralsTable && hasEnsureFn && hasClaimFn;

  return NextResponse.json({
    ok: configured,
    tables: {
      referral_codes: hasReferralCodesTable,
      referrals: hasReferralsTable,
    },
    functions: {
      ensure_referral_code: hasEnsureFn,
      claim_referral: hasClaimFn,
    },
  });
}

