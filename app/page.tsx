'use client'

import { useEffect, useRef, useState } from 'react'
import { saveNote, getNotes } from '@/lib/supabase'
import ProcessingProgress from './components/ProcessingProgress'
import type { MeetingType } from '@/lib/ai'

interface Note {
  id: string
  title: string
  input: string
  output: string
  created_at: string
}

interface ActionItem {
  task: string
  owner: string
  deadline?: string
  priority: 'high' | 'medium' | 'low'
  dependencies?: string[]
  successCriteria?: string
}

interface SOPCheck {
  category: string
  status: 'compliant' | 'partial' | 'missing'
  details: string
  recommendation?: string
  severity: 'critical' | 'important' | 'minor'
}

interface RiskItem {
  risk: string
  impact: 'high' | 'medium' | 'low'
  probability: 'high' | 'medium' | 'low'
  mitigation: string
  owner?: string
}

interface FollowUpReminder {
  action: string
  dueDate: string
  owner: string
  type: 'follow-up' | 'escalation' | 'review' | 'decision'
}

interface MeetingQualityMetrics {
  overallScore: number
  areas: {
    preparation: number
    participation: number
    decisionMaking: number
    actionClarity: number
    followThrough: number
  }
  recommendations: string[]
}

interface SummaryOutput {
  keyDiscussionPoints: string[]
  nextSteps: ActionItem[]
  sopChecks: SOPCheck[]
  openQuestions: string[]
  meetingType?: string
  riskAssessment?: RiskItem[]
  followUpReminders?: FollowUpReminder[]
  meetingQuality?: MeetingQualityMetrics
}

const MEETING_TYPES: Array<{
  id: MeetingType
  label: string
  description: string
  icon: string
  accent: string
}> = [
  {
    id: 'daily-standup',
    label: 'Daily Standup',
    description: 'Surface blockers, dependencies, and today’s focus',
    icon: '🚀',
    accent: 'blue'
  },
  {
    id: 'weekly-report',
    label: 'Weekly Report',
    description: 'Summarize progress, metrics, and stakeholder updates',
    icon: '📊',
    accent: 'emerald'
  },
  {
    id: 'risk-assessment',
    label: 'Risk Assessment',
    description: 'Identify risks, impact, mitigation, and escalation paths',
    icon: '⚠️',
    accent: 'amber'
  },
  {
    id: 'general',
    label: 'General Meeting',
    description: 'Comprehensive summary for any other meeting type',
    icon: '💼',
    accent: 'slate'
  }
] as const

const MEETING_TYPE_STYLES: Record<MeetingType, { selected: string; unselected: string; badge: string; icon: string; focus: string }> = {
  'daily-standup': {
    selected: 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm',
    unselected: 'border-gray-200 hover:border-blue-300',
    badge: 'bg-blue-500',
    icon: 'text-blue-500',
    focus: 'focus:ring-blue-400'
  },
  'weekly-report': {
    selected: 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm',
    unselected: 'border-gray-200 hover:border-emerald-300',
    badge: 'bg-emerald-500',
    icon: 'text-emerald-500',
    focus: 'focus:ring-emerald-400'
  },
  'risk-assessment': {
    selected: 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm',
    unselected: 'border-gray-200 hover:border-amber-300',
    badge: 'bg-amber-500',
    icon: 'text-amber-500',
    focus: 'focus:ring-amber-400'
  },
  general: {
    selected: 'border-slate-500 bg-slate-50 text-slate-700 shadow-sm',
    unselected: 'border-gray-200 hover:border-slate-300',
    badge: 'bg-slate-500',
    icon: 'text-slate-500',
    focus: 'focus:ring-slate-400'
  }
}

