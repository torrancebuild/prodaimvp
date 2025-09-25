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
    // If no API key is configured, use fallback demo mode
    if (!process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY === '') {
      console.log('No API key configured, using demo mode')
      return await generateDemoOutput(input)
    }

    // Detect meeting type for context-aware processing
    const meetingType = detectMeetingType(input)
    
    // Extract temporal context for better summarization
    const temporalContext = extractTemporalContext(input)
    
    // Enhanced structured prompting for better AI outputs
    const structuredPrompt = createStructuredPrompt(input, meetingType, temporalContext)
    
    // Use Hugging Face Inference API for text summarization
    const summaryResponse = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      {
        headers: { 
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          inputs: structuredPrompt,
          parameters: {
            max_length: 400,
            min_length: 100,
            do_sample: true,
            temperature: 0.2,
            top_p: 0.9,
            repetition_penalty: 1.1
          }
        }),
      }
    )

    if (!summaryResponse.ok) {
      throw new Error(`Hugging Face API error: ${summaryResponse.status}`)
    }

    const summaryData = await summaryResponse.json()
    
    if (!summaryData || !summaryData[0] || !summaryData[0].summary_text) {
      throw new Error('Invalid response from AI service')
    }

    const summaryText = summaryData[0].summary_text

    // Enhanced extraction with better patterns
    const actionItems = extractActionItems(input, meetingType)
    const sopCheck = performSOPCheck(input, meetingType)
    const probingQuestions = generateProbingQuestions(input, meetingType)

    // Better summary parsing with structured extraction
    const summary = parseStructuredSummary(summaryText, input)
    
    // Organize summary into hierarchical structure
    const hierarchicalSummary = organizeHierarchicalSummary(summary, input)

    // Calculate quality metrics
    const qualityMetrics = calculateQualityMetrics(summary, actionItems, sopCheck, input)
    const confidenceScore = calculateConfidenceScore(qualityMetrics)

    return {
      summary: hierarchicalSummary.length > 0 ? hierarchicalSummary : ['No clear summary could be generated'],
      actionItems: actionItems.length > 0 ? actionItems : ['No action items identified'],
      sopCheck: sopCheck,
      probingQuestions: probingQuestions,
      meetingType: meetingType,
      confidenceScore: confidenceScore,
      qualityMetrics: qualityMetrics
    }

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('AI service not configured. Please check API keys.')
      } else if (error.message.includes('rate limit')) {
        throw new Error('AI service rate limit exceeded. Please try again later.')
      } else if (error.message.includes('quota')) {
        throw new Error('AI service quota exceeded. Please check your account.')
      }
    }
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
  
  // Enhanced meeting type detection with scoring system
  const meetingTypeScores = {
    standup: 0,
    planning: 0,
    retrospective: 0,
    decision: 0,
    review: 0,
    'problem-solving': 0,
    general: 0
  }
  
  // Standup/Status Meeting indicators
  const standupIndicators = [
    'standup', 'daily standup', 'status meeting', 'daily sync',
    'yesterday', 'today', 'tomorrow', 'this week', 'last week',
    'blocked', 'impediment', 'stuck', 'waiting for',
    'accomplished', 'completed', 'finished', 'delivered',
    'working on', 'planning to', 'next up', 'upcoming'
  ]
  
  // Planning Meeting indicators
  const planningIndicators = [
    'planning', 'sprint planning', 'sprint', 'backlog', 'epic', 'story', 'task',
    'user story', 'acceptance criteria', 'definition of done',
    'estimation', 'story points', 'capacity', 'velocity',
    'requirements', 'specifications', 'scope', 'deliverables'
  ]
  
  // Retrospective indicators
  const retrospectiveIndicators = [
    'retro', 'retrospective', 'went well', 'didn\'t go well', 'improve',
    'start doing', 'stop doing', 'continue doing', 'lessons learned',
    'what worked', 'what didn\'t work', 'challenges', 'successes',
    'team feedback', 'process improvement', 'team dynamics'
  ]
  
  // Decision Meeting indicators
  const decisionIndicators = [
    'decision', 'decide', 'approve', 'reject', 'vote', 'consensus',
    'agreed', 'concluded', 'resolved', 'chose', 'selected',
    'option', 'alternatives', 'pros and cons', 'trade-offs',
    'stakeholder', 'approval', 'sign-off', 'final decision'
  ]
  
  // Review Meeting indicators
  const reviewIndicators = [
    'review', 'demo', 'presentation', 'showcase', 'walkthrough',
    'feedback', 'stakeholder review', 'client review', 'approval',
    'deliverable', 'milestone', 'checkpoint', 'gate review',
    'quality', 'assessment', 'evaluation', 'criteria'
  ]
  
  // Problem Solving indicators
  const problemSolvingIndicators = [
    'problem', 'issue', 'bug', 'fix', 'troubleshoot', 'debug',
    'root cause', 'investigation', 'analysis', 'solution',
    'workaround', 'mitigation', 'prevention', 'monitoring',
    'incident', 'outage', 'failure', 'error', 'exception'
  ]
  
  // Score each meeting type based on indicator presence
  standupIndicators.forEach(indicator => {
    if (lowerText.includes(indicator)) meetingTypeScores.standup += 1
  })
  
  planningIndicators.forEach(indicator => {
    if (lowerText.includes(indicator)) meetingTypeScores.planning += 1
  })
  
  retrospectiveIndicators.forEach(indicator => {
    if (lowerText.includes(indicator)) meetingTypeScores.retrospective += 1
  })
  
  decisionIndicators.forEach(indicator => {
    if (lowerText.includes(indicator)) meetingTypeScores.decision += 1
  })
  
  reviewIndicators.forEach(indicator => {
    if (lowerText.includes(indicator)) meetingTypeScores.review += 1
  })
  
  problemSolvingIndicators.forEach(indicator => {
    if (lowerText.includes(indicator)) meetingTypeScores['problem-solving'] += 1
  })
  
  // Find the meeting type with the highest score
  const maxScore = Math.max(...Object.values(meetingTypeScores))
  
  // If no clear indicators found, use general
  if (maxScore === 0) {
    return 'general'
  }
  
  // Return the meeting type with the highest score
  const detectedType = Object.entries(meetingTypeScores)
    .find(([_, score]) => score === maxScore)?.[0] || 'general'
  
  return detectedType
}

