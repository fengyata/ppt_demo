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

          // Send an initial progress to show we are working
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'progress', current: 1, total: totalSlides, slideNumber: 1 })}\n\n`
            )
          )

          // "Design-First" Prompt Strategy
          // Leveraging Gemini 3 Pro's aesthetic capabilities to create high-end visuals.
          
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

### 🛠 Technical Requirements (Strict)
1.  **Output**: A single valid HTML file starting with \`<!DOCTYPE html>\`.
2.  **Structure**:
    \`\`\`html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <!-- Import Google Fonts, Icons (remixicon/font-awesome), and Define Variables in :root -->
        <style>
            /* GLOBAL RESET & THEME */
            :root { --bg: ...; --text: ...; --accent: ...; }
            body { margin: 0; overflow: hidden; background: var(--bg); color: var(--text); font-family: ...; }
            
            /* SLIDE CONTAINER (Required for Navigation) */
            .slide-container { width: 100vw; height: 100vh; overflow-y: scroll; scroll-snap-type: y mandatory; scroll-behavior: smooth; }
            
            /* SLIDE (Required for Layout) */
            .slide { 
                width: 100vw; height: 100vh; scroll-snap-align: start; 
                position: relative; overflow: hidden; 
                display: flex; flex-direction: column; justify-content: center; align-items: center;
                padding: 4rem; box-sizing: border-box;
            }
            
            /* YOUR CUSTOM CLASSES (Cards, Grids, Typography, Animations) */
            .glass-card { ... }
            .gradient-text { ... }
            .animate-in { ... }
        </style>
    </head>
    <body>
        <div class="slide-container">
            <!-- SLIDE 1 -->
            <div class="slide" id="slide1"> ...content... </div>
            <!-- SLIDE 2 -->
            <div class="slide" id="slide2"> ...content... </div>
            ...
        </div>
    </body>
    </html>
    \`\`\`
3.  **No Javascript**: Just pure HTML/CSS. The parent window handles navigation logic.

Generate the complete, polished HTML code now.`

          const result = await model.generateContent(fullPrompt)
          const response = await result.response
          let fullHtml = response.text()

          // Clean markdown
          fullHtml = fullHtml.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim()

          // Send complete event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'progress', current: totalSlides, total: totalSlides, slideNumber: totalSlides })}\n\n`
            )
          )
          
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
