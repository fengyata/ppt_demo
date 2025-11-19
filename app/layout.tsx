import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI PPT Generator',
  description: 'Generate beautiful PPTs using AI SDK 5.x and Gemini 3 Pro',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

