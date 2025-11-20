'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, LayoutTemplate } from 'lucide-react'
import { PPTPreview } from './PPTPreview'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false)
  
  // Streaming & Preview State
  const [fullHtmlBuffer, setFullHtmlBuffer] = useState('') // Accumulates raw HTML
  const [previewHtml, setPreviewHtml] = useState('') // Debounced/Snapshot for preview
  const [pptProgress, setPptProgress] = useState<{
    current: number
    total: number
    completed: boolean
  } | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initial Welcome
  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hi! I\'m your AI Presentation Designer. Tell me your topic, and I\'ll generate a modern, interactive slide deck for you. Try "Future of Renewable Energy" or "Q4 Marketing Strategy".',
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
    // Reset Preview state for new generation
    setPreviewHtml('') 
    setFullHtmlBuffer('')
    setPptProgress(null)

    try {
      // 1. Generate Outline (Streaming)
      const outlineResponse = await fetch('/api/generate-outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: userMessage.content,
          conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!outlineResponse.ok) throw new Error('Failed to generate outline')

      const outlineId = (Date.now() + 1).toString()
      setMessages((prev) => [...prev, { id: outlineId, role: 'assistant', content: 'Thinking...' }])

      const outlineReader = outlineResponse.body?.getReader()
      const decoder = new TextDecoder()
      let fullOutline = ''

      if (outlineReader) {
        while (true) {
          const { done, value } = await outlineReader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.slice(6))
                    if (data.type === 'chunk') {
                        fullOutline += data.content
                        setMessages((prev) => prev.map(m => m.id === outlineId ? { ...m, content: fullOutline } : m))
                    } else if (data.type === 'complete') {
                        fullOutline = data.outline // Ensure we have full
                    }
                } catch (e) {}
            }
          }
        }
      }

      // 2. Generate PPT (Streaming HTML)
      setIsGeneratingPPT(true)
      setMessages((prev) => [...prev, { id: 'ppt-status', role: 'assistant', content: 'Designing your presentation...' }])

      const pptResponse = await fetch('/api/generate-ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outline: fullOutline,
          userPrompt: userMessage.content,
        }),
      })

      if (!pptResponse.ok) throw new Error('Failed to generate PPT')

      const pptReader = pptResponse.body?.getReader()
      let localHtmlBuffer = '' // Local var for speed

      if (pptReader) {
        while (true) {
          const { done, value } = await pptReader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          
          for (const line of lines) {
             if (line.startsWith('data: ')) {
                 try {
                     const data = JSON.parse(line.slice(6))
                     if (data.type === 'chunk') {
                         localHtmlBuffer += data.content
                         setFullHtmlBuffer(localHtmlBuffer)
                     } else if (data.type === 'progress') {
                         // Update Progress
                         setPptProgress({ current: data.current, total: data.total, completed: false })
                         // Update Preview! (Real-time Preview of Slide)
                         setPreviewHtml(localHtmlBuffer)
                     } else if (data.type === 'complete') {
                         localHtmlBuffer = data.html
                         setFullHtmlBuffer(localHtmlBuffer)
                         setPreviewHtml(localHtmlBuffer)
                         setPptProgress(prev => prev ? { ...prev, completed: true } : null)
                     }
                 } catch(e) {}
             }
          }
        }
      }

      // 3. Finalize
      setMessages((prev) => prev.filter(m => m.id !== 'ppt-status').concat({
          id: Date.now().toString(),
          role: 'assistant',
          content: '✨ Presentation ready! You can preview it on the right.'
      }))

    } catch (error) {
      setMessages((prev) => [...prev, { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }])
    } finally {
      setIsGenerating(false)
      setIsGeneratingPPT(false)
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* LEFT SIDEBAR - CHAT */}
      <div className="w-[400px] flex flex-col border-r bg-muted/10 flex-shrink-0">
        {/* Header */}
        <div className="h-14 border-b flex items-center px-4 bg-background/50 backdrop-blur">
            <Sparkles className="w-5 h-5 text-primary mr-2" />
            <span className="font-semibold">AI Slides</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className={`rounded-lg p-3 text-sm max-w-[85%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border shadow-sm'}`}>
                        <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-background">
            <form onSubmit={handleSubmit} className="relative">
                <input 
                    className="w-full bg-muted/50 border rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Describe your presentation..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={isGenerating}
                />
                <button 
                    type="submit" 
                    disabled={isGenerating || !input.trim()}
                    className="absolute right-2 top-2 p-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                    <Send size={16} />
                </button>
            </form>
        </div>
      </div>

      {/* RIGHT PANEL - PREVIEW */}
      <div className="flex-1 flex flex-col bg-muted/30 relative">
         {previewHtml ? (
             <div className="absolute inset-0 p-4 sm:p-6">
                 <PPTPreview html={previewHtml} className="h-full shadow-lg" title="Generated Presentation" />
             </div>
         ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                 <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                    <LayoutTemplate size={32} />
                 </div>
                 <h3 className="font-medium text-lg text-foreground">Ready to Design</h3>
                 <p className="text-sm mt-2 max-w-xs text-center">Enter a topic in the chat to generate a presentation structure and slides.</p>
             </div>
         )}

         {/* Progress Overlay */}
         {isGeneratingPPT && pptProgress && !pptProgress.completed && (
             <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-foreground/80 backdrop-blur text-background px-6 py-3 rounded-full shadow-xl flex items-center gap-3 z-50">
                 <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                 <span className="text-sm font-medium">
                    Generating Slide {pptProgress.current} of {pptProgress.total}...
                 </span>
             </div>
         )}
      </div>
    </div>
  )
}
