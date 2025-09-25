import type { Metadata } from 'next'
import './globals.css'
import { getVersionDisplay } from '@/lib/version'

export const metadata: Metadata = {
  title: 'AI Meeting Notes Summarizer',
  description: 'Transform messy meeting notes into structured, shareable outputs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const versionDisplay = getVersionDisplay();
  
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <header className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  AI Meeting Notes Summarizer
                </h1>
                <p className="text-gray-600">
                  Transform your messy meeting notes into structured, shareable outputs
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  v{versionDisplay.version}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {versionDisplay.commit}
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  {versionDisplay.feature}
                </div>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
