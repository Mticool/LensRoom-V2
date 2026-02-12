'use client'

interface ModelOption {
  id: string
  name: string
  subtitle?: string
  icon?: React.ReactNode
  imageUrl?: string
  badge?: string
}

interface ModelCarouselProps {
  models: ModelOption[]
  selected: string
  onChange: (id: string) => void
  className?: string
}

export function ModelCarousel({
  models,
  selected,
  onChange,
  className = '',
}: ModelCarouselProps) {
  return (
    <div
      className={`flex gap-3 overflow-x-auto scrollbar-hide px-1 pb-3 snap-x ${className}`}
    >
      {models.map((model) => {
        const isActive = model.id === selected
        return (
          <button
            key={model.id}
            onClick={() => onChange(model.id)}
            className={`snap-center shrink-0 w-[130px] h-[160px] rounded-2xl relative overflow-hidden group cursor-pointer transition-all duration-200 active:scale-95 ${
              isActive
                ? 'ring-2 ring-[#8cf425] shadow-[0_0_20px_-5px_rgba(140,244,37,0.5)]'
                : 'ring-1 ring-[rgba(255,255,255,0.08)] hover:ring-[rgba(255,255,255,0.18)]'
            }`}
          >
            {/* Background image or gradient */}
            {model.imageUrl ? (
              <img
                src={model.imageUrl}
                alt={model.name}
                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-110 transition-all duration-500"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(140,244,37,0.08)] to-[rgba(139,92,246,0.08)]" />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

            {/* Badge */}
            {model.badge && (
              <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[rgba(140,244,37,0.20)] text-[#8cf425] text-[9px] font-bold rounded-md border border-[rgba(140,244,37,0.30)]">
                {model.badge}
              </div>
            )}

            {/* Content */}
            <div className="absolute bottom-3 left-3 right-2 z-10">
              {/* Icon */}
              <div
                className={`w-7 h-7 rounded-full backdrop-blur border flex items-center justify-center mb-1.5 ${
                  isActive
                    ? 'bg-black/50 border-[rgba(140,244,37,0.50)]'
                    : 'bg-black/30 border-[rgba(255,255,255,0.15)]'
                }`}
              >
                {model.icon || (
                  <svg
                    className={`w-3.5 h-3.5 ${isActive ? 'text-[#8cf425]' : 'text-white/70'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                  </svg>
                )}
              </div>
              <h3 className="font-bold text-sm leading-tight text-white">
                {model.name}
              </h3>
              {model.subtitle && (
                <p className="text-[10px] text-white/50 mt-0.5">{model.subtitle}</p>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
