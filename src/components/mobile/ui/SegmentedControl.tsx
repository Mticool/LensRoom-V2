'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface SegmentedControlOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  size?: 'sm' | 'md'
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  const updateIndicator = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const idx = options.findIndex((o) => o.value === value)
    if (idx < 0) return
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-segment]')
    const btn = buttons[idx]
    if (!btn) return
    setIndicatorStyle({
      left: btn.offsetLeft,
      width: btn.offsetWidth,
    })
  }, [options, value])

  useEffect(() => {
    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [updateIndicator])

  const h = size === 'sm' ? 'h-9' : 'h-11'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div
      ref={containerRef}
      className={`relative flex bg-white/5 rounded-full p-1 border border-[rgba(255,255,255,0.05)] ${className}`}
    >
      {/* Sliding indicator */}
      <div
        className={`absolute top-1 ${h} bg-[#8cf425] rounded-full transition-all duration-200 ease-out shadow-[0_0_12px_-3px_rgba(140,244,37,0.5)]`}
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
      />
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            data-segment
            onClick={() => onChange(option.value)}
            className={`relative z-10 flex-1 ${h} flex items-center justify-center gap-1.5 ${textSize} font-semibold rounded-full transition-colors duration-200 ${
              isActive ? 'text-black' : 'text-white/60 active:text-white/80'
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
