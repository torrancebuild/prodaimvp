export type MeetingType = 'daily-standup' | 'weekly-report' | 'risk-assessment' | 'general'

export interface SummaryOutput {
  keyDiscussionPoints: string[]
  nextSteps: ActionItem[]
  sopChecks: SOPCheck[]
  openQuestions: string[]
  meetingType?: string
  riskAssessment?: RiskItem[]
  followUpReminders?: FollowUpReminder[]
  meetingQuality?: MeetingQualityMetrics
}

export interface ActionItem {
  task: string
  owner: string
  deadline?: string
  priority: 'high' | 'medium' | 'low'
  dependencies?: string[]
  successCriteria?: string
}

export interface SOPCheck {
  category: string
  status: 'compliant' | 'partial' | 'missing'
  details: string
  recommendation?: string
  severity: 'critical' | 'important' | 'minor'
}

export interface RiskItem {
  risk: string
  impact: 'high' | 'medium' | 'low'
  probability: 'high' | 'medium' | 'low'
  mitigation: string
  owner?: string
}

export interface FollowUpReminder {
  action: string
  dueDate: string
  owner: string
  type: 'follow-up' | 'escalation' | 'review' | 'decision'
}

export interface MeetingQualityMetrics {
  overallScore: number // 1-10
  areas: {
    preparation: number
    participation: number
    decisionMaking: number
    actionClarity: number
    followThrough: number
  }
  recommendations: string[]
}

import { jsonrepair } from 'jsonrepair'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const CLAUDE_MODEL = process.env.CLAUDE_SUMMARY_MODEL || 'claude-3-haiku-20240307'

const DEMO_MODE_FLAG =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
  process.env.DEMO_MODE === 'true'

