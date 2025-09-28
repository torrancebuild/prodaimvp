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

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY
const HUGGINGFACE_MODEL = process.env.HUGGINGFACE_SUMMARY_MODEL || 'facebook/bart-large-cnn'
const DEMO_MODE_FLAG =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  process.env.DEMO_MODE === 'true'

export async function summarizeNotes(input: string): Promise<SummaryOutput> {
  const meetingType = detectMeetingType(input)

  if (shouldUseDemoMode()) {
    return await generateDemoOutput(input, meetingType)
  }

  try {
    const summarizerInput = prepareTextForSummarizer(input)
    const summaryText = await fetchSummaryWithRetry(summarizerInput)
    const summary = parseStructuredSummary(summaryText, input)
    const actionItems = extractActionItems(input, meetingType)
    const sopCheck = performSOPCheck(input, meetingType)
    const probingQuestions = generateProbingQuestions(input, meetingType)
    const qualityMetrics = calculateQualityMetrics(summary, actionItems, sopCheck, input)
    const confidenceScore = calculateConfidenceScore(qualityMetrics)

    return {
      summary,
      actionItems,
      sopCheck,
      probingQuestions,
      meetingType,
      qualityMetrics,
      confidenceScore,
    }
  } catch (error) {
    console.error('Hugging Face summarization failed:', error)
    if (error instanceof Error) {
      throw new Error(getReadableErrorMessage(error))
    }
    throw new Error('Unexpected error while contacting the Hugging Face API.')
  }
}

function shouldUseDemoMode(): boolean {
  if (DEMO_MODE_FLAG) {
    return true
  }

  if (!HUGGINGFACE_API_KEY) {
    console.warn('HUGGINGFACE_API_KEY is not set. Falling back to demo mode output.')
    return true
  }

  return false
}

async function fetchSummaryWithRetry(prompt: string, retries = 2): Promise<string> {
  try {
    return await callHuggingFaceSummarizer(prompt)
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      const backoff = 1000 * (3 - retries)
      await sleep(backoff)
      return fetchSummaryWithRetry(prompt, retries - 1)
    }
    throw error
  }
}

async function callHuggingFaceSummarizer(prompt: string): Promise<string> {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error('Missing Hugging Face API key.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${HUGGINGFACE_MODEL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_length: 220,
          min_length: 80,
          do_sample: false,
        },
        options: {
          wait_for_model: true,
        },
      }),
      signal: controller.signal,
    })

    if (response.status === 429) {
      throw new Error('Hugging Face rate limit reached. Please try again shortly.')
    }

    if (response.status === 401) {
      throw new Error('Hugging Face authentication failed. Verify your API key.')
    }

    if (response.status === 503) {
      const data = await response.json().catch(() => ({}))
      const waitTimeSeconds = typeof data?.estimated_time === 'number' ? data.estimated_time : 2
      throw new HuggingFaceModelLoadingError(waitTimeSeconds)
    }

    if (!response.ok) {
      const message = await response.text()
      throw new Error(`Hugging Face API error (${response.status}): ${message}`)
    }

    const data = await response.json()
    const summaryText = extractSummaryText(data)

    if (!summaryText) {
      throw new Error('Hugging Face API returned an unexpected response format.')
    }

    return summaryText
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Hugging Face request timed out after 20 seconds.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function extractSummaryText(response: unknown): string | null {
  if (!response) {
    return null
  }

  if (Array.isArray(response)) {
    const firstEntry = response[0] as { summary_text?: string }
    return firstEntry?.summary_text ?? null
  }

  if (typeof response === 'object' && response !== null) {
    const record = response as { summary_text?: string; generated_text?: string; text?: string }
    return record.summary_text ?? record.generated_text ?? record.text ?? null
  }

  return null
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof HuggingFaceModelLoadingError) {
    return true
  }

  if (error instanceof Error) {
    return /timeout/i.test(error.message)
  }

  return false
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs))
}

