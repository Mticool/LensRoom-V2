-- Enable Realtime for generations table
-- This allows browser clients to receive instant updates when generations change

-- Enable Realtime replication for generations table
ALTER PUBLICATION supabase_realtime ADD TABLE generations;

-- Verify RLS policies allow realtime (users can see their own generations)
-- Existing policy should already handle this, but confirming:
-- CREATE POLICY IF NOT EXISTS "Users can view own generations"
-- ON generations FOR SELECT
-- USING (auth.uid() = user_id);

-- Note: Realtime requires:
-- 1. Table added to supabase_realtime publication (done above)
-- 2. RLS policies that allow SELECT for authenticated users (already exists)
-- 3. Client must use authenticated connection (anon key + session)

-- Test query to verify policy exists:
-- SELECT * FROM pg_policies WHERE tablename = 'generations' AND cmd = 'SELECT';
