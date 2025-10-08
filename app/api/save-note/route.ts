import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface SaveNoteBody {
  title?: unknown
  input?: unknown
  output?: unknown
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase URL or service role key is not configured on the server')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function POST(request: NextRequest) {
  try {
    const { title, input, output }: SaveNoteBody = await request.json()

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
    }
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    if (!output || typeof output !== 'string') {
      return NextResponse.json({ error: 'Invalid output' }, { status: 400 })
    }

    const parsed = JSON.parse(output)

    const summaryPoints: string[] = Array.isArray(parsed.summaryPoints) ? parsed.summaryPoints : []
    const actionItems: unknown[] = Array.isArray(parsed.actionItems)
      ? parsed.actionItems
      : Array.isArray(parsed?.developmentTeamSections?.actionItemsAndOwnership)
        ? parsed.developmentTeamSections.actionItemsAndOwnership
        : []
    const openQuestions: string[] = Array.isArray(parsed.openQuestions) ? parsed.openQuestions : []

    const supabase = getAdminClient()

    // Save meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert([{ title, raw_notes: input }])
      .select()
      .single()

    if (meetingError) {
      throw new Error(`Failed to save meeting: ${meetingError.message}`)
    }

    // Save meeting output
    const { error: outputError } = await supabase
      .from('meeting_outputs')
      .insert([
        {
          meeting_id: meeting.id,
          summary: JSON.stringify(summaryPoints),
          action_items: actionItems,
          sop_gaps: [],
          probing_questions: openQuestions,
        }
      ])

    if (outputError) {
      throw new Error(`Failed to save meeting output: ${outputError.message}`)
    }

    return NextResponse.json({ ok: true, id: meeting.id })
  } catch (error) {
    console.error('Save Note API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save note' },
      { status: 500 }
    )
  }
}


