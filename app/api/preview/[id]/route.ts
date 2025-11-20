import { NextRequest, NextResponse } from 'next/server'
import { head, list } from '@vercel/blob'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const blobPath = `presentations/${id}.html`
    
    // According to Vercel Blob docs: https://vercel.com/docs/vercel-blob
    // - Use head() to check if blob exists and get metadata
    // - Use list() with prefix to find blobs
    // - Public blobs can be accessed directly via URL
    
    // First, try to use head() to get blob metadata directly
    // This is more efficient than listing all blobs
    try {
      const blob = await head(blobPath)
      
      if (blob) {
        // Fetch the content from the public blob URL
        const response = await fetch(blob.url)
        if (response.ok) {
          const html = await response.text()
          return new NextResponse(html, {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'public, max-age=3600',
            },
          })
        }
      }
    } catch (headError) {
      // If head() fails, try list() as fallback
      console.warn('head() failed, trying list():', headError)
    }
    
    // Fallback: Use list() to find the blob
    // This is less efficient but works if head() doesn't work
    const { blobs } = await list({
      prefix: 'presentations/',
    })
    
    // Find exact match by pathname
    const blob = blobs.find(b => b.pathname === blobPath)
    
    if (!blob) {
      console.error(`Blob not found for ID: ${id}`)
      console.error(`Searched path: ${blobPath}`)
      return NextResponse.json(
        { error: 'Presentation not found', id, path: blobPath },
        { status: 404 }
      )
    }
    
    // Fetch the content from the public blob URL
    const response = await fetch(blob.url)
    if (!response.ok) {
      console.error(`Failed to fetch blob from URL: ${blob.url}, status: ${response.status}`)
      return NextResponse.json(
        { error: 'Failed to fetch presentation' },
        { status: 500 }
      )
    }
    
    const html = await response.text()

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error loading presentation:', error)
    return NextResponse.json(
      { error: 'Failed to load presentation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
