import { NextRequest, NextResponse } from 'next/server'
import { summarizeNotes } from '@/lib/ai'

type MeetingType = 'sprint-review' | 'product-decision'

export async function POST(request: NextRequest) {
  try {
    const { input, meetingType }: { input: unknown; meetingType?: MeetingType } = await request.json()
    
    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input. Please provide meeting notes as a string.' },
        { status: 400 }
      )
    }

    if (input.length < 10) {
      return NextResponse.json(
        { error: 'Meeting notes must be at least 10 characters long.' },
        { status: 400 }
      )
    }

    if (input.length > 1000) {
      return NextResponse.json(
        { error: 'Meeting notes cannot exceed 1000 characters.' },
        { status: 400 }
      )
    }

    const result = await summarizeNotes(input, meetingType ?? 'sprint-review')
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred while processing your notes' },
      { status: 500 }
    )
  }
}
