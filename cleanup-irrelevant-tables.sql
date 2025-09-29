-- Cleanup Irrelevant Database Tables
-- Run this in your Supabase SQL Editor to remove tables not relevant to ProDAI MVP

-- WARNING: This will permanently delete the following tables and all their data:
-- - document_collaborators
-- - documents  
-- - glossary
-- - meeting_embeddings
-- - presence
-- - profiles
-- - settings
-- - sop_templates

-- The following tables will be KEPT (they are essential for the app):
-- - meetings
-- - meeting_outputs

-- Drop irrelevant tables in the correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS document_collaborators CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS glossary CASCADE;
DROP TABLE IF EXISTS meeting_embeddings CASCADE;
DROP TABLE IF EXISTS presence CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS sop_templates CASCADE;

-- Verify that only the relevant tables remain
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('meetings', 'meeting_outputs') THEN '✅ KEPT (Essential)'
        ELSE '❌ SHOULD NOT EXIST'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;
