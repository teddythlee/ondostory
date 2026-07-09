'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Post, Cluster } from '@/types'

export default function AdminPostsTable({ posts, clusters }: { posts: Post[]; clusters: Cluster[] }) {
  const router = useRouter()
  const [clusterMode, setClusterMode] = useState(false)
  const [managing, setManaging] = useState(false)
  // 낙관적 배정 오버라이드 (postId -> clusterKey|null)
  const [assignments, setAssignments] = useState<Record<string, string | null>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const clusterKeyOf = (p: Post) => (p.id in assignments ? assignments[p.id] : p.cluster)
  const clusterMap = new Map(clusters.map((c) => [c.key, c]))

  async function assign(post: Post, rawKey: string) {
    const value = rawKey === '' ? null : rawKey
    const prev = clusterKeyOf(post)
    setSavingId(post.id)
    setAssignments((a) => ({ ...a, [post.id]: value }))
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cluster: value }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || '저장 실패')
    } catch (err) {
      setAssignments((a) => ({ ...a, [post.id]: prev ?? null }))
      alert(err instanceof Error ? err.message : '클러스터 저장 실패')
    } finally {
      setSavingId(null)
    }
  }

  const countByCluster = posts.reduce<Record<string, number>>((acc, p) => {
    const k = clusterKeyOf(p)
    if (k) acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-900">글 목록</h2>
          {clusterMode && (
            <span className="text-xs text-gray-400">
              {clusters.map((c) => `${c.emoji} ${c.nav_label || c.title} ${countByCluster[c.key] ?? 0}`).join('  ·  ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {clusterMode && (
            <button
              onClick={() => setManaging((v) => !v)}
              className="text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {managing ? '관리 닫기' : '클러스터 관리'}
            </button>
          )}
          <button
            onClick={() => setClusterMode((v) => !v)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              clusterMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-200 hover:bg-gray-50'
            }`}
          >
            클러스터 모드 {clusterMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {clusterMode && managing && (
        <ClusterManager clusters={clusters} onChanged={() => router.refresh()} />
      )}

      {posts.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="mb-4">작성된 글이 없습니다</p>
          <Link href="/admin/posts/new" className="text-blue-500 hover:underline text-sm">첫 글 작성하기 →</Link>
        </div>
      ) : (
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 text-left w-[40%]">제목</th>
              {clusterMode ? (
                <th className="px-4 py-3 text-left w-[26%]">클러스터</th>
              ) : (
                <th className="px-4 py-3 text-left w-[18%]">태그</th>
              )}
              <th className="px-4 py-3 text-left w-[11%]">상태</th>
              {!clusterMode && <th className="px-4 py-3 text-right w-[8%]">조회수</th>}
              <th className="px-4 py-3 text-left w-[10%]">날짜</th>
              <th className="px-4 py-3 text-right w-[15%]">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <Link href={`/admin/posts/${post.id}`} className="font-medium text-gray-900 hover:text-blue-600 line-clamp-2 leading-snug block">
                    {post.title}
                  </Link>
                </td>
                {clusterMode ? (
                  <td className="px-4 py-4">
                    <select
                      value={clusterKeyOf(post) ?? ''}
                      disabled={savingId === post.id}
                      onChange={(e) => assign(post, e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50"
                    >
                      <option value="">— 미분류 —</option>
                      {clusters.map((c) => (
                        <option key={c.key} value={c.key}>{c.emoji} {c.title}</option>
                      ))}
                    </select>
                  </td>
                ) : (
                  <td className="px-4 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{tag}</span>
                      ))}
                    </div>
                  </td>
                )}
                <td className="px-4 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${post.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {post.published ? '발행됨' : '임시저장'}
                  </span>
                </td>
                {!clusterMode && (
                  <td className="px-4 py-4 text-sm text-gray-500 text-right whitespace-nowrap">{post.view_count ?? 0}</td>
                )}
                <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                  {format(new Date(post.created_at), 'yy.MM.dd', { locale: ko })}
                </td>
                <td className="px-4 py-4 text-right whitespace-nowrap">
                  <Link href={`/admin/posts/${post.id}`} className="text-sm text-blue-500 hover:underline mr-3">편집</Link>
                  {post.published && (
                    <Link href={`/blog/${post.slug}`} target="_blank" className="text-sm text-gray-400 hover:underline">보기</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── 클러스터 생성/수정/삭제 패널 ──
function ClusterManager({ clusters, onChanged }: { clusters: Cluster[]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)

  async function create(form: HTMLFormElement) {
    const fd = new FormData(form)
    const body = {
      key: String(fd.get('key') || ''),
      emoji: String(fd.get('emoji') || '📚'),
      title: String(fd.get('title') || ''),
      nav_label: String(fd.get('nav_label') || ''),
      tagline: String(fd.get('tagline') || ''),
      meta_description: String(fd.get('meta_description') || ''),
      sort_order: Number(fd.get('sort_order') || 0),
    }
    setBusy(true)
    try {
      const res = await fetch('/api/clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || '생성 실패')
      form.reset()
      onChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : '클러스터 생성 실패')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-gray-50 border-b border-gray-100 px-6 py-5 space-y-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">클러스터 관리</p>

      <div className="space-y-3">
        {clusters.map((c) => (
          <ClusterRow key={c.id} cluster={c} onChanged={onChanged} busyParent={busy} />
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); create(e.currentTarget) }}
        className="border-t border-gray-200 pt-4 grid grid-cols-2 md:grid-cols-4 gap-2 items-end"
      >
        <label className="text-xs text-gray-500">key(URL)
          <input name="key" required placeholder="travel" className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
        </label>
        <label className="text-xs text-gray-500">이모지
          <input name="emoji" defaultValue="📚" className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
        </label>
        <label className="text-xs text-gray-500 md:col-span-2">제목
          <input name="title" required placeholder="미국 여행 가이드" className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
        </label>
        <label className="text-xs text-gray-500">내비 라벨
          <input name="nav_label" placeholder="여행 가이드" className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
        </label>
        <label className="text-xs text-gray-500">정렬
          <input name="sort_order" type="number" defaultValue={0} className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
        </label>
        <label className="text-xs text-gray-500 md:col-span-2">한 줄 소개(tagline)
          <input name="tagline" className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
        </label>
        <label className="text-xs text-gray-500 md:col-span-3">메타 설명(SEO)
          <input name="meta_description" className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
        </label>
        <button disabled={busy} className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
          + 새 클러스터
        </button>
      </form>
    </div>
  )
}

function ClusterRow({ cluster, onChanged, busyParent }: { cluster: Cluster; onChanged: () => void; busyParent: boolean }) {
  const [c, setC] = useState(cluster)
  const [busy, setBusy] = useState(false)
  const dirty =
    c.emoji !== cluster.emoji || c.title !== cluster.title || c.nav_label !== cluster.nav_label ||
    c.tagline !== cluster.tagline || c.meta_description !== cluster.meta_description ||
    c.sort_order !== cluster.sort_order || c.key !== cluster.key

  async function save() {
    setBusy(true)
    try {
      const res = await fetch(`/api/clusters/${cluster.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: c.key, emoji: c.emoji, title: c.title, nav_label: c.nav_label,
          tagline: c.tagline, meta_description: c.meta_description, sort_order: c.sort_order,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || '저장 실패')
      onChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm(`"${cluster.title}" 클러스터를 삭제할까요? 배정된 글은 미분류로 돌아갑니다. (글은 삭제되지 않음)`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/clusters/${cluster.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || '삭제 실패')
      onChanged()
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 실패')
    } finally {
      setBusy(false)
    }
  }

  const input = 'text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white'
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 grid grid-cols-2 md:grid-cols-6 gap-2 items-center">
      <input value={c.emoji} onChange={(e) => setC({ ...c, emoji: e.target.value })} className={`${input} text-center`} />
      <input value={c.key} onChange={(e) => setC({ ...c, key: e.target.value })} className={`${input} font-mono`} title="URL key" />
      <input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} className={`${input} md:col-span-2`} />
      <input value={c.nav_label} onChange={(e) => setC({ ...c, nav_label: e.target.value })} className={input} placeholder="내비 라벨" />
      <input type="number" value={c.sort_order} onChange={(e) => setC({ ...c, sort_order: Number(e.target.value) })} className={input} title="정렬" />
      <input value={c.tagline} onChange={(e) => setC({ ...c, tagline: e.target.value })} className={`${input} md:col-span-3`} placeholder="한 줄 소개" />
      <input value={c.meta_description} onChange={(e) => setC({ ...c, meta_description: e.target.value })} className={`${input} md:col-span-2`} placeholder="메타 설명" />
      <div className="flex gap-2 justify-end">
        <button disabled={!dirty || busy || busyParent} onClick={save} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40">저장</button>
        <button disabled={busy || busyParent} onClick={remove} className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40">삭제</button>
      </div>
    </div>
  )
}
