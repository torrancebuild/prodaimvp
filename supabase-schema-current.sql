-- AI Meeting Notes Summarizer Database Schema (Current)
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist (to overwrite for free tier)
DROP TABLE IF EXISTS meeting_outputs CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;

-- Create the meetings table
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  raw_notes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT NULL
);

-- Create the meeting_outputs table
CREATE TABLE meeting_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  action_items JSONB NOT NULL DEFAULT '[]',
  sop_gaps JSONB NOT NULL DEFAULT '[]',
  probing_questions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_meetings_created_at ON meetings(created_at DESC);
CREATE INDEX idx_meeting_outputs_meeting_id ON meeting_outputs(meeting_id);
CREATE INDEX idx_meeting_outputs_created_at ON meeting_outputs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_outputs ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations for demo purposes
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow all operations on meetings" ON meetings
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on meeting_outputs" ON meeting_outputs
  FOR ALL USING (true);

-- Insert a test record to verify everything works
INSERT INTO meetings (title, raw_notes) VALUES 
('Test Meeting', 'This is a test meeting note for verification');

-- Get the meeting ID for the test output
DO $$
DECLARE
    test_meeting_id UUID;
BEGIN
    SELECT id INTO test_meeting_id FROM meetings WHERE title = 'Test Meeting';
    
    INSERT INTO meeting_outputs (meeting_id, summary, action_items, sop_gaps, probing_questions) 
    VALUES (
        test_meeting_id,
        '["Test summary point"]',
        '[{"task": "Test action item", "owner": "Test Owner", "deadline": "Next week"}]',
        '[]',
        ARRAY['Test question']
    );
END $$;

-- Verify the tables were created successfully
SELECT 'meetings' as table_name, count(*) as record_count FROM meetings
UNION ALL
SELECT 'meeting_outputs' as table_name, count(*) as record_count FROM meeting_outputs;
