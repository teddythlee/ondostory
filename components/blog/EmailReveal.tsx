'use client'

import { useEffect } from 'react'

// The email address is base64-encoded in the link's data-mail attribute (never
// plain text in the page HTML), so spam harvesters can't scrape it. On click we
// decode it and open the user's mail app. Wired up by the [메일문의:주소] token
// processed server-side in the blog post page.
export default function EmailReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('a[data-mail]')
    const handler = (e: Event) => {
      e.preventDefault()
      const el = e.currentTarget as HTMLElement
      let email = ''
      try { email = atob(el.dataset.mail || '') } catch { return }
      if (!email) return
      const subject = el.dataset.subj || 'ondostory 문의'
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`
    }
    els.forEach((el) => el.addEventListener('click', handler))
    return () => els.forEach((el) => el.removeEventListener('click', handler))
  }, [])
  return null
}
