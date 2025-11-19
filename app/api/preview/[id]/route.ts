import { NextRequest, NextResponse } from 'next/server'
import { list } from '@vercel/blob'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const blobPath = `presentations/${id}.html`
    
    // List blobs to find the one we need
    // Since @vercel/blob doesn't have a direct get method, we use list
    const { blobs } = await list({
      prefix: blobPath,
    })
    
    // Find exact match
    const blob = blobs.find(b => b.pathname === blobPath)
    
    if (!blob) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      )
    }
    
    // Fetch the content from the public blob URL
    const response = await fetch(blob.url)
    if (!response.ok) {
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
