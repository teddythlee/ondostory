'use client'

import { useEffect, useRef, useState } from 'react'

// In-page popup system. Authors write in a post:
//   [팝업 label="트리거 문구"] ...작성한 HTML... [/팝업]
// which the blog page turns into an inline <button.os-popup-trigger> plus an
// inert <template> holding the authored content. A <template> is valid anywhere
// (even mid-sentence) and never affects layout, so the token can sit inline in a
// paragraph. Clicking the trigger clones the template into a centered modal —
// content shows in place, no navigation.
//
// Any [메일문의:] link inside the popup arrives as an <a data-mail> with the
// address base64-encoded (never plain text in the page source, so spam bots
// can't scrape it). Template content lives outside the live DOM, so EmailReveal
// can't see it — we wire those links here on clone.
export default function PopupModal() {
  const [openId, setOpenId] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Bind the triggers once. Templates are server-rendered and present at mount.
  useEffect(() => {
    const triggers = document.querySelectorAll<HTMLElement>('.os-popup-trigger')
    const handler = (e: Event) => {
      e.preventDefault()
      const id = (e.currentTarget as HTMLElement).dataset.popupTarget
      if (id) setOpenId(id)
    }
    triggers.forEach((t) => t.addEventListener('click', handler))
    return () => triggers.forEach((t) => t.removeEventListener('click', handler))
  }, [])

  // While open: clone the template into the modal, wire mail links, lock scroll, Esc to close.
  useEffect(() => {
    if (!openId) return
    const tpl = document.getElementById(openId) as HTMLTemplateElement | null
    const body = bodyRef.current
    if (!tpl || !body || !('content' in tpl)) return

    const frag = tpl.content.cloneNode(true) as DocumentFragment
    frag.querySelectorAll<HTMLElement>('a[data-mail]').forEach((a) => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault()
        let email = ''
        try { email = atob(a.dataset.mail || '') } catch { return }
        if (!email) return
        const subject = a.dataset.subj || 'ondostory 문의'
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`
      })
    })
    body.replaceChildren(frag)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      body.replaceChildren()
    }
  }, [openId])

  if (!openId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => setOpenId(null)}
    >
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="닫기"
          onClick={() => setOpenId(null)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          ×
        </button>
        <div ref={bodyRef} className="prose prose-sm max-w-none text-gray-800" />
      </div>
    </div>
  )
}
