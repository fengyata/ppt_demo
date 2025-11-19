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
    const blob = await put(`presentations/${presentationId}.html`, html, {
      access: 'public',
      contentType: 'text/html',
    })
    
    // Return preview URL (use the blob URL directly)
    return NextResponse.json({
      success: true,
      previewUrl: `/preview/${presentationId}`,
      blobUrl: blob.url, // Store blob URL for direct access if needed
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
