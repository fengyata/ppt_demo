'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { PPTPreview } from '@/components/PPTPreview'

export default function PreviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPresentation = async () => {
      try {
        // Check if blob URL is provided as query parameter (direct access)
        const blobUrl = searchParams.get('url')
        if (blobUrl) {
          const response = await fetch(blobUrl)
          if (response.ok) {
            const htmlContent = await response.text()
            setHtml(htmlContent)
            setLoading(false)
            return
          }
        }
        
        // Otherwise, use API route
        const response = await fetch(`/api/preview/${id}`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Presentation not found')
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
  }, [id, searchParams])

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-muted-foreground text-sm">Loading presentation...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground p-4">
        <div className="text-xl font-semibold mb-2 text-destructive">Error Loading Presentation</div>
        <div className="text-muted-foreground text-center max-w-md">{error}</div>
        <div className="mt-4 text-xs text-muted-foreground/50">ID: {id}</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-full h-full bg-background">
        <PPTPreview html={html} autoShow={true} showThumbnails={true} className="border-none rounded-none" />
    </div>
  )
}