// Extract temporal context from meeting notes
function extractTemporalContext(input: string): {
  timeReferences: string[]
  sequence: string[]
  deadlines: string[]
  timeframes: string[]
} {
  const lowerText = input.toLowerCase()
  
  // Extract time references
  const timeReferences = [
    'yesterday', 'today', 'tomorrow', 'this week', 'next week', 'last week',
    'this month', 'next month', 'last month', 'this quarter', 'next quarter',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'morning', 'afternoon', 'evening', 'night', 'early', 'late'
  ].filter(ref => lowerText.includes(ref))
  
  // Extract sequence indicators
  const sequence = [
    'first', 'second', 'third', 'next', 'then', 'after', 'before', 'finally',
    'initially', 'subsequently', 'meanwhile', 'concurrently', 'previously',
    'step 1', 'step 2', 'phase 1', 'phase 2', 'stage 1', 'stage 2'
  ].filter(seq => lowerText.includes(seq))
  
  // Extract deadlines and timeframes
  const deadlinePatterns = [
    /\b(?:due|deadline|by|until|before)\s+(?:tomorrow|next week|end of|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
    /\b(?:due|deadline|by|until|before)\s+\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi,
    /\b(?:due|deadline|by|until|before)\s+\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/gi
  ]
  
  const deadlines: string[] = []
  deadlinePatterns.forEach(pattern => {
    const matches = input.match(pattern)
    if (matches) {
      deadlines.push(...matches)
    }
  })
  
  // Extract timeframes
  const timeframes = [
    'immediately', 'asap', 'urgent', 'priority', 'high priority',
    'short term', 'long term', 'ongoing', 'continuous', 'recurring',
    'one-time', 'temporary', 'permanent', 'indefinite'
  ].filter(tf => lowerText.includes(tf))
  
  return {
    timeReferences,
    sequence,
    deadlines,
    timeframes
  }
}

// Enhanced structured prompting for better AI outputs
function createStructuredPrompt(input: string, meetingType: string, temporalContext?: any): string {
  const contextPrompts = {
    'standup': {
      focus: 'Daily standup meeting focusing on progress, blockers, and team coordination',
      structure: [
        'What each person accomplished since last meeting',
        'What each person plans to work on next',
        'Any blockers or impediments mentioned',
        'Team coordination and dependencies',
        'Key updates or announcements'
      ],
      extraction: 'Extract specific accomplishments, planned work, blockers, and team updates. Focus on actionable items and dependencies.'
    },
    'planning': {
      focus: 'Sprint planning or project planning meeting focusing on requirements and deliverables',
      structure: [
        'User stories and requirements discussed',
        'Acceptance criteria and definitions of done',
        'Effort estimates and capacity planning',
        'Sprint goals and deliverables',
        'Dependencies and risks identified'
      ],
      extraction: 'Extract specific requirements, estimates, sprint goals, and planning decisions. Focus on what will be delivered and when.'
    },
    'retrospective': {
      focus: 'Team retrospective focusing on process improvement and lessons learned',
      structure: [
        'What went well (successes and positive outcomes)',
        'What didn\'t go well (challenges and pain points)',
        'Lessons learned and insights gained',
        'Action items for improvement',
        'Team dynamics and collaboration insights'
      ],
      extraction: 'Extract specific successes, challenges, lessons learned, and improvement actions. Focus on actionable insights.'
    },
    'decision': {
      focus: 'Decision-making meeting focusing on options, rationale, and outcomes',
      structure: [
        'Options or alternatives considered',
        'Pros and cons of each option',
        'Final decision made and rationale',
        'Who made the decision and who was involved',
        'Next steps and implementation plan'
      ],
      extraction: 'Extract specific options, decision rationale, stakeholders, and implementation steps. Focus on the decision process and outcomes.'
    },
    'review': {
      focus: 'Review or demo meeting focusing on deliverables and feedback',
      structure: [
        'Deliverables or work products shown',
        'Feedback received from stakeholders',
        'Quality assessment and evaluation',
        'Improvements and next iterations',
        'Stakeholder reactions and approval status'
      ],
      extraction: 'Extract specific deliverables, feedback received, quality assessments, and improvement plans. Focus on what was reviewed and outcomes.'
    },
    'problem-solving': {
      focus: 'Problem-solving meeting focusing on issue resolution and solutions',
      structure: [
        'Problem description and impact',
        'Root cause analysis and investigation',
        'Solutions considered and evaluated',
        'Chosen solution and implementation plan',
        'Prevention measures and monitoring'
      ],
      extraction: 'Extract specific problems, root causes, solutions considered, and resolution plans. Focus on the problem-solving process and outcomes.'
    },
    'general': {
      focus: 'General meeting focusing on key discussions and outcomes',
      structure: [
        'Key decisions made and rationale',
        'Important discussions and topics covered',
        'Outcomes and results achieved',
        'Next steps and action items',
        'Critical information shared'
      ],
      extraction: 'Extract specific decisions, discussions, outcomes, and next steps. Focus on the most important information and outcomes.'
    }
  }
  
  const prompt = contextPrompts[meetingType as keyof typeof contextPrompts] || contextPrompts.general
  
  // Add temporal context to the prompt if available
  let temporalContextText = ''
  if (temporalContext && (temporalContext.timeReferences.length > 0 || temporalContext.deadlines.length > 0)) {
    temporalContextText = `

TEMPORAL CONTEXT:
${temporalContext.timeReferences.length > 0 ? `Time References: ${temporalContext.timeReferences.join(', ')}` : ''}
${temporalContext.deadlines.length > 0 ? `Deadlines: ${temporalContext.deadlines.join(', ')}` : ''}
${temporalContext.sequence.length > 0 ? `Sequence Indicators: ${temporalContext.sequence.join(', ')}` : ''}
${temporalContext.timeframes.length > 0 ? `Timeframes: ${temporalContext.timeframes.join(', ')}` : ''}`
  }

  return `MEETING SUMMARY ANALYSIS
Meeting Type: ${meetingType.toUpperCase()}
Context: ${prompt.focus}${temporalContextText}

ANALYSIS INSTRUCTIONS:
${prompt.extraction}

STRUCTURE TO EXTRACT:
${prompt.structure.map((item, index) => `${index + 1}. ${item}`).join('\n')}

MEETING NOTES:
${input}

REQUIRED OUTPUT FORMAT:
Provide a comprehensive summary that captures the essential information from this ${meetingType} meeting. Focus on:
- Specific details and concrete information
- Decisions made and rationale behind them
- Action items and next steps with clear deadlines
- Key outcomes and results
- Important discussions and topics covered
- Temporal sequence and timing of events

Format as clear, specific bullet points that someone who wasn't at the meeting could understand and act upon.`
}

// Better summary parsing with structured extraction
function parseStructuredSummary(summaryText: string, originalInput: string): string[] {
  // Clean and normalize the summary text
  let cleanedText = summaryText.trim()
  
  // Try to extract bullet points first (most common format)
  let summary: string[] = []
  
  // Look for bullet point patterns
  const bulletPatterns = [
    /^[-•*]\s+(.+)$/gm,  // Standard bullet points
    /^\d+\.\s+(.+)$/gm,  // Numbered lists
    /^[▪▫]\s+(.+)$/gm,   // Unicode bullets
    /^→\s+(.+)$/gm       // Arrow bullets
  ]
  
  for (const pattern of bulletPatterns) {
    const matches = cleanedText.match(pattern)
    if (matches && matches.length > 0) {
      summary = matches.map(match => {
        const content = match.replace(/^[-•*▪▫→\d+\.]\s+/, '').trim()
        return content
      }).filter(item => item.length > 15)
      
      if (summary.length >= 2) break
    }
  }
  
  // If bullet points didn't work, try paragraph splitting
  if (summary.length < 2) {
    const paragraphs = cleanedText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 20)
    if (paragraphs.length >= 2) {
      summary = paragraphs
    }
  }
  
  // If paragraphs didn't work, try sentence splitting with better logic
  if (summary.length < 2) {
    const sentences = cleanedText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20)
    
    // Prioritize sentences with important keywords
    const importantKeywords = [
      'decided', 'agreed', 'concluded', 'resolved', 'chose', 'selected',
      'accomplished', 'completed', 'finished', 'delivered', 'achieved',
      'blocked', 'impediment', 'issue', 'problem', 'challenge',
      'next', 'action', 'todo', 'deadline', 'due', 'schedule',
      'goal', 'objective', 'target', 'milestone', 'deliverable',
      'discussed', 'reviewed', 'analyzed', 'evaluated', 'considered'
    ]
    
    // Score sentences by importance
    const scoredSentences = sentences.map(sentence => {
      const lowerSentence = sentence.toLowerCase()
      const score = importantKeywords.reduce((acc, keyword) => {
        return acc + (lowerSentence.includes(keyword) ? 1 : 0)
      }, 0)
      return { sentence, score }
    }).sort((a, b) => b.score - a.score)
    
    summary = scoredSentences.slice(0, 6).map(item => item.sentence)
  }
  
  // Final fallback: use original input analysis
  if (summary.length < 2) {
    summary = extractKeyPoints(originalInput)
  }
  
  // Clean up and validate final summary
  summary = summary
    .map(item => item.trim())
    .filter(item => item.length > 15)
    .slice(0, 6) // Allow up to 6 key points for better coverage
  
  return summary.length > 0 ? summary : ['No clear summary could be generated from the meeting notes']
}

