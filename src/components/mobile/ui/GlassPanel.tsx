'use client'

import { type ReactNode } from 'react'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  blur?: 'sm' | 'md' | 'lg' | 'xl'
  as?: 'div' | 'section' | 'article'
}

const blurMap = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
}

export function GlassPanel({
  children,
  className = '',
  blur = 'xl',
  as: Tag = 'div',
}: GlassPanelProps) {
  return (
    <Tag
      className={`bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] ${blurMap[blur]} rounded-2xl ${className}`}
    >
      {children}
    </Tag>
  )
}
