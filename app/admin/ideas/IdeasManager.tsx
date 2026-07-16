'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import type { PostIdea } from '@/lib/ideas'

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  skipped: 'bg-gray-100 text-gray-500',
}
const STATUS_LABEL: Record<string, string> = {
  pending: '대기', processing: '생성 중', done: '초안 생성됨', skipped: '보류',
}

export default function IdeasManager({ initial }: { initial: PostIdea[] }) {
  const [ideas, setIdeas] = useState(initial)
  const [topic, setTopic] = useState('')
  const [bullets, setBullets] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setTopic(''); setBullets(''); setImages([]); setEditId(null); setMsg('')
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true); setMsg('')
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '업로드 실패')
        uploaded.push(data.url)
      }
      setImages((prev) => [...prev, ...uploaded])
    } catch (e) {
      setMsg('❌ 사진 ' + (e instanceof Error ? e.message : '업로드 실패'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url))
  }

  async function save() {
    if (!topic.trim()) { setMsg('주제를 입력하세요'); return }
    setSaving(true); setMsg('')
    try {
      const url = editId ? `/api/ideas/${editId}` : '/api/ideas'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, bullets, image_urls: images }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setIdeas((prev) => editId ? prev.map((i) => i.id === editId ? data : i) : [data, ...prev])
      resetForm()
      setMsg('✅ 저장됨')
    } catch (e) {
      setMsg('❌ ' + (e instanceof Error ? e.message : '저장 실패'))
    } finally {
      setSaving(false)
    }
  }

  function startEdit(idea: PostIdea) {
    setEditId(idea.id); setTopic(idea.topic); setBullets(idea.bullets); setImages(idea.image_urls ?? []); setMsg('')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(id: string) {
    if (!confirm('이 아이디어를 삭제할까요?')) return
    const res = await fetch(`/api/ideas/${id}`, { method: 'DELETE' })
    if (res.ok) setIdeas((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Capture form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-900">{editId ? '아이디어 수정' : '새 아이디어'}</h2>
          {editId && <button onClick={resetForm} className="text-xs text-gray-400 hover:text-gray-700">+ 새로 쓰기로</button>}
        </div>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="주제 (예: 얼바인 하코 돈까스)"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400"
        />
        <textarea
          value={bullets}
          onChange={(e) => setBullets(e.target.value)}
          rows={6}
          placeholder={'경험 불릿 (겪은 것만 · 한 줄에 하나)\n- 장소/제품: \n- 좋았던 점: \n- 솔직히 아쉬운 점: \n- 가격/구체 정보: \n- 누구에게 추천: '}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400 resize-none font-mono"
        />

        {/* Photo attach — uploads to blog storage, stored with the idea */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              📷 사진 첨부
            </button>
            {uploading && <span className="text-xs text-gray-400">업로드 중...</span>}
            {!uploading && images.length > 0 && <span className="text-xs text-gray-400">{images.length}장</span>}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((url) => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white rounded-full w-5 h-5 text-xs leading-none flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving || uploading}
            className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? '저장 중...' : editId ? '수정 저장' : '저장'}
          </button>
          {msg && <span className="text-xs text-gray-500">{msg}</span>}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">
          아이디어 {ideas.length}개
        </div>
        {ideas.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-400">아직 없어요. 위에서 하나 적어보세요.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {ideas.map((idea) => (
              <li key={idea.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{idea.topic}</span>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_STYLE[idea.status]}`}>
                        {STATUS_LABEL[idea.status]}
                      </span>
                    </div>
                    {idea.bullets && (
                      <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap line-clamp-3">{idea.bullets}</p>
                    )}
                    {idea.image_urls?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {idea.image_urls.map((url) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={url} src={url} alt="" className="w-12 h-12 object-cover rounded border border-gray-200" />
                        ))}
                      </div>
                    )}
                    {idea.post_id && (
                      <Link href={`/admin/posts/${idea.post_id}`} className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                        → 생성된 초안 보기
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => startEdit(idea)} className="text-xs text-gray-500 hover:text-gray-900">수정</button>
                    <button onClick={() => remove(idea.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
