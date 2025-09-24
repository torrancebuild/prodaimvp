-- AI Meeting Notes Summarizer Database Schema
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist (to overwrite for free tier)
DROP TABLE IF EXISTS notes CASCADE;

-- Create the notes table
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on created_at for efficient ordering
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for demo purposes
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow all operations for demo" ON notes
  FOR ALL USING (true);

-- Insert a test record to verify everything works
INSERT INTO notes (title, input, output) VALUES 
('Test Note', 'This is a test meeting note', '{"summary":["Test summary"],"actionItems":["Test action"],"sopCheck":["✅ Test SOP"]}');

-- Verify the table was created successfully
SELECT * FROM notes;
