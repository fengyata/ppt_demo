import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { userPrompt, conversationHistory } = await request.json()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not set' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey })

    // Build conversation history context
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a professional PPT content planner. Generate a detailed PPT outline based on user input. Default to 5 slides with modern style unless the user specifically requests otherwise.',
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
      content: `User request: ${userPrompt}

Generate a structured PPT outline with the following requirements:
1. Include a title slide
2. Include exactly 5 content slides (unless user specifies otherwise)
3. Each slide should have a title and key points
4. Use clear formatting
5. Content should be professional and logical
6. Use modern, engaging topics

Output format:
# PPT Outline

## Slide 1: Title Slide
- Main Title: [title]
- Subtitle: [subtitle]

## Slide 2: [slide title]
- Key Point 1: [content]
- Key Point 2: [content]
- Key Point 3: [content]

## Slide 3: [slide title]
- Key Point 1: [content]
- Key Point 2: [content]

... (continue for all slides)`,
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.7,
    })

    const outline = completion.choices[0]?.message?.content || ''

    if (!outline) {
      throw new Error('OpenAI returned empty content')
    }

    return NextResponse.json({ outline })
  } catch (error) {
    console.error('Outline generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate outline', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
