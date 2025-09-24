export interface SummaryOutput {
  summary: string[]
  actionItems: string[]
  sopCheck: string[]
  probingQuestions: string[]
}

export async function summarizeNotes(input: string): Promise<SummaryOutput> {
  try {
    // If no API key is configured, use fallback demo mode
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.log('No API key configured, using demo mode')
      return generateDemoOutput(input)
    }

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
          inputs: input,
          parameters: {
            max_length: 150,
            min_length: 30
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

    // Parse the input to extract action items and perform SOP check
    const actionItems = extractActionItems(input)
    const sopCheck = performSOPCheck(input)
    const probingQuestions = generateProbingQuestions(input)

    // Split summary into bullet points
    const summary = summaryText.split('. ').map(item => 
      item.trim().replace(/\.$/, '')
    ).filter(item => item.length > 0)

    return {
      summary: summary.length > 0 ? summary : ['No clear summary could be generated'],
      actionItems: actionItems.length > 0 ? actionItems : ['No action items identified'],
      sopCheck: sopCheck,
      probingQuestions: probingQuestions
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
  const lowerText = text.toLowerCase()
  
  // Check for Goals
  const goalKeywords = ['goal', 'objective', 'purpose', 'aim', 'target']
  const hasGoals = goalKeywords.some(keyword => lowerText.includes(keyword))
  sopResults.push(hasGoals ? '✅ Goals covered' : '⚠️ Goals missing')
  
  // Check for Decisions
  const decisionKeywords = ['decided', 'decision', 'agreed', 'concluded', 'resolved', 'chose']
  const hasDecisions = decisionKeywords.some(keyword => lowerText.includes(keyword))
  sopResults.push(hasDecisions ? '✅ Decisions documented' : '⚠️ Decisions missing')
  
  // Check for Next Steps
  const nextStepKeywords = ['next', 'follow up', 'action', 'todo', 'deadline', 'due', 'schedule']
  const hasNextSteps = nextStepKeywords.some(keyword => lowerText.includes(keyword))
  sopResults.push(hasNextSteps ? '✅ Next steps defined' : '⚠️ Next steps missing')
  
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

// Demo mode function that works without API keys
function generateDemoOutput(input: string): SummaryOutput {
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
