import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Meeting Notes Summarizer',
  description: 'Transform messy meeting notes into structured, shareable outputs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI Meeting Notes Summarizer
            </h1>
            <p className="text-gray-600">
              Transform your messy meeting notes into structured, shareable outputs
            </p>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
