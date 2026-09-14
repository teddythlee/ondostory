'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { EMPTY_MANUAL_CHECKS, type QualityDashboardRow, type QualityManualChecks, type QualityWorkState } from '@/lib/quality-system'

const STATE_LABELS: Record<QualityWorkState, string> = {
  queued: '보강 대기',
  improving: '보강 중',
  monitoring: '성과 관찰',
  resolved: '해결됨',
}

const RISK_STYLE = {
  critical: 'bg-red-100 text-red-700',
  watch: 'bg-amber-100 text-amber-700',
  healthy: 'bg-green-100 text-green-700',
}

export default function QualityDashboard({ initialRows }: { initialRows: QualityDashboardRow[] }) {
  const [rows, setRows] = useState(initialRows)
  const [filter, setFilter] = useState<'priority' | 'critical' | 'watch' | 'healthy' | 'images' | 'resolved'>('priority')
  const [query, setQuery] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((row) => {
        if (filter === 'resolved' && row.work?.state !== 'resolved') return false
        if (filter === 'images' && !(row.metrics.unknownImageCount > 0 || row.metrics.externalImageCount > 0 || row.metrics.duplicateImageCount > 0)) return false
        if (filter !== 'priority' && filter !== 'resolved' && filter !== 'images' && row.risk_level !== filter) return false
        if (filter === 'priority' && row.work?.state === 'resolved') return false
        return !q || row.title.toLowerCase().includes(q) || row.current_slug.toLowerCase().includes(q)
      })
      .sort((a, b) => b.priority_score - a.priority_score)
  }, [rows, filter, query])

  async function update(
    row: QualityDashboardRow,
    state: QualityWorkState,
    notes = row.work?.notes || '',
    manualChecks: QualityManualChecks = row.work?.manual_checks || EMPTY_MANUAL_CHECKS,
  ) {
    setSavingId(row.post_id)
    try {
      const res = await fetch(`/api/quality/work-items/${row.post_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, notes, manualChecks }),
      })
      const data = (await res.json().catch(() => ({}))) as { item?: QualityDashboardRow['work']; error?: string }
      if (!res.ok || !data.item) throw new Error(data.error || '저장 실패')
      setRows((current) => current.map((item) => item.post_id === row.post_id ? { ...item, work: data.item || null } : item))
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 space-y-3">
        <div className="flex flex-wrap gap-2">
          {([
            ['priority', '우선 보강'],
            ['critical', '위험'],
            ['watch', '점검'],
            ['healthy', '자동 통과'],
            ['images', '이미지 점검'],
            ['resolved', '해결됨'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="제목 또는 슬러그 검색"
          className="w-full sm:w-80 text-sm border border-gray-200 rounded-lg px-3 py-2"
        />
      </div>

      {visible.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-gray-400">해당하는 글이 없습니다.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {visible.map((row, index) => {
            const gsc = row.metrics.gsc
            const ga4 = row.metrics.ga4
            const state = row.work?.state || 'queued'
            const manualChecks = row.work?.manual_checks || EMPTY_MANUAL_CHECKS
            return (
              <article key={row.id} className="p-5 hover:bg-gray-50/60 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex items-center gap-3 lg:w-36 flex-shrink-0">
                    <span className="text-xs text-gray-400 tabular-nums w-5">{index + 1}</span>
                    <div>
                      <p className="text-3xl font-bold text-gray-900 tabular-nums">{row.score}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${RISK_STYLE[row.risk_level]}`}>
                          {row.risk_level === 'critical' ? '위험' : row.risk_level === 'watch' ? '점검' : '자동 통과'}
                        </span>
                        {row.score_delta !== null && row.score_delta !== 0 && (
                          <span className={`text-xs font-medium ${row.score_delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {row.score_delta > 0 ? '+' : ''}{row.score_delta}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link href={`/admin/posts/${row.post_id}`} className="font-semibold text-gray-900 hover:text-blue-600 leading-snug">
                          {row.title}
                        </Link>
                        <p className="text-xs text-gray-400 mt-1 font-mono truncate">/{row.current_slug}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">우선순위 {row.priority_score.toFixed(1)}</span>
                        <select
                          value={state}
                          disabled={savingId === row.post_id}
                          onChange={(event) => update(row, event.target.value as QualityWorkState)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50"
                        >
                          {Object.entries(STATE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {row.factors.slice(0, 4).map((factor) => (
                        <span key={factor.key} title={factor.detail} className="text-xs bg-red-50 text-red-700 rounded-full px-2 py-1">
                          {factor.label} −{factor.penalty}
                        </span>
                      ))}
                      {row.factors.length === 0 && <span className="text-xs text-green-600">중요한 내부 품질 위험을 찾지 못했습니다.</span>}
                    </div>

                    {row.recommendations.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-gray-600">
                        {row.recommendations.slice(0, 3).map((recommendation) => <li key={recommendation}>• {recommendation}</li>)}
                      </ul>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span>본문 {row.metrics.contentChars.toLocaleString()}자</span>
                      <span>경험 신호 {row.metrics.evidenceSignals}</span>
                      <span>구체성 {row.metrics.specificitySignals}</span>
                      {row.metrics.unknownImageCount > 0 && <span className="text-purple-600">사용권 미확인 {row.metrics.unknownImageCount}</span>}
                      {row.metrics.externalImageCount > 0 && <span>외부 연결 {row.metrics.externalImageCount}</span>}
                      {row.metrics.duplicateImageCount > 0 && <span>중복 이미지 {row.metrics.duplicateImageCount}</span>}
                      {gsc && <span>GSC 노출 {gsc.impressions.toLocaleString()} · 클릭 {gsc.clicks}</span>}
                      {ga4 && <span>GA4 세션 {ga4.sessions} · 참여율 {(ga4.engagementRate * 100).toFixed(0)}%</span>}
                      {row.metrics.similarSlug && row.metrics.maxSimilarity >= 0.075 && <span>유사: {row.metrics.similarSlug}</span>}
                    </div>

                    <details className="mt-3">
                      <summary className="text-xs text-blue-600 cursor-pointer">사람 검수와 작업 메모</summary>
                      <form
                        className="mt-3 space-y-3"
                        onSubmit={(event) => {
                          event.preventDefault()
                          const form = new FormData(event.currentTarget)
                          update(row, state, String(form.get('notes') || ''), {
                            originalValue: form.get('originalValue') === 'on',
                            experienceEvidence: form.get('experienceEvidence') === 'on',
                            factChecked: form.get('factChecked') === 'on',
                            intentComplete: form.get('intentComplete') === 'on',
                          })
                        }}
                      >
                        <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-700">
                          <Check name="originalValue" defaultChecked={manualChecks.originalValue}>이 글에만 있는 고유 가치가 있다</Check>
                          <Check name="experienceEvidence" defaultChecked={manualChecks.experienceEvidence}>직접 경험 또는 신뢰 가능한 근거가 보인다</Check>
                          <Check name="factChecked" defaultChecked={manualChecks.factChecked}>가격·규정·사실과 확인 날짜를 검증했다</Check>
                          <Check name="intentComplete" defaultChecked={manualChecks.intentComplete}>검색자가 이 글로 다음 행동을 할 수 있다</Check>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input name="notes" defaultValue={row.work?.notes || ''} placeholder="무엇을 보강하고 확인했는지 기록" className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2" />
                          <button disabled={savingId === row.post_id} className="text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50">검수 저장</button>
                        </div>
                      </form>
                    </details>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Check({ name, defaultChecked, children }: { name: keyof QualityManualChecks; defaultChecked: boolean; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5" />
      <span>{children}</span>
    </label>
  )
}
