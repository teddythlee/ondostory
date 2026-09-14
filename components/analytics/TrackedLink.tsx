'use client'

import Link from 'next/link'
import { sendGAEvent } from '@next/third-parties/google'
import type { ComponentProps } from 'react'

type TrackedLinkProps = Omit<ComponentProps<typeof Link>, 'onNavigate'> & {
  eventName: 'internal_recommendation_click' | 'guide_click'
  eventParams: Record<string, string | number>
}

export default function TrackedLink({ eventName, eventParams, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onNavigate={() => {
        if (process.env.NODE_ENV === 'production') {
          sendGAEvent('event', eventName, eventParams)
        }
      }}
    />
  )
}
