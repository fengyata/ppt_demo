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
    // According to Vercel Blob docs: https://vercel.com/docs/vercel-blob
    // - Use put() for server-side uploads
    // - Set access: 'public' for public URLs
    // - Set contentType for proper MIME type
    const blob = await put(`presentations/${presentationId}.html`, html, {
      access: 'public',
      contentType: 'text/html',
    })
    
    // Return preview URL with blob URL
    // The blob.url is a public URL that can be accessed directly
    return NextResponse.json({
      success: true,
      previewUrl: `/preview/${presentationId}`,
      blobUrl: blob.url, // Public blob URL from Vercel Blob
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
