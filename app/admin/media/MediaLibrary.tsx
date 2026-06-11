'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface MediaFile {
  name: string
  created_at: string
  url: string
}

export default function MediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function fetchFiles() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/media')
      if (!res.ok) throw new Error('목록을 불러오지 못했습니다.')
      const data = (await res.json()) as { files: MediaFile[] }
      setFiles(data.files)
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2000)
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      showToast('복사됨!')
    } catch {
      showToast('복사 실패')
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`"${name}" 파일을 삭제하시겠습니까?`)) return
    try {
      const res = await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('삭제 실패')
      setFiles((prev) => prev.filter((f) => f.name !== name))
    } catch {
      alert('삭제에 실패했습니다.')
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('업로드 실패')
      await fetchFiles()
    } catch {
      alert('업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              ← 관리자
            </Link>
            <span className="text-gray-300">·</span>
            <span className="text-lg font-bold text-gray-900">미디어 라이브러리</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">총 {files.length}개</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {uploading ? '업로드 중...' : '+ 업로드'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading && (
          <div className="text-center py-16 text-gray-400">불러오는 중...</div>
        )}
        {error && (
          <div className="text-center py-16 text-red-500">{error}</div>
        )}
        {!loading && !error && files.length === 0 && (
          <div className="text-center py-16 text-gray-400">업로드된 이미지가 없습니다.</div>
        )}
        {!loading && !error && files.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {files.map((file) => (
              <div
                key={file.name}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden group"
              >
                <div
                  className="relative aspect-square cursor-pointer overflow-hidden bg-gray-100"
                  onClick={() => handleCopy(file.url)}
                  title="클릭하여 URL 복사"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover transition-opacity group-hover:opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <span className="bg-white text-gray-800 text-xs px-2 py-1 rounded shadow">URL 복사</span>
                  </div>
                </div>
                <div className="px-3 py-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500 truncate flex-1" title={file.name}>
                    {file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDelete(file.name)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors shrink-0"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
