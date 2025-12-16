'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  EFFECT_PRESETS, 
  FILTER_CHIPS, 
  getEffectsByFilter, 
  getOrderedPresetsForMasonry,
  buildPresetUrl,
  getTileAspectClass,
  type FilterChipId,
  type EffectPreset,
} from '@/config/effectsGallery';

// ===== EFFECT CARD =====
interface EffectCardProps {
  preset: EffectPreset;
  onClick: () => void;
}

function EffectCard({ preset, onClick }: EffectCardProps) {
  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="link"
      aria-label={`Создать ${preset.title}`}
      className="group relative w-full overflow-hidden rounded-2xl bg-[var(--surface)] 
                 border border-[var(--border)] break-inside-avoid mb-4
                 transition-all duration-300 ease-out
                 hover:translate-y-[-2px]
                 hover:border-white/50
                 hover:shadow-[0_0_20px_rgba(214,179,106,0.08),inset_0_0_20px_rgba(214,179,106,0.03)]
                 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/50 focus:ring-offset-2 focus:ring-offset-[var(--bg)]
                 text-left"
    >
      {/* Image with aspect ratio */}
      <div className={`relative w-full ${getTileAspectClass(preset.tileRatio)} overflow-hidden`}>
        <img
          src={preset.previewImage}
          alt={preset.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Bottom gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Cost pill - top right */}
        <div className="absolute top-3 right-3 px-2 py-1 rounded-full 
                        bg-black/50 backdrop-blur-sm
                        text-[11px] font-semibold text-white
                        flex items-center gap-1">
          ⭐{preset.costStars}
        </div>
        
        {/* Title - bottom left */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide truncate">
            {preset.title}
          </h3>
        </div>
      </div>
    </button>
  );
}

// ===== FILTER CHIPS =====
interface FilterChipsProps {
  activeFilter: FilterChipId;
  onFilterChange: (id: FilterChipId) => void;
}

function FilterChips({ activeFilter, onFilterChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 md:flex-wrap">
      {FILTER_CHIPS.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onFilterChange(chip.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
            ${activeFilter === chip.id
              ? 'bg-white text-black'
              : 'bg-[var(--surface)] text-[var(--text2)] border border-[var(--border)] hover:border-white/50 hover:text-[var(--text)]'
            }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

// ===== MASONRY GRID =====
interface MasonryGridProps {
  presets: EffectPreset[];
  onCardClick: (preset: EffectPreset) => void;
}

function MasonryGrid({ presets, onCardClick }: MasonryGridProps) {
  // Order presets for balanced visual layout
  const orderedPresets = getOrderedPresetsForMasonry(presets);
  
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
      {orderedPresets.map((preset) => (
        <EffectCard
          key={preset.presetId}
          preset={preset}
          onClick={() => onCardClick(preset)}
        />
      ))}
    </div>
  );
}

// ===== MAIN GALLERY COMPONENT =====
export function EffectsGallery() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterChipId>('all');
  
  const filteredPresets = getEffectsByFilter(activeFilter);
  
  const handleCardClick = useCallback((preset: EffectPreset) => {
    router.push(buildPresetUrl(preset));
  }, [router]);

  const handleFilterChange = useCallback((id: FilterChipId) => {
    setActiveFilter(id);
  }, []);

  return (
    <section className="pb-8">
      <div className="container mx-auto px-6">
        {/* Filter chips */}
        <div className="mb-8">
          <FilterChips 
            activeFilter={activeFilter} 
            onFilterChange={handleFilterChange} 
          />
        </div>

        {/* Masonry grid */}
        <MasonryGrid 
          presets={filteredPresets} 
          onCardClick={handleCardClick} 
        />
        
        {/* Empty state */}
        {filteredPresets.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[var(--muted)] text-lg">
              Нет эффектов для выбранного фильтра
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default EffectsGallery;