// Organize summary into hierarchical structure
function organizeHierarchicalSummary(summary: string[], input: string): string[] {
  if (summary.length === 0) return summary
  
  // Define topic categories and their keywords
  const topicCategories = {
    decisions: ['decided', 'agreed', 'concluded', 'resolved', 'chose', 'selected', 'approved', 'rejected'],
    actions: ['action', 'todo', 'task', 'next', 'deadline', 'due', 'schedule', 'assign', 'responsible'],
    outcomes: ['completed', 'finished', 'delivered', 'achieved', 'accomplished', 'result', 'outcome'],
    problems: ['blocked', 'impediment', 'issue', 'problem', 'challenge', 'bug', 'fix', 'troubleshoot'],
    planning: ['planned', 'scheduled', 'goal', 'objective', 'target', 'milestone', 'deliverable'],
    discussions: ['discussed', 'reviewed', 'analyzed', 'evaluated', 'considered', 'debated', 'presented']
  }
  
  // Categorize summary points
  const categorizedPoints = {
    decisions: [] as string[],
    actions: [] as string[],
    outcomes: [] as string[],
    problems: [] as string[],
    planning: [] as string[],
    discussions: [] as string[],
    other: [] as string[]
  }
  
  summary.forEach(point => {
    const lowerPoint = point.toLowerCase()
    let categorized = false
    
    Object.entries(topicCategories).forEach(([category, keywords]) => {
      if (keywords.some(keyword => lowerPoint.includes(keyword))) {
        categorizedPoints[category as keyof typeof categorizedPoints].push(point)
        categorized = true
      }
    })
    
    if (!categorized) {
      categorizedPoints.other.push(point)
    }
  })
  
  // Build hierarchical summary
  const hierarchicalSummary: string[] = []
  
  // Add main topics with their sub-points
  Object.entries(categorizedPoints).forEach(([category, points]) => {
    if (points.length > 0) {
      const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')
      hierarchicalSummary.push(`📋 ${categoryTitle}:`)
      points.forEach(point => {
        hierarchicalSummary.push(`  • ${point}`)
      })
      hierarchicalSummary.push('') // Add spacing
    }
  })
  
  // If no categorization worked, return original summary
  if (hierarchicalSummary.length === 0) {
    return summary
  }
  
  return hierarchicalSummary
}

