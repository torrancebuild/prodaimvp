import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase URL or service role key is not configured on the server')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function GET() {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        id,
        title,
        raw_notes,
        created_at,
        meeting_outputs (
          summary,
          action_items,
          sop_gaps,
          probing_questions
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Get Notes API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load notes' },
      { status: 500 }
    )
  }
}


