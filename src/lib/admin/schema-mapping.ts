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

type ColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
};

type TableRow = {
  table_name: string;
  table_type: string;
};

const TTL_MS = 10 * 60 * 1000; // 10 minutes

let _schemaCache:
  | {
      expiresAt: number;
      value: Awaited<ReturnType<typeof computeAdminSchemaMapping>>;
    }
  | null = null;
let _schemaInFlight: Promise<Awaited<ReturnType<typeof computeAdminSchemaMapping>>> | null = null;

let _tablesCache: { expiresAt: number; value: TableRow[] } | null = null;
let _tablesInFlight: Promise<TableRow[]> | null = null;

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function pick(cols: Set<string>, candidates: string[]): string | undefined {
  for (const c of candidates) if (cols.has(c)) return c;
  return undefined;
}

function hasAny(cols: Set<string>, candidates: string[]) {
  return candidates.some((c) => cols.has(c));
}

async function listPublicTables() {
  const now = Date.now();
  if (_tablesCache && _tablesCache.expiresAt > now) return _tablesCache.value;
  if (_tablesInFlight) return _tablesInFlight;

  _tablesInFlight = (async () => {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .schema("information_schema")
        .from("tables")
        .select("table_name, table_type")
        .eq("table_schema", "public")
        .eq("table_type", "BASE TABLE");

      if (error) throw error;
      const value = (data || []) as TableRow[];
      _tablesCache = { value, expiresAt: Date.now() + TTL_MS };
      return value;
    } finally {
      _tablesInFlight = null;
    }
  })();

  return _tablesInFlight;
}

async function listPublicColumns() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .schema("information_schema")
    .from("columns")
    .select("table_name, column_name, data_type, udt_name")
    .eq("table_schema", "public");

  if (error) throw error;
  return (data || []) as ColumnRow[];
}

function groupColumnsByTable(cols: ColumnRow[]) {
  const m = new Map<string, ColumnRow[]>();
  for (const c of cols) {
    const arr = m.get(c.table_name) || [];
    arr.push(c);
    m.set(c.table_name, arr);
  }
  return m;
}

