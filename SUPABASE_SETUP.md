# Supabase Setup Guide

## 🚀 Quick Setup Steps

### 1. Create New Project in Supabase
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Choose your organization
4. Fill in project details:
   - **Name**: `ai-meeting-notes-summarizer`
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you
5. Click **"Create new project"**
6. Wait for project to be ready (2-3 minutes)

### 2. Get Your API Keys
1. In your project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`)

### 3. Run Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click **"Run"**
5. You should see a success message and a test record

### 4. Configure Environment Variables
1. Copy `env.template` to `.env.local`:
   ```bash
   cp env.template .env.local
   ```

2. Edit `.env.local` and fill in your Supabase values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

### 5. Test the Connection
1. Restart your development server:
   ```bash
   npm run dev
   ```
2. Go to http://localhost:3000
3. Try the "Load History" button - it should work now!

## 🆓 Free Tier Limits

Your Supabase free tier includes:
- **Database**: 500MB storage
- **API Requests**: 50,000 per month
- **Auth**: 50,000 users
- **File Storage**: 1GB

For the meeting notes app, this is more than enough!

## 🔧 Troubleshooting

### Common Issues:

**"Invalid API key"**
- Double-check your API keys in `.env.local`
- Make sure there are no extra spaces

**"Failed to load notes"**
- Verify the database schema was run successfully
- Check the SQL Editor for any errors

**"Permission denied"**
- Make sure RLS policies are set up correctly
- Verify the service role key is being used

### Reset Everything:
If you need to start over:
1. Delete the project in Supabase
2. Create a new project
3. Run the schema again
4. Update your `.env.local`

## 📊 Database Structure

The `notes` table stores:
- `id`: Unique identifier (UUID)
- `title`: Short title (first 50 chars of input)
- `input`: Original meeting notes
- `output`: JSON string of AI results
- `created_at`: Timestamp

The app automatically keeps only the last 10 notes to stay within free tier limits.
