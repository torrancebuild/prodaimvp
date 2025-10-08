import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create Supabase client only if environment variables are available
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

export interface Note {
  id: string
  title: string
  input: string
  output: string
  created_at: string
}

export interface Meeting {
  id: string
  title: string
  raw_notes: string
  created_at: string
  user_id?: string
}

export type MeetingActionItems = Array<Record<string, unknown>>
export type MeetingSOPGaps = Array<Record<string, unknown>>

export interface MeetingOutput {
  id: string
  meeting_id: string
  summary: string
  action_items: MeetingActionItems
  sop_gaps: MeetingSOPGaps
  probing_questions: string[]
  created_at: string
}

export async function saveNote(title: string, input: string, output: string): Promise<void> {
  try {
    // Always go through server API to avoid client-side RLS issues
    const response = await fetch('/api/save-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, input, output })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err?.error || 'Failed to save note')
    }

    // Keep only the last 10 meetings
    await keepLast10Meetings()
  } catch (error) {
    throw new Error(`Failed to save note: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function getNotes(): Promise<Note[]> {
  try {
    const response = await fetch('/api/get-notes')
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err?.error || 'Failed to load notes')
    }
    const payload = await response.json()
    const data = (payload?.data || []) as MeetingWithOutputs[]

    const notes: Note[] = data.map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      input: meeting.raw_notes,
      output: JSON.stringify({
        summaryPoints: meeting.meeting_outputs?.[0]?.summary ? JSON.parse(meeting.meeting_outputs[0].summary) : [],
        actionItemsOrNextSteps: meeting.meeting_outputs?.[0]?.action_items || [],
        openQuestions: meeting.meeting_outputs?.[0]?.probing_questions || [],
        meetingType: 'sprint-review',
        riskAssessment: [],
        followUpReminders: []
      }),
      created_at: meeting.created_at
    }))

    return notes
  } catch (error) {
    throw new Error(`Failed to load notes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function keepLast10Meetings(): Promise<void> {
  try {
    if (!supabase) {
      console.log('Supabase not configured - skipping cleanup')
      return
    }
    
    // Get all meetings ordered by creation date
    const { data, error } = await supabase
      .from('meetings')
      .select('id, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching meetings for cleanup:', error)
      return
    }

    // If we have more than 10 meetings, delete the oldest ones
    if (data && data.length > 10) {
      const meetingsToDelete = data.slice(10)
      const idsToDelete = meetingsToDelete.map(meeting => meeting.id)

      // Delete meeting outputs first (foreign key constraint)
      const { error: deleteOutputsError } = await supabase
        .from('meeting_outputs')
        .delete()
        .in('meeting_id', idsToDelete)

      if (deleteOutputsError) {
        console.error('Error deleting old meeting outputs:', deleteOutputsError)
      }

      // Then delete the meetings
      const { error: deleteMeetingsError } = await supabase
        .from('meetings')
        .delete()
        .in('id', idsToDelete)

      if (deleteMeetingsError) {
        console.error('Error deleting old meetings:', deleteMeetingsError)
      }
    }
  } catch (error) {
    console.error('Error in keepLast10Meetings:', error)
  }
}

// Types for API payloads
interface MeetingOutputRow {
  summary?: string
  action_items?: unknown[]
  sop_gaps?: unknown[]
  probing_questions?: string[]
}

interface MeetingWithOutputs {
  id: string
  title: string
  raw_notes: string
  created_at: string
  meeting_outputs?: MeetingOutputRow[]
}
