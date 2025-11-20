'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Maximize, Download, X } from 'lucide-react'

interface PPTPreviewProps {
  html: string
  title?: string
  autoShow?: boolean
  onClose?: () => void
}

export function PPTPreview({ html, title = 'Presentation', autoShow = false, onClose }: PPTPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(1)
  const [totalSlides, setTotalSlides] = useState(0)
  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null)

  // Inject script to handle slide navigation and count slides
  const enhancedHtml = html.replace(
    '</body>',
    `
    <script>
      // Initialize slide navigation
      const slides = document.querySelectorAll('.slide');
      const totalSlides = slides.length;
      let currentSlide = 1;

      // Report total slides to parent
      window.parent.postMessage({ type: 'INIT_SLIDES', total: totalSlides }, '*');

      function showSlide(n) {
        // Scroll to slide
        if (slides[n-1]) {
          slides[n-1].scrollIntoView({ behavior: 'smooth' });
          currentSlide = n;
          window.parent.postMessage({ type: 'SLIDE_CHANGED', current: currentSlide }, '*');
        }
      }

      // Listen for messages from parent
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
      
      // Hide scrollbar
      document.body.style.overflow = 'hidden';
      const container = document.querySelector('.slide-container');
      if(container) {
          container.style.overflow = 'hidden';
      }
    </script>
    </body>
    `
  )

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

  const handleDownload = () => {
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

  const handleFullscreen = () => {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
      }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 border rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <span className="text-lg">📄</span>
          <h3 className="font-semibold text-gray-800 truncate max-w-[200px]">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFullscreen}
            className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-colors text-sm font-medium flex items-center gap-1"
            title="Open in new tab"
          >
             <Maximize size={18} />
             <span>Export to Slides</span>
          </button>
          <button
            onClick={handleDownload}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Download HTML"
          >
            <Download size={18} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative bg-gray-100 flex items-center justify-center p-4 sm:p-8">
        <div className="relative w-full h-full max-w-4xl aspect-[16/9] bg-white shadow-2xl rounded-md overflow-hidden">
            <iframe
            ref={setIframeRef}
            srcDoc={enhancedHtml}
            className="w-full h-full border-0"
            title="PPT Preview"
            />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="bg-white border-t px-6 py-4 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-500">
          Slide {currentSlide} of {totalSlides}
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrev}
            disabled={currentSlide <= 1}
            className="p-2 rounded-full border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleNext}
            disabled={currentSlide >= totalSlides}
            className="p-2 rounded-full border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Empty div for spacing balance */}
        <div className="w-[100px]"></div>
      </div>
    </div>
  )
}
