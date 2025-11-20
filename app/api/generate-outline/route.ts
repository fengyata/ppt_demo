import { NextRequest } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { userPrompt, conversationHistory } = await request.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY is not set' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const openai = new OpenAI({ apiKey })

    // Build conversation history context
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an expert presentation strategist. Your goal is to create a clear, structured outline for a presentation based on the user's request.

CRITICAL INSTRUCTION:
If the user specifies a particular style, layout, or structure, you MUST incorporate these requirements into the outline. Mark these as [User Directive] in the outline so the next stage knows they are mandatory.

Default Structure (unless user overrides):
- 5-8 slides total.
- Slide 1: Title Slide.
- Slides 2-N: Content slides with clear topics.
- Last Slide: Conclusion/Call to Action.

Output Format:
# Presentation Outline

## Slide 1: [Title]
- Key Point 1
- Key Point 2
...

[User Directives]: (List any specific style/layout requests found in the prompt here, e.g., "Dark mode", "Minimalist", "Two-column layout for slide 3")`,
      },
    ]

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg: any) => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          })
        }
      })
    }

    // Add current user request
    messages.push({
      role: 'user',
      content: userPrompt,
    })

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.7,
      stream: true,
    })

    // Create ReadableStream for SSE
    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = ''
          
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullContent += content
              // Send each chunk as SSE
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`)
              )
            }
          }
          
          // Send completion event with full content
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'complete', outline: fullContent })}\n\n`)
          )
          
          controller.close()
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Outline generation error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate outline', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
