export interface SummaryOutput {
  keyDiscussionPoints: string[]
  nextSteps: string[]
  sopChecks: string[]
  openQuestions: string[]
  meetingType?: string
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const CLAUDE_MODEL = process.env.CLAUDE_SUMMARY_MODEL || 'claude-3-haiku-20240307'

const DEMO_MODE_FLAG =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  process.env.DEMO_MODE === 'true'

export async function summarizeNotes(input: string): Promise<SummaryOutput> {
  const meetingType = detectMeetingType(input)

  if (shouldUseDemoMode()) {
    return await generateDemoOutput(input, meetingType)
  }

  try {
    const summaryText = await fetchClaudeSummary(input)
    const sections = parseStructuredSummary(summaryText, input)
    return {
      keyDiscussionPoints: sections.keyDiscussionPoints,
      nextSteps: sections.nextSteps,
      sopChecks: sections.sopChecks,
      openQuestions: sections.openQuestions,
      meetingType,
    }
  } catch (error) {
    console.error('Summarization failed:', error)
    if (error instanceof Error) {
      throw new Error(getReadableErrorMessage(error))
    }
    throw new Error('Unexpected error while contacting the summarization service.')
  }
}

function shouldUseDemoMode(): boolean {
  if (DEMO_MODE_FLAG) {
    return true
  }

  if (!ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY is not set. Falling back to demo mode output.')
    return true
  }

  return false
}

async function fetchClaudeSummary(input: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Missing Anthropic API key.')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      temperature: 0.2,
      system: 'You are an AI assistant that converts messy meeting notes into structured summaries. Always respond with exactly 4 sections in this format:\n\n## Key Discussion Points\n• [2-5 bullet points]\n\n## Next Steps\n• [2-5 bullet points with clear owners]\n\n## SOP Checks\n• [2-5 bullet points with ✅ for good practices, ⚠️ for gaps]\n\n## Open Questions\n• [1-3 bullet points highlighting areas needing clarification]',
      messages: [
        {
          role: 'user',
          content: `Meeting Notes:\n${input}\n\nConvert these notes into the 4-section format above.`
        }
      ]
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    try {
      const parsed = JSON.parse(errorText)
      const parsedMessage = parsed?.error?.message as string | undefined
      throw new Error(parsedMessage || `Claude API error (${response.status})`)
    } catch {
      throw new Error(errorText || `Claude API error (${response.status})`)
    }
  }

  const data = await response.json()
  const content = data?.content?.[0]?.text

  if (!content || typeof content !== 'string') {
    throw new Error('Claude API returned an unexpected response format.')
  }

  return content
}

function getReadableErrorMessage(error: Error): string {
  if (/credit balance/i.test(error.message)) {
    return 'Anthropic account balance is low. Please add credits and try again.'
  }

  if (/api key/i.test(error.message)) {
    return 'Anthropic API key is invalid or missing. Verify your credentials.'
  }

  return error.message || 'Unable to generate a summary at this time. Please try again later.'
}

function extractActionItems(text: string, meetingType: string = 'general'): string[] {
  const actionItems: string[] = []
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  for (const line of lines) {
    // Look for patterns like "John to do X", "Amy will", "Need to", etc.
    const actionPatterns = [
      /^(.+?)\s+(?:to|will|should|needs? to|has to)\s+(.+)$/i,
      /^(.+?)\s+→\s+(.+)$/,
      /^(.+?)\s+assigned to\s+(.+)$/i,
      /^action:\s*(.+)$/i,
      /^todo:\s*(.+)$/i
    ]
    
    for (const pattern of actionPatterns) {
      const match = line.match(pattern)
      if (match) {
        // Check if we have both owner and task (patterns with 2 groups)
        if (match[2]) {
          const owner = match[1].trim()
          const task = match[2].trim()
          if (owner && task) {
            actionItems.push(`${owner} → ${task}`)
          }
        } else {
          // Single group patterns (like "action: X" or "todo: X")
          const task = match[1].trim()
          if (task) {
            actionItems.push(task)
          }
        }
      }
    }
    
    // Look for simple action items without clear owner
    if (line.toLowerCase().includes('todo') || 
        line.toLowerCase().includes('action') ||
        line.toLowerCase().includes('need to') ||
        line.toLowerCase().includes('should')) {
      if (!actionItems.some(item => item.includes(line))) {
        actionItems.push(line)
      }
    }
  }
  
  return actionItems.slice(0, 5) // Limit to 5 action items
}

