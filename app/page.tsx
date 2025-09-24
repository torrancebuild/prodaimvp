'use client'

import { useState } from 'react'
import { summarizeNotes } from '@/lib/ai'
import { saveNote, getNotes } from '@/lib/supabase'

interface Note {
  id: string
  title: string
  input: string
  output: string
  created_at: string
}

interface SummaryOutput {
  summary: string[]
  actionItems: string[]
  sopCheck: string[]
  probingQuestions: string[]
}

export default function Home() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<SummaryOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<Note[]>([])
  const [inputError, setInputError] = useState('')

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
      const result = await summarizeNotes(input)
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

  const copyToClipboard = () => {
    if (!output) return
    
    const text = `SUMMARY:\n${output.summary.map(item => `• ${item}`).join('\n')}\n\nACTION ITEMS:\n${output.actionItems.map(item => `• ${item}`).join('\n')}\n\nSOP CHECK:\n${output.sopCheck.map(item => `• ${item}`).join('\n')}\n\nPROBING QUESTIONS:\n${output.probingQuestions.map(question => `• ${question}`).join('\n')}`
    navigator.clipboard.writeText(text)
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Notes
          </label>
          <textarea
            id="notes"
            value={input}
            onChange={handleInputChange}
            placeholder="Paste your messy meeting notes here..."
            className={`input-field ${inputError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''} ${input.length > 900 ? 'border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500' : ''}`}
            rows={8}
            maxLength={1000}
            required
          />
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <div className={`text-sm ${inputError ? 'text-red-600' : input.length > 900 ? 'text-yellow-600' : 'text-gray-500'}`}>
                {input.length}/1000 characters
              </div>
              {input.length > 0 && !inputError && (
                <div className="text-xs text-green-600">
                  ✓ Valid input
                </div>
              )}
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  inputError 
                    ? 'bg-red-500' 
                    : input.length > 900 
                      ? 'bg-yellow-500' 
                      : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((input.length / 1000) * 100, 100)}%` }}
              ></div>
            </div>
            
            {/* Character limit warnings */}
            {input.length > 800 && input.length <= 900 && (
              <div className="text-xs text-yellow-600 mt-1">
                ⚠️ Approaching character limit
              </div>
            )}
            {input.length > 950 && (
              <div className="text-xs text-red-600 mt-1">
                🚨 Very close to character limit
              </div>
            )}
          </div>
          {inputError && (
            <div className="text-sm text-red-600 mt-1">
              ⚠️ {inputError}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !input.trim() || inputError !== ''}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Summarize Notes'}
        </button>
        
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Generated Summary</h2>
            <button
              onClick={copyToClipboard}
              className="btn-secondary"
            >
              Copy to Clipboard
            </button>
          </div>

          <div className="output-section">
            <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
            <ul className="list-disc list-inside space-y-1">
              {output.summary.map((item, index) => (
                <li key={index} className="text-gray-700">{item}</li>
              ))}
            </ul>
          </div>

          <div className="output-section">
            <h3 className="font-medium text-gray-900 mb-2">Action Items</h3>
            <ul className="list-disc list-inside space-y-1">
              {output.actionItems.map((item, index) => (
                <li key={index} className="text-gray-700">{item}</li>
              ))}
            </ul>
          </div>

          <div className="output-section">
            <h3 className="font-medium text-gray-900 mb-2">SOP Check</h3>
            <ul className="list-disc list-inside space-y-1">
              {output.sopCheck.map((item, index) => (
                <li key={index} className={item.includes('⚠️') ? 'sop-warning' : 'text-gray-700'}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="output-section">
            <h3 className="font-medium text-gray-900 mb-2">Probing Questions</h3>
            <ul className="list-disc list-inside space-y-1">
              {output.probingQuestions.map((question, index) => (
                <li key={index} className="text-gray-700">{question}</li>
              ))}
            </ul>
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
