/**
 * Supabase usage report for this repo.
 *
 * Produces:
 * - docs/supabase-usage-report.json
 * - docs/supabase-usage-report.md
 *
 * Requires:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Note:
 * - This scans the repo for `.from('table')` usage and classifies operations by nearby method calls.
 * - It also fetches live table inventory from Supabase OpenAPI and counts rows + recent activity (30d).
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function walkFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const ents = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of ents) {
      if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) out.push(p);
    }
  }
  return out;
}

function isScanFile(p) {
  return (
    p.includes(`${path.sep}src${path.sep}`) ||
    p.includes(`${path.sep}scripts${path.sep}`)
  ) && (p.endsWith(".ts") || p.endsWith(".tsx") || p.endsWith(".js") || p.endsWith(".mjs"));
}

function rel(p) {
  return path.relative(ROOT, p);
}

function parseFromCalls(content) {
  // Capture `.from('table')` and `.from("table")`
  const re = /\.from\(\s*(['"])([^'"]+)\1\s*\)/g;
  const hits = [];
  let m;
  while ((m = re.exec(content))) {
    hits.push({ table: m[2], index: m.index });
  }
  return hits;
}

function classifyOps(windowText) {
  // Very simple heuristic based on chained calls in the next ~400 chars.
  const ops = new Set();
  if (/\.(insert|upsert|update|delete)\s*\(/.test(windowText)) {
    const m = windowText.match(/\.(insert|upsert|update|delete)\s*\(/g) || [];
    for (const x of m) ops.add(x.replace(/[.\s(]/g, ""));
  }
  if (/\.select\s*\(/.test(windowText)) ops.add("select");
  if (/\.rpc\s*\(/.test(windowText)) ops.add("rpc");
  return Array.from(ops).sort();
}

function parseRpcCalls(content) {
  const re = /\.rpc\(\s*(['"])([^'"]+)\1\s*/g;
  const hits = [];
  let m;
  while ((m = re.exec(content))) hits.push(m[2]);
  return hits;
}

function pickTs(cols) {
  const prefs = ["created_at", "updated_at", "completed_at", "linked_at", "used_at", "last_login_at", "published_at"];
  for (const p of prefs) if (cols.includes(p)) return p;
  return null;
}

async function fetchOpenApiTables() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`OpenAPI fetch failed: ${r.status}`);
  const api = await r.json();
  const defs = api.definitions || {};
  return Object.entries(defs)
    .filter(([, v]) => v?.type === "object" && v?.properties)
    .map(([name, v]) => ({ table: name, cols: Object.keys(v.properties) }))
    .sort((a, b) => a.table.localeCompare(b.table));
}

async function countTable(table, tsCol, sinceIso) {
  const { count: total, error: e1 } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (e1) return { total: null, recent30: null, error: e1.message };
  if (!tsCol) return { total: total ?? 0, recent30: null, error: null };
  const { count: recent30, error: e2 } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte(tsCol, sinceIso);
  if (e2) return { total: total ?? 0, recent30: null, error: e2.message };
  return { total: total ?? 0, recent30: recent30 ?? 0, error: null };
}

