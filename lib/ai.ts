export interface SummaryOutput {
  summary: string[]
  actionItems: string[]
  sopCheck: string[]
  probingQuestions: string[]
  meetingType?: string
  confidenceScore?: number
  qualityMetrics?: {
    completeness: number
    clarity: number
    actionability: number
  }
}

export async function summarizeNotes(input: string): Promise<SummaryOutput> {
  try {
    // For now, always use demo mode to ensure API works
    // TODO: Re-enable API key checking once environment variables are properly configured
    return await generateDemoOutput(input)
  } catch (error) {
    console.error('AI processing error:', error)
    throw new Error('Failed to process notes. Please try again.')
  }
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
  const goalConfidence = hasGoals ? 'High' : 'Low'
  sopResults.push(hasGoals ? `✅ Goals covered (${goalConfidence} confidence)` : '⚠️ Goals missing - Add specific objectives')
  
  // Enhanced Decisions Detection
  const decisionPatterns = [
    /\b(?:decided|decision|agreed|concluded|resolved|chose|selected|approved|rejected)\b/i,
    /\b(?:we will|we won't|we should|we shouldn't)\b/i,
    /\b(?:consensus|unanimous|majority|voted)\b/i,
    /\b(?:final|definitive|conclusive|settled)\b/i
  ]
  const hasDecisions = decisionPatterns.some(pattern => pattern.test(text))
  const decisionConfidence = hasDecisions ? 'High' : 'Low'
  sopResults.push(hasDecisions ? `✅ Decisions documented (${decisionConfidence} confidence)` : '⚠️ Decisions missing - Document what was decided')
  
  // Enhanced Next Steps Detection
  const nextStepPatterns = [
    /\b(?:next|follow up|action|todo|deadline|due|schedule|timeline)\b/i,
    /\b(?:by|before|until|on|at)\s+(?:tomorrow|next week|end of|monday|tuesday|wednesday|thursday|friday)\b/i,
    /\b(?:assign|responsible|owner|lead|champion)\b/i,
    /\b(?:milestone|deliverable|outcome|result)\b/i
  ]
  const hasNextSteps = nextStepPatterns.some(pattern => pattern.test(text))
  const nextStepConfidence = hasNextSteps ? 'High' : 'Low'
  sopResults.push(hasNextSteps ? `✅ Next steps defined (${nextStepConfidence} confidence)` : '⚠️ Next steps missing - Define clear follow-up actions')
  
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

// Better summary parsing with structured extraction
function parseStructuredSummary(summaryText: string, originalInput: string): string[] {
  // First, try to split by common delimiters
  let summary = summaryText.split(/[.!?]\s+/).map((item: string) => 
    item.trim().replace(/[.!?]$/, '')
  ).filter((item: string) => item.length > 10)
  
  // If that doesn't work well, try bullet point patterns
  if (summary.length < 2) {
    summary = summaryText.split(/\n/).map((item: string) => 
      item.trim().replace(/^[-•*]\s*/, '')
    ).filter((item: string) => item.length > 10)
  }
  
  // If still not good, try sentence splitting
  if (summary.length < 2) {
    summary = summaryText.split(/[.!?]/).map((item: string) => 
      item.trim()
    ).filter((item: string) => item.length > 15)
  }
  
  // Fallback: use original input analysis
  if (summary.length < 2) {
    summary = extractKeyPoints(originalInput)
  }
  
  return summary.slice(0, 5) // Limit to 5 key points
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
function calculateQualityMetrics(summary: string[], actionItems: string[], sopCheck: string[], input: string) {
  // Completeness: How well the summary covers the input
  const inputLength = input.length
  const summaryLength = summary.join(' ').length
  const completeness = Math.min(summaryLength / (inputLength * 0.3), 1) // Target 30% compression
  
  // Clarity: Based on sentence structure and readability
  const avgSentenceLength = summary.reduce((acc, item) => acc + item.length, 0) / summary.length
  const clarity = Math.max(0, 1 - (avgSentenceLength - 50) / 100) // Optimal around 50 chars
  
  // Actionability: Based on action items and SOP compliance
  const actionability = (actionItems.length * 0.2) + (sopCheck.filter(item => item.includes('✅')).length * 0.1)
  
  return {
    completeness: Math.round(completeness * 100) / 100,
    clarity: Math.round(clarity * 100) / 100,
    actionability: Math.round(Math.min(actionability, 1) * 100) / 100
  }
}

// Calculate overall confidence score
function calculateConfidenceScore(qualityMetrics: { completeness: number; clarity: number; actionability: number }): number {
  const weights = { completeness: 0.4, clarity: 0.3, actionability: 0.3 }
  const score = (
    qualityMetrics.completeness * weights.completeness +
    qualityMetrics.clarity * weights.clarity +
    qualityMetrics.actionability * weights.actionability
  )
  return Math.round(score * 100) / 100
}

// Demo mode function that works without API keys
function generateDemoOutput(input: string): Promise<SummaryOutput> {
  // Simulate processing delay
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const summary = [
          'Meeting discussed key project updates',
          'Team reviewed current progress and blockers',
          'Decisions made on next phase priorities'
        ]
        
        const actionItems = extractActionItems(input)
        const sopCheck = performSOPCheck(input)
        const probingQuestions = generateProbingQuestions(input)
        
        const result = {
          summary: summary.length > 0 ? summary : ['Demo summary generated'],
          actionItems: actionItems.length > 0 ? actionItems : ['Demo action item'],
          sopCheck: sopCheck.length > 0 ? sopCheck : ['✅ Demo SOP check'],
          probingQuestions: probingQuestions.length > 0 ? probingQuestions : ['Demo probing question']
        }
        
        resolve(result)
        
      } catch (error) {
        console.error('Demo mode error:', error)
        resolve({
          summary: ['Demo summary generated'],
          actionItems: ['Demo action item'],
          sopCheck: ['✅ Demo SOP check'],
          probingQuestions: ['Demo probing question']
        })
      }
    }, 3500) // 3.5 second delay to simulate realistic API call
  })
}
