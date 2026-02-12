'use client'

import { useRef, useCallback } from 'react'

interface SliderStep {
  value: number
  label?: string
}

interface DiscreteSliderProps {
  steps: SliderStep[]
  value: number
  onChange: (value: number) => void
  /** Label shown above the slider (e.g. "Motion Strength") */
  title?: string
  /** Show the current value above the thumb */
  showValue?: boolean
  /** Format the displayed value (e.g. add "%" suffix) */
  formatValue?: (value: number) => string
  className?: string
}

export function DiscreteSlider({
  steps,
  value,
  onChange,
  title,
  showValue = true,
  formatValue,
  className = '',
}: DiscreteSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  // Find the closest step index
  const activeIndex = steps.reduce((closestIdx, step, idx) => {
    return Math.abs(step.value - value) < Math.abs(steps[closestIdx].value - value)
      ? idx
      : closestIdx
  }, 0)

  const progress = steps.length > 1 ? activeIndex / (steps.length - 1) : 0

  const handleTrackInteraction = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const closestIdx = Math.round(ratio * (steps.length - 1))
      onChange(steps[closestIdx].value)
    },
    [steps, onChange]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const target = e.currentTarget as HTMLElement
      target.setPointerCapture(e.pointerId)
      handleTrackInteraction(e.clientX)
    },
    [handleTrackInteraction]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.buttons === 0) return
      handleTrackInteraction(e.clientX)
    },
    [handleTrackInteraction]
  )

  const displayValue = formatValue ? formatValue(value) : String(value)

  return (
    <div className={`${className}`}>
      {/* Title + value row */}
      {(title || showValue) && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <span className="text-xs font-bold tracking-widest text-white/40 uppercase">
              {title}
            </span>
          )}
          {showValue && (
            <span className="text-sm text-[#8cf425] font-mono bg-[rgba(140,244,37,0.10)] px-2 py-0.5 rounded border border-[rgba(140,244,37,0.20)]">
              {displayValue}
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-11 flex items-center touch-none select-none cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* Background track */}
        <div className="absolute left-0 right-0 h-1 bg-[rgba(255,255,255,0.08)] rounded-full" />

        {/* Filled track */}
        <div
          className="absolute left-0 h-1 bg-[#8cf425] rounded-full transition-[width] duration-100"
          style={{ width: `${progress * 100}%` }}
        />

        {/* Step dots */}
        {steps.map((step, idx) => {
          const pos = steps.length > 1 ? (idx / (steps.length - 1)) * 100 : 0
          const isPast = idx <= activeIndex
          return (
            <div
              key={step.value}
              className={`absolute w-2 h-2 rounded-full -translate-x-1/2 transition-colors duration-100 ${
                isPast ? 'bg-[#8cf425]' : 'bg-[rgba(255,255,255,0.15)]'
              }`}
              style={{ left: `${pos}%` }}
            />
          )
        })}

        {/* Thumb */}
        <div
          className="absolute w-6 h-6 rounded-full bg-[#8cf425] -translate-x-1/2 shadow-[0_0_12px_rgba(140,244,37,0.4)] transition-[left] duration-100 active:scale-110"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      {/* Step labels */}
      {steps.some((s) => s.label) && (
        <div className="flex justify-between mt-1.5 px-0.5">
          {steps.map((step) => (
            <span
              key={step.value}
              className={`text-[10px] transition-colors ${
                step.value === value
                  ? 'text-[#8cf425]/70 font-medium'
                  : 'text-white/20'
              }`}
            >
              {step.label || ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
