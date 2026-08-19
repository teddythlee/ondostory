'use client'

import { useEffect } from 'react'

// [환율] 토큰(.os-fx)을 실시간 환율로 채운다. Frankfurter(ECB 기반, 키·한도 없음)에서
// 매 페이지 로드 시 최신값을 받아온다. base별로 1회만 호출하고, 실패하면 초기 fallback
// 텍스트를 그대로 둔다(크롤러·오프라인에서도 의미 유지 → AdSense/SEO 안전).
export default function ExchangeRate() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.os-fx'))
    if (!els.length) return

    const need = new Map<string, Set<string>>() // base → {symbols}
    els.forEach((el) => {
      const base = (el.dataset.base || 'USD').toUpperCase()
      const sym = (el.dataset.symbol || 'KRW').toUpperCase()
      if (!need.has(base)) need.set(base, new Set())
      need.get(base)!.add(sym)
    })

    let cancelled = false
    ;(async () => {
      const rates = new Map<string, { rate: number; date: string }>() // "BASE_SYM"
      await Promise.all(
        Array.from(need.entries()).map(async ([base, syms]) => {
          try {
            const url = `https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${Array.from(syms).join(',')}`
            const res = await fetch(url)
            if (!res.ok) return
            const data = await res.json()
            const date = String(data.date || '')
            Object.entries((data.rates || {}) as Record<string, number>).forEach(([sym, rate]) => {
              rates.set(`${base}_${sym}`, { rate: Number(rate), date })
            })
          } catch {
            /* keep fallback */
          }
        })
      )
      if (cancelled) return
      els.forEach((el) => {
        const base = (el.dataset.base || 'USD').toUpperCase()
        const sym = (el.dataset.symbol || 'KRW').toUpperCase()
        const hit = rates.get(`${base}_${sym}`)
        if (!hit) return
        const amt = Number(el.dataset.amount || '1') || 1
        const val = Math.round(hit.rate * amt)
        const baseLabel = base === 'USD' ? `${amt}달러` : `${amt} ${base}`
        const valLabel = sym === 'KRW' ? `₩${val.toLocaleString()}` : `${val.toLocaleString()} ${sym}`
        el.textContent = `${baseLabel} ≈ ${valLabel} (${hit.date} 기준)`
        el.title = 'Frankfurter(ECB) 실시간 환율'
      })
    })()

    return () => {
      cancelled = true
    }
  }, [])
  return null
}
