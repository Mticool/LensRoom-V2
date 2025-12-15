'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Image as ImageIcon,
  Video,
  Sparkles,
  Eye,
  EyeOff,
  GripVertical,
  Search,
  Filter,
  Upload,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Star,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PHOTO_MODELS, VIDEO_MODELS, getModelById } from '@/config/models';
import { computePrice } from '@/lib/pricing/compute-price';

// ===== TYPES =====
export interface EffectPreset {
  id?: string;
  presetId: string;
  title: string;
  contentType: 'photo' | 'video';
  modelKey: string;
  tileRatio: '9:16' | '1:1' | '16:9';
  costStars: number;
  mode: string;
  variantId: string;
  previewImage: string;
  templatePrompt: string;
  featured: boolean;
  published: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

interface GalleryEditorProps {
  presets: EffectPreset[];
  onSave: (preset: EffectPreset) => Promise<void>;
  onDelete: (presetId: string) => Promise<void>;
  onReorder: (presets: EffectPreset[]) => Promise<void>;
  loading: boolean;
}

// ===== CONSTANTS =====
const CONTENT_TYPES = [
  { id: 'photo', label: 'Фото', icon: ImageIcon },
  { id: 'video', label: 'Видео', icon: Video },
];

const TILE_RATIOS = [
  { id: '9:16', label: '9:16 (Stories)', icon: '▯' },
  { id: '1:1', label: '1:1 (Square)', icon: '□' },
  { id: '16:9', label: '16:9 (Wide)', icon: '▭' },
];

const PHOTO_MODES = [
  { id: 't2i', label: 'Текст → Фото' },
  { id: 'i2i', label: 'Фото → Фото' },
];

const VIDEO_MODES = [
  { id: 't2v', label: 'Текст → Видео' },
  { id: 'i2v', label: 'Фото → Видео' },
  { id: 'start_end', label: 'Старт → Финиш' },
  { id: 'storyboard', label: 'Раскадровка' },
];

// ===== MAIN COMPONENT =====
export function GalleryEditor({ presets, onSave, onDelete, onReorder, loading }: GalleryEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'video'>('all');
  const [editingPreset, setEditingPreset] = useState<EffectPreset | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Filter presets
  const filteredPresets = presets.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.templatePrompt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || p.contentType === filterType;
    return matchesSearch && matchesType;
  });

  // Create new preset
  const handleCreate = () => {
    const newPreset: EffectPreset = {
      presetId: `effect-${Date.now()}`,
      title: 'Новый эффект',
      contentType: 'photo',
      modelKey: 'nano-banana-pro',
      tileRatio: '1:1',
      costStars: 3,
      mode: 't2i',
      variantId: 'default',
      previewImage: '',
      templatePrompt: '',
      featured: false,
      published: false,
      order: presets.length,
    };
    setEditingPreset(newPreset);
    setIsCreating(true);
  };

  // Save preset
  const handleSave = async (preset: EffectPreset) => {
    try {
      await onSave(preset);
      setEditingPreset(null);
      setIsCreating(false);
      toast.success(isCreating ? 'Эффект создан!' : 'Эффект сохранён!');
    } catch (error) {
      toast.error('Ошибка сохранения');
    }
  };

  // Delete preset
  const handleDelete = async (presetId: string) => {
    if (!confirm('Удалить этот эффект?')) return;
    try {
      await onDelete(presetId);
      toast.success('Эффект удалён');
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск эффектов..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]"
            />
          </div>

          {/* Filter */}
          <div className="flex gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
            {(['all', 'photo', 'video'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  filterType === type
                    ? "bg-[var(--gold)] text-black"
                    : "text-[var(--text2)] hover:text-[var(--text)]"
                )}
              >
                {type === 'all' ? 'Все' : type === 'photo' ? 'Фото' : 'Видео'}
              </button>
            ))}
          </div>
        </div>

        {/* Create Button */}
        <Button onClick={handleCreate} className="bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)]">
          <Plus className="w-4 h-4 mr-2" />
          Добавить эффект
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Всего эффектов" value={presets.length} icon={Sparkles} />
        <StatCard label="Опубликовано" value={presets.filter(p => p.published).length} icon={Eye} />
        <StatCard label="Featured" value={presets.filter(p => p.featured).length} icon={Star} />
        <StatCard label="Черновики" value={presets.filter(p => !p.published).length} icon={EyeOff} />
      </div>

      {/* Presets Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
        </div>
      ) : filteredPresets.length === 0 ? (
        <div className="text-center py-20">
          <Sparkles className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
          <p className="text-[var(--muted)]">Нет эффектов</p>
          <Button variant="outline" className="mt-4" onClick={handleCreate}>
            Создать первый эффект
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPresets.map((preset) => (
            <PresetCard
              key={preset.presetId}
              preset={preset}
              onEdit={() => { setEditingPreset(preset); setIsCreating(false); }}
              onDelete={() => handleDelete(preset.presetId)}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingPreset && (
        <PresetEditorModal
          preset={editingPreset}
          isNew={isCreating}
          onSave={handleSave}
          onClose={() => { setEditingPreset(null); setIsCreating(false); }}
        />
      )}
    </div>
  );
}

// ===== STAT CARD =====
function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[var(--gold)]" />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
          <p className="text-xs text-[var(--muted)]">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ===== PRESET CARD =====
function PresetCard({ 
  preset, 
  onEdit, 
  onDelete 
}: { 
  preset: EffectPreset; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(preset.presetId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden group hover:border-[var(--gold)]/50 transition-all">
      {/* Preview Image */}
      <div className="relative aspect-video bg-[var(--surface2)]">
        {preset.previewImage ? (
          <img src={preset.previewImage} alt={preset.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-[var(--muted)]" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={cn(
            "text-[9px] px-1.5 py-0.5 rounded font-bold",
            preset.contentType === 'photo' 
              ? "bg-blue-500/80 text-white" 
              : "bg-purple-500/80 text-white"
          )}>
            {preset.contentType === 'photo' ? 'ФОТО' : 'ВИДЕО'}
          </span>
          {preset.featured && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--gold)] text-black font-bold">
              FEATURED
            </span>
          )}
        </div>

        {/* Status */}
        <div className="absolute top-2 right-2">
          {preset.published ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/80 text-white font-bold flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" />
              LIVE
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-500/80 text-white font-bold flex items-center gap-0.5">
              <EyeOff className="w-2.5 h-2.5" />
              DRAFT
            </span>
          )}
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5 mr-1" />
            Редактировать
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm text-[var(--text)] line-clamp-1">{preset.title}</h3>
          <span className="text-xs text-[var(--gold)] font-bold flex items-center gap-0.5 flex-shrink-0">
            <Star className="w-3 h-3 fill-current" />
            {preset.costStars}
          </span>
        </div>
        
        <p className="text-xs text-[var(--muted)] line-clamp-2 mb-3">{preset.templatePrompt || 'Нет промпта'}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface2)] text-[var(--text2)]">
              {preset.modelKey}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface2)] text-[var(--text2)]">
              {preset.tileRatio}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={copyId} className="p-1 rounded hover:bg-[var(--surface2)] transition-colors">
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
              )}
            </button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-red-500/20 transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== PRESET EDITOR MODAL =====
