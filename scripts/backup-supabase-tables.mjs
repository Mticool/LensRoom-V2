/**
 * Backup selected Supabase tables to JSON files.
 *
 * Uses REST (supabase-js) and requires:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Output: docs/_supabase_backups/<timestamp>/<table>.json
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const TABLES = process.argv.slice(2);
if (TABLES.length === 0) {
  console.error(
    "Usage: node scripts/backup-supabase-tables.mjs <table1> <table2> ...\n" +
      "Example: node scripts/backup-supabase-tables.mjs academy_waitlist support_tickets referrals"
  );
  process.exit(2);
}

function tsDir() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}Z`
  );
}

async function fetchAll(table) {
  const out = [];
  const step = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + step - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < step) break;
    from += step;
  }

  return out;
}

async function main() {
  const outBase = path.join(process.cwd(), "docs", "_supabase_backups", tsDir());
  fs.mkdirSync(outBase, { recursive: true });

  const meta = {
    generated_at: new Date().toISOString(),
    project_url: SUPABASE_URL,
    tables: [],
  };

  for (const table of TABLES) {
    const rows = await fetchAll(table);
    const file = path.join(outBase, `${table}.json`);
    fs.writeFileSync(file, JSON.stringify({ table, rows }, null, 2));
    meta.tables.push({ table, rows: rows.length, file: path.relative(process.cwd(), file) });
    console.log(`${table}: ${rows.length}`);
  }

  fs.writeFileSync(path.join(outBase, "_meta.json"), JSON.stringify(meta, null, 2));
  console.log(`WROTE ${outBase}`);
}

main().catch((e) => {
  console.error(String(e?.stack || e?.message || e));
  process.exit(1);
});