export async function summarizeNotes(input: string, selectedMeetingType: MeetingType = 'general'): Promise<SummaryOutput> {
  const meetingType = selectedMeetingType === 'general' ? detectMeetingType(input) : selectedMeetingType

  if (shouldUseDemoMode()) {
    return await generateDemoOutput(input, meetingType)
  }

  try {
    const summaryText = await fetchClaudeSummary(input, meetingType)
    const parsedData = parseStructuredSummary(summaryText, input)
    return {
      keyDiscussionPoints: parsedData.keyDiscussionPoints,
      nextSteps: parsedData.nextSteps,
      sopChecks: parsedData.sopChecks,
      openQuestions: parsedData.openQuestions,
      meetingType,
      riskAssessment: parsedData.riskAssessment,
      followUpReminders: parsedData.followUpReminders,
      meetingQuality: parsedData.meetingQuality,
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

function getMeetingSpecificPrompt(meetingType: MeetingType): string {
  const prompts: Record<MeetingType, string> = {
    'daily-standup': `You are analyzing a DAILY STANDUP meeting. Focus on:
- Blockers and dependencies requiring immediate attention
- Team coordination, handoffs, and sprint commitments
- Fast decisions needed to keep the team unblocked within the next 24 hours
- Clear owners, deadlines, and escalation paths

Generate a concise plan of action for the next working day.`,
    'weekly-report': `You are analyzing a WEEKLY REPORT meeting. Focus on:
- Progress against goals, metrics, and commitments
- Key wins, setbacks, and learnings the wider org should know
- Trends over the past two weeks and predicted trajectory
- Stakeholder communication or approvals required

Generate an executive-ready report highlighting priorities for the upcoming week.`,
    'risk-assessment': `You are analyzing a RISK ASSESSMENT meeting. Focus on:
- Specific risks raised (technical, operational, financial, compliance)
- Probability and impact ratings with rationale
- Concrete mitigation steps, fallback plans, and monitoring signals
- Escalation triggers and responsible owners

Generate a risk matrix that leadership can act on immediately.`,
    'general': `You are analyzing a GENERAL MEETING. Focus on:
- Key decisions, agreements, and rationale
- Action items with owners, deadlines, and success measures
- Process/SOP gaps and recommended improvements
- Open questions requiring follow-up or clarification
- Meeting quality and follow-through readiness

Generate comprehensive meeting intelligence.`
  }

  return prompts[meetingType] ?? prompts.general
}

async function fetchClaudeSummary(input: string, meetingType: MeetingType): Promise<string> {
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
      max_tokens: 800,
      temperature: 0.1,
      system: `${getMeetingSpecificPrompt(meetingType)}

ALWAYS respond with this EXACT JSON format (valid JSON only):
{
  "keyDiscussionPoints": ["specific decision made", "important topic discussed", "critical update shared"],
  "nextSteps": [
    {
      "task": "specific actionable task",
      "owner": "person responsible",
      "deadline": "specific date or timeframe",
      "priority": "high|medium|low",
      "successCriteria": "how to measure completion"
    }
  ],
  "sopChecks": [
    {
      "category": "Meeting Preparation|Decision Documentation|Action Assignment|Follow-up Planning|Stakeholder Communication",
      "status": "compliant|partial|missing",
      "details": "specific assessment",
      "recommendation": "actionable improvement",
      "severity": "critical|important|minor"
    }
  ],
  "openQuestions": ["specific question that needs answering"],
  "riskAssessment": [
    {
      "risk": "specific risk identified",
      "impact": "high|medium|low",
      "probability": "high|medium|low",
      "mitigation": "specific mitigation strategy",
      "owner": "person responsible for mitigation"
    }
  ],
  "followUpReminders": [
    {
      "action": "specific follow-up action",
      "dueDate": "specific date",
      "owner": "person responsible",
      "type": "follow-up|escalation|review|decision"
    }
  ],
  "meetingQuality": {
    "overallScore": 8,
    "areas": {
      "preparation": 7,
      "participation": 8,
      "decisionMaking": 9,
      "actionClarity": 6,
      "followThrough": 7
    },
    "recommendations": ["specific improvement recommendations for the next meeting"]
  }
}

MANDATORY:
- Use only double quotes for JSON keys/values and escape characters correctly.
- Tailor every section to the ${meetingType.toUpperCase()} meeting context.
- If a value is unknown, use "TBD" instead of hallucinating.
- If requested number of items is not available, provide as many as possible and explain why.`,
      messages: [
        {
          role: 'user',
          content: `${meetingType.toUpperCase()} Meeting Notes:\n${input}\n\nAnalyze these notes and provide ${meetingType} meeting intelligence. Clearly state what additional information is required if anything is missing.`
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

function extractActionItems(text: string): string[] {
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

function performSOPCheck(text: string): string[] {
  const sopResults: string[] = []
  
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

function generateProbingQuestions(text: string): string[] {
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
function detectMeetingType(input: string): MeetingType {
  const lowerText = input.toLowerCase()
  
  if (lowerText.includes('standup') || lowerText.includes('status update') ||
      lowerText.includes('yesterday') || lowerText.includes('today') ||
      lowerText.includes('blocker') || lowerText.includes('dependency')) {
    return 'daily-standup'
  }

  if (lowerText.includes('risk') || lowerText.includes('mitigation') ||
      lowerText.includes('impact') || lowerText.includes('probability') ||
      lowerText.includes('contingency') || lowerText.includes('escalation')) {
    return 'risk-assessment'
  }

  if (lowerText.includes('weekly') || lowerText.includes('report') ||
      lowerText.includes('metrics') || lowerText.includes('kpi') ||
      lowerText.includes('progress') || lowerText.includes('update')) {
    return 'weekly-report'
  }

  return 'general'
}

// Enhanced structured prompting for better AI outputs
// Parse structured summary with enhanced JSON structure
function parseStructuredSummary(summaryText: string, originalInput: string): {
  keyDiscussionPoints: string[]
  nextSteps: ActionItem[]
  sopChecks: SOPCheck[]
  openQuestions: string[]
  riskAssessment?: RiskItem[]
  followUpReminders?: FollowUpReminder[]
  meetingQuality?: MeetingQualityMetrics
} {
  try {
    const jsonMatch = summaryText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const repaired = jsonrepair(jsonMatch[0])
      const parsed = JSON.parse(repaired)
      return {
        keyDiscussionPoints: parsed.keyDiscussionPoints || [],
        nextSteps: parsed.nextSteps || [],
        sopChecks: parsed.sopChecks || [],
        openQuestions: parsed.openQuestions || [],
        riskAssessment: parsed.riskAssessment || [],
        followUpReminders: parsed.followUpReminders || [],
        meetingQuality: parsed.meetingQuality || undefined,
      }
    }
  } catch (error) {
    console.warn('Failed to parse JSON, falling back to text parsing:', error)
  }

  // Fallback to legacy text parsing
  const sections = {
    keyDiscussionPoints: [] as string[],
    nextSteps: [] as ActionItem[],
    sopChecks: [] as SOPCheck[],
    openQuestions: [] as string[],
    riskAssessment: [] as RiskItem[],
    followUpReminders: [] as FollowUpReminder[],
    meetingQuality: undefined as MeetingQualityMetrics | undefined
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

    // Extract bullet points and convert to structured format
    if (currentSection && line.match(/^[-•*]\s+/)) {
      const bullet = line.replace(/^[-•*]\s+/, '').trim()
      if (bullet.length > 0) {
        if (currentSection === 'nextSteps') {
          sections.nextSteps.push({
            task: bullet,
            owner: 'TBD',
            priority: 'medium',
            successCriteria: 'Completion of task'
          })
        } else if (currentSection === 'sopChecks') {
          sections.sopChecks.push({
            category: 'General',
            status: bullet.includes('✅') ? 'compliant' : bullet.includes('⚠️') ? 'partial' : 'missing',
            details: bullet,
            severity: bullet.includes('⚠️') ? 'important' : 'minor'
          })
        } else {
          (sections[currentSection as keyof typeof sections] as string[]).push(bullet)
        }
      }
    }
  }

  // Fallback if sections are empty
  if (sections.keyDiscussionPoints.length === 0) {
    sections.keyDiscussionPoints = extractKeyPoints(originalInput).slice(0, 5)
  }
  if (sections.nextSteps.length === 0) {
    const legacyActions = extractActionItems(originalInput)
    sections.nextSteps = legacyActions.map(action => ({
      task: action,
      owner: 'TBD',
      priority: 'medium' as const,
      successCriteria: 'Completion of task'
    })).slice(0, 5)
  }
  if (sections.sopChecks.length === 0) {
    const legacySOPs = performSOPCheck(originalInput)
    sections.sopChecks = legacySOPs.map(sop => ({
      category: 'General',
      status: (sop.includes('✅') ? 'compliant' : sop.includes('⚠️') ? 'partial' : 'missing') as 'compliant' | 'partial' | 'missing',
      details: sop,
      severity: (sop.includes('⚠️') ? 'important' : 'minor') as 'critical' | 'important' | 'minor'
    })).slice(0, 5)
  }
  if (sections.openQuestions.length === 0) {
    sections.openQuestions = generateProbingQuestions(originalInput).slice(0, 3)
  }

  return sections
}

// Validate section has correct number of bullets per PRD
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
function generateDemoOutput(input: string, meetingType?: MeetingType): Promise<SummaryOutput> {
  // Simulate processing delay
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const detectedMeetingType = meetingType ?? detectMeetingType(input)
        
        // Generate realistic demo data based on input analysis
        const keyDiscussionPoints = extractKeyPoints(input).slice(0, 4)
        const legacyActions = extractActionItems(input)
        const legacySOPs = performSOPCheck(input)
        const openQuestions = generateProbingQuestions(input)
        
        // Convert legacy data to new structured format
        const nextSteps: ActionItem[] = legacyActions.slice(0, 4).map((action, index) => ({
          task: action,
          owner: ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Alex Rivera'][index] || 'TBD',
          deadline: ['Next Friday', 'End of week', 'Monday', 'By next meeting'][index] || 'TBD',
          priority: (['high', 'medium', 'low'] as const)[index % 3],
          successCriteria: 'Task completion and stakeholder approval'
        }))
        
        const sopChecks: SOPCheck[] = legacySOPs.slice(0, 4).map((sop, index) => ({
          category: ['Meeting Preparation', 'Decision Documentation', 'Action Assignment', 'Follow-up Planning'][index] || 'General',
          status: (sop.includes('✅') ? 'compliant' : sop.includes('⚠️') ? 'partial' : 'missing') as 'compliant' | 'partial' | 'missing',
          details: sop,
          recommendation: 'Continue current practices and improve documentation',
          severity: (sop.includes('⚠️') ? 'important' : 'minor') as 'critical' | 'important' | 'minor'
        }))
        
        const riskAssessment: RiskItem[] = [
          {
            risk: 'Payment gateway issues may impact user experience',
            impact: 'high',
            probability: 'medium',
            mitigation: 'Implement monitoring and fallback payment methods',
            owner: 'Engineering Team'
          },
          {
            risk: 'Customer confusion about cashback policy',
            impact: 'medium',
            probability: 'high',
            mitigation: 'Update app UI to clearly display cashback terms',
            owner: 'Product Team'
          }
        ]
        
        const followUpReminders: FollowUpReminder[] = [
          {
            action: 'Coordinate with payment gateway provider',
            dueDate: '2024-01-15',
            owner: 'John Smith',
            type: 'follow-up'
          },
          {
            action: 'Review cashback policy communication',
            dueDate: '2024-01-12',
            owner: 'Sarah Johnson',
            type: 'review'
          }
        ]
        
        const meetingQuality: MeetingQualityMetrics = {
          overallScore: 7,
          areas: {
            preparation: 6,
            participation: 8,
            decisionMaking: 7,
            actionClarity: 6,
            followThrough: 8
          },
          recommendations: [
            'Include more specific deadlines for action items',
            'Document decision rationale more clearly',
            'Set up regular check-ins for follow-up items'
          ]
        }
        
        const result: SummaryOutput = {
          keyDiscussionPoints: keyDiscussionPoints.length > 0 ? keyDiscussionPoints : ['Key project updates discussed', 'Current blockers reviewed', 'Next phase priorities decided'],
          nextSteps,
          sopChecks,
          openQuestions: openQuestions.length > 0 ? openQuestions : ['What is the timeline for resolving payment issues?', 'Who will communicate the cashback policy changes?'],
          meetingType: detectedMeetingType,
          riskAssessment,
          followUpReminders,
          meetingQuality,
        }
        
        resolve(result)
        
      } catch (error) {
        console.error('Demo mode error:', error)
        resolve({
          keyDiscussionPoints: ['Demo key discussion point'],
          nextSteps: [{
            task: 'Demo action item',
            owner: 'Demo Owner',
            deadline: 'Next week',
            priority: 'medium',
            successCriteria: 'Task completion'
          }],
          sopChecks: [{
            category: 'General',
            status: 'compliant',
            details: '✅ Demo SOP check',
            severity: 'minor'
          }],
          openQuestions: ['Demo open question'],
          meetingType: meetingType ?? 'general',
        })
      }
    }, 3500) // 3.5 second delay to simulate realistic API call
  })
}
