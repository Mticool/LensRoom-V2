'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Search, Sparkles } from 'lucide-react';

export type ModelCategory = 'text' | 'image' | 'video' | 'audio';

export interface Model {
  id: string;
  name: string;
  provider: string;
  icon: any; // LucideIcon
  cost: number;
  costPerGeneration?: number; // Alternative cost display
  badge?: string;
  description: string;
  category: ModelCategory;
  featured?: boolean; // Highlighted models
}

interface ModelModalProps {
  isOpen: boolean;
  models: Model[];
  currentModelId: string;
  category: ModelCategory;
  onSelect: (modelId: string) => void;
  onClose: () => void;
  showSearch?: boolean;
  title?: string;
}

export function ModelSelectionModal({
  isOpen,
  models,
  currentModelId,
  category,
  onSelect,
  onClose,
  showSearch = true,
  title,
}: ModelModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Filter models by search query
  const filteredModels = models.filter((model) => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Group models: featured first, then by cost
  const featuredModels = filteredModels.filter(m => m.featured);
  const otherModels = filteredModels.filter(m => !m.featured).sort((a, b) => a.cost - b.cost);

  const getCategoryIcon = () => {
    switch (category) {
      case 'text': return '💬';
      case 'image': return '🎨';
      case 'video': return '🎬';
      case 'audio': return '🔊';
      default: return '✨';
    }
  };

  const getCategoryTitle = () => {
    switch (category) {
      case 'text': return 'Text Models';
      case 'image': return 'Design Models';
      case 'video': return 'Video Models';
      case 'audio': return 'Audio Models';
      default: return 'Select Model';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 flex items-center justify-center">
                <span className="text-2xl">{getCategoryIcon()}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">{title || getCategoryTitle()}</h2>
                <p className="text-sm text-[var(--muted)]">{filteredModels.length} models available</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl hover:bg-[var(--surface2)] transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition"
              />
            </div>
          )}
        </div>

        {/* Model Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Featured Models */}
          {featuredModels.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">Featured</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {featuredModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isSelected={currentModelId === model.id}
                    onSelect={() => {
                      onSelect(model.id);
                      onClose();
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Models */}
          {otherModels.length > 0 && (
            <div>
              {featuredModels.length > 0 && (
                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">All Models</h3>
              )}
              <div className="grid grid-cols-2 gap-3">
                {otherModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isSelected={currentModelId === model.id}
                    onSelect={() => {
                      onSelect(model.id);
                      onClose();
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredModels.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface2)] flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-[var(--muted)]" />
              </div>
              <p className="text-sm text-[var(--muted)]">No models found</p>
              <p className="text-xs text-[var(--muted)] mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Model Card Component
interface ModelCardProps {
  model: Model;
  isSelected: boolean;
  onSelect: () => void;
}

function ModelCard({ model, isSelected, onSelect }: ModelCardProps) {
  const ModelIcon = model.icon;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-3 p-5 rounded-2xl border-2 text-left transition-all group",
        isSelected
          ? "border-[var(--accent-primary)] bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 shadow-lg"
          : "border-transparent bg-[var(--surface2)] hover:border-[var(--border)] hover:shadow-md"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 flex items-center justify-center flex-shrink-0">
          <ModelIcon className="w-6 h-6 text-[var(--accent-primary)]" />
        </div>
        {model.badge && (
          <span className="px-2 py-1 text-[10px] font-bold bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-full">
            {model.badge}
          </span>
        )}
      </div>

      {/* Content */}
      <div>
        <div className="font-bold text-base mb-1">{model.name}</div>
        <div className="text-xs text-[var(--muted)] mb-2">{model.provider}</div>
        <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2">{model.description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <div className="text-xs text-[var(--muted)]">
          {model.costPerGeneration ? `${model.costPerGeneration} ⭐/gen` : 'Cost per generation'}
        </div>
        <div className="text-sm font-bold text-[var(--accent-primary)]">{model.cost} ⭐</div>
      </div>
    </button>
  );
}