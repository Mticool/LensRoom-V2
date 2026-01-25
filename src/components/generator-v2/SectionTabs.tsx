'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Image as ImageIcon, Video, Music, Clapperboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Section {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const SECTIONS: Section[] = [
  { 
    id: 'photo', 
    label: 'Photo', 
    icon: <ImageIcon className="w-4 h-4" />,
    color: '#3b82f6' // blue
  },
  { 
    id: 'video', 
    label: 'Video', 
    icon: <Video className="w-4 h-4" />,
    color: '#a855f7', // purple
  },
  { 
    id: 'motion', 
    label: 'Motion', 
    icon: <Clapperboard className="w-4 h-4" />,
    color: '#f97316', // orange
  },
  { 
    id: 'music', 
    label: 'Music', 
    icon: <Music className="w-4 h-4" />,
    color: '#f472b6' // pink
  },
];

interface SectionTabsProps {
  className?: string;
}

export function SectionTabs({ className }: SectionTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Canonical sections: photo|video|motion|music
  // Backward-compat: image -> photo, audio -> music
  const rawSection = (searchParams.get('section') || '').trim().toLowerCase();
  const currentSection =
    rawSection === 'image' ? 'photo' :
    rawSection === 'audio' ? 'music' :
    rawSection || 'photo';

  const handleSectionChange = (sectionId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', sectionId);
    
    // Preserve the model param only if switching within same type
    if (sectionId !== currentSection) {
      params.delete('model');
    }
    
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: Centered tabs */}
      <div className="hidden md:flex justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          {SECTIONS.map((section) => {
            const isActive = currentSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id)}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all",
                  isActive
                    ? "text-black"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-[var(--gold)] rounded-xl"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {section.icon}
                  {section.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: Horizontal scrollable tabs */}
      <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="inline-flex gap-2 p-1 min-w-full">
          {SECTIONS.map((section) => {
            const isActive = currentSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all active:scale-95",
                  isActive
                    ? "bg-[var(--gold)] text-black"
                    : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]"
                )}
              >
                {section.icon}
                {section.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Alternative: Pill-style tabs for use in specific contexts
interface PillTabsProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function GeneratorPillTabs({ value, onChange, className }: PillTabsProps) {
  return (
    <div className={cn("flex gap-1.5", className)}>
      {SECTIONS.map((section) => {
        const isActive = value === section.id;
        return (
          <button
            key={section.id}
            onClick={() => onChange(section.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              isActive
                ? "bg-[var(--gold)] text-black"
                : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--border)]"
            )}
          >
            {section.icon}
            {section.label}
          </button>
        );
      })}
    </div>
  );
}
