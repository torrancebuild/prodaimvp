'use client'

import { useState, useEffect } from 'react'

interface ProcessingProgressProps {
  isVisible: boolean
}

interface ProcessingStage {
  id: string
  label: string
  description: string
  estimatedTime: number // in milliseconds
}

const PROCESSING_STAGES: ProcessingStage[] = [
  {
    id: 'analyzing',
    label: 'Analyzing Notes',
    description: 'Reading and understanding your meeting notes...',
    estimatedTime: 800
  },
  {
    id: 'extracting',
    label: 'Extracting Key Points',
    description: 'Identifying important decisions and discussions...',
    estimatedTime: 1000
  },
  {
    id: 'identifying',
    label: 'Identifying Action Items',
    description: 'Finding tasks and responsibilities...',
    estimatedTime: 600
  },
  {
    id: 'checking',
    label: 'Checking SOPs',
    description: 'Validating meeting structure and completeness...',
    estimatedTime: 500
  },
  {
    id: 'generating',
    label: 'Generating Summary',
    description: 'Creating structured output and probing questions...',
    estimatedTime: 700
  },
  {
    id: 'finalizing',
    label: 'Finalizing Results',
    description: 'Preparing your formatted summary...',
    estimatedTime: 400
  }
]

export default function ProcessingProgress({ isVisible }: ProcessingProgressProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isVisible) {
      setCurrentStageIndex(0)
      setProgress(0)
      return
    }

    let totalTime = 0
    let currentTime = 0

    // Calculate total estimated time
    const totalEstimatedTime = PROCESSING_STAGES.reduce((sum, stage) => sum + stage.estimatedTime, 0)

    const interval = setInterval(() => {
      currentTime += 50 // Update every 50ms for smooth progress
      
      // Calculate overall progress
      const overallProgress = Math.min((currentTime / totalEstimatedTime) * 100, 95) // Cap at 95%
      setProgress(overallProgress)

      // Determine current stage based on elapsed time
      let stageTime = 0
      let stageIndex = 0

      for (let i = 0; i < PROCESSING_STAGES.length; i++) {
        stageTime += PROCESSING_STAGES[i].estimatedTime
        if (currentTime <= stageTime) {
          stageIndex = i
          break
        }
      }

      setCurrentStageIndex(Math.min(stageIndex, PROCESSING_STAGES.length - 1))

      // Complete after total time
      if (currentTime >= totalEstimatedTime) {
        clearInterval(interval)
        setProgress(100)
        setCurrentStageIndex(PROCESSING_STAGES.length - 1)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  const currentStage = PROCESSING_STAGES[currentStageIndex]

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-blue-900">
            {currentStage.label}
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            {currentStage.description}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-blue-600 mb-2">
          <span>Processing...</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="flex justify-between text-xs text-blue-600">
        {PROCESSING_STAGES.map((stage, index) => (
          <div 
            key={stage.id}
            className={`flex flex-col items-center ${
              index <= currentStageIndex ? 'text-blue-700' : 'text-blue-400'
            }`}
          >
            <div className={`w-2 h-2 rounded-full mb-1 transition-colors duration-300 ${
              index < currentStageIndex 
                ? 'bg-blue-600' 
                : index === currentStageIndex 
                  ? 'bg-blue-600 animate-pulse' 
                  : 'bg-blue-300'
            }`}></div>
            <span className="text-center leading-tight">
              {stage.label.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Estimated Time */}
      <div className="mt-4 text-xs text-blue-500 text-center">
        This usually takes 3-5 seconds...
      </div>
    </div>
  )
}
