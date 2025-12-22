/* eslint-disable no-console */

// CI-friendly audit for import-time env reads.
// Flags suspicious module-scope patterns like:
//   const X = process.env.Y
//   const { X } = process.env
// in src/lib/** and src/app/api/**
//
// Notes:
// - Reads inside functions/handlers are allowed.
// - This is a heuristic (fast and dependency-free), not a full TS parser.

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const TARGET_DIRS = [
  path.join(ROOT_DIR, 'src', 'lib'),
  path.join(ROOT_DIR, 'src', 'app', 'api'),
];

const EXT_OK = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

// Common module-scope patterns that cause import-time evaluation.
const LINE_PATTERNS = [
  /^\s*(export\s+)?(const|let|var)\s+[^=\n]+\s*=\s*process\.env\.[A-Z0-9_]+\b/, // const X = process.env.Y
  /^\s*(export\s+)?(const|let|var)\s+\{[^}]+\}\s*=\s*process\.env\b/, // const { X } = process.env
  /^\s*(export\s+)?(const|let|var)\s+\{[^}]+\}\s*=\s*process\.env\s*\[\s*[^\]]+\s*\]/, // const { X } = process.env[...]
];

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    // Skip dot-dirs quickly
    if (ent.name.startsWith('.')) continue;

    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      // Skip common heavy dirs
      if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === 'dist' || ent.name === 'build') continue;
      walk(full, out);
      continue;
    }
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name);
    if (!EXT_OK.has(ext)) continue;
    out.push(full);
  }
}

function updateBraceDepth(line, depth) {
  // Very small heuristic: ignore braces in obvious string literals.
  // We only need a coarse “are we in a block?” signal.
  const stripped = line
    .replace(/\/\/.*$/g, '') // remove // comments
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''")
    .replace(/\"[^\"\\]*(?:\\.[^\"\\]*)*\"/g, '""')
    .replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, '``');

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth = Math.max(0, depth - 1);
  }
  return depth;
}

function auditFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);

  let depth = 0;
  const hits = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Depth==0 is our “module scope” approximation.
    if (depth === 0) {
      for (const re of LINE_PATTERNS) {
        if (re.test(line)) {
          hits.push({ line: i + 1, text: line.trim() });
          break;
        }
      }
    }

    depth = updateBraceDepth(line, depth);
  }

  return hits;
}

function main() {
  const files = [];
  for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) continue;
    walk(dir, files);
  }

  /** @type {Array<{file:string, line:number, text:string}>} */
  const findings = [];

  for (const f of files) {
    const hits = auditFile(f);
    for (const h of hits) findings.push({ file: f, ...h });
  }

  if (findings.length) {
    console.error('Suspicious module-scope process.env usage found:');
    for (const f of findings) {
      const rel = path.relative(ROOT_DIR, f.file);
      console.error(`${rel}:${f.line}: ${f.text}`);
    }
    console.error('');
    console.error('Fix: move env reads into lazy getters using src/lib/env.ts (env.required/env.optional).');
    process.exit(1);
  }

  console.log('OK: no suspicious module-scope process.env reads in src/lib/** or src/app/api/**');
}

main();

