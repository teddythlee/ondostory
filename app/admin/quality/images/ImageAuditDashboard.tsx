'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ImageAsset, ImageAuditItem, ImageOrigin, ImageRightsStatus } from '@/lib/image-provenance'

const ORIGINS: Array<[ImageOrigin, string]> = [
  ['unknown', '미확인'],
  ['original', '직접 촬영'],
  ['licensed_stock', '라이선스 이미지'],
  ['ai_generated', 'AI 생성'],
  ['business_provided', '업체 제공'],
]

function ImageCard({ item, onSaved }: { item: ImageAuditItem; onSaved: (asset: ImageAsset) => void }) {
  const [originType, setOriginType] = useState(item.origin_type)
  const [rightsStatus, setRightsStatus] = useState(item.rights_status)
  const [sourceUrl, setSourceUrl] = useState(item.source_url || '')
  const [creator, setCreator] = useState(item.creator || '')
  const [licenseName, setLicenseName] = useState(item.license_name || '')
  const [note, setNote] = useState(item.verification_note || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function save() {
    setSaving(true); setMessage('')
    try {
      const res = await fetch('/api/quality/images', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: item.image_url, originType, rightsStatus, sourceUrl, creator, licenseName, verificationNote: note }),
      })
      const data = (await res.json()) as { asset?: ImageAsset; error?: string }
      if (!res.ok || !data.asset) throw new Error(data.error || '저장 실패')
      onSaved(data.asset)
      setMessage('저장됨')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장 실패')
    } finally { setSaving(false) }
  }

  const statusStyle = item.rights_status === 'verified'
    ? 'bg-green-100 text-green-700'
    : item.rights_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'

  return (
    <article className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="grid md:grid-cols-[240px_1fr]">
        <div className="bg-gray-100 min-h-44">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt="감사 대상 이미지" className="w-full h-52 md:h-full object-cover" />
        </div>
        <div className="p-4 space-y-3 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusStyle}`}>
                {item.rights_status === 'verified' ? '검증 완료' : item.rights_status === 'rejected' ? '교체 필요' : '증빙 없음'}
              </span>
              <p className="text-xs text-gray-400 mt-2 truncate" title={item.image_url}>{item.host} · {item.storage_path || '외부 이미지'}</p>
            </div>
            <span className={`text-xs ${item.posts.length > 1 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>{item.posts.length}개 글에서 사용</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {item.posts.map((post) => <Link key={post.id} href={`/admin/posts/${post.id}`} className="text-blue-600 hover:underline">{post.title}</Link>)}
            {item.posts.length === 0 && <span className="text-gray-400">현재 글에서 사용하지 않음</span>}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <select value={originType} onChange={(event) => setOriginType(event.target.value as ImageOrigin)} className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white">
              {ORIGINS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={rightsStatus} onChange={(event) => setRightsStatus(event.target.value as ImageRightsStatus)} className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white">
              <option value="unverified">증빙 없음</option><option value="verified">검증 완료</option><option value="rejected">교체 필요</option>
            </select>
            <input value={creator} onChange={(event) => setCreator(event.target.value)} placeholder="촬영자·제작자" className="text-xs border border-gray-200 rounded-lg px-3 py-2" />
            <input value={licenseName} onChange={(event) => setLicenseName(event.target.value)} placeholder="라이선스명" className="text-xs border border-gray-200 rounded-lg px-3 py-2" />
            <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="원본 페이지 URL" className="sm:col-span-2 text-xs border border-gray-200 rounded-lg px-3 py-2" />
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="허가·생성 기록·확인 근거" className="sm:col-span-2 text-xs border border-gray-200 rounded-lg px-3 py-2" />
          </div>
          <div className="flex items-center justify-end gap-2">
            {message && <span className={`text-xs ${message === '저장됨' ? 'text-green-600' : 'text-red-600'}`}>{message}</span>}
            <button onClick={save} disabled={saving} className="text-xs bg-gray-900 text-white rounded-lg px-3 py-2 disabled:opacity-50">{saving ? '저장 중' : '증빙 저장'}</button>
          </div>
        </div>
      </div>
    </article>
  )
}
export default function ImageAuditDashboard({ initialItems }: { initialItems: ImageAuditItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [filter, setFilter] = useState<'unverified' | 'rejected' | 'verified' | 'duplicate' | 'all'>('unverified')
  const [query, setQuery] = useState('')
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => {
      if (filter === 'duplicate' && item.posts.length < 2) return false
      if (!['all', 'duplicate'].includes(filter) && item.rights_status !== filter) return false
      return !q || item.image_url.toLowerCase().includes(q) || item.posts.some((post) => `${post.title} ${post.slug}`.toLowerCase().includes(q))
    })
  }, [items, filter, query])

  const counts = { unverified: items.filter((item) => item.rights_status === 'unverified').length, rejected: items.filter((item) => item.rights_status === 'rejected').length, verified: items.filter((item) => item.rights_status === 'verified').length, duplicate: items.filter((item) => item.posts.length > 1).length }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['증빙 없음', counts.unverified, 'text-amber-600'], ['교체 필요', counts.rejected, 'text-red-600'], ['검증 완료', counts.verified, 'text-green-600'], ['중복 사용', counts.duplicate, 'text-purple-600']].map(([label, value, color]) => (
          <div key={String(label)} className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs text-gray-500">{label}</p><p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p></div>
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {([['unverified', '증빙 없음'], ['rejected', '교체 필요'], ['verified', '검증 완료'], ['duplicate', '중복'], ['all', '전체']] as const).map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`text-xs px-3 py-1.5 rounded-full ${filter === value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>)}
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="글 제목·파일 URL 검색" className="text-sm border border-gray-200 rounded-lg px-3 py-2" />
      </div>
      {visible.length === 0 ? <div className="py-16 text-center text-sm text-gray-400">해당 이미지가 없습니다.</div> : visible.map((item) => <ImageCard key={item.image_url} item={item} onSaved={(asset) => setItems((current) => current.map((row) => row.image_url === asset.image_url ? { ...row, ...asset } : row))} />)}
    </div>
  )
}