async function computeAdminSchemaMapping() {
  const [tables, columns] = await Promise.all([listPublicTables(), listPublicColumns()]);
  const colsByTable = groupColumnsByTable(columns);

  const users = findUsersTable(tables, colsByTable);
  const payments = findPaymentsTable(tables, colsByTable);
  const referrals = findReferralsTable(tables, colsByTable);

  return {
    users,
    payments,
    referrals,
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

export function findUsersTable(tables: TableRow[], colsByTable: Map<string, ColumnRow[]>) {
  const candidates = ["telegram_profiles", "profiles"]; // prefer telegram_profiles in this project

  for (const name of candidates) {
    const cols = colsByTable.get(name);
    if (!cols) continue;
    const set = new Set(cols.map((c) => c.column_name));
    const id = pick(set, ["id"]) || "id";

    return {
      table: { schema: "public", name },
      columns: {
        id,
        createdAt: pick(set, ["created_at", "createdAt", "created"]) || undefined,
        authUserId: pick(set, ["auth_user_id", "user_id"]) || undefined,
        telegramId: pick(set, ["telegram_id"]) || undefined,
        username: pick(set, ["telegram_username", "username"]) || undefined,
        firstName: pick(set, ["first_name", "firstName"]) || undefined,
        lastName: pick(set, ["last_name", "lastName"]) || undefined,
      },
    } satisfies UsersMapping;
  }

  // Fallback: any table with a created_at and an id column.
  for (const t of tables) {
    const cols = colsByTable.get(t.table_name);
    if (!cols) continue;
    const set = new Set(cols.map((c) => c.column_name));
    if (set.has("id") && (set.has("created_at") || set.has("createdAt"))) {
      return {
        table: { schema: "public", name: t.table_name },
        columns: { id: "id", createdAt: set.has("created_at") ? "created_at" : "createdAt" },
      } as UsersMapping;
    }
  }

  return null;
}

export function findPaymentsTable(tables: TableRow[], colsByTable: Map<string, ColumnRow[]>) {
  // Prefer explicit names first.
  const namePriority = ["payments", "orders", "purchases"];

  const scored: Array<{ name: string; score: number; cols: Set<string> }> = [];

  for (const t of tables) {
    const colsArr = colsByTable.get(t.table_name);
    if (!colsArr) continue;
    const cols = new Set(colsArr.map((c) => c.column_name));

    // Heuristic: must have user_id and amount-like.
    const hasUser = hasAny(cols, ["user_id", "auth_user_id", "customer_extra"]);
    const hasAmount = hasAny(cols, ["amount", "price", "rub_amount", "sum", "total", "total_amount"]);
    if (!hasUser || !hasAmount) continue;

    let score = 0;
    if (namePriority.includes(t.table_name)) score += 50;
    if (cols.has("status")) score += 5;
    if (cols.has("created_at")) score += 5;
    if (cols.has("metadata")) score += 3;
    if (cols.has("type")) score += 2;
    if (cols.has("credits") || cols.has("stars") || cols.has("coins")) score += 2;

    scored.push({ name: t.table_name, score, cols });
  }

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  if (!winner) return null;

  return resolvePaymentsColumns({ schema: "public", name: winner.name }, winner.cols);
}

export function resolvePaymentsColumns(table: TableRef, cols: Set<string>) {
  const userId = pick(cols, ["user_id", "auth_user_id"]) || "";
  const amount = pick(cols, ["amount", "rub_amount", "price", "sum", "total", "total_amount"]) || "";
  const createdAt = pick(cols, ["created_at", "createdAt", "created"]) || "";

  const missing: string[] = [];
  if (!userId) missing.push("payments.user_id");
  if (!amount) missing.push("payments.amount");
  if (!createdAt) missing.push("payments.created_at");

  const mapping: PaymentsMapping = {
    table,
    columns: {
      id: pick(cols, ["id"]) || undefined,
      userId: userId || "user_id",
      status: pick(cols, ["status", "payment_status"]) || undefined,
      type: pick(cols, ["type", "product", "product_type", "kind"]) || undefined,
      packId: pick(cols, ["pack_id", "package_id", "sku", "product_id"]) || undefined,
      amount: amount || "amount",
      credits: pick(cols, ["credits", "stars", "coins"]) || undefined,
      metadata: pick(cols, ["metadata", "meta", "custom_fields", "payload"]) || undefined,
      createdAt: createdAt || "created_at",
    },
  };

  return { mapping, missing };
}

export function findReferralsTable(tables: TableRow[], colsByTable: Map<string, ColumnRow[]>) {
  // Prefer explicit table name.
  const preferred = ["referrals", "user_referrals", "invites"];

  const candidates: Array<{ name: string; cols: Set<string> }> = [];

  for (const t of tables) {
    const colsArr = colsByTable.get(t.table_name);
    if (!colsArr) continue;
    const cols = new Set(colsArr.map((c) => c.column_name));

    const hasInviter = hasAny(cols, ["inviter_user_id", "referrer_user_id", "inviter_id", "referrer_id"]);
    const hasInvitee = hasAny(cols, ["invitee_user_id", "referred_user_id", "invitee_id", "referred_id"]);
    if (!hasInviter || !hasInvitee) continue;

    candidates.push({ name: t.table_name, cols });
  }

  candidates.sort((a, b) => {
    const ap = preferred.includes(a.name) ? 1 : 0;
    const bp = preferred.includes(b.name) ? 1 : 0;
    return bp - ap;
  });

  const winner = candidates[0];
  if (!winner) return null;

  return resolveReferralsColumns({ schema: "public", name: winner.name }, winner.cols);
}

export function resolveReferralsColumns(table: TableRef, cols: Set<string>) {
  const inviterUserId = pick(cols, ["inviter_user_id", "referrer_user_id", "inviter_id", "referrer_id"]) || "";
  const inviteeUserId = pick(cols, ["invitee_user_id", "referred_user_id", "invitee_id", "referred_id"]) || "";
  const createdAt = pick(cols, ["created_at", "createdAt", "created"]) || "";

  const missing: string[] = [];
  if (!inviterUserId) missing.push("referrals.inviter_user_id");
  if (!inviteeUserId) missing.push("referrals.invitee_user_id");
  if (!createdAt) missing.push("referrals.created_at");

  const mapping: ReferralsMapping = {
    table,
    columns: {
      id: pick(cols, ["id"]) || undefined,
      inviterUserId: inviterUserId || "inviter_user_id",
      inviteeUserId: inviteeUserId || "invitee_user_id",
      createdAt: createdAt || "created_at",
    },
  };

  return { mapping, missing };
}

export async function listContentTables(): Promise<{ effectsGallery: boolean; inspiration: string[] }> {
  const tables = await listPublicTables();
  const names = new Set(tables.map((t) => t.table_name));
  const inspiration = tables
    .map((t) => t.table_name)
    .filter((n) => n.toLowerCase().startsWith("inspiration"));

  return {
    effectsGallery: names.has("effects_gallery"),
    inspiration: uniq(inspiration),
  };
}

