'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { IdeaCandidate, DiscoveryRun } from '@/lib/candidates'

const SOURCE_LABEL: Record<string, string> = {
  gsc_gap: '서치콘솔 기회',
  gsc_lowctr: '저CTR 리라이트',
  suggest: '구글 자동완성',
  naver: '네이버 자동완성',
  seasonal: '시즌/이벤트',
  community: '커뮤니티',
  internal_gap: '클러스터 갭',
}
const SOURCE_STYLE: Record<string, string> = {
  gsc_gap: 'bg-blue-100 text-blue-700',
  gsc_lowctr: 'bg-amber-100 text-amber-700',
  suggest: 'bg-violet-100 text-violet-700',
  naver: 'bg-green-100 text-green-700',
  seasonal: 'bg-orange-100 text-orange-700',
  community: 'bg-teal-100 text-teal-700',
  internal_gap: 'bg-gray-100 text-gray-600',
}

interface ClusterOpt { key: string; emoji: string; label: string }

// ── 그룹핑 헬퍼 ─────────────────────────────────────────────
// 대괄호 태그([리라이트]/[보강])·따옴표를 벗기고 앞 2토큰을 "패밀리 키"로 삼는다.
function stripTag(t: string): string {
  return t.replace(/^\[[^\]]+\]\s*/, '').replace(/["“”'']/g, '').trim()
}
function familyKey(t: string): string {
  return stripTag(t).split(/\s+/).slice(0, 2).join(' ')
}
// 새 글 후보인가 (리라이트·보강은 기존 글 대상이라 우산 병합 대상이 아님)
function isNewPost(c: IdeaCandidate): boolean {
  if (c.source === 'gsc_lowctr') return false
  if (c.source === 'gsc_gap' && Boolean((c.evidence as Record<string, unknown>)?.hasOwnPost)) return false
  return true
}
function commonCluster(items: IdeaCandidate[]): string | null {
  const counts = new Map<string, number>()
  for (const c of items) if (c.cluster) counts.set(c.cluster, (counts.get(c.cluster) || 0) + 1)
  let best: string | null = null
  let n = 0
  for (const [k, v] of counts) if (v > n) { best = k; n = v }
  return best
}

type Entry =
  | { type: 'family'; key: string; items: IdeaCandidate[]; score: number }
  | { type: 'single'; item: IdeaCandidate; score: number }

export default function CandidatesManager({
  initial,
  runs,
  clusters,
  related = {},
}: {
  initial: IdeaCandidate[]
  runs: DiscoveryRun[]
  clusters: ClusterOpt[]
  related?: Record<string, { slug: string; title: string }>
}) {
  const [items, setItems] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [groupBusy, setGroupBusy] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState('')
  const [fCluster, setFCluster] = useState('')
  const [fSource, setFSource] = useState('')
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const lastRun = runs[0]
  const clusterLabel = useMemo(
    () => Object.fromEntries(clusters.map((c) => [c.key, `${c.emoji} ${c.label}`])),
    [clusters]
  )

  const shown = items.filter(
    (c) => (!fCluster || c.cluster === fCluster) && (!fSource || c.source === fSource)
  )

  // 패밀리로 묶기: 같은 키 2개 이상이면 그룹, 아니면 단독. 그룹은 최고점 기준으로 섞어 정렬.
  const entries: Entry[] = useMemo(() => {
    const byKey = new Map<string, IdeaCandidate[]>()
    for (const c of shown) {
      const k = familyKey(c.topic)
      const arr = byKey.get(k) ?? []
      arr.push(c)
      byKey.set(k, arr)
    }
    const out: Entry[] = []
    for (const [k, arr] of byKey) {
      if (arr.length >= 2) {
        arr.sort((a, b) => b.score - a.score)
        out.push({ type: 'family', key: k, items: arr, score: arr[0].score })
      } else {
        out.push({ type: 'single', item: arr[0], score: arr[0].score })
      }
    }
    out.sort((a, b) => b.score - a.score)
    return out
  }, [shown])

  const familyCount = entries.filter((e) => e.type === 'family').length

  async function act(id: string, action: 'adopt' | 'dismiss') {
    setBusy(id)
    setMsg('')
    try {
      const res = await fetch(`/api/ideas/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, cluster: picked[id] || undefined }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || '실패')
      setItems((prev) => prev.filter((c) => c.id !== id))
      setMsg(action === 'adopt' ? '아이디어로 옮겼습니다 — 아이디어 화면에서 경험을 채우세요.' : '기각했습니다. 다시 올라오지 않습니다.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '실패')
    } finally {
      setBusy(null)
    }
  }

  async function groupAct(key: string, groupItems: IdeaCandidate[], action: 'adopt' | 'dismiss') {
    const ids = groupItems.map((c) => c.id)
    if (action === 'adopt' && !confirm(`${ids.length}개를 "우산 글 하나"로 묶어 채택할까요? (나머지는 그 글의 섹션이 됩니다)`)) return
    setGroupBusy(key)
    setMsg('')
    try {
      const res = await fetch('/api/ideas/candidates/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids, cluster: action === 'adopt' ? commonCluster(groupItems) : undefined }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || '실패')
      setItems((prev) => prev.filter((c) => !ids.includes(c.id)))
      setMsg(action === 'adopt'
        ? `${ids.length}개를 우산 글 하나로 묶어 채택했습니다 — 아이디어에서 경험을 한 번에 채우세요.`
        : `${ids.length}개를 한 번에 기각했습니다.`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '실패')
    } finally {
      setGroupBusy(null)
    }
  }

  async function runNow() {
    setRunning(true)
    setMsg('발굴 중… 30초쯤 걸립니다.')
    try {
      const res = await fetch('/api/ideas/discover', { method: 'POST' })
      const data = (await res.json()) as { error?: string; inserted?: number; refreshed?: number }
      if (!res.ok) throw new Error(data.error || '실패')
      setMsg(`신규 ${data.inserted ?? 0}건 · 갱신 ${data.refreshed ?? 0}건. 새로고침하면 반영됩니다.`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '실패')
    } finally {
      setRunning(false)
    }
  }

  // 후보 카드 내용(단독·그룹 멤버 공용)
  function renderItem(c: IdeaCandidate) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="text-xs font-semibold text-gray-900 tabular-nums bg-gray-100 px-2 py-0.5 rounded">{c.score}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${SOURCE_STYLE[c.source] || 'bg-gray-100 text-gray-600'}`}>
              {SOURCE_LABEL[c.source] || c.source}
            </span>
            {c.cluster && <span className="text-xs text-gray-500">{clusterLabel[c.cluster] || c.cluster}</span>}
            {c.seen_count > 1 && <span className="text-xs text-gray-400">{c.seen_count}일 연속</span>}
            {c.impressions > 0 && (
              <span className="text-xs text-gray-400 tabular-nums">노출 {c.impressions} · {c.position?.toFixed(1)}위</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 break-words">{c.topic}</p>
          {related[c.id] && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ 비슷한 발행글:{' '}
              <Link href={`/blog/${related[c.id].slug}`} target="_blank" className="underline hover:text-amber-700">
                {related[c.id].title}
              </Link>
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{c.rationale}</p>
          {typeof c.evidence?.url === 'string' && (
            <a href={c.evidence.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mt-1 inline-block">
              원문 보기 ↗
            </a>
          )}
          {typeof c.evidence?.slug === 'string' && (
            <Link href={`/blog/${c.evidence.slug}`} target="_blank" className="text-xs text-blue-500 hover:underline mt-1 inline-block">
              대상 글 보기 ↗
            </Link>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-none">
          {!c.cluster && (
            <select
              value={picked[c.id] || ''}
              onChange={(e) => setPicked((p) => ({ ...p, [c.id]: e.target.value }))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
            >
              <option value="">클러스터 지정</option>
              {clusters.map((cl) => <option key={cl.key} value={cl.key}>{cl.emoji} {cl.label}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => act(c.id, 'dismiss')}
              disabled={busy === c.id}
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              기각
            </button>
            <button
              onClick={() => act(c.id, 'adopt')}
              disabled={busy === c.id || (!c.cluster && !picked[c.id])}
              className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              {busy === c.id ? '…' : '채택'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 실행 상태 */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          {lastRun ? (
            <>
              마지막 실행 <strong className="text-gray-900">{new Date(lastRun.started_at).toLocaleString('ko-KR')}</strong>
              {' · '}신규 {lastRun.inserted} · 갱신 {lastRun.refreshed}
              {lastRun.errors?.length ? <span className="text-amber-600"> · 일부 소스 실패 {lastRun.errors.length}건</span> : null}
            </>
          ) : (
            <span className="text-gray-400">아직 실행 기록이 없습니다.</span>
          )}
        </div>
        <button
          onClick={runNow}
          disabled={running}
          className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {running ? '실행 중…' : '지금 실행'}
        </button>
      </div>

      {msg && <p className="text-sm text-blue-600 px-1">{msg}</p>}

      {/* 필터 */}
      <div className="flex flex-wrap gap-2">
        <select value={fCluster} onChange={(e) => setFCluster(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">클러스터 전체</option>
          {clusters.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
        </select>
        <select value={fSource} onChange={(e) => setFSource(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">소스 전체</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="text-sm text-gray-400 self-center ml-1">
          {shown.length}건{familyCount > 0 && ` · ${familyCount}묶음`}
        </span>
      </div>

      {/* 후보 목록 (비슷한 건 패밀리로 접어 보기) */}
      {entries.length === 0 ? (
        <p className="bg-white rounded-xl border border-gray-200 px-4 py-12 text-center text-sm text-gray-400">
          대기 중인 후보가 없습니다. &quot;지금 실행&quot;을 눌러보세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => {
            if (entry.type === 'single') {
              return (
                <li key={entry.item.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  {renderItem(entry.item)}
                </li>
              )
            }
            const allNew = entry.items.every(isNewPost)
            const open = !!expanded[entry.key]
            return (
              <li key={`f:${entry.key}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [entry.key]: !open }))}
                    className="flex items-center gap-2 min-w-0 text-left"
                  >
                    <span className="text-gray-400 text-xs w-3">{open ? '▾' : '▸'}</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{entry.key}</span>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{entry.items.length}개</span>
                    <span className="text-xs text-gray-400 tabular-nums">최고 {entry.items[0].score}</span>
                  </button>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => groupAct(entry.key, entry.items, 'dismiss')}
                      disabled={groupBusy === entry.key}
                      className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      그룹 기각
                    </button>
                    {allNew && (
                      <button
                        onClick={() => groupAct(entry.key, entry.items, 'adopt')}
                        disabled={groupBusy === entry.key}
                        className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                        title="하나의 우산 글로 묶어 채택 (나머지는 섹션)"
                      >
                        {groupBusy === entry.key ? '…' : '묶어 채택'}
                      </button>
                    )}
                  </div>
                </div>
                {open && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                    {!allNew && (
                      <p className="text-xs text-amber-600">보강·리라이트가 섞여 있어 묶어 채택은 막았습니다 — 개별로 처리하세요.</p>
                    )}
                    {entry.items.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded-lg border border-gray-100 p-3">
                        {renderItem(c)}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