export default function Home() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<SummaryOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<Note[]>([])
  const [inputError, setInputError] = useState('')
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType>('daily-standup')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedType = MEETING_TYPES.find(type => type.id === selectedMeetingType) ?? MEETING_TYPES[0]

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
        body: JSON.stringify({ input, meetingType: selectedMeetingType }),
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

    if (output.meetingQuality) {
      lines.push(`Overall Quality Score: ${output.meetingQuality.overallScore}/10`)
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

    addSection('KEY DISCUSSION POINTS', output.keyDiscussionPoints.map(item => `- ${item}`))

    const actionItems = output.nextSteps.map(item => {
      const details: string[] = [
        `Owner: ${item.owner}`,
        `Deadline: ${item.deadline || 'TBD'}`,
        `Priority: ${item.priority.toUpperCase()}`
      ]

      if (item.successCriteria) {
        details.push(`Success Criteria: ${item.successCriteria}`)
      }

      if (item.dependencies && item.dependencies.length > 0) {
        details.push(`Dependencies: ${item.dependencies.join(', ')}`)
      }

      return `- ${item.task}\n  ${details.join(' | ')}`
    })

    addSection('NEXT STEPS', actionItems)

    const sopChecks = output.sopChecks.map(item => {
      const sopDetails: string[] = [
        `Status: ${item.status.toUpperCase()}`,
        `Severity: ${item.severity.toUpperCase()}`,
        `Details: ${item.details}`
      ]

      if (item.recommendation) {
        sopDetails.push(`Recommendation: ${item.recommendation}`)
      }

      return `- ${item.category}\n  ${sopDetails.join(' | ')}`
    })

    addSection('SOP CHECKS', sopChecks)

    addSection('OPEN QUESTIONS', output.openQuestions.map(question => `- ${question}`))

    const risks = (output.riskAssessment || []).map(item => {
      const riskDetails: string[] = [
        `Impact: ${item.impact.toUpperCase()}`,
        `Probability: ${item.probability.toUpperCase()}`,
        `Mitigation: ${item.mitigation}`
      ]

      if (item.owner) {
        riskDetails.push(`Owner: ${item.owner}`)
      }

      return `- ${item.risk}\n  ${riskDetails.join(' | ')}`
    })

    addSection('RISK ASSESSMENT', risks)

    const reminders = (output.followUpReminders || []).map(item => {
      return `- ${item.action}\n  Type: ${item.type.toUpperCase()} | Due: ${item.dueDate} | Owner: ${item.owner}`
    })

    addSection('FOLLOW-UP REMINDERS', reminders)

    if (output.meetingQuality) {
      const areaScores = Object.entries(output.meetingQuality.areas).map(([area, score]) => `- ${formatSentenceCase(area)}: ${score}/10`)
      addSection('MEETING QUALITY SCORES', areaScores)

      addSection('MEETING QUALITY RECOMMENDATIONS', output.meetingQuality.recommendations.map(rec => `- ${rec}`))
    }

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
          <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">Meeting Type</label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {MEETING_TYPES.map((type) => {
              const isSelected = selectedMeetingType === type.id
              const styles = MEETING_TYPE_STYLES[type.id]

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedMeetingType(type.id)}
                  className={`flex flex-col gap-1.5 rounded-md border px-2.5 py-2 text-left transition-all focus:outline-none focus:ring-1 focus:ring-offset-1 ${isSelected ? styles.selected : styles.unselected} ${styles.focus}`}
                >
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${styles.icon}`}>
                    <span aria-hidden="true" className="text-sm">{type.icon}</span>
                    <span className="text-gray-900">{type.label}</span>
                  </div>
                  <p className="text-[11px] leading-tight text-gray-500">{type.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="notes" className="text-sm font-medium text-gray-700">
              {selectedType.label} Notes
            </label>
            <span className={`text-xs ${inputError ? 'text-red-500' : input.length > 900 ? 'text-amber-600' : 'text-gray-400'}`}>
              {input.length}/1000
            </span>
          </div>
          <textarea
            id="notes"
            value={input}
            onChange={handleInputChange}
            placeholder={`Paste your ${selectedType.label.toLowerCase()} notes here...`}
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
          <span>{selectedType.icon}</span>
          {loading ? 'Processing...' : `Analyze ${selectedType.label}`}
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
              <h2 className="text-2xl font-bold text-gray-900">📊 Meeting Intelligence Report</h2>
              {output.meetingType && (
                <p className="text-sm text-gray-600 mt-1">
                  Meeting Type: <span className="font-medium capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">{output.meetingType.replace('-', ' ')}</span>
                </p>
              )}
              {output.meetingQuality && (
                <p className="text-sm text-gray-600 mt-2">
                  Overall Quality Score: <span className="font-bold text-lg text-green-600">{output.meetingQuality.overallScore}/10</span>
                </p>
              )}
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

          {/* Key Discussion Points */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              💬 Key Discussion Points
            </h3>
            <ul className="space-y-2">
              {output.keyDiscussionPoints.map((item, index) => (
                <li key={index} className="text-blue-800 flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Items */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
              ✅ Action Items & Next Steps
            </h3>
            <div className="space-y-4">
              {output.nextSteps.map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-green-100">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{item.task}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.priority === 'high' ? 'bg-red-100 text-red-800' :
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div><strong>Owner:</strong> {item.owner}</div>
                    <div><strong>Deadline:</strong> {item.deadline || 'TBD'}</div>
                    {item.successCriteria && (
                      <div className="md:col-span-1"><strong>Success:</strong> {item.successCriteria}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SOP Checks */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-orange-900 mb-4 flex items-center gap-2">
              📋 SOP Compliance Check
            </h3>
            <div className="space-y-3">
              {output.sopChecks.map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-orange-100">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{item.category}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'compliant' ? 'bg-green-100 text-green-800' :
                        item.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        item.severity === 'important' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-2">{item.details}</p>
                  {item.recommendation && (
                    <p className="text-sm text-blue-600"><strong>Recommendation:</strong> {item.recommendation}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Risk Assessment */}
          {output.riskAssessment && output.riskAssessment.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
                ⚠️ Risk Assessment
              </h3>
              <div className="space-y-4">
                {output.riskAssessment.map((risk, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-red-100">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{risk.risk}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          risk.impact === 'high' ? 'bg-red-100 text-red-800' :
                          risk.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          Impact: {risk.impact.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          risk.probability === 'high' ? 'bg-red-100 text-red-800' :
                          risk.probability === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          Probability: {risk.probability.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2"><strong>Mitigation:</strong> {risk.mitigation}</p>
                    {risk.owner && (
                      <p className="text-sm text-blue-600"><strong>Owner:</strong> {risk.owner}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up Reminders */}
          {output.followUpReminders && output.followUpReminders.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                🔔 Follow-up Reminders
              </h3>
              <div className="space-y-3">
                {output.followUpReminders.map((reminder, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-purple-100">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{reminder.action}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        reminder.type === 'escalation' ? 'bg-red-100 text-red-800' :
                        reminder.type === 'review' ? 'bg-blue-100 text-blue-800' :
                        reminder.type === 'decision' ? 'bg-purple-100 text-purple-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {reminder.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><strong>Due Date:</strong> {reminder.dueDate}</div>
                      <div><strong>Owner:</strong> {reminder.owner}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open Questions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              ❓ Open Questions
            </h3>
            <ul className="space-y-2">
              {output.openQuestions.map((question, index) => (
                <li key={index} className="text-gray-700 flex items-start gap-2">
                  <span className="text-gray-500 mt-1">•</span>
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Meeting Quality Metrics */}
          {output.meetingQuality && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h3 className="font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                📈 Meeting Quality Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Quality Scores</h4>
                  <div className="space-y-2">
                    {Object.entries(output.meetingQuality.areas).map(([area, score]) => (
                      <div key={area} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">{area.replace(/([A-Z])/g, ' $1')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                score >= 8 ? 'bg-green-500' :
                                score >= 6 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${(score / 10) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-6">{score}/10</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
                  <ul className="space-y-1">
                    {output.meetingQuality.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-indigo-500 mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
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