function performSOPCheck(text: string, meetingType: string = 'general'): string[] {
  const sopResults: string[] = []
  const lowerText = text.toLowerCase()
  
  // Enhanced Goals Detection
  const goalPatterns = [
    /\b(?:goal|objective|purpose|aim|target|mission|vision)\b/i,
    /\b(?:we need to|we want to|we should|we must)\b/i,
    /\b(?:achieve|accomplish|deliver|complete|finish)\b/i
  ]
  const hasGoals = goalPatterns.some(pattern => pattern.test(text))
  sopResults.push(hasGoals ? '✅ Goals covered' : '⚠️ Goals missing - Add specific objectives')
  
  // Enhanced Decisions Detection
  const decisionPatterns = [
    /\b(?:decided|decision|agreed|concluded|resolved|chose|selected|approved|rejected)\b/i,
    /\b(?:we will|we won't|we should|we shouldn't)\b/i,
    /\b(?:consensus|unanimous|majority|voted)\b/i,
    /\b(?:final|definitive|conclusive|settled)\b/i
  ]
  const hasDecisions = decisionPatterns.some(pattern => pattern.test(text))
  sopResults.push(hasDecisions ? '✅ Decisions documented' : '⚠️ Decisions missing - Document what was decided')
  
  // Enhanced Next Steps Detection
  const nextStepPatterns = [
    /\b(?:next|follow up|action|todo|deadline|due|schedule|timeline)\b/i,
    /\b(?:by|before|until|on|at)\s+(?:tomorrow|next week|end of|monday|tuesday|wednesday|thursday|friday)\b/i,
    /\b(?:assign|responsible|owner|lead|champion)\b/i,
    /\b(?:milestone|deliverable|outcome|result)\b/i
  ]
  const hasNextSteps = nextStepPatterns.some(pattern => pattern.test(text))
  sopResults.push(hasNextSteps ? '✅ Next steps defined' : '⚠️ Next steps missing - Define clear follow-up actions')
  
  // Additional SOP Checks
  const hasParticipants = /\b(?:attendees|participants|team|members|present|absent)\b/i.test(text)
  sopResults.push(hasParticipants ? '✅ Participants identified' : '⚠️ Participants missing - List who attended')
  
  const hasContext = /\b(?:background|context|situation|problem|issue|challenge)\b/i.test(text)
  sopResults.push(hasContext ? '✅ Context provided' : '⚠️ Context missing - Add background information')
  
  const hasOutcomes = /\b(?:outcome|result|conclusion|summary|key takeaway|learned)\b/i.test(text)
  sopResults.push(hasOutcomes ? '✅ Outcomes captured' : '⚠️ Outcomes missing - Document what was achieved')
  
  return sopResults
}

function generateProbingQuestions(text: string, meetingType: string = 'general'): string[] {
  const questions: string[] = []
  const lowerText = text.toLowerCase()
  
  // Generate questions based on missing elements
  if (!lowerText.includes('goal') && !lowerText.includes('objective')) {
    questions.push('What were the specific goals for this meeting?')
  }
  
  if (!lowerText.includes('deadline') && !lowerText.includes('due date')) {
    questions.push('What are the deadlines for the action items?')
  }
  
  if (!lowerText.includes('budget') && !lowerText.includes('cost')) {
    questions.push('Are there any budget considerations for these decisions?')
  }
  
  if (!lowerText.includes('risk') && !lowerText.includes('concern')) {
    questions.push('What are the potential risks or concerns?')
  }
  
  if (!lowerText.includes('stakeholder') && !lowerText.includes('team')) {
    questions.push('Who are the key stakeholders involved?')
  }
  
  // If no specific gaps found, add generic probing questions
  if (questions.length === 0) {
    questions.push('What are the next steps after this meeting?')
    questions.push('Who will be responsible for following up?')
  }
  
  return questions.slice(0, 3) // Limit to 3 questions
}

