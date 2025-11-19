'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function PreviewPage() {
  const params = useParams()
  const id = params.id as string
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPresentation = async () => {
      try {
        const response = await fetch(`/api/preview/${id}`)
        if (!response.ok) {
          throw new Error('Presentation not found')
        }
        const htmlContent = await response.text()
        setHtml(htmlContent)
      } catch (err) {
        console.error('Load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load presentation')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadPresentation()
    }
  }, [id])

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="text-white text-lg">Loading presentation...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="text-red-500 text-lg">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-black">
      <iframe
        srcDoc={html}
        className="w-full h-full border-0"
        title="Presentation Preview"
        style={{ display: 'block' }}
      />
    </div>
  )
}
