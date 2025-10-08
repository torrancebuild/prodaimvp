// Single general meeting type for all development teams
export type MeetingType = 'development-team-meeting'

// Core elements for general development team meetings
export interface CoreElements {
  summaryPoints: string[] // 3-5 key discussion highlights
  actionItems: ActionItem[] // Who's doing what and when
  openQuestions: string[] // Unresolved items needing follow-up
}

// General development team meeting sections - 3 critical areas
export interface DevelopmentTeamSections {
  keyDecisionsAndProgress: {
    decisions: Decision[] // What was decided
    progressUpdates: string[] // What's working/complete
  }
  actionItemsAndOwnership: ActionItem[] // Who's doing what and when
  blockersAndNextSteps: {
    currentBlockers: string[] // What's blocking progress
    upcomingItems: string[] // What's coming up next
  }
}

export interface SummaryOutput extends CoreElements {
  meetingType: MeetingType
  developmentTeamSections: DevelopmentTeamSections
  // Optional additional elements
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

export interface Decision {
  decision: string
  rationale: string
  impact: 'high' | 'medium' | 'low'
  owner?: string
  deadline?: string
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

export async function summarizeNotes(input: string): Promise<SummaryOutput> {
  const meetingType: MeetingType = 'development-team-meeting'

  if (shouldUseDemoMode()) {
    return await generateDemoOutput(input)
  }

  try {
    const summaryText = await fetchClaudeSummary(input)
    const parsedData = parseStructuredSummary(summaryText, input)
    return {
      summaryPoints: parsedData.summaryPoints,
      actionItems: parsedData.actionItems,
      openQuestions: parsedData.openQuestions,
      meetingType,
      developmentTeamSections: parsedData.developmentTeamSections,
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
      max_tokens: 800,
      temperature: 0.1,
      system: `You are a meeting summarizer for development teams. Focus on the 3 most critical things product managers need to share with their teams.

Respond with this EXACT JSON format focusing on ONLY the 3 critical sections:

{
  "summaryPoints": ["key discussion highlight 1", "key discussion highlight 2", "key discussion highlight 3"],
  "actionItems": [
    {
      "task": "specific actionable task",
      "owner": "person responsible", 
      "deadline": "when it's due or TBD",
      "priority": "high|medium|low",
      "successCriteria": "how success will be measured"
    }
  ],
  "openQuestions": ["specific question that needs answering"],
  "developmentTeamSections": {
    "keyDecisionsAndProgress": {
      "decisions": [
        {
          "decision": "what was decided",
          "rationale": "why this decision was made",
          "impact": "high|medium|low",
          "owner": "person responsible",
          "deadline": "when to implement"
        }
      ],
      "progressUpdates": ["completed feature X", "resolved issue Y", "achieved milestone Z"]
    },
    "actionItemsAndOwnership": [
      {
        "task": "specific action item",
        "owner": "person responsible",
        "deadline": "when it's due or TBD",
        "priority": "high|medium|low",
        "successCriteria": "how success will be measured"
      }
    ],
    "blockersAndNextSteps": {
      "currentBlockers": ["blocker 1 description", "blocker 2 description"],
      "upcomingItems": ["feature A planned", "improvement B scheduled", "meeting C scheduled"]
    }
  }
}

CRITICAL FOCUS:
- Focus on 1) Key Decisions & Progress, 2) Action Items & Ownership, 3) Blockers & Next Steps
- Keep each section concise but comprehensive
- Use specific names from input, not generic terms
- If information is unclear, use "TBD" instead of guessing
- This works for sprint reviews, planning meetings, retrospectives, standups, and any development team meeting`,
      messages: [
        {
          role: 'user',
          content: `Development Team Meeting Notes:\n${input}\n\nAnalyze these notes and provide development team meeting intelligence. Clearly state what additional information is required if anything is missing.`
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


// Parse structured summary with simplified JSON structure
function parseStructuredSummary(summaryText: string, originalInput: string): {
  summaryPoints: string[]
  actionItems: ActionItem[]
  openQuestions: string[]
  developmentTeamSections: DevelopmentTeamSections
  riskAssessment?: RiskItem[]
  followUpReminders?: FollowUpReminder[]
  meetingQuality?: MeetingQualityMetrics
} {
  console.log('AI Response:', summaryText)
  try {
    const jsonMatch = summaryText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      console.log('JSON Match found:', jsonMatch[0])
      const repaired = jsonrepair(jsonMatch[0])
      console.log('Repaired JSON:', repaired)
      const parsed = JSON.parse(repaired)
      console.log('Parsed JSON:', parsed)
      return {
        summaryPoints: parsed.summaryPoints || [],
        actionItems: parsed.actionItems || [],
        openQuestions: parsed.openQuestions || [],
        developmentTeamSections: parsed.developmentTeamSections || {
          keyDecisionsAndProgress: { decisions: [], progressUpdates: [] },
          actionItemsAndOwnership: [],
          blockersAndNextSteps: { currentBlockers: [], upcomingItems: [] }
        },
        riskAssessment: parsed.riskAssessment || [],
        followUpReminders: parsed.followUpReminders || [],
        meetingQuality: parsed.meetingQuality || undefined,
      }
    }
  } catch (error) {
    console.warn('Failed to parse JSON, falling back to text parsing:', error)
    console.warn('Raw response:', summaryText)
  }

  // Fallback to legacy text parsing
  const sections = {
    summaryPoints: [] as string[],
    actionItems: [] as ActionItem[],
    openQuestions: [] as string[],
    developmentTeamSections: {
      keyDecisionsAndProgress: { decisions: [] as Decision[], progressUpdates: [] as string[] },
      actionItemsAndOwnership: [] as ActionItem[],
      blockersAndNextSteps: { currentBlockers: [] as string[], upcomingItems: [] as string[] }
    } as DevelopmentTeamSections,
    riskAssessment: [] as RiskItem[],
    followUpReminders: [] as FollowUpReminder[],
    meetingQuality: undefined as MeetingQualityMetrics | undefined
  }

  const lines = summaryText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  let currentSection = ''

  for (const line of lines) {
    // Detect section headers
    if (line.match(/^#+\s*Summary Points/i) || line.match(/^#+\s*Key Discussion Points/i)) {
      currentSection = 'summaryPoints'
      continue
    } else if (line.match(/^#+\s*Action Items/i) || line.match(/^#+\s*Next Steps/i)) {
      currentSection = 'actionItems'
      continue
    } else if (line.match(/^#+\s*Open Questions/i)) {
      currentSection = 'openQuestions'
      continue
    }

    // Extract bullet points and convert to structured format
    if (currentSection && line.match(/^[-•*]\s+/)) {
      const bullet = line.replace(/^[-•*]\s+/, '').trim()
      if (bullet.length > 0) {
        if (currentSection === 'actionItems') {
          sections.actionItems.push({
            task: bullet,
            owner: 'TBD',
            priority: 'medium',
            successCriteria: 'Completion of task'
          })
        } else {
          (sections[currentSection as keyof typeof sections] as string[]).push(bullet)
        }
      }
    }
  }

  // Fallback if sections are empty
  if (sections.summaryPoints.length === 0) {
    sections.summaryPoints = extractKeyPoints(originalInput).slice(0, 5)
  }
  if (sections.actionItems.length === 0) {
    const legacyActions = extractActionItems(originalInput)
    sections.actionItems = legacyActions.map(action => ({
      task: action,
      owner: 'TBD',
      priority: 'medium' as const,
      successCriteria: 'Completion of task'
    })).slice(0, 5)
  }
  if (sections.openQuestions.length === 0) {
    sections.openQuestions = generateProbingQuestions(originalInput).slice(0, 3)
  }

  // Populate developmentTeamSections with actual data from fallback parsing
  if (sections.developmentTeamSections.keyDecisionsAndProgress.decisions.length === 0) {
    // Extract decisions from input
    const decisions = extractKeyPoints(originalInput).slice(0, 2).map(point => ({
      decision: point,
      rationale: 'Based on meeting discussion',
      impact: 'medium' as const,
      owner: 'TBD',
      deadline: 'TBD'
    }))
    sections.developmentTeamSections.keyDecisionsAndProgress.decisions = decisions
  }
  
  if (sections.developmentTeamSections.keyDecisionsAndProgress.progressUpdates.length === 0) {
    sections.developmentTeamSections.keyDecisionsAndProgress.progressUpdates = extractKeyPoints(originalInput).slice(0, 3)
  }
  
  if (sections.developmentTeamSections.actionItemsAndOwnership.length === 0) {
    sections.developmentTeamSections.actionItemsAndOwnership = sections.actionItems
  }
  
  if (sections.developmentTeamSections.blockersAndNextSteps.currentBlockers.length === 0) {
    sections.developmentTeamSections.blockersAndNextSteps.currentBlockers = ['No blockers identified']
  }
  
  if (sections.developmentTeamSections.blockersAndNextSteps.upcomingItems.length === 0) {
    sections.developmentTeamSections.blockersAndNextSteps.upcomingItems = ['Follow up on action items']
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
function generateDemoOutput(input: string): Promise<SummaryOutput> {
  // Simulate processing delay
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        // Generate realistic demo data based on input analysis
        const summaryPoints = extractKeyPoints(input).slice(0, 4)
        const legacyActions = extractActionItems(input)
        const openQuestions = generateProbingQuestions(input)
        
        // Convert legacy data to new structured format
        const actionItems: ActionItem[] = legacyActions.slice(0, 4).map((action, index) => ({
          task: action,
          owner: ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Alex Rivera'][index] || 'TBD',
          deadline: ['Next Friday', 'End of week', 'Monday', 'By next meeting'][index] || 'TBD',
          priority: (['high', 'medium', 'low'] as const)[index % 3],
          successCriteria: 'Task completion and stakeholder approval'
        }))
        
        // Generate development team sections - 3 critical areas
        const developmentTeamSections: DevelopmentTeamSections = {
          keyDecisionsAndProgress: {
            decisions: [
              { decision: 'Implement microservices architecture', rationale: 'Better scalability and maintainability', impact: 'high', owner: 'Tech Lead', deadline: 'Q2 2024' },
              { decision: 'Use React for frontend', rationale: 'Team expertise and ecosystem support', impact: 'medium', owner: 'Frontend Team', deadline: 'Next sprint' }
            ],
            progressUpdates: ['User authentication completed', 'Database optimization finished', 'Mobile app performance improved']
          },
          actionItemsAndOwnership: [
            { task: 'Complete user authentication testing', owner: 'John Smith', deadline: 'Next Friday', priority: 'high', successCriteria: 'All test cases pass' },
            { task: 'Update mobile app performance metrics', owner: 'Sarah Johnson', deadline: 'End of week', priority: 'medium', successCriteria: 'Performance dashboard updated' }
          ],
          blockersAndNextSteps: {
            currentBlockers: ['Database connection timeout', 'Third-party API rate limits', 'Design system inconsistencies'],
            upcomingItems: ['User dashboard redesign', 'Advanced analytics features', 'Mobile app optimization', 'Sprint planning meeting']
          }
        }
        
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
          summaryPoints: summaryPoints.length > 0 ? summaryPoints : ['Key project updates discussed', 'Current blockers reviewed', 'Next phase priorities decided'],
          actionItems,
          openQuestions: openQuestions.length > 0 ? openQuestions : ['What is the timeline for resolving payment issues?', 'Who will communicate the cashback policy changes?'],
          meetingType: 'development-team-meeting',
          developmentTeamSections,
          riskAssessment,
          followUpReminders,
          meetingQuality,
        }
        
        resolve(result)
        
      } catch (error) {
        console.error('Demo mode error:', error)
        resolve({
          summaryPoints: ['Demo key discussion point'],
          actionItems: [{
            task: 'Demo action item',
            owner: 'Demo Owner',
            deadline: 'Next week',
            priority: 'medium',
            successCriteria: 'Task completion'
          }],
          openQuestions: ['Demo open question'],
          meetingType: 'development-team-meeting',
          developmentTeamSections: {
            keyDecisionsAndProgress: { decisions: [], progressUpdates: [] },
            actionItemsAndOwnership: [],
            blockersAndNextSteps: { currentBlockers: [], upcomingItems: [] }
          }
        })
      }
    }, 3500) // 3.5 second delay to simulate realistic API call
  })
}