class HuggingFaceModelLoadingError extends Error {
  waitTimeSeconds: number

  constructor(waitTimeSeconds: number) {
    super('Hugging Face model is loading.')
    this.name = 'HuggingFaceModelLoadingError'
    this.waitTimeSeconds = waitTimeSeconds
  }
}

function getReadableErrorMessage(error: Error): string {
  if (error instanceof HuggingFaceModelLoadingError) {
    const waitTime = Math.ceil(error.waitTimeSeconds)
    return `The Hugging Face model is waking up. Please retry in about ${waitTime} seconds.`
  }

  if (/authentication failed/i.test(error.message)) {
    return 'Authentication with Hugging Face failed. Verify your API key configuration.'
  }

  if (/rate limit/i.test(error.message)) {
    return 'Hugging Face rate limit exceeded. Please wait a moment and try again.'
  }

  if (/timeout/i.test(error.message)) {
    return 'The Hugging Face service timed out. Please try again.'
  }

  return error.message || 'Unable to generate a summary at this time. Please try again later.'
}

function prepareTextForSummarizer(input: string): string {
  const sanitized = input
    .replace(/\s+/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .trim()

  if (sanitized.length <= 3000) {
    return sanitized
  }

  // Prioritise beginning and action-heavy sentences to stay within model limits (~1024 tokens)
  const sentences = sanitized.split(/(?<=[.!?])\s+/)
  const importantSentences: string[] = []
  let charCount = 0

  for (const sentence of sentences) {
    if (charCount >= 3000) break
    importantSentences.push(sentence)
    charCount += sentence.length
  }

  return importantSentences.join(' ')
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
  const bulletCandidates = summaryText
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[-•*]\s*/, ''))
    .filter((line) => line.length > 0)

  const bulletPoints = bulletCandidates.filter((line) => /[A-Za-z]/.test(line)).slice(0, 5)

  if (bulletPoints.length >= 3) {
    return bulletPoints
  }

  // Try splitting by sentences if bullet extraction didn't yield enough items
  let summary = summaryText
    .split(/(?<=[.!?])\s+/)
    .map((item: string) => item.trim().replace(/[.!?]$/, ''))
    .filter((item: string) => item.length > 15)

  if (summary.length < 3) {
    summary = extractKeyPoints(originalInput)
  }

  return summary.slice(0, 5)
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
function generateDemoOutput(input: string, meetingType?: string): Promise<SummaryOutput> {
  // Simulate processing delay
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const summary = [
          'Meeting discussed key project updates',
          'Team reviewed current progress and blockers',
          'Decisions made on next phase priorities'
        ]
        
        const detectedMeetingType = meetingType ?? detectMeetingType(input)
        const actionItems = extractActionItems(input, detectedMeetingType)
        const sopCheck = performSOPCheck(input, detectedMeetingType)
        const probingQuestions = generateProbingQuestions(input, detectedMeetingType)
        const qualityMetrics = calculateQualityMetrics(summary, actionItems, sopCheck, input)
        const confidenceScore = calculateConfidenceScore(qualityMetrics)
        
        const result = {
          summary: summary.length > 0 ? summary : ['Demo summary generated'],
          actionItems: actionItems.length > 0 ? actionItems : ['Demo action item'],
          sopCheck: sopCheck.length > 0 ? sopCheck : ['✅ Demo SOP check'],
          probingQuestions: probingQuestions.length > 0 ? probingQuestions : ['Demo probing question'],
          meetingType: detectedMeetingType,
          qualityMetrics,
          confidenceScore,
        }
        
        resolve(result)
        
      } catch (error) {
        console.error('Demo mode error:', error)
        resolve({
          summary: ['Demo summary generated'],
          actionItems: ['Demo action item'],
          sopCheck: ['✅ Demo SOP check'],
          probingQuestions: ['Demo probing question'],
          meetingType: meetingType ?? 'general',
        })
      }
    }, 3500) // 3.5 second delay to simulate realistic API call
  })
}
