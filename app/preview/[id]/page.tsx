import { readFile } from 'fs/promises'
import { join } from 'path'
import { notFound } from 'next/navigation'

interface PageProps {
  params: {
    id: string
  }
}

export default async function PreviewPage({ params }: PageProps) {
  const { id } = params

  try {
    // Read the HTML file from public/presentations directory
    const filePath = join(process.cwd(), 'public', 'presentations', `${id}.html`)
    const html = await readFile(filePath, 'utf-8')

    return (
      <div className="fixed inset-0 w-full h-full bg-black">
        <iframe
          srcDoc={html}
          className="w-full h-full border-0"
          title="Presentation Preview"
          style={{ display: 'block' }}
        />
      </div>
    )
  } catch (error) {
    console.error('Error loading presentation:', error)
    notFound()
  }
}
