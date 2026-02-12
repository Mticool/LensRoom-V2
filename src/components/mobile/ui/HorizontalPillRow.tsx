'use client'

interface PillOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface HorizontalPillRowProps {
  options: PillOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  scrollable?: boolean
  size?: 'sm' | 'md'
}

export function HorizontalPillRow({
  options,
  value,
  onChange,
  className = '',
  scrollable = true,
  size = 'md',
}: HorizontalPillRowProps) {
  const px = size === 'sm' ? 'px-3' : 'px-4'
  const py = size === 'sm' ? 'py-1.5' : 'py-2'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div
      className={`flex gap-2 ${
        scrollable ? 'overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1' : 'flex-wrap'
      } ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`flex-shrink-0 ${px} ${py} ${textSize} font-medium rounded-full transition-all duration-150 flex items-center gap-1.5 active:scale-95 ${
              isActive
                ? 'bg-[#8cf425] text-black shadow-[0_0_12px_-3px_rgba(140,244,37,0.5)]'
                : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.10)] text-white/70 hover:text-white/90 hover:border-[rgba(255,255,255,0.18)]'
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