function PresetEditorModal({
  preset,
  isNew,
  onSave,
  onClose,
}: {
  preset: EffectPreset;
  isNew: boolean;
  onSave: (preset: EffectPreset) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EffectPreset>(preset);
  const [saving, setSaving] = useState(false);

  const models = form.contentType === 'photo' ? PHOTO_MODELS : VIDEO_MODELS;
  const modes = form.contentType === 'photo' ? PHOTO_MODES : VIDEO_MODES;

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('Введите название');
      return;
    }
    if (!form.previewImage.trim()) {
      toast.error('Добавьте изображение превью');
      return;
    }
    
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (updates: Partial<EffectPreset>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  // Reset mode when content type changes
  useEffect(() => {
    if (form.contentType === 'photo') {
      updateForm({ mode: 't2i', modelKey: 'nano-banana-pro' });
    } else {
      updateForm({ mode: 't2v', modelKey: 'kling-2.6' });
    }
  }, [form.contentType]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--bg)] border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text)]">
            {isNew ? 'Создать эффект' : 'Редактировать эффект'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors">
            <X className="w-5 h-5 text-[var(--muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Settings */}
            <div className="space-y-5">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">Основное</h3>
                
                {/* Title */}
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1.5 block">Название *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateForm({ title: e.target.value })}
                    placeholder="SMOKE TRANSITION"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]"
                  />
                </div>

                {/* Content Type */}
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1.5 block">Тип контента</label>
                  <div className="flex gap-2">
                    {CONTENT_TYPES.map(type => (
                      <button
                        key={type.id}
                        onClick={() => updateForm({ contentType: type.id as 'photo' | 'video' })}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all",
                          form.contentType === type.id
                            ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                            : "border-[var(--border)] text-[var(--text2)] hover:border-[var(--gold)]/50"
                        )}
                      >
                        <type.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preset ID */}
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1.5 block">Preset ID</label>
                  <input
                    type="text"
                    value={form.presetId}
                    onChange={(e) => updateForm({ presetId: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="smoke-transition"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] font-mono"
                  />
                </div>
              </div>

              {/* Model & Mode */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">Модель и режим</h3>
                
                {/* Model */}
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1.5 block">Модель</label>
                  <select
                    value={form.modelKey}
                    onChange={(e) => updateForm({ modelKey: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--gold)]"
                  >
                    {models.map(m => {
                      const minPrice = computePrice(m.id, { variants: 1 });
                      return (
                        <option key={m.id} value={m.id}>
                          {m.name} — от {minPrice.stars}⭐
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Mode */}
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1.5 block">Режим</label>
                  <div className="grid grid-cols-2 gap-2">
                    {modes.map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => updateForm({ mode: mode.id })}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-sm transition-all",
                          form.mode === mode.id
                            ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                            : "border-[var(--border)] text-[var(--text2)] hover:border-[var(--gold)]/50"
                        )}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cost */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-[var(--muted)]">Стоимость (⭐)</label>
                    <span className="text-sm font-bold text-[var(--gold)]">{form.costStars}</span>
                  </div>
                  <Slider
                    value={[form.costStars]}
                    onValueChange={([v]) => updateForm({ costStars: v })}
                    min={1}
                    max={200}
                    step={1}
                  />
                </div>
              </div>

              {/* Display */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">Отображение</h3>
                
                {/* Tile Ratio */}
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1.5 block">Формат плитки</label>
                  <div className="flex gap-2">
                    {TILE_RATIOS.map(ratio => (
                      <button
                        key={ratio.id}
                        onClick={() => updateForm({ tileRatio: ratio.id as '9:16' | '1:1' | '16:9' })}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border transition-all",
                          form.tileRatio === ratio.id
                            ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]"
                            : "border-[var(--border)] text-[var(--text2)] hover:border-[var(--gold)]/50"
                        )}
                      >
                        <span className="text-lg">{ratio.icon}</span>
                        <span className="text-[10px]">{ratio.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => updateForm({ featured: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border)] text-[var(--gold)] focus:ring-[var(--gold)]"
                    />
                    <span className="text-sm text-[var(--text2)]">Featured</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.published}
                      onChange={(e) => updateForm({ published: e.target.checked })}
                      className="w-4 h-4 rounded border-[var(--border)] text-[var(--gold)] focus:ring-[var(--gold)]"
                    />
                    <span className="text-sm text-[var(--text2)]">Опубликовать</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column - Preview & Prompt */}
            <div className="space-y-5">
              {/* Preview Image */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">Превью</h3>
                
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1.5 block">URL изображения *</label>
                  <input
                    type="text"
                    value={form.previewImage}
                    onChange={(e) => updateForm({ previewImage: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)]"
                  />
                </div>

                {/* Preview */}
                <div className={cn(
                  "relative rounded-xl overflow-hidden bg-[var(--surface2)] border border-[var(--border)]",
                  form.tileRatio === '9:16' ? 'aspect-[9/16] max-w-[200px]' :
                  form.tileRatio === '16:9' ? 'aspect-video' : 'aspect-square max-w-[250px]'
                )}>
                  {form.previewImage ? (
                    <img src={form.previewImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-[var(--muted)] mx-auto mb-2" />
                        <p className="text-xs text-[var(--muted)]">Добавьте URL</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Template Prompt */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider">Промпт</h3>
                
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1.5 block">Шаблон промпта</label>
                  <textarea
                    value={form.templatePrompt}
                    onChange={(e) => updateForm({ templatePrompt: e.target.value })}
                    placeholder="Cinematic smoke transition, particles dissolving and reforming, ethereal atmosphere, 4K quality"
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] resize-none"
                  />
                  <p className="text-[10px] text-[var(--muted)] mt-1">
                    Этот промпт будет автоматически подставлен при выборе эффекта
                  </p>
                </div>
              </div>

              {/* Variant ID */}
              <div>
                <label className="text-xs text-[var(--muted)] mb-1.5 block">Variant ID (опционально)</label>
                <input
                  type="text"
                  value={form.variantId}
                  onChange={(e) => updateForm({ variantId: e.target.value })}
                  placeholder="default"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--surface)]">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isNew ? 'Создать' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>
  );
}
