'use client'

interface PPTPreviewProps {
  html: string
  autoShow?: boolean
}

export function PPTPreview({ html, autoShow = false }: PPTPreviewProps) {
  if (autoShow) {
    return (
      <iframe
        srcDoc={html}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="PPT Preview"
      />
    )
  }

  return (
    <div>
      <iframe
        srcDoc={html}
        style={{
          width: '100%',
          height: '600px',
          border: 'none',
        }}
        title="PPT Preview"
      />
    </div>
  )
}

