'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  previewUrl?: string
}

export function ChatInterface() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false)
  const [pptProgress, setPptProgress] = useState<{
    current: number
    total: number
    completed: boolean
    previewUrl?: string
  } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize welcome message
  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m your PPT generation assistant. Please tell me what topic you\'d like to create a presentation about. For example: "I want to create a presentation about artificial intelligence"',
      },
    ])
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isGenerating) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsGenerating(true)

    try {
      // Generate outline with streaming
      const outlineResponse = await fetch('/api/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: input,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!outlineResponse.ok) {
        throw new Error('Failed to generate outline')
      }

      // Create outline message for streaming
      const outlineMessageId = (Date.now() + 2).toString()
      const outlineMessage: Message = {
        id: outlineMessageId,
        role: 'assistant',
        content: 'Generating outline...\n\n',
      }
      setMessages((prev) => [...prev, outlineMessage])

      // Stream outline content
      const reader = outlineResponse.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Unable to read outline response stream')
      }

      let buffer = ''
      let fullOutline = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'chunk') {
                // Append chunk to outline
                fullOutline += data.content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === outlineMessageId
                      ? {
                          ...msg,
                          content: `I've generated a PPT outline for you:\n\n${fullOutline}`,
                        }
                      : msg
                  )
                )
              } else if (data.type === 'complete') {
                // Final outline
                fullOutline = data.outline
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === outlineMessageId
                      ? {
                          ...msg,
                          content: `I've generated a PPT outline for you:\n\n${fullOutline}\n\nGenerating PPT now...`,
                        }
                      : msg
                  )
                )
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Error generating outline')
              }
            } catch (e) {
              console.error('Error parsing outline stream data:', e)
            }
          }
        }
      }

      // Stream PPT generation
      setIsGeneratingPPT(true)
      setPptProgress({ current: 0, total: 0, completed: false })

      const pptResponse = await fetch('/api/generate-ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outline: fullOutline,
          userPrompt: input,
        }),
      })

      if (!pptResponse.ok) {
        throw new Error('Failed to generate PPT')
      }

      const reader = pptResponse.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Unable to read response stream')
      }

      let buffer = ''
      let fullHtml = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'start') {
                setPptProgress({
                  current: 0,
                  total: data.total,
                  completed: false,
                })
              } else if (data.type === 'progress') {
                setPptProgress((prev) =>
                  prev
                    ? {
                        ...prev,
                        current: data.current,
                        total: data.total,
                      }
                    : null
                )
              } else if (data.type === 'complete') {
                fullHtml = data.html
                setPptProgress((prev) =>
                  prev
                    ? {
                        ...prev,
                        completed: true,
                      }
                    : null
                )
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Error generating PPT')
              }
            } catch (e) {
              console.error('Error parsing stream data:', e)
            }
          }
        }
      }

      // Save PPT and get preview URL
      if (fullHtml) {
        const saveResponse = await fetch('/api/save-ppt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: fullHtml }),
        })

        if (saveResponse.ok) {
          const saveData = await saveResponse.json()
          const previewUrl = saveData.previewUrl

          setPptProgress((prev) =>
            prev
              ? {
                  ...prev,
                  previewUrl,
                }
              : null
          )

          // Use blob URL directly if available, otherwise use preview URL
          const finalPreviewUrl = saveData.blobUrl 
            ? `/preview/${saveData.presentationId}?url=${encodeURIComponent(saveData.blobUrl)}`
            : previewUrl

          const pptMessage: Message = {
            id: (Date.now() + 3).toString(),
            role: 'assistant',
            content: 'PPT generation completed! Click the button below to preview your presentation in fullscreen.',
            previewUrl: finalPreviewUrl,
          }
          setMessages((prev) => [...prev, pptMessage])
        } else {
          throw new Error('Failed to save presentation')
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 4).toString(),
        role: 'assistant',
        content: `Sorry, an error occurred during generation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
      setIsGeneratingPPT(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">AI PPT Generator</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Generate beautiful presentations using AI SDK 5.x and Gemini 3 Pro
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left: Chat Messages */}
        <div className="w-full md:w-[500px] lg:w-[600px] flex flex-col border-r border-b md:border-b-0 bg-muted/30">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-foreground border'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  {message.previewUrl && (
                    <a
                      href={message.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full mt-3 px-3 sm:px-4 py-2 text-xs font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                    >
                      🎯 Open Fullscreen Preview
                    </a>
                  )}
                </div>
              </div>
            ))}
            {isGenerating && !isGeneratingPPT && (
              <div className="flex justify-start">
                <div className="bg-card border rounded-lg px-3 sm:px-4 py-2">
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t bg-card">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your PPT topic..."
                disabled={isGenerating}
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isGenerating || !input.trim()}
                className="px-3 sm:px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? '...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Info Panel with Progress */}
        <div className="flex-1 flex flex-col bg-background">
          {/* Progress Section - Now on Right */}
          {isGeneratingPPT && pptProgress && (
            <div className="p-4 sm:p-6 bg-card border-b">
              <h3 className="text-base sm:text-lg font-semibold mb-4 text-foreground">Generation Progress</h3>
              <div className="space-y-3">
                <div className="text-sm sm:text-base text-muted-foreground">
                  {pptProgress.completed
                    ? `✅ Generation Complete (${pptProgress.total}/${pptProgress.total})`
                    : `Generating Slide ${pptProgress.current} / ${pptProgress.total}`}
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{
                      width: `${pptProgress.total > 0 ? (pptProgress.current / pptProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                {pptProgress.completed && pptProgress.previewUrl && (
                  <a
                    href={pptProgress.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full mt-4 px-4 sm:px-6 py-3 text-sm sm:text-base font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                  >
                    🎯 Open Fullscreen Preview
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Info Panel */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
            <div className="text-center max-w-md space-y-4">
              <div className="text-4xl sm:text-5xl mb-4">📊</div>
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground">AI PPT Generator</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Generate professional presentations with AI. Simply describe your topic and we'll create a beautiful presentation for you.
              </p>
              {pptProgress && pptProgress.completed && pptProgress.previewUrl && !isGeneratingPPT && (
                <div className="mt-6">
                  <a
                    href={pptProgress.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                  >
                    🎯 Open Fullscreen Preview
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
