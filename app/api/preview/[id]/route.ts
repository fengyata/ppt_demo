import { NextRequest, NextResponse } from 'next/server'
import { list } from '@vercel/blob'
import { blobUrlCache } from '@/lib/blob-cache'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const blobPath = `presentations/${id}.html`
    
    // First, try to get from cache (fastest)
    const cachedUrl = blobUrlCache.get(id)
    if (cachedUrl) {
      try {
        const response = await fetch(cachedUrl)
        if (response.ok) {
          const html = await response.text()
          return new NextResponse(html, {
            headers: {
              'Content-Type': 'text/html',
              'Cache-Control': 'public, max-age=3600',
            },
          })
        }
      } catch (error) {
        // If cached URL fails, continue to search in blob storage
        console.warn('Cached URL failed, searching in blob storage:', error)
      }
    }
    
    // If not in cache or cache failed, search in blob storage
    const { blobs } = await list({
      prefix: 'presentations/',
    })
    
    // Find blob by ID in pathname or URL
    const blob = blobs.find(b => {
      // Check if pathname contains the ID
      if (b.pathname.includes(id)) return true
      // Check if URL contains the ID
      if (b.url.includes(id)) return true
      return false
    })
    
    if (!blob) {
      console.error(`Blob not found for ID: ${id}`)
      console.error(`Searched path: ${blobPath}`)
      console.error(`Available blobs count: ${blobs.length}`)
      if (blobs.length > 0) {
        console.error(`Sample blob paths:`, blobs.slice(0, 3).map(b => b.pathname))
      }
      return NextResponse.json(
        { error: 'Presentation not found', id, path: blobPath },
        { status: 404 }
      )
    }
    
    // Cache the URL for future requests
    blobUrlCache.set(id, blob.url)
    
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
