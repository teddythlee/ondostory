'use client'

import { useRef, useState } from 'react'

export type ImageSize = 'small' | 'medium' | 'large' | 'full'

interface Props {
  onInsert: (src: string, size: ImageSize) => void
  onClose: () => void
}

const SIZE_OPTIONS: { value: ImageSize; label: string; desc: string }[] = [
  { value: 'small', label: '소', desc: '25%' },
  { value: 'medium', label: '중', desc: '50%' },
  { value: 'large', label: '대', desc: '75%' },
  { value: 'full', label: '전체', desc: '100%' },
]

export default function ImageModal({ onInsert, onClose }: Props) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload')
  const [url, setUrl] = useState('')
  const [size, setSize] = useState<ImageSize>('full')
  const [preview, setPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { setError(data.error); return }
    setPreview(data.url)
    setUrl(data.url)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInsert() {
    if (!url) return
    onInsert(url, size)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">이미지 삽입</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Tab */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          {(['upload', 'url'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${tab === t ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
            >
              {t === 'upload' ? '파일 업로드' : 'URL 입력'}
            </button>
          ))}
        </div>

        {tab === 'upload' ? (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            {uploading ? (
              <p className="text-sm text-gray-500">업로드 중...</p>
            ) : preview ? (
              <img src={preview} alt="preview" className="max-h-32 mx-auto rounded-lg object-contain" />
            ) : (
              <>
                <p className="text-3xl mb-2">🖼️</p>
                <p className="text-sm text-gray-500">클릭하거나 파일을 드래그하세요</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, GIF · 최대 10MB</p>
              </>
            )}
          </div>
        ) : (
          <input
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setPreview(e.target.value) }}
            placeholder="https://..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

        {/* Size selector */}
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">이미지 크기</p>
          <div className="flex gap-2">
            {SIZE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSize(opt.value)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${size === opt.value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
              >
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {preview && (
          <div className="mt-3 rounded-lg overflow-hidden bg-gray-50 flex justify-center p-2">
            <img src={preview} alt="preview" className="max-h-24 object-contain rounded" />
          </div>
        )}

        <button
          onClick={handleInsert}
          disabled={!url}
          className="mt-4 w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          삽입하기
        </button>
      </div>
    </div>
  )
}
