import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... node run-migration.mjs ./supabase/migrations/<file>.sql
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase config. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const migrationPath = process.argv[2] || './supabase/migrations/20260127_user_voices.sql';
const sql = readFileSync(migrationPath, 'utf-8');

// Split by semicolon and execute each statement
const statements = sql.split(';').filter(s => s.trim());

for (const statement of statements) {
  if (statement.trim()) {
    console.log('Executing:', statement.substring(0, 80) + '...');
    const { data, error } = await supabase.rpc('exec', { query: statement });
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Success!');
    }
  }
}

console.log('✅ Migration complete!');
process.exit(0);
