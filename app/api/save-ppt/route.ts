import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

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
    
    // Create public directory if it doesn't exist
    const publicDir = join(process.cwd(), 'public', 'presentations')
    try {
      await mkdir(publicDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Save HTML file
    const filePath = join(publicDir, `${presentationId}.html`)
    await writeFile(filePath, html, 'utf-8')

    // Return preview URL
    return NextResponse.json({
      success: true,
      previewUrl: `/preview/${presentationId}`,
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

