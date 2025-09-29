export type MeetingType = 'sprint-review' | 'product-decision'

// Core elements that both meeting types must include
export interface CoreElements {
  summaryPoints: string[] // 3-5 key discussion highlights
  actionItemsOrNextSteps: ActionItem[] // Choose based on meeting type
  openQuestions: string[] // Unresolved items needing follow-up
}

// Sprint/Planning Review specific sections - 3 critical areas
export interface SprintReviewSections {
  sprintMetrics: SprintMetric[] // 1) Sprint Metrics & Progress
  actionItems: ActionItem[] // 2) Action Items with Ownership
  blockersAndRoadmap: {
    blockersResolved: string[] // 3) Blockers & Roadmap Updates
    upcomingRoadmapItems: string[]
  }
}

// Product Decision Meeting specific sections - 3 critical areas
export interface ProductDecisionSections {
  decisionsMade: Decision[] // 1) Decisions Made with Rationale
  successCriteria: string[] // 2) Success Criteria & Impact
  resourceRequirements: ResourceRequirement[] // 3) Resource Requirements & Timeline
}

export interface SummaryOutput extends CoreElements {
  meetingType: MeetingType
  // Meeting-specific sections (only one will be populated based on meeting type)
  sprintReviewSections?: SprintReviewSections
  productDecisionSections?: ProductDecisionSections
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

export interface SprintMetric {
  name: string
  value: string | number
  trend?: 'up' | 'down' | 'stable'
  description?: string
}

export interface Decision {
  decision: string
  rationale: string
  impact: 'high' | 'medium' | 'low'
  owner?: string
  deadline?: string
}

export interface ResourceRequirement {
  type: 'team' | 'timeline' | 'budget' | 'technology'
  description: string
  quantity?: string
  timeline?: string
  owner?: string
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

export async function summarizeNotes(input: string, selectedMeetingType: MeetingType = 'sprint-review'): Promise<SummaryOutput> {
  const meetingType = selectedMeetingType

  if (shouldUseDemoMode()) {
    return await generateDemoOutput(input, meetingType)
  }

  try {
    const summaryText = await fetchClaudeSummary(input, meetingType)
    const parsedData = parseStructuredSummary(summaryText, input)
    return {
      summaryPoints: parsedData.summaryPoints,
      actionItemsOrNextSteps: parsedData.actionItemsOrNextSteps,
      openQuestions: parsedData.openQuestions,
      meetingType,
      sprintReviewSections: parsedData.sprintReviewSections,
      productDecisionSections: parsedData.productDecisionSections,
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
      system: `You are a meeting summarizer focused on the 3 most critical things PMs need to share.

For ${meetingType.toUpperCase()} meetings, respond with this EXACT JSON format focusing on ONLY the 3 critical sections:

${meetingType === 'sprint-review' ? `{
  "summaryPoints": ["key discussion highlight 1", "key discussion highlight 2", "key discussion highlight 3"],
  "actionItemsOrNextSteps": [
    {
      "task": "specific actionable task",
      "owner": "person responsible", 
      "deadline": "when it's due or TBD",
      "priority": "high|medium|low",
      "successCriteria": "how success will be measured"
    }
  ],
  "openQuestions": ["specific question that needs answering"],
  "sprintReviewSections": {
    "sprintMetrics": [
      {
        "name": "Velocity",
        "value": "23 story points",
        "trend": "up|down|stable",
        "description": "Story points completed this sprint"
      }
    ],
    "actionItems": [
      {
        "task": "specific action item",
        "owner": "person responsible",
        "deadline": "when it's due or TBD",
        "priority": "high|medium|low",
        "successCriteria": "how success will be measured"
      }
    ],
    "blockersAndRoadmap": {
      "blockersResolved": ["blocker 1 resolved", "blocker 2 cleared"],
      "upcomingRoadmapItems": ["feature A planned", "improvement B scheduled"]
    }
  }
}` : `{
  "summaryPoints": ["key discussion highlight 1", "key discussion highlight 2", "key discussion highlight 3"],
  "actionItemsOrNextSteps": [
    {
      "task": "specific next step",
      "owner": "person responsible", 
      "deadline": "when it's due or TBD",
      "priority": "high|medium|low",
      "successCriteria": "how success will be measured"
    }
  ],
  "openQuestions": ["specific question that needs answering"],
  "productDecisionSections": {
    "decisionsMade": [
      {
        "decision": "what was decided",
        "rationale": "why this decision was made",
        "impact": "high|medium|low",
        "owner": "person responsible",
        "deadline": "when to implement"
      }
    ],
    "successCriteria": ["metric 1", "metric 2", "metric 3"],
    "resourceRequirements": [
      {
        "type": "team|timeline|budget|technology",
        "description": "what is needed",
        "quantity": "how much",
        "timeline": "when needed",
        "owner": "who manages this"
      }
    ]
  }
}`}

CRITICAL FOCUS:
- For SPRINT REVIEWS: Focus on 1) Sprint Metrics & Progress, 2) Action Items with Ownership, 3) Blockers & Roadmap Updates
- For PRODUCT DECISIONS: Focus on 1) Decisions Made with Rationale, 2) Success Criteria & Impact, 3) Resource Requirements & Timeline
- Keep each section concise but comprehensive
- Use specific names from input, not generic terms
- If information is unclear, use "TBD" instead of guessing`,
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
  
  if (lowerText.includes('sprint') || lowerText.includes('planning') ||
      lowerText.includes('review') || lowerText.includes('progress') ||
      lowerText.includes('update') || lowerText.includes('milestone') ||
      lowerText.includes('deliverable') || lowerText.includes('roadmap')) {
    return 'sprint-review'
  }

  if (lowerText.includes('decision') || lowerText.includes('prioritization') ||
      lowerText.includes('feature') || lowerText.includes('technical') ||
      lowerText.includes('architecture') || lowerText.includes('strategy') ||
      lowerText.includes('implementation') || lowerText.includes('rationale')) {
    return 'product-decision'
  }

  return 'sprint-review' // Default to sprint-review
}

// Enhanced structured prompting for better AI outputs
// Parse structured summary with enhanced JSON structure
function parseStructuredSummary(summaryText: string, originalInput: string): {
  summaryPoints: string[]
  actionItemsOrNextSteps: ActionItem[]
  openQuestions: string[]
  sprintReviewSections?: SprintReviewSections
  productDecisionSections?: ProductDecisionSections
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
        summaryPoints: parsed.summaryPoints || [],
        actionItemsOrNextSteps: parsed.actionItemsOrNextSteps || [],
        openQuestions: parsed.openQuestions || [],
        sprintReviewSections: parsed.sprintReviewSections || undefined,
        productDecisionSections: parsed.productDecisionSections || undefined,
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
    summaryPoints: [] as string[],
    actionItemsOrNextSteps: [] as ActionItem[],
    openQuestions: [] as string[],
    sprintReviewSections: undefined as SprintReviewSections | undefined,
    productDecisionSections: undefined as ProductDecisionSections | undefined,
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
      currentSection = 'actionItemsOrNextSteps'
      continue
    } else if (line.match(/^#+\s*Open Questions/i)) {
      currentSection = 'openQuestions'
      continue
    }

    // Extract bullet points and convert to structured format
    if (currentSection && line.match(/^[-•*]\s+/)) {
      const bullet = line.replace(/^[-•*]\s+/, '').trim()
      if (bullet.length > 0) {
        if (currentSection === 'actionItemsOrNextSteps') {
          sections.actionItemsOrNextSteps.push({
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
  if (sections.actionItemsOrNextSteps.length === 0) {
    const legacyActions = extractActionItems(originalInput)
    sections.actionItemsOrNextSteps = legacyActions.map(action => ({
      task: action,
      owner: 'TBD',
      priority: 'medium' as const,
      successCriteria: 'Completion of task'
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
        const summaryPoints = extractKeyPoints(input).slice(0, 4)
        const legacyActions = extractActionItems(input)
        const openQuestions = generateProbingQuestions(input)
        
        // Convert legacy data to new structured format
        const actionItemsOrNextSteps: ActionItem[] = legacyActions.slice(0, 4).map((action, index) => ({
          task: action,
          owner: ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Alex Rivera'][index] || 'TBD',
          deadline: ['Next Friday', 'End of week', 'Monday', 'By next meeting'][index] || 'TBD',
          priority: (['high', 'medium', 'low'] as const)[index % 3],
          successCriteria: 'Task completion and stakeholder approval'
        }))
        
        // Generate meeting-specific sections based on type - 3 critical areas only
        const sprintReviewSections: SprintReviewSections | undefined = detectedMeetingType === 'sprint-review' ? {
          sprintMetrics: [
            { name: 'Velocity', value: '23 story points', trend: 'up', description: 'Story points completed this sprint' },
            { name: 'Burndown', value: 'On track', trend: 'stable', description: 'Sprint progress vs planned' },
            { name: 'Quality', value: '95%', trend: 'up', description: 'Bug-free delivery rate' }
          ],
          actionItems: [
            { task: 'Complete user authentication testing', owner: 'John Smith', deadline: 'Next Friday', priority: 'high', successCriteria: 'All test cases pass' },
            { task: 'Update mobile app performance metrics', owner: 'Sarah Johnson', deadline: 'End of week', priority: 'medium', successCriteria: 'Performance dashboard updated' }
          ],
          blockersAndRoadmap: {
            blockersResolved: ['Database connection timeout fixed', 'Third-party API integration completed'],
            upcomingRoadmapItems: ['User dashboard redesign', 'Advanced analytics features', 'Mobile app optimization']
          }
        } : undefined

        const productDecisionSections: ProductDecisionSections | undefined = detectedMeetingType === 'product-decision' ? {
          decisionsMade: [
            { decision: 'Implement microservices architecture', rationale: 'Better scalability and maintainability', impact: 'high', owner: 'Tech Lead', deadline: 'Q2 2024' },
            { decision: 'Use React for frontend', rationale: 'Team expertise and ecosystem support', impact: 'medium', owner: 'Frontend Team', deadline: 'Next sprint' }
          ],
          successCriteria: ['50% reduction in deployment time', '99.9% uptime target', 'Improved developer productivity'],
          resourceRequirements: [
            { type: 'team', description: '2 additional backend developers', quantity: '2', timeline: 'Q1 2024', owner: 'Engineering Manager' },
            { type: 'budget', description: 'Infrastructure costs', quantity: '$10k/month', timeline: 'Ongoing', owner: 'Finance Team' }
          ]
        } : undefined
        
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
          actionItemsOrNextSteps,
          openQuestions: openQuestions.length > 0 ? openQuestions : ['What is the timeline for resolving payment issues?', 'Who will communicate the cashback policy changes?'],
          meetingType: detectedMeetingType,
          sprintReviewSections,
          productDecisionSections,
          riskAssessment,
          followUpReminders,
          meetingQuality,
        }
        
        resolve(result)
        
      } catch (error) {
        console.error('Demo mode error:', error)
        resolve({
          summaryPoints: ['Demo key discussion point'],
          actionItemsOrNextSteps: [{
            task: 'Demo action item',
            owner: 'Demo Owner',
            deadline: 'Next week',
            priority: 'medium',
            successCriteria: 'Task completion'
          }],
          openQuestions: ['Demo open question'],
          meetingType: meetingType ?? 'sprint-review',
        })
      }
    }, 3500) // 3.5 second delay to simulate realistic API call
  })
}
