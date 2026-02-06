/**
 * Execute a SQL file against the linked Supabase remote database.
 *
 * Requires:
 * - SUPABASE_DB_URL (recommended) or a linked project with supabase/.temp/pooler-url
 * - SUPABASE_DB_PASSWORD (or DATABASE_PASSWORD)
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD=... node scripts/exec-remote-sql.mjs supabase/migrations/20260206_drop_legacy_unused_tables.sql
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

function readPoolerUrlFromLink() {
  const p = path.join(process.cwd(), "supabase", ".temp", "pooler-url");
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8").trim();
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Missing sql file path argument.");
  process.exit(2);
}

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || readPoolerUrlFromLink();
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL (or linked project supabase/.temp/pooler-url).");
  process.exit(2);
}

const password = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD (or DATABASE_PASSWORD).");
  process.exit(2);
}

const sql = fs.readFileSync(path.resolve(sqlFile), "utf8");

const rejectUnauthorized =
  String(process.env.PG_SSL_REJECT_UNAUTHORIZED || "false").toLowerCase() === "true";

async function main() {
  const u = new URL(dbUrl);
  const user = decodeURIComponent(u.username || "");
  const host = u.hostname;
  const port = u.port ? Number(u.port) : 5432;
  const database = (u.pathname || "/postgres").replace(/^\//, "") || "postgres";

  const client = new Client({
    user,
    host,
    port,
    database,
    password,
    // Supabase pooler often presents a chain that triggers Node's strict verification.
    // For production-hardening, set PG_SSL_REJECT_UNAUTHORIZED=true and provide a CA.
    ssl: rejectUnauthorized ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
  });

  await client.connect();

  const who = await client.query("select current_database() as db, current_user as user, inet_server_addr() as server_ip;");
  console.log(`connected db=${who.rows[0]?.db} user=${who.rows[0]?.user} server_ip=${who.rows[0]?.server_ip}`);

  await client.query(sql);

  await client.end();
  console.log("OK");
}

main().catch((e) => {
  console.error(String(e?.stack || e?.message || e));
  process.exit(1);
});
