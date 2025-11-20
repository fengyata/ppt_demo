'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Maximize, Share2, PanelLeft, PanelLeftClose, X, Presentation } from 'lucide-react'

interface PPTPreviewProps {
  html: string
  title?: string
  autoShow?: boolean
  onClose?: () => void
  className?: string
  showThumbnails?: boolean
  activeSlide?: number
}

export function PPTPreview({ html, title = 'Presentation', autoShow = false, onClose, className = '', showThumbnails = false, activeSlide }: PPTPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(1)
  const [totalSlides, setTotalSlides] = useState(0)
  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [slidesData, setSlidesData] = useState<string[]>([])

  // Thumbnail Generation
  useEffect(() => {
      if (showThumbnails && html) {
          try {
              const parser = new DOMParser()
              const doc = parser.parseFromString(html, 'text/html')
              const styles = Array.from(doc.querySelectorAll('style, link[rel="stylesheet"]')).map(el => el.outerHTML).join('')
              const slideEls = doc.querySelectorAll('.slide')
              
              const slides = Array.from(slideEls).map(el => {
                  return `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        ${styles}
                    <style>
                        body { margin: 0; overflow: hidden; width: 100vw; height: 100vh; background: white; }
                        .slide-container { width: 100%; height: 100%; overflow: hidden; }
                        .slide { width: 100vw; height: 100vh; position: absolute; top: 0; left: 0; }
                        ::-webkit-scrollbar { display: none; }
                    </style>
                    </head>
                    <body>
                        <div class="slide-container">${el.outerHTML}</div>
                    </body>
                    </html>
                  `
              })
              setSlidesData(slides)
          } catch (e) {
              console.error("Error generating thumbnails", e)
          }
      }
  }, [html, showThumbnails])

  // Inject script to handle slide navigation
  const scriptContent = `
    <script>
      const slides = document.querySelectorAll('.slide');
      const totalSlides = slides.length;
      let currentSlide = 1;
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
          if (direction === 'next' && currentSlide < totalSlides) nextSlide++;
          else if (direction === 'prev' && currentSlide > 1) nextSlide--;
          showSlide(nextSlide);
        } else if (event.data.type === 'GOTO') {
            showSlide(event.data.slide);
        }
      });
      
      document.body.style.overflow = 'hidden';
      const container = document.querySelector('.slide-container');
      if(container) container.style.overflow = 'hidden';
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

  // Watch activeSlide prop for auto-scroll
  useEffect(() => {
      if (activeSlide && activeSlide > 0) {
          setTimeout(() => {
              navigateTo(activeSlide)
          }, 500)
      }
  }, [activeSlide, html]) 

  const navigateTo = (index: number) => {
      iframeRef?.contentWindow?.postMessage({ type: 'GOTO', slide: index }, '*')
  }

  const handlePrev = () => iframeRef?.contentWindow?.postMessage({ type: 'NAVIGATE', direction: 'prev' }, '*')
  const handleNext = () => iframeRef?.contentWindow?.postMessage({ type: 'NAVIGATE', direction: 'next' }, '*')

  const handleShare = async () => {
      setIsSharing(true)
      try {
          const res = await fetch('/api/save-ppt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ html })
          })
          const data = await res.json()
          if (data.previewUrl) {
              const fullUrl = window.location.origin + data.previewUrl
              await navigator.clipboard.writeText(fullUrl)
              alert('Link copied! You can share this URL.')
          } else {
              throw new Error('No url returned')
          }
      } catch(e) {
          alert('Share failed')
      } finally {
          setIsSharing(false)
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
    <div className={`flex h-full bg-background border rounded-xl shadow-sm overflow-hidden ${className}`}>
      
      {/* Sidebar (Thumbnails) */}
      {showThumbnails && (
          <div className={`border-r bg-muted/30 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-48' : 'w-0'} overflow-hidden relative`}>
              <div className="p-3 border-b flex items-center justify-between bg-card sticky top-0 z-10">
                  <span className="text-xs font-semibold text-muted-foreground">Slides</span>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-muted rounded" title="Close Sidebar">
                      <PanelLeftClose size={14} />
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {slidesData.map((slideHtml, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => navigateTo(idx + 1)}
                        className={`relative w-full h-[108px] bg-white rounded border cursor-pointer hover:ring-2 ring-primary/50 transition-all overflow-hidden ${currentSlide === idx + 1 ? 'ring-2 ring-primary' : ''}`}
                      >
                          <div className="absolute top-1 left-1 z-10 bg-black/50 text-white text-[10px] px-1.5 rounded-full backdrop-blur-sm">
                              {idx + 1}
                          </div>
                          <iframe 
                            srcDoc={slideHtml} 
                            className="absolute top-0 left-0 border-0 pointer-events-none origin-top-left bg-white" 
                            style={{ width: '1280px', height: '720px', transform: 'scale(0.135)' }} // 1280*0.135 = 172.8
                            tabIndex={-1}
                          />
                          <div className="absolute inset-0 z-20" />
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-card border-b">
            <div className="flex items-center gap-2">
              {showThumbnails && !isSidebarOpen && (
                  <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 mr-1 hover:bg-muted rounded-md" title="Show Slides">
                      <PanelLeft size={18} />
                  </button>
              )}
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Presentation size={18} className="text-primary" />
              </div>
              <h3 className="font-medium text-sm text-foreground truncate max-w-[200px]">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Share Button (Primary) */}
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors shadow-sm"
                title="Share Presentation Link"
              >
                <Share2 size={14} />
                <span className="hidden sm:inline">{isSharing ? 'Sharing...' : 'Share'}</span>
              </button>

              <div className="h-4 w-[1px] bg-border mx-1" />

              {/* Fullscreen (Highlighted) */}
              <button
                onClick={handleFullscreen}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                title="Full Screen"
              >
                 <Maximize size={14} />
                 <span className="hidden sm:inline">Fullscreen</span>
              </button>

              {onClose && (
                <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md ml-1">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Preview Iframe */}
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

          {/* Footer */}
          <div className="bg-card border-t px-4 py-3 flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground">
              Slide {currentSlide} <span className="text-border mx-1">/</span> {totalSlides || '-'}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handlePrev} className="p-1.5 rounded-md hover:bg-muted"><ChevronLeft size={18} /></button>
              <button onClick={handleNext} className="p-1.5 rounded-md hover:bg-muted"><ChevronRight size={18} /></button>
            </div>
            <div className="w-[80px]"></div>
          </div>
      </div>
    </div>
  )
}
