import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type TableRef = { schema: string; name: string };

export type PaymentsMapping = {
  table: TableRef;
  columns: {
    id?: string;
    userId: string;
    status?: string;
    type?: string;
    packId?: string;
    amount: string;
    credits?: string;
    metadata?: string;
    createdAt: string;
  };
};

export type ReferralsMapping = {
  table: TableRef;
  columns: {
    id?: string;
    inviterUserId: string;
    inviteeUserId: string;
    createdAt: string;
  };
};

export type UsersMapping = {
  table: TableRef;
  columns: {
    id: string;
    createdAt?: string;
    // Optional join helpers
    authUserId?: string;
    telegramId?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
};

const TTL_MS = 10 * 60 * 1000; // 10 minutes

let _schemaCache:
  | {
      expiresAt: number;
      value: Awaited<ReturnType<typeof computeAdminSchemaMapping>>;
    }
  | null = null;
let _schemaInFlight: Promise<Awaited<ReturnType<typeof computeAdminSchemaMapping>>> | null = null;

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function isMissingTableError(err: any) {
  const msg = typeof err?.message === "string" ? err.message : "";
  // PostgREST may return 42P01 or a message containing 'relation ... does not exist'
  return err?.code === "42P01" || msg.includes("does not exist") && msg.includes("relation");
}

function isMissingColumnError(err: any) {
  const msg = typeof err?.message === "string" ? err.message : "";
  return err?.code === "42703" || (msg.includes("column") && msg.includes("does not exist"));
}

async function tableExists(table: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).select("*").limit(1);
  if (!error) return true;
  if (isMissingTableError(error)) return false;
  // Any other error (RLS, permissions, etc) -> treat as exists.
  return true;
}

async function validateSelect(table: string, columns: string[]): Promise<{ ok: boolean; missing: string[] }> {
  const supabase = getSupabaseAdmin();
  const select = columns.filter(Boolean).join(", ");
  if (!select) return { ok: true, missing: [] };
  const { error } = await supabase.from(table).select(select).limit(1);
  if (!error) return { ok: true, missing: [] };
  if (isMissingColumnError(error)) {
    // We cannot reliably pinpoint which column; return the required set.
    return { ok: false, missing: columns.map((c) => `${table}.${c}`) };
  }
  return { ok: true, missing: [] };
}

async function computeAdminSchemaMapping() {
  // NOTE: In production, PostgREST blocks access to information_schema (PGRST106).
  // We therefore use a safe, explicit mapping for known project tables and validate via SELECT.

  // Users table (prefer telegram_profiles)
  const usersTable = (await tableExists("telegram_profiles")) ? "telegram_profiles" : (await tableExists("profiles")) ? "profiles" : null;
  const users = usersTable
    ? {
        table: { schema: "public", name: usersTable },
        columns: {
          id: "id",
          createdAt: "created_at",
          authUserId: usersTable === "telegram_profiles" ? "auth_user_id" : undefined,
          telegramId: usersTable === "telegram_profiles" ? "telegram_id" : undefined,
          username: usersTable === "telegram_profiles" ? "telegram_username" : undefined,
          firstName: usersTable === "telegram_profiles" ? "first_name" : undefined,
          lastName: usersTable === "telegram_profiles" ? "last_name" : undefined,
        },
      } satisfies UsersMapping
    : null;

  // Payments table
  const paymentsTable = (await tableExists("payments")) ? "payments" : null;
  const paymentsMapping = paymentsTable
    ? ({
        table: { schema: "public", name: paymentsTable },
        columns: {
          id: "id",
          userId: "user_id",
          status: "status",
          type: "type",
          packId: "package_id",
          amount: "amount",
          credits: "credits",
          metadata: "metadata",
          createdAt: "created_at",
        },
      } satisfies PaymentsMapping)
    : null;

  // Referrals table
  const referralsTable = (await tableExists("referrals")) ? "referrals" : null;
  const referralsMapping = referralsTable
    ? ({
        table: { schema: "public", name: referralsTable },
        columns: {
          id: "id",
          inviterUserId: "inviter_user_id",
          inviteeUserId: "invitee_user_id",
          createdAt: "created_at",
        },
      } satisfies ReferralsMapping)
    : null;

  // Validate required columns for each mapping (best-effort; avoids silent breakage)
  const usersMissing =
    users && users.table.name === "telegram_profiles"
      ? (await validateSelect("telegram_profiles", ["id", "auth_user_id", "created_at"])).missing
      : users && users.table.name === "profiles"
        ? (await validateSelect("profiles", ["id"])).missing
        : [];

  const paymentsMissing = paymentsMapping ? (await validateSelect("payments", ["user_id", "amount", "created_at"])).missing : [];
  const referralsMissing = referralsMapping ? (await validateSelect("referrals", ["inviter_user_id", "invitee_user_id", "created_at"])).missing : [];

  return {
    users,
    payments: paymentsMapping ? { mapping: paymentsMapping, missing: paymentsMissing } : null,
    referrals: referralsMapping ? { mapping: referralsMapping, missing: referralsMissing } : null,
  };
}

export async function getAdminSchemaMapping() {
  const now = Date.now();
  if (_schemaCache && _schemaCache.expiresAt > now) return _schemaCache.value;
  if (_schemaInFlight) return _schemaInFlight;

  _schemaInFlight = (async () => {
    try {
      const value = await computeAdminSchemaMapping();
      _schemaCache = { value, expiresAt: Date.now() + TTL_MS };
      return value;
    } finally {
      _schemaInFlight = null;
    }
  })();

  return _schemaInFlight;
}

export async function listContentTables(): Promise<{ effectsGallery: boolean; inspiration: string[] }> {
  const effectsGallery = await tableExists("effects_gallery");

  return {
    effectsGallery,
    // We cannot enumerate tables without information_schema; keep empty for now.
    inspiration: uniq([]),
  };
}

