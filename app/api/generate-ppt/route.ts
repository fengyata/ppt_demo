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

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send start event
          const slides = parseOutline(outline)
          const totalSlides = slides.length

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'start', total: totalSlides })}\n\n`)
          )

          // Send an initial progress
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'progress', current: 0, total: totalSlides, slideNumber: 0 })}\n\n`
            )
          )

          // Stream Prompt Strategy:
          // 1. Force CSS/Head first so we can render immediately.
          // 2. Then Body/Slides.
          
          const fullPrompt = `Role: Award-Winning Digital Designer & Creative Coder.
Task: Craft a visually stunning, immersive HTML presentation (PPT) based on the content below.

Context:
- **User Vibe/Request**: "${userPrompt}"
- **Content Outline**:
${outline}

---

### 🎨 Design Directive (The "Gemini" Touch)
Don't just build slides; build an **experience**. 
1.  **Analyze the Topic**: 
    - If Tech/AI: Go for "Dark Mode", "Neon Accents", "Glassmorphism", "Mesh Gradients".
    - If Business: Go for "Swiss Style", "Clean Typography", "Bento Grids", "Whitespace".
    - If Creative: Go "Bold", "Brutalist", or "Editorial".
    - **Priority**: If the user asked for a specific style in "${userPrompt}", OBEY it strictly. Otherwise, surprise me with your best aesthetic judgment.

2.  **Visuals & CSS**:
    - **Typography**: Use Google Fonts. Pair a strong Display font (headings) with a clean Sans/Serif (body).
    - **Backgrounds**: Use CSS \`linear-gradient\`, \`radial-gradient\`, or high-quality Unsplash images (\`source.unsplash.com/random/?{keyword}\`) to create depth.
    - **Components**: layout content using **Cards**, **Split Screens**, **Grids**, and **Big Typography**. Avoid boring bullet lists; turn them into icon grids or feature cards.
    - **Polish**: Add \`box-shadow\`, \`backdrop-filter: blur()\`, \`border-radius\`, and subtle \`animations\` (fade-in, slide-up).

---

### 🛠 Technical Requirements (Streaming Friendly)
1.  **Output**: A single valid HTML file.
2.  **Order**: You MUST output the \`<head>\` and \`<style>\` tags FIRST, completely, before starting the \`<body>\`. This allows real-time rendering.
3.  **Structure**:
    \`\`\`html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <!-- Styles and Fonts -->
        <style>
            /* Define standard variables and .slide-container / .slide classes HERE */
            /* .slide-container { scroll-snap-type: y mandatory; ... } */
            /* .slide { height: 100vh; scroll-snap-align: start; ... } */
        </style>
    </head>
    <body>
        <div class="slide-container">
            <div class="slide" id="slide1"> ... </div>
            <div class="slide" id="slide2"> ... </div>
            ...
        </div>
        <script>
           // Optional: Any lightweight interaction scripts
        </script>
    </body>
    </html>
    \`\`\`

Generate the complete HTML code now, streaming it token by token.`

          const result = await model.generateContentStream(fullPrompt)
          
          let fullHtml = ''
          let slideCount = 0

          for await (const chunk of result.stream) {
            const chunkText = chunk.text()
            fullHtml += chunkText
            
            // Simple heuristic to detect slide completion for progress updates
            // We count closing </div> tags that might correspond to slides, 
            // or just send the raw html chunk for the frontend to handle partial rendering.
            // Sending partial HTML is better for "Realtime Preview".
            
            // Filter out markdown code blocks for the partial stream
            const cleanChunk = chunkText.replace(/```html/g, '').replace(/```/g, '')
            
            controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: cleanChunk })}\n\n`)
            )
            
            // Check for slide endings to update progress count
            const matches = chunkText.match(/<\/div>/g)
            if (matches) {
               // This is a very loose approximation, but fine for visual progress
               // A better way is to count <div class="slide"> in fullHtml
               const slideMatches = fullHtml.match(/<div[^>]*class=["']slide["'][^>]*>/g)
               if (slideMatches && slideMatches.length > slideCount) {
                 slideCount = slideMatches.length
                 controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'progress', current: slideCount, total: totalSlides, slideNumber: slideCount })}\n\n`)
                 )
               }
            }
          }

          // Final cleanup of the full HTML
          fullHtml = fullHtml.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim()

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

// Helper to parse outline count only
function parseOutline(outline: string): Array<{ content: string }> {
  const slides: Array<{ content: string }> = []
  const lines = outline.split('\n')
  let currentSlide: { content: string } | null = null

  for (const line of lines) {
    if (line.match(/^##?\s*(Slide|Page)\s*\d+[:：]/i) || line.match(/^##?\s*\d+[:：]/)) {
      if (currentSlide) slides.push(currentSlide)
      currentSlide = { content: '' }
    } else if (currentSlide) {
      currentSlide.content += line + '\n'
    }
  }
  if (currentSlide) slides.push(currentSlide)
  if (slides.length === 0) slides.push({ content: outline })
  return slides
}
