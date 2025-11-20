'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, LayoutTemplate, ArrowRight } from 'lucide-react'
import { PPTPreview } from './PPTPreview'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

const EXAMPLE_PROMPTS = [
  "Pitch deck for an AI-powered coffee machine startup",
  "Quarterly business review for a fashion brand",
  "Introduction to Quantum Computing for students",
  "Sustainable energy investment proposal",
  "Digital Marketing Strategy 2025"
]

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false)
  
  // Streaming & Preview State
  const [fullHtmlBuffer, setFullHtmlBuffer] = useState('') 
  const [previewHtml, setPreviewHtml] = useState('') 
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
        content: 'Hi! I\'m your AI Presentation Designer. Tell me your topic, and I\'ll generate a modern, interactive slide deck for you.',
      },
    ])
  }, [])

  // Determine Layout State
  // We show the preview panel IF we have preview content OR we are generating
  // OR if we have more than just the initial welcome message (meaning conversation started)
  const hasContent = !!previewHtml || isGenerating || messages.length > 1

  const handleSubmit = async (e: React.FormEvent, promptOverride?: string) => {
    e.preventDefault()
    const promptText = promptOverride || input
    if (!promptText.trim() || isGenerating) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: promptText,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsGenerating(true)

    // Reset Preview state for new generation ONLY if it's a new topic
    // But for modification, we keep it.
    // Since we don't have the "smart router" anymore (reverted), we just always regen for now.
    // Or better: if previewHtml exists, we assume user wants to modify? 
    // No, user might want a completely new topic.
    // Since the "Intent Recognition" was reverted, I'll stick to the basic flow:
    // Just regen everything for now to be safe, or keep previewHtml until new one arrives?
    // Let's clear it to show "Thinking..." state clearly.
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
                        fullOutline = data.outline 
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
      let localHtmlBuffer = '' 

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
                         setPptProgress({ current: data.current, total: data.total, completed: false })
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
    <div className="flex h-screen bg-background overflow-hidden transition-all">
      {/* LEFT SIDEBAR - CHAT */}
      <div 
        className={`flex flex-col border-r bg-muted/10 flex-shrink-0 transition-all duration-500 ease-in-out ${
            hasContent ? 'w-[400px]' : 'w-full max-w-3xl mx-auto border-r-0 bg-background'
        }`}
      >
        {/* Header */}
        <div className={`h-14 border-b flex items-center px-4 backdrop-blur ${hasContent ? 'bg-background/50' : 'border-b-0 justify-center mt-10 bg-transparent'}`}>
            <Sparkles className={`w-5 h-5 text-primary mr-2 ${!hasContent && 'w-8 h-8'}`} />
            <span className={`font-semibold ${!hasContent && 'text-2xl'}`}>AI Slides</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
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
            
            {/* Example Prompts (Only show when no conversation active) */}
            {!hasContent && messages.length <= 1 && (
                <div className="mt-8 space-y-2 px-4">
                    <p className="text-sm text-muted-foreground mb-4 text-center">Try an example:</p>
                    <div className="grid gap-2">
                        {EXAMPLE_PROMPTS.map((ex, i) => (
                            <button 
                                key={i}
                                onClick={(e) => handleSubmit(e, ex)}
                                className="text-left p-3 text-sm border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between group"
                            >
                                <span>{ex}</span>
                                <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={`p-4 ${hasContent ? 'border-t bg-background' : 'bg-transparent'}`}>
            <form onSubmit={(e) => handleSubmit(e)} className="relative">
                <input 
                    className="w-full bg-muted/50 border rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                    placeholder="Describe your presentation..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={isGenerating}
                    autoFocus
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
      <div className={`flex flex-col bg-muted/30 relative transition-all duration-500 ease-in-out ${hasContent ? 'flex-1 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
         {previewHtml ? (
             <div className="absolute inset-0 p-4 sm:p-6">
                 <PPTPreview 
                    html={previewHtml} 
                    className="h-full shadow-lg" 
                    title="Generated Presentation" 
                    activeSlide={pptProgress?.current}
                 />
             </div>
         ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                 <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                    <LayoutTemplate size={32} />
                 </div>
                 <h3 className="font-medium text-lg text-foreground">Generating Preview...</h3>
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
