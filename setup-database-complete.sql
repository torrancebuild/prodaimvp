-- Complete Database Setup for AI Meeting Notes Summarizer
-- This script ensures all tables, policies, and permissions are correctly configured

-- Step 1: Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS meeting_outputs CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;

-- Step 2: Create the meetings table
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  raw_notes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT NULL
);

-- Step 3: Create the meeting_outputs table
CREATE TABLE meeting_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  action_items JSONB NOT NULL DEFAULT '[]',
  sop_gaps JSONB NOT NULL DEFAULT '[]',
  probing_questions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes for efficient querying
CREATE INDEX idx_meetings_created_at ON meetings(created_at DESC);
CREATE INDEX idx_meeting_outputs_meeting_id ON meeting_outputs(meeting_id);
CREATE INDEX idx_meeting_outputs_created_at ON meeting_outputs(created_at DESC);

-- Step 5: Enable Row Level Security
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_outputs ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all operations on meetings" ON meetings;
DROP POLICY IF EXISTS "Allow all operations on meeting_outputs" ON meeting_outputs;

-- Step 7: Create permissive policies for demo/development
-- These policies allow all operations for any user (suitable for demo purposes)
CREATE POLICY "Allow all operations on meetings" ON meetings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on meeting_outputs" ON meeting_outputs
  FOR ALL USING (true) WITH CHECK (true);

-- Step 8: Insert a test record to verify everything works
INSERT INTO meetings (title, raw_notes) VALUES 
('Database Setup Test', 'This is a test meeting note to verify the database setup works correctly');

-- Step 9: Get the meeting ID for the test output
DO $$
DECLARE
    test_meeting_id UUID;
BEGIN
    SELECT id INTO test_meeting_id FROM meetings WHERE title = 'Database Setup Test';
    
    INSERT INTO meeting_outputs (meeting_id, summary, action_items, sop_gaps, probing_questions) 
    VALUES (
        test_meeting_id,
        '["Database setup completed successfully"]',
        '[{"task": "Verify database functionality", "owner": "System", "deadline": "Immediate"}]',
        '[]',
        ARRAY['Is the database working correctly?']
    );
END $$;

-- Step 10: Verify the setup
SELECT 
    'meetings' as table_name, 
    count(*) as record_count,
    'RLS enabled' as rls_status
FROM meetings
UNION ALL
SELECT 
    'meeting_outputs' as table_name, 
    count(*) as record_count,
    'RLS enabled' as rls_status
FROM meeting_outputs;

-- Step 11: Verify RLS policies are active
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename IN ('meetings', 'meeting_outputs');

-- Step 12: Clean up test data
DELETE FROM meetings WHERE title = 'Database Setup Test';

SELECT 'Database setup completed successfully! All tables, indexes, and RLS policies are configured.' as status;
