'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Maximize, Download, X, Presentation, FileJson } from 'lucide-react'

interface PPTPreviewProps {
  html: string
  title?: string
  autoShow?: boolean
  onClose?: () => void
  className?: string
}

export function PPTPreview({ html, title = 'Presentation', autoShow = false, onClose, className = '' }: PPTPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(1)
  const [totalSlides, setTotalSlides] = useState(0)
  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Inject script to handle slide navigation and count slides
  const scriptContent = `
    <script>
      // Initialize slide navigation
      const slides = document.querySelectorAll('.slide');
      const totalSlides = slides.length;
      let currentSlide = 1;

      // Report total slides to parent
      window.parent.postMessage({ type: 'INIT_SLIDES', total: totalSlides }, '*');

      function showSlide(n) {
        if (slides[n-1]) {
          slides[n-1].scrollIntoView({ behavior: 'smooth' });
          currentSlide = n;
          window.parent.postMessage({ type: 'SLIDE_CHANGED', current: currentSlide }, '*');
        }
      }

      window.addEventListener('message', (event) => {
        if (event.data.type === 'NAVIGATE') {
          const direction = event.data.direction;
          let nextSlide = currentSlide;
          
          if (direction === 'next' && currentSlide < totalSlides) {
            nextSlide++;
          } else if (direction === 'prev' && currentSlide > 1) {
            nextSlide--;
          }
          showSlide(nextSlide);
        } else if (event.data.type === 'GOTO') {
            showSlide(event.data.slide);
        }
      });
      
      document.body.style.overflow = 'hidden';
      const container = document.querySelector('.slide-container');
      if(container) {
          container.style.overflow = 'hidden';
      }
    </script>
    </body>
  `
  
  const enhancedHtml = html.includes('</body>') 
    ? html.replace('</body>', scriptContent)
    : html + scriptContent

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'INIT_SLIDES') {
        setTotalSlides(event.data.total)
      } else if (event.data.type === 'SLIDE_CHANGED') {
        setCurrentSlide(event.data.current)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handlePrev = () => {
    iframeRef?.contentWindow?.postMessage({ type: 'NAVIGATE', direction: 'prev' }, '*')
  }

  const handleNext = () => {
    iframeRef?.contentWindow?.postMessage({ type: 'NAVIGATE', direction: 'next' }, '*')
  }

  const handleDownloadHTML = () => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/\s+/g, '_')}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadPPTX = async () => {
    try {
      setIsExporting(true)
      // Dynamically import pptxgenjs to avoid SSR/build issues
      const pptxgenModule = await import('pptxgenjs')
      const PptxGenJS = pptxgenModule.default
      const pres = new PptxGenJS()

      // Setup Metadata
      pres.title = title
      pres.layout = 'LAYOUT_16x9'

      // Parse HTML Content
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const slides = doc.querySelectorAll('.slide')

      // Helper to clean text
      const cleanText = (text: string | null) => text ? text.replace(/\s+/g, ' ').trim() : ''

      slides.forEach((slideElem, index) => {
        const slide = pres.addSlide()
        
        // Attempt to find background
        // Since we can't compute style easily, we assume standard white/light theme
        // or check for inline style if AI generated it
        slide.background = { color: "FFFFFF" }

        // 1. Title Extraction (h1, h2, .title)
        const titleElem = slideElem.querySelector('h1, h2, .title')
        if (titleElem) {
            slide.addText(cleanText(titleElem.textContent), { 
                x: 0.5, y: 0.5, w: '90%', h: 1, 
                fontSize: 32, bold: true, color: '000000', align: 'center',
                fontFace: 'Arial' 
            })
        }

        // 2. Content Extraction (p, ul, li, .content)
        const contentLines: string[] = []
        
        // Lists
        slideElem.querySelectorAll('li').forEach(li => {
            contentLines.push(`• ${cleanText(li.textContent)}`)
        })
        
        // Paragraphs (only if not inside list to avoid duplication if structure is nested)
        // This is heuristic
        if (contentLines.length === 0) {
            slideElem.querySelectorAll('p').forEach(p => {
                const text = cleanText(p.textContent)
                if (text.length > 0) contentLines.push(text)
            })
        }

        if (contentLines.length > 0) {
            slide.addText(contentLines.join('\n'), {
                x: 1, y: 2, w: '80%', h: 4,
                fontSize: 18, color: '333333', align: 'left',
                lineSpacing: 30, // 1.5ish linespacing
                fontFace: 'Arial'
            })
        }

        // 3. Image Extraction
        const imgElem = slideElem.querySelector('img')
        if (imgElem && imgElem.src) {
            // Basic positioning: right side or bottom
            // If content is short, put image on right
            // We'll just put it in a standard "Content + Image" layout position
            // x: 6.5 inches, y: 2 inches
            slide.addImage({ 
                path: imgElem.src, 
                x: 6.5, y: 2, w: 3, h: 3 
            })
        }
      })

      await pres.writeFile({ fileName: `${title.replace(/\s+/g, '_')}.pptx` })
    } catch (error) {
      console.error('PPTX generation failed:', error)
      alert('Failed to generate PPTX. Please try downloading as HTML.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleFullscreen = () => {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
      }
  }

  return (
    <div className={`flex flex-col h-full bg-background border rounded-xl shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Presentation size={18} className="text-primary" />
          </div>
          <h3 className="font-medium text-sm text-foreground truncate max-w-[200px]">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="Full Screen Preview"
          >
             <Maximize size={14} />
             <span className="hidden sm:inline">Fullscreen</span>
          </button>
          
          <div className="h-4 w-[1px] bg-border mx-1" />
          
          <button
            onClick={handleDownloadHTML}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="Download HTML Source"
          >
            <FileJson size={14} />
            <span className="hidden sm:inline">HTML</span>
          </button>

          <button
            onClick={handleDownloadPPTX}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors shadow-sm ml-2"
            title="Download PowerPoint File"
          >
            <Download size={14} />
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Download PPTX'}</span>
          </button>
          
          {onClose && (
            <>
              <div className="h-4 w-[1px] bg-border mx-1" />
              <button
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative bg-muted/50 flex items-center justify-center p-4 overflow-hidden">
        <div className="relative w-full aspect-[16/9] max-h-full bg-white shadow-2xl rounded-lg overflow-hidden ring-1 ring-border/50">
            <iframe
            ref={setIframeRef}
            srcDoc={enhancedHtml}
            className="w-full h-full border-0 block"
            title="PPT Preview"
            sandbox="allow-scripts allow-same-origin"
            />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="bg-card border-t px-4 py-3 flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">
          Slide {currentSlide} <span className="text-border mx-1">/</span> {totalSlides || '-'}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentSlide <= 1}
            className="p-1.5 rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNext}
            disabled={currentSlide >= totalSlides}
            className="p-1.5 rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="w-[80px]"></div>
      </div>
    </div>
  )
}
