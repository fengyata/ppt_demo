import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const { outline, userPrompt } = await request.json()

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_GENERATIVE_AI_API_KEY is not set' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'models/gemini-3-pro-preview' })

    // Parse outline to extract slide information
    const slides = parseOutline(outline)
    const totalSlides = slides.length

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let allSlidesHtml = ''
        const baseHtml = getBaseHtmlTemplate()

        try {
          // Send start event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'start', total: totalSlides })}\n\n`)
          )

          // Generate all slides in parallel for maximum speed
          const slidePromises = slides.map(async (slide, index) => {
            const slideIndex = index
            
            // Ultimate Minimalist Prompt:
            // Removed all design directives. Just pure content + technical requirement.
            
            const slidePrompt = `Generate the HTML for a single presentation slide.

User Request: "${userPrompt}"
Slide Content:
${slide.content}

Technical Requirements (STRICT):
1. Output ONLY valid HTML for a single \`div\` with class "slide".
2. The outer container MUST be: \`<div class="slide" id="slide${slideIndex + 1}">...</div>\`
3. Scope all CSS to this ID (#slide${slideIndex + 1}) to prevent conflicts.
4. Do NOT include \`<html>\`, \`<head>\`, or \`<body>\` tags.
5. You may use Unsplash images for backgrounds.

Design:
Create the most beautiful, modern, and appropriate design for this content. Surprise me.`

            const result = await model.generateContent(slidePrompt)
            const response = await result.response
            let slideHtml = response.text()

            // Clean markdown code block markers
            slideHtml = slideHtml.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim()

            // Ensure proper slide format
            if (!slideHtml.includes('<div') && !slideHtml.includes('.slide')) {
              slideHtml = `<div class="slide" id="slide${slideIndex + 1}">
                <div class="content">
                    ${slideHtml}
                </div>
            </div>`
            } else if (!slideHtml.includes('class="slide"') && !slideHtml.includes("class='slide'")) {
              slideHtml = slideHtml.replace(/<div/g, '<div class="slide"').replace(/class="slide"/g, `class="slide" id="slide${slideIndex + 1}"`)
            }

            return { slideIndex, slideHtml }
          })

          // Generate all slides in parallel and track progress
          let completedCount = 0
          const results = await Promise.all(
            slidePromises.map(async (promise, index) => {
              const result = await promise
              completedCount++
              // Send progress update
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'progress', current: completedCount, total: totalSlides, slideNumber: completedCount })}\n\n`
                )
              )
              return result
            })
          )

          // Sort by slide index and combine
          for (const { slideIndex, slideHtml } of results.sort((a, b) => a.slideIndex - b.slideIndex)) {
            allSlidesHtml += slideHtml + '\n'
          }

          // Combine full HTML
          const fullHtml = baseHtml.replace('<!-- SLIDES_PLACEHOLDER -->', allSlidesHtml)

          // Send complete event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'complete', html: fullHtml })}\n\n`
            )
          )

          controller.close()
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('PPT generation error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate PPT', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Parse outline to extract slide information
function parseOutline(outline: string): Array<{ content: string }> {
  const slides: Array<{ content: string }> = []
  const lines = outline.split('\n')
  
  let currentSlide: { content: string } | null = null
  let slideContent: string[] = []

  for (const line of lines) {
    // Detect new slide start (## or # at the beginning)
    if (line.match(/^##?\s*(Slide|Page)\s*\d+[:：]/i) || line.match(/^##?\s*\d+[:：]/)) {
      // Save previous slide
      if (currentSlide) {
        currentSlide.content = slideContent.join('\n')
        slides.push(currentSlide)
      }
      // Start new slide
      currentSlide = { content: '' }
      slideContent = [line]
    } else if (currentSlide) {
      slideContent.push(line)
    }
  }

  // Save last slide
  if (currentSlide) {
    currentSlide.content = slideContent.join('\n')
    slides.push(currentSlide)
  }

  // If no slides parsed, use entire outline as one slide
  if (slides.length === 0) {
    slides.push({ content: outline })
  }

  return slides
}

// Get base HTML template
function getBaseHtmlTemplate(): string {
  // Removed hardcoded font-family from body to allow slides to define their own
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Generated PPT</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            /* Removed default font to allow slides to define their own typography */
            overflow-x: hidden;
            background: #000;
            color: white;
        }
        .slide-container {
            scroll-snap-type: y mandatory;
            overflow-y: scroll;
            height: 100vh;
        }
        .slide {
            width: 100vw;
            height: 100vh;
            scroll-snap-align: start;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background-size: cover;
            background-position: center;
        }
    </style>
</head>
<body>
    <div class="slide-container">
        <!-- SLIDES_PLACEHOLDER -->
    </div>
</body>
</html>`
}
