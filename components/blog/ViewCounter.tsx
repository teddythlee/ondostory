'use client'

import { useEffect } from 'react'

export default function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    fetch('/api/posts/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })
  }, [slug])

  return null
}