// Extract key points from original input as fallback
function extractKeyPoints(text: string): string[] {
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 20)
  const keyPoints: string[] = []
  
  // Enhanced keyword categories with different weights
  const keywordCategories = {
    decisions: ['decided', 'agreed', 'concluded', 'resolved', 'chose', 'selected', 'approved', 'rejected'],
    actions: ['action', 'todo', 'task', 'next', 'deadline', 'due', 'schedule', 'assign', 'responsible'],
    outcomes: ['completed', 'finished', 'delivered', 'achieved', 'accomplished', 'result', 'outcome'],
    problems: ['blocked', 'impediment', 'issue', 'problem', 'challenge', 'bug', 'fix', 'troubleshoot'],
    planning: ['planned', 'scheduled', 'goal', 'objective', 'target', 'milestone', 'deliverable'],
    discussions: ['discussed', 'reviewed', 'analyzed', 'evaluated', 'considered', 'debated', 'presented']
  }
  
  // Score sentences by importance and category
  const scoredSentences = sentences.map(sentence => {
    const lowerSentence = sentence.toLowerCase()
    let score = 0
    let categories = []
    
    // Calculate score based on keyword categories
    Object.entries(keywordCategories).forEach(([category, keywords]) => {
      const categoryScore = keywords.reduce((acc, keyword) => {
        return acc + (lowerSentence.includes(keyword) ? 1 : 0)
      }, 0)
      
      if (categoryScore > 0) {
        score += categoryScore * (category === 'decisions' ? 3 : category === 'actions' ? 2.5 : 2)
        categories.push(category)
      }
    })
    
    // Bonus for sentences with multiple important elements
    if (lowerSentence.includes('decided') && lowerSentence.includes('because')) score += 2
    if (lowerSentence.includes('action') && lowerSentence.includes('by')) score += 2
    if (lowerSentence.includes('deadline') || lowerSentence.includes('due')) score += 1.5
    
    return { sentence: sentence.trim(), score, categories }
  })
  
  // Sort by score and take the most important ones
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(item => item.sentence)
  
  return topSentences.length > 0 ? topSentences : ['No clear key points could be extracted from the meeting notes']
}

