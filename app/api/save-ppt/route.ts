import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { put } from '@vercel/blob'

// Simple in-memory cache to map ID to blob URL
// In production, consider using Vercel KV for persistence
const blobUrlCache = new Map<string, string>()

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
    
    // Cache the blob URL for quick lookup
    blobUrlCache.set(presentationId, blob.url)
    
    // Return preview URL with blob URL
    return NextResponse.json({
      success: true,
      previewUrl: `/preview/${presentationId}`,
      blobUrl: blob.url, // Public blob URL (can be used directly)
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

// Export cache for use in preview route
export { blobUrlCache }
