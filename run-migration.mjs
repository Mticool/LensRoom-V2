import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://ndhykojwzazgmgvjaqgt.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaHlrb2p3emF6Z21ndmphcWd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTU4ODg3OCwiZXhwIjoyMDgxMTY0ODc4fQ.QCd7bpnvrBJD1syVvGm0HdUny-5frSQpLhmbKqc9MwQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const sql = readFileSync('./supabase/migrations/20260127_user_voices.sql', 'utf-8');

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