// Calculate quality metrics for the summary
function calculateQualityMetrics(summary: string[], actionItems: string[], sopCheck: string[], input: string) {
  // Completeness: How well the summary covers the input content
  const inputLength = input.length
  const summaryLength = summary.join(' ').length
  
  // Better completeness calculation based on content coverage
  const inputWords = input.toLowerCase().split(/\s+/).filter(word => word.length > 3)
  const summaryWords = summary.join(' ').toLowerCase().split(/\s+/).filter(word => word.length > 3)
  
  // Calculate word overlap as a measure of content coverage
  const uniqueInputWords = new Set(inputWords)
  const uniqueSummaryWords = new Set(summaryWords)
  const overlap = [...uniqueSummaryWords].filter(word => uniqueInputWords.has(word)).length
  const completeness = Math.min(overlap / Math.max(uniqueInputWords.size * 0.3, 1), 1)
  
  // Clarity: Based on sentence structure, readability, and coherence
  const avgSentenceLength = summary.reduce((acc, item) => acc + item.length, 0) / summary.length
  const sentenceVariety = new Set(summary.map(s => s.length)).size / summary.length
  
  // Optimal sentence length is 40-80 characters with good variety
  const lengthScore = Math.max(0, 1 - Math.abs(avgSentenceLength - 60) / 40)
  const varietyScore = Math.min(sentenceVariety, 1)
  const clarity = (lengthScore * 0.7 + varietyScore * 0.3)
  
  // Actionability: Based on action items, SOP compliance, and decision clarity
  const actionItemScore = Math.min(actionItems.length / 3, 1) // Target 3 action items
  const sopScore = sopCheck.filter(item => item.includes('✅')).length / sopCheck.length
  const decisionScore = summary.some(s => 
    s.toLowerCase().includes('decided') || 
    s.toLowerCase().includes('agreed') || 
    s.toLowerCase().includes('concluded')
  ) ? 0.5 : 0
  
  const actionability = (actionItemScore * 0.4 + sopScore * 0.4 + decisionScore * 0.2)
  
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

// Test function to validate improvements
export async function testSummaryImprovements(): Promise<void> {
  const testCases = [
    {
      name: 'Standup Meeting',
      input: 'Daily standup: John completed the user authentication feature yesterday. Sarah is working on the database migration today. Mike is blocked on the API integration due to missing documentation. Tomorrow we need to review the sprint progress and plan next week\'s tasks.',
      expectedType: 'standup'
    },
    {
      name: 'Decision Meeting',
      input: 'We discussed three options for the payment system: Stripe, PayPal, and Square. After reviewing pros and cons, we decided to go with Stripe because of better documentation and lower fees. The implementation deadline is next Friday.',
      expectedType: 'decision'
    },
    {
      name: 'Planning Meeting',
      input: 'Sprint planning session: We estimated 5 user stories for the next sprint. The login feature is high priority and needs to be completed by end of week. We assigned John to the frontend work and Sarah to the backend API development.',
      expectedType: 'planning'
    }
  ]
  
  console.log('🧪 Testing Summary Improvements...')
  
  for (const testCase of testCases) {
    try {
      const result = await summarizeNotes(testCase.input)
      console.log(`\n✅ ${testCase.name}:`)
      console.log(`   Meeting Type: ${result.meetingType} (expected: ${testCase.expectedType})`)
      console.log(`   Summary Points: ${result.summary.length}`)
      console.log(`   Confidence Score: ${result.confidenceScore}`)
      console.log(`   Quality Metrics:`, result.qualityMetrics)
      
      // Validate meeting type detection
      if (result.meetingType === testCase.expectedType) {
        console.log(`   ✅ Meeting type detection: PASS`)
      } else {
        console.log(`   ❌ Meeting type detection: FAIL (got ${result.meetingType}, expected ${testCase.expectedType})`)
      }
      
      // Validate summary quality
      if (result.summary.length >= 2 && result.confidenceScore && result.confidenceScore > 0.5) {
        console.log(`   ✅ Summary quality: PASS`)
      } else {
        console.log(`   ❌ Summary quality: FAIL`)
      }
      
    } catch (error) {
      console.log(`   ❌ ${testCase.name}: ERROR - ${error}`)
    }
  }
  
  console.log('\n🎉 Summary improvement testing completed!')
}

// Demo mode function that works without API keys
function generateDemoOutput(input: string): Promise<SummaryOutput> {
  // Simulate processing delay
  return new Promise((resolve) => {
    setTimeout(() => {
      const summary = [
        'Meeting discussed key project updates',
        'Team reviewed current progress and blockers',
        'Decisions made on next phase priorities'
      ]
      
      const actionItems = extractActionItems(input)
      const sopCheck = performSOPCheck(input)
      const probingQuestions = generateProbingQuestions(input)
      
      resolve({
        summary: summary.length > 0 ? summary : ['Demo summary generated'],
        actionItems: actionItems.length > 0 ? actionItems : ['Demo action item'],
        sopCheck: sopCheck.length > 0 ? sopCheck : ['✅ Demo SOP check'],
        probingQuestions: probingQuestions.length > 0 ? probingQuestions : ['Demo probing question']
      })
    }, 1000) // 1 second delay to simulate API call
  })
}
