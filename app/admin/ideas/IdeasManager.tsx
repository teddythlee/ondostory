'use client'

import { useState, useRef, useEffect } from 'react'
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

// Labeled fields so the guidance stays visible while typing.
// Combined into a single `bullets` text on save; parsed back on edit.
const FIELDS: { key: string; label: string; multi: boolean; ph: string }[] = [
  { key: '장소/제품', label: '장소 / 제품명', multi: false, ph: '예: 얼바인 하코 돈까스집' },
  { key: '좋았던 점', label: '좋았던 점', multi: true, ph: '맛·양·서비스 등 좋았던 것 (한 줄에 하나여도 됨)' },
  { key: '아쉬운 점', label: '솔직히 아쉬운 점', multi: true, ph: '아쉬웠던 것 (없으면 비워도 됨)' },
  { key: '가격/정보', label: '가격 / 구체 정보', multi: false, ph: '가격, 주소, 소요시간 등 아는 것' },
  { key: '한국어', label: '한국어 되나? (업체·병원·정비면)', multi: false, ph: '예: 사장님 한국분, 한국어 가능' },
  { key: '추천 대상', label: '누구에게 추천', multi: false, ph: '예: 돈까스 좋아하는 사람' },
  { key: '기타', label: '기타 (자유)', multi: true, ph: '분위기·팁 등 더 하고 싶은 말' },
]

type Fields = Record<string, string>
const emptyFields = (): Fields => Object.fromEntries(FIELDS.map((f) => [f.key, '']))

function buildBullets(f: Fields): string {
  return FIELDS.filter((fd) => f[fd.key]?.trim())
    .map((fd) => `${fd.key}: ${f[fd.key].trim()}`)
    .join('\n')
}

function parseBullets(bullets: string): Fields {
  const f = emptyFields()
  const prefixes = FIELDS.map((fd) => ({ key: fd.key, p: `${fd.key}:` }))
  let cur: string | null = null
  let any = false
  for (const line of (bullets || '').split('\n')) {
    const m = prefixes.find((x) => line.startsWith(x.p))
    if (m) { cur = m.key; f[cur] = line.slice(m.p.length).trim(); any = true }
    else if (cur) f[cur] += (f[cur] ? '\n' : '') + line
  }
  // legacy/unlabeled text → dump into 기타 so nothing is lost
  if (!any && (bullets || '').trim()) f['기타'] = bullets.trim()
  return f
}

export default function IdeasManager({ initial, sharedImages = [], shareFailed = false, sharedEditId = '' }: { initial: PostIdea[]; sharedImages?: string[]; shareFailed?: boolean; sharedEditId?: string }) {
  const [ideas, setIdeas] = useState(initial)
  const [topic, setTopic] = useState('')
  const [fields, setFields] = useState<Fields>(emptyFields())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>(sharedImages)
  // Share outcome banner, shown once until dismissed.
  // 'saved'   → photos auto-saved as an idea (opened in edit mode below)
  // 'prefill' → photos uploaded but idea insert failed; pre-filled, not yet saved
  // 'fail'    → the share arrived with no photos
  const [shareBanner, setShareBanner] = useState<{ kind: 'saved'; count: number } | { kind: 'prefill'; count: number } | { kind: 'fail' } | null>(
    shareFailed ? { kind: 'fail' } : sharedImages.length ? { kind: 'prefill', count: sharedImages.length } : null
  )

  // A photo shared from another app was auto-saved as an idea — open it in edit
  // mode so the owner only has to fill in the topic/details.
  useEffect(() => {
    if (!sharedEditId) return
    const idea = initial.find((i) => i.id === sharedEditId)
    if (!idea) return
    startEdit(idea)
    setShareBanner({ kind: 'saved', count: idea.image_urls?.length ?? 0 })
    // run once on mount for the shared idea
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function setField(key: string, val: string) {
    setFields((prev) => ({ ...prev, [key]: val }))
  }

  function resetForm() {
    setTopic(''); setFields(emptyFields()); setImages([]); setEditId(null); setMsg('')
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
        body: JSON.stringify({ topic, bullets: buildBullets(fields), image_urls: images }),
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
    setEditId(idea.id); setTopic(idea.topic); setFields(parseBullets(idea.bullets)); setImages(idea.image_urls ?? []); setMsg('')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(id: string) {
    if (!confirm('이 아이디어를 삭제할까요?')) return
    const res = await fetch(`/api/ideas/${id}`, { method: 'DELETE' })
    if (res.ok) setIdeas((prev) => prev.filter((i) => i.id !== id))
  }

  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-400'

  return (
    <div className="space-y-6">
      {/* Share Target outcome — prominent so it can't be missed on a phone */}
      {shareBanner && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            shareBanner.kind === 'fail'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}
        >
          <span className="flex-1">
            {shareBanner.kind === 'saved'
              ? `✅ 공유한 사진 ${shareBanner.count}장을 아이디어로 저장했어요. 아래에서 주제·내용만 채워 “수정 저장”하세요. 지금 닫아도 목록에 남아 있어요.`
              : shareBanner.kind === 'prefill'
              ? `✅ 공유한 사진 ${shareBanner.count}장을 받았어요. 아래 미리보기 확인 후 주제를 채워 저장하세요.`
              : '⚠️ 공유는 도착했지만 사진을 받지 못했어요. 아래 “📷 사진 첨부”로 직접 올려주세요.'}
          </span>
          <button
            type="button"
            onClick={() => setShareBanner(null)}
            className="opacity-60 hover:opacity-100 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Capture form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-900">{editId ? '아이디어 수정' : '새 아이디어'}</h2>
          {editId && <button onClick={resetForm} className="text-xs text-gray-400 hover:text-gray-700">+ 새로 쓰기로</button>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">주제 *</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 얼바인 하코 돈까스"
            className={inputCls}
          />
        </div>

        {FIELDS.map((fd) => (
          <div key={fd.key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{fd.label}</label>
            {fd.multi ? (
              <textarea
                value={fields[fd.key]}
                onChange={(e) => setField(fd.key, e.target.value)}
                rows={2}
                placeholder={fd.ph}
                className={`${inputCls} resize-none`}
              />
            ) : (
              <input
                type="text"
                value={fields[fd.key]}
                onChange={(e) => setField(fd.key, e.target.value)}
                placeholder={fd.ph}
                className={inputCls}
              />
            )}
          </div>
        ))}

        {/* Photo attach — uploads to blog storage, stored with the idea */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600">사진 (구글포토·갤러리에서 골라 첨부)</label>
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
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
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

        <div className="flex items-center gap-3 pt-1">
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