// Detect meeting type for context-aware processing
function detectMeetingType(input: string): string {
  const lowerText = input.toLowerCase()
  
  // Standup/Status Meeting
  if (lowerText.includes('standup') || lowerText.includes('status') || 
      lowerText.includes('yesterday') || lowerText.includes('today') || 
      lowerText.includes('blocked') || lowerText.includes('impediment')) {
    return 'standup'
  }
  
  // Planning Meeting
  if (lowerText.includes('planning') || lowerText.includes('sprint') || 
      lowerText.includes('backlog') || lowerText.includes('epic') || 
      lowerText.includes('story') || lowerText.includes('task')) {
    return 'planning'
  }
  
  // Retrospective
  if (lowerText.includes('retro') || lowerText.includes('retrospective') || 
      lowerText.includes('went well') || lowerText.includes('improve') || 
      lowerText.includes('start doing') || lowerText.includes('stop doing')) {
    return 'retrospective'
  }
  
  // Decision Meeting
  if (lowerText.includes('decision') || lowerText.includes('decide') || 
      lowerText.includes('approve') || lowerText.includes('reject') || 
      lowerText.includes('vote') || lowerText.includes('consensus')) {
    return 'decision'
  }
  
  // Review Meeting
  if (lowerText.includes('review') || lowerText.includes('demo') || 
      lowerText.includes('presentation') || lowerText.includes('showcase')) {
    return 'review'
  }
  
  // Problem Solving
  if (lowerText.includes('problem') || lowerText.includes('issue') || 
      lowerText.includes('bug') || lowerText.includes('fix') || 
      lowerText.includes('troubleshoot') || lowerText.includes('debug')) {
    return 'problem-solving'
  }
  
  return 'general'
}

// Enhanced structured prompting for better AI outputs
function createStructuredPrompt(input: string, meetingType: string): string {
  const contextPrompts = {
    'standup': 'Focus on: What was accomplished, what\'s planned, blockers, and team coordination.',
    'planning': 'Focus on: Requirements, user stories, acceptance criteria, estimates, and sprint goals.',
    'retrospective': 'Focus on: What went well, what didn\'t, lessons learned, and improvement actions.',
    'decision': 'Focus on: Options considered, pros/cons, final decision, rationale, and next steps.',
    'review': 'Focus on: Deliverables shown, feedback received, quality assessment, and improvements.',
    'problem-solving': 'Focus on: Problem description, root cause analysis, solutions considered, and resolution.',
    'general': 'Focus on: Key decisions, important discussions, outcomes, and next steps.'
  }
  
  return `Meeting Notes Analysis (${meetingType.toUpperCase()} Meeting):

Context: Analyze the following meeting notes and extract key information.
${contextPrompts[meetingType as keyof typeof contextPrompts]}

Meeting Notes:
${input}

Please provide a structured summary focusing on:
1. Key decisions made
2. Important discussions and outcomes
3. Critical information shared
4. Main topics covered

Format your response as clear, actionable bullet points.`
}

