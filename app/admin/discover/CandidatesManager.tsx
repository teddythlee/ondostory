'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { IdeaCandidate, DiscoveryRun } from '@/lib/candidates'

const SOURCE_LABEL: Record<string, string> = {
  gsc_gap: '서치콘솔 기회',
  gsc_lowctr: '저CTR 리라이트',
  suggest: '자동완성',
  community: '커뮤니티',
  internal_gap: '클러스터 갭',
}
const SOURCE_STYLE: Record<string, string> = {
  gsc_gap: 'bg-blue-100 text-blue-700',
  gsc_lowctr: 'bg-amber-100 text-amber-700',
  suggest: 'bg-violet-100 text-violet-700',
  community: 'bg-teal-100 text-teal-700',
  internal_gap: 'bg-gray-100 text-gray-600',
}

interface ClusterOpt { key: string; emoji: string; label: string }

export default function CandidatesManager({
  initial,
  runs,
  clusters,
}: {
  initial: IdeaCandidate[]
  runs: DiscoveryRun[]
  clusters: ClusterOpt[]
}) {
  const [items, setItems] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState('')
  const [fCluster, setFCluster] = useState('')
  const [fSource, setFSource] = useState('')
  const [picked, setPicked] = useState<Record<string, string>>({})

  const lastRun = runs[0]
  const clusterLabel = useMemo(
    () => Object.fromEntries(clusters.map((c) => [c.key, `${c.emoji} ${c.label}`])),
    [clusters]
  )

  const shown = items.filter(
    (c) => (!fCluster || c.cluster === fCluster) && (!fSource || c.source === fSource)
  )

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
        <span className="text-sm text-gray-400 self-center ml-1">{shown.length}건</span>
      </div>

      {/* 후보 목록 */}
      {shown.length === 0 ? (
        <p className="bg-white rounded-xl border border-gray-200 px-4 py-12 text-center text-sm text-gray-400">
          대기 중인 후보가 없습니다. &quot;지금 실행&quot;을 눌러보세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((c) => (
            <li key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
