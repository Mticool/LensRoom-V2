'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export type SectionType = 'text' | 'image' | 'video' | 'audio';

export interface Section {
  key: SectionType;
  label: string;
  icon: LucideIcon;
}

interface SectionTabsProps {
  sections: Section[];
  activeSection: SectionType;
  onSectionChange: (section: SectionType) => void;
  onSectionClick?: (section: SectionType) => void; // Open modal on click
}

export function SectionTabs({ sections, activeSection, onSectionChange, onSectionClick }: SectionTabsProps) {
  const handleClick = (sectionKey: SectionType) => {
    onSectionChange(sectionKey);
    onSectionClick?.(sectionKey); // Trigger modal if provided
  };

  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
      <div className="flex items-center gap-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.key}
              onClick={() => handleClick(section.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2",
                activeSection === section.key
                  ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shadow-lg shadow-purple-500/30"
                  : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)]"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
