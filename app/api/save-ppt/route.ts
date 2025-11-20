import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    const { html } = await request.json()

    if (!html) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      )
    }

    // Generate unique ID for the presentation
    const presentationId = randomUUID()
    
    // Upload HTML to Vercel Blob Storage
    // We set addRandomSuffix: false to ensure the filename matches exactly what we expect
    // so we can retrieve it by ID later in the preview route.
    const blob = await put(`presentations/${presentationId}.html`, html, {
      access: 'public',
      contentType: 'text/html',
      addRandomSuffix: false, 
    })
    
    // Return preview URL with blob URL
    return NextResponse.json({
      success: true,
      previewUrl: `/preview/${presentationId}`,
      blobUrl: blob.url, 
      presentationId,
    })
  } catch (error) {
    console.error('Error saving PPT:', error)
    return NextResponse.json(
      { error: 'Failed to save presentation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
