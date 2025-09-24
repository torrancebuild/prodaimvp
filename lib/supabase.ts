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

export interface MeetingOutput {
  id: string
  meeting_id: string
  summary: string
  action_items: any
  sop_gaps: any
  probing_questions: string[]
  created_at: string
}

export async function saveNote(title: string, input: string, output: string): Promise<void> {
  try {
    if (!supabase) {
      console.log('Supabase not configured - skipping save (demo mode)')
      return
    }

    // Parse the output to extract structured data
    const outputData = JSON.parse(output)
    
    // First, save the meeting
    const { data: meetingData, error: meetingError } = await supabase
      .from('meetings')
      .insert([
        {
          title,
          raw_notes: input,
        }
      ])
      .select()
      .single()

    if (meetingError) {
      throw new Error(`Failed to save meeting: ${meetingError.message}`)
    }

    // Then, save the meeting output
    const { error: outputError } = await supabase
      .from('meeting_outputs')
      .insert([
        {
          meeting_id: meetingData.id,
          summary: JSON.stringify(outputData.summary),
          action_items: outputData.actionItems,
          sop_gaps: outputData.sopCheck,
          probing_questions: [], // Required field - empty array for now
        }
      ])

    if (outputError) {
      throw new Error(`Failed to save meeting output: ${outputError.message}`)
    }

    // Keep only the last 10 meetings
    await keepLast10Meetings()
  } catch (error) {
    throw new Error(`Failed to save note: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function getNotes(): Promise<Note[]> {
  try {
    if (!supabase) {
      console.log('Supabase not configured - returning empty history (demo mode)')
      return []
    }

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
      throw new Error(`Database error: ${error.message}`)
    }

    // Transform the data to match our Note interface
    const notes: Note[] = (data || []).map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      input: meeting.raw_notes,
      output: JSON.stringify({
        summary: meeting.meeting_outputs?.[0]?.summary ? JSON.parse(meeting.meeting_outputs[0].summary) : [],
        actionItems: meeting.meeting_outputs?.[0]?.action_items || [],
        sopCheck: meeting.meeting_outputs?.[0]?.sop_gaps || [],
        probingQuestions: meeting.meeting_outputs?.[0]?.probing_questions || []
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
