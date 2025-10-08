-- Fix RLS Policies for AI Meeting Notes Summarizer
-- Run this in your Supabase SQL Editor to fix the database permissions

-- First, let's check if the tables exist and their current RLS status
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    hasrls as has_rls
FROM pg_tables 
WHERE tablename IN ('meetings', 'meeting_outputs');

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow all operations on meetings" ON meetings;
DROP POLICY IF EXISTS "Allow all operations on meeting_outputs" ON meeting_outputs;

-- Ensure RLS is enabled
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_outputs ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for demo/development
-- These allow all operations for any user (suitable for demo purposes)
CREATE POLICY "Allow all operations on meetings" ON meetings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on meeting_outputs" ON meeting_outputs
  FOR ALL USING (true) WITH CHECK (true);

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('meetings', 'meeting_outputs');

-- Test insert to verify everything works
INSERT INTO meetings (title, raw_notes) VALUES 
('RLS Test Meeting', 'Testing row level security policies') 
ON CONFLICT DO NOTHING;

-- Clean up test record
DELETE FROM meetings WHERE title = 'RLS Test Meeting';

SELECT 'RLS policies have been fixed successfully!' as status;
