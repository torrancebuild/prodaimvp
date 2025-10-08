'use client'

import { useEffect, useRef, useState } from 'react'
import { saveNote, getNotes } from '@/lib/supabase'
import ProcessingProgress from './components/ProcessingProgress'
import type { SummaryOutput } from '@/lib/ai'

interface Note {
  id: string
  title: string
  input: string
  output: string
  created_at: string
}


export default function Home() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<SummaryOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<Note[]>([])
  const [inputError, setInputError] = useState('')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current)
      }
    }
  }, [])

  const validateInput = (text: string): string => {
    if (!text.trim()) {
      return 'Please enter some meeting notes'
    }
    if (text.trim().length < 10) {
      return 'Please enter at least 10 characters of meeting notes'
    }
    if (text.length > 1000) {
      return 'Meeting notes cannot exceed 1000 characters'
    }
    return ''
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setInput(newValue)
    
    // Clear previous errors when user starts typing
    if (inputError) {
      setInputError('')
    }
    
    // Validate in real-time
    const validationError = validateInput(newValue)
    if (validationError && newValue.length > 0) {
      setInputError(validationError)
    } else {
      setInputError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate input before submitting
    const validationError = validateInput(input)
    if (validationError) {
      setInputError(validationError)
      return
    }

    setLoading(true)
    setError('')
    setInputError('')
    
    try {
      // Call the API route instead of the direct function
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process notes')
      }

      const result = await response.json()
      setOutput(result)
      
      // Save to history
      const title = input.slice(0, 50) + (input.length > 50 ? '...' : '')
      const outputString = JSON.stringify(result)
      await saveNote(title, input, outputString)
      
      // Refresh history
      const notes = await getNotes()
      setHistory(notes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing your notes')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!output) return

    const formatSentenceCase = (value: string) =>
      value
        .replace(/([A-Z])/g, ' $1')
        .replace(/\b\w/g, char => char.toUpperCase())
        .trim()

    const lines: string[] = []
    lines.push('MEETING INTELLIGENCE REPORT')

    if (output.meetingType) {
      lines.push(`Meeting Type: ${formatSentenceCase(output.meetingType.replace(/-/g, ' '))}`)
    }


    const addSection = (title: string, entries: string[]) => {
      lines.push('')
      lines.push(`${title}:`)
      if (entries.length > 0) {
        lines.push(...entries)
      } else {
        lines.push('- None')
      }
    }

    addSection('SUMMARY POINTS', output.summaryPoints.map(item => `- ${item}`))

    // Add development team sections
    if (output.developmentTeamSections) {
      // Key Decisions & Progress
      const decisions = output.developmentTeamSections.keyDecisionsAndProgress.decisions.map(decision => {
        const details: string[] = [
          `Rationale: ${decision.rationale}`,
          `Impact: ${decision.impact.toUpperCase()}`
        ]
        if (decision.owner) details.push(`Owner: ${decision.owner}`)
        if (decision.deadline) details.push(`Deadline: ${decision.deadline}`)
        return `- ${decision.decision}\n  ${details.join(' | ')}`
      })
      const progress = output.developmentTeamSections.keyDecisionsAndProgress.progressUpdates.map(item => `- ✓ ${item}`)
      addSection('KEY DECISIONS & PROGRESS', [
        'Decisions Made:',
        ...decisions,
        'Progress Updates:',
        ...progress
      ])

      // Action Items with Ownership
      const actionItems = output.developmentTeamSections.actionItemsAndOwnership.map(item => {
        const details: string[] = [
          `Owner: ${item.owner}`,
          `Deadline: ${item.deadline || 'TBD'}`,
          `Priority: ${item.priority.toUpperCase()}`
        ]
        if (item.successCriteria) {
          details.push(`Success: ${item.successCriteria}`)
        }
        return `- ${item.task}\n  ${details.join(' | ')}`
      })
      addSection('ACTION ITEMS WITH OWNERSHIP', actionItems)

      // Blockers & Next Steps
      const blockers = output.developmentTeamSections.blockersAndNextSteps.currentBlockers.map(item => `- ⚠️ ${item}`)
      const upcoming = output.developmentTeamSections.blockersAndNextSteps.upcomingItems.map(item => `- → ${item}`)
      addSection('BLOCKERS & NEXT STEPS', [
        'Current Blockers:',
        ...blockers,
        'Upcoming Items:',
        ...upcoming
      ])
    }

    addSection('OPEN QUESTIONS', output.openQuestions.map(question => `- ${question}`))


    const reportText = lines.join('\n').trim()

    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error('Clipboard API not available')
      }

      await navigator.clipboard.writeText(reportText)
      setCopyStatus('success')
    } catch (err) {
      setCopyStatus('error')
      console.error('Failed to copy report', err)
    } finally {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current)
      }

      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setCopyStatus('idle')
      }, 2500)
    }
  }

  const loadHistory = async () => {
    try {
      const notes = await getNotes()
      setHistory(notes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    }
  }

  return (
    <main>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Development Team Meeting Notes
            </label>
            <span className={`text-xs ${inputError ? 'text-red-500' : input.length > 900 ? 'text-amber-600' : 'text-gray-400'}`}>
              {input.length}/1000
            </span>
          </div>
          <textarea
            id="notes"
            value={input}
            onChange={handleInputChange}
            placeholder="Paste your development team meeting notes here..."
            className={`input-field text-sm leading-5 resize-none ${inputError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''} ${input.length > 900 ? 'border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500' : ''}`}
            rows={6}
            maxLength={1000}
            required
          />
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  inputError 
                    ? 'bg-red-500' 
                    : input.length > 900 
                      ? 'bg-yellow-500' 
                      : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((input.length / 1000) * 100, 100)}%` }}
              ></div>
            </div>
            
            {input.length > 800 && input.length <= 900 && (
              <div className="text-xs text-yellow-600 mt-1">⚠️ Approaching character limit</div>
            )}
            {input.length > 950 && (
              <div className="text-xs text-red-600 mt-1">🚨 Very close to character limit</div>
            )}
          </div>
          {inputError && (
            <div className="text-sm text-red-600 mt-1">⚠️ {inputError}</div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !input.trim() || inputError !== ''}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm px-4 py-2"
        >
          <span>🚀</span>
          {loading ? 'Processing...' : 'Analyze Meeting Notes'}
        </button>
        
        <ProcessingProgress isVisible={loading} />
        
        {inputError && (
          <p className="text-sm text-red-600 mt-2">
            Please fix the input errors before submitting.
          </p>
        )}
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <p className="text-red-800 font-medium">Error:</p>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {output && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">📊 Development Team Meeting Report</h2>
              <p className="text-sm text-gray-600 mt-1">
                Meeting Type: <span className="font-medium capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Development Team Meeting</span>
              </p>
            </div>
            <button
              onClick={copyToClipboard}
              className="btn-secondary flex items-center gap-2"
              type="button"
            >
              <span>{copyStatus === 'success' ? '✅' : copyStatus === 'error' ? '⚠️' : '📋'}</span>
              <span className="sr-only">Copy status</span>
              <span aria-hidden="true">
                {copyStatus === 'success'
                  ? 'Copied!'
                  : copyStatus === 'error'
                    ? 'Copy Failed'
                    : 'Copy Full Report'}
              </span>
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {/* Key Decisions & Progress */}
            {output.developmentTeamSections && (
              <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2 text-lg">
                  💡 Key Decisions & Progress
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Decisions Made</h4>
                    <div className="flex flex-col gap-3">
                      {output.developmentTeamSections.keyDecisionsAndProgress.decisions.map((decision, index) => (
                        <div key={index} className="bg-white rounded-lg p-4 border border-blue-100">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium text-gray-900 leading-snug">{decision.decision}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              decision.impact === 'high' ? 'bg-red-100 text-red-800' :
                              decision.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {decision.impact.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2"><strong>Rationale:</strong> {decision.rationale}</p>
                          {decision.owner && (
                            <p className="text-xs text-blue-600"><strong>Owner:</strong> {decision.owner}</p>
                          )}
                          {decision.deadline && (
                            <p className="text-xs text-blue-600"><strong>Deadline:</strong> {decision.deadline}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Progress Updates</h4>
                    <ul className="space-y-1">
                      {output.developmentTeamSections.keyDecisionsAndProgress.progressUpdates.map((item, index) => (
                        <li key={index} className="text-blue-700 flex items-start gap-2 text-sm">
                          <span className="text-blue-600 mt-1">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Action Items with Ownership */}
            {output.developmentTeamSections && (
              <section className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2 text-lg">
                  ✅ Action Items with Ownership
                </h3>
                <div className="flex flex-col gap-3">
                  {output.developmentTeamSections.actionItemsAndOwnership.map((item, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-green-100">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-gray-900 leading-snug">{item.task}</h4>
                        {item.priority && (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.priority === 'high' ? 'bg-red-100 text-red-800' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                        <span><strong>Owner:</strong> {item.owner}</span>
                        <span><strong>Deadline:</strong> {item.deadline || 'TBD'}</span>
                        {item.successCriteria && (
                          <span><strong>Success:</strong> {item.successCriteria}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Blockers & Next Steps */}
            {output.developmentTeamSections && (
              <section className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="font-semibold text-orange-900 mb-4 flex items-center gap-2 text-lg">
                  🚧 Blockers & Next Steps
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-orange-800 mb-2">Current Blockers</h4>
                    <ul className="space-y-1">
                      {output.developmentTeamSections.blockersAndNextSteps.currentBlockers.map((item, index) => (
                        <li key={index} className="text-orange-700 flex items-start gap-2 text-sm">
                          <span className="text-orange-600 mt-1">⚠️</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-orange-800 mb-2">Upcoming Items</h4>
                    <ul className="space-y-1">
                      {output.developmentTeamSections.blockersAndNextSteps.upcomingItems.map((item, index) => (
                        <li key={index} className="text-orange-700 flex items-start gap-2 text-sm">
                          <span className="text-orange-600 mt-1">→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Open Questions - Always shown */}
            <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 xl:col-span-3">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                ❓ Open Questions
              </h3>
              <ul className="flex flex-col gap-2">
                {output.openQuestions.map((question, index) => (
                  <li key={index} className="text-gray-700 flex items-start gap-2">
                    <span className="text-gray-500 mt-1">•</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </section>

          </div>
        </div>
      )}

      <div className="mt-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">History</h2>
          <button
            onClick={loadHistory}
            className="btn-secondary"
          >
            Load History
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-gray-500 italic">No notes in history yet</p>
        ) : (
          <div className="space-y-3">
            {history.map((note) => (
              <div key={note.id} className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-1">{note.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{note.input}</p>
                <p className="text-xs text-gray-500">
                  {new Date(note.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