async function main() {
  const sinceIso = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  // 1) Scan repo
  const files = walkFiles(path.join(ROOT, "src")).concat(walkFiles(path.join(ROOT, "scripts"))).filter(isScanFile);
  const usage = new Map(); // table -> { ops:Set, files:Set }
  const rpcUsage = new Map(); // fn -> files:Set

  for (const f of files) {
    const txt = fs.readFileSync(f, "utf8");

    for (const fn of parseRpcCalls(txt)) {
      if (!rpcUsage.has(fn)) rpcUsage.set(fn, new Set());
      rpcUsage.get(fn).add(rel(f));
    }

    const hits = parseFromCalls(txt);
    for (const h of hits) {
      const windowText = txt.slice(h.index, h.index + 500);
      const ops = classifyOps(windowText);
      if (!usage.has(h.table)) usage.set(h.table, { ops: new Set(), files: new Set() });
      const u = usage.get(h.table);
      ops.forEach((o) => u.ops.add(o));
      u.files.add(rel(f));
    }
  }

  // 2) Live inventory from Supabase
  const tables = await fetchOpenApiTables();
  const inventory = [];
  for (const t of tables) {
    const tsCol = pickTs(t.cols);
    const counts = await countTable(t.table, tsCol, sinceIso);
    inventory.push({
      table: t.table,
      timestamp_col: tsCol,
      total: counts.total,
      recent30: counts.recent30,
      error: counts.error,
      used_in_code: usage.has(t.table),
      code_ops: usage.has(t.table) ? Array.from(usage.get(t.table).ops).sort() : [],
      code_files: usage.has(t.table) ? Array.from(usage.get(t.table).files).sort() : [],
    });
  }

  // 3) Output JSON
  const outJson = {
    generated_at: new Date().toISOString(),
    since: sinceIso,
    project_url: SUPABASE_URL,
    inventory,
    rpc: Array.from(rpcUsage.entries())
      .map(([fn, files]) => ({ fn, files: Array.from(files).sort() }))
      .sort((a, b) => a.fn.localeCompare(b.fn)),
  };
  const jsonPath = path.join(ROOT, "docs", "supabase-usage-report.json");
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(outJson, null, 2));

  // 4) Output Markdown
  const notUsed = inventory.filter((r) => !r.used_in_code).sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  const used = inventory.filter((r) => r.used_in_code).sort((a, b) => (b.total ?? 0) - (a.total ?? 0));

  const md = [];
  md.push(`# Supabase Usage Report`);
  md.push(``);
  md.push(`Generated: ${outJson.generated_at}`);
  md.push(`Since (30d): ${sinceIso}`);
  md.push(``);
  md.push(`## Summary`);
  md.push(``);
  md.push(`- Total tables (public schema via OpenAPI): ${inventory.length}`);
  md.push(`- Tables referenced in code: ${used.length}`);
  md.push(`- Tables NOT referenced in code: ${notUsed.length}`);
  md.push(``);
  md.push(`## Not Referenced In Code`);
  md.push(``);
  md.push(`| table | rows | recent30 | ts_col | notes |`);
  md.push(`|---|---:|---:|---|---|`);
  for (const r of notUsed) {
    md.push(
      `| ${r.table} | ${r.total ?? "?"} | ${r.recent30 ?? ""} | ${r.timestamp_col ?? ""} | ${r.error ? `ERR: ${r.error}` : ""} |`
    );
  }
  md.push(``);
  md.push(`## Referenced In Code (Top 30 by row count)`);
  md.push(``);
  md.push(`| table | ops | rows | recent30 | ts_col |`);
  md.push(`|---|---|---:|---:|---|`);
  for (const r of used.slice(0, 30)) {
    md.push(
      `| ${r.table} | ${r.code_ops.join(",")} | ${r.total ?? "?"} | ${r.recent30 ?? ""} | ${r.timestamp_col ?? ""} |`
    );
  }
  md.push(``);
  md.push(`## RPC Functions Referenced In Code`);
  md.push(``);
  if (outJson.rpc.length === 0) {
    md.push(`(none)`);
  } else {
    for (const r of outJson.rpc) md.push(`- \`${r.fn}\` (${r.files.length} files)`);
  }
  md.push(``);
  md.push(`## Per-Table Code References`);
  md.push(``);
  md.push(`This section is the ground truth for \"drop requires code change\" decisions.`);
  md.push(``);
  for (const r of used.sort((a, b) => a.table.localeCompare(b.table))) {
    md.push(`### ${r.table}`);
    md.push(``);
    md.push(`- ops: ${r.code_ops.join(", ") || "(unknown)"}`);
    md.push(`- rows: ${r.total ?? "?"}`);
    md.push(`- recent30: ${r.recent30 ?? ""}`);
    md.push(`- files:`);
    for (const f of r.code_files) md.push(`  - \`${f}\``);
    md.push(``);
  }

  const mdPath = path.join(ROOT, "docs", "supabase-usage-report.md");
  fs.writeFileSync(mdPath, md.join("\n"));

  console.log(`WROTE ${rel(jsonPath)}`);
  console.log(`WROTE ${rel(mdPath)}`);
}

main().catch((e) => {
  console.error(String(e?.stack || e?.message || e));
  process.exit(1);
});