// Parse structured summary with 4 sections
function parseStructuredSummary(summaryText: string, originalInput: string): {
  keyDiscussionPoints: string[]
  nextSteps: string[]
  sopChecks: string[]
  openQuestions: string[]
} {
  const sections = {
    keyDiscussionPoints: [] as string[],
    nextSteps: [] as string[],
    sopChecks: [] as string[],
    openQuestions: [] as string[]
  }

  const lines = summaryText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  let currentSection = ''

  for (const line of lines) {
    // Detect section headers
    if (line.match(/^#+\s*Key Discussion Points/i)) {
      currentSection = 'keyDiscussionPoints'
      continue
    } else if (line.match(/^#+\s*Next Steps/i)) {
      currentSection = 'nextSteps'
      continue
    } else if (line.match(/^#+\s*SOP Checks/i)) {
      currentSection = 'sopChecks'
      continue
    } else if (line.match(/^#+\s*Open Questions/i)) {
      currentSection = 'openQuestions'
      continue
    }

    // Extract bullet points
    if (currentSection && line.match(/^[-•*]\s+/)) {
      const bullet = line.replace(/^[-•*]\s+/, '').trim()
      if (bullet.length > 0) {
        sections[currentSection as keyof typeof sections].push(bullet)
      }
    }
  }

  // Validate and limit sections to PRD requirements (2-5 bullets each, except Open Questions 1-3)
  sections.keyDiscussionPoints = validateSection(sections.keyDiscussionPoints, 2, 5, 'Key Discussion Points')
  sections.nextSteps = validateSection(sections.nextSteps, 2, 5, 'Next Steps')
  sections.sopChecks = validateSection(sections.sopChecks, 2, 5, 'SOP Checks')
  sections.openQuestions = validateSection(sections.openQuestions, 1, 3, 'Open Questions')

  // Fallback if sections are empty
  if (sections.keyDiscussionPoints.length === 0) {
    sections.keyDiscussionPoints = extractKeyPoints(originalInput).slice(0, 5)
  }
  if (sections.nextSteps.length === 0) {
    sections.nextSteps = extractActionItems(originalInput).slice(0, 5)
  }
  if (sections.sopChecks.length === 0) {
    sections.sopChecks = performSOPCheck(originalInput).slice(0, 5)
  }
  if (sections.openQuestions.length === 0) {
    sections.openQuestions = generateProbingQuestions(originalInput).slice(0, 3)
  }

  return sections
}

// Validate section has correct number of bullets per PRD
function validateSection(items: string[], min: number, max: number, sectionName: string): string[] {
  if (items.length === 0) {
    return [`No ${sectionName.toLowerCase()} noted`]
  }
  
  if (items.length < min) {
    // Pad with generic items if too few
    const padded = [...items]
    while (padded.length < min) {
      padded.push(`Additional ${sectionName.toLowerCase()} item`)
    }
    return padded.slice(0, max)
  }
  
  return items.slice(0, max)
}

// Extract key points from original input as fallback
function extractKeyPoints(text: string): string[] {
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 20)
  const keyPoints: string[] = []
  
  // Look for sentences with important keywords
  const importantKeywords = ['decided', 'agreed', 'discussed', 'reviewed', 'planned', 'scheduled', 'completed', 'blocked', 'issue', 'problem', 'solution', 'next', 'action', 'deadline', 'goal', 'objective']
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase()
    if (importantKeywords.some(keyword => lowerSentence.includes(keyword))) {
      keyPoints.push(sentence.trim())
    }
  }
  
  return keyPoints.slice(0, 5)
}

// Calculate quality metrics for the summary
// Demo mode function that works without API keys
function generateDemoOutput(input: string, meetingType?: string): Promise<SummaryOutput> {
  // Simulate processing delay
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const keyDiscussionPoints = [
          'Meeting discussed key project updates',
          'Team reviewed current progress and blockers',
          'Decisions made on next phase priorities'
        ]
        
        const detectedMeetingType = meetingType ?? detectMeetingType(input)
        const nextSteps = extractActionItems(input, detectedMeetingType)
        const sopChecks = performSOPCheck(input, detectedMeetingType)
        const openQuestions = generateProbingQuestions(input, detectedMeetingType)
        const result = {
          keyDiscussionPoints: keyDiscussionPoints.length > 0 ? keyDiscussionPoints : ['Demo key discussion point'],
          nextSteps: nextSteps.length > 0 ? nextSteps : ['Demo next step'],
          sopChecks: sopChecks.length > 0 ? sopChecks : ['✅ Demo SOP check'],
          openQuestions: openQuestions.length > 0 ? openQuestions : ['Demo open question'],
          meetingType: detectedMeetingType,
        }
        
        resolve(result)
        
      } catch (error) {
        console.error('Demo mode error:', error)
        resolve({
          keyDiscussionPoints: ['Demo key discussion point'],
          nextSteps: ['Demo next step'],
          sopChecks: ['✅ Demo SOP check'],
          openQuestions: ['Demo open question'],
          meetingType: meetingType ?? 'general',
        })
      }
    }, 3500) // 3.5 second delay to simulate realistic API call
  })
}
