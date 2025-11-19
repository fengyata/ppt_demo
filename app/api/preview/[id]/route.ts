import { NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Get the blob from Vercel Blob Storage
    const blob = await get(`presentations/${id}.html`)
    
    if (!blob) {
      return NextResponse.json(
        { error: 'Presentation not found' },
        { status: 404 }
      )
    }

    // Convert blob to text
    const html = await blob.text()

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
