"use client"

import type { ReactNode } from 'react'

interface NoSSRProps {
  children: ReactNode
  fallback?: ReactNode
}

export function NoSSR({ children, fallback = null }: NoSSRProps) {
  if (typeof window === 'undefined') {
    return <>{fallback}</>
  }

  return <>{children}</>
}
