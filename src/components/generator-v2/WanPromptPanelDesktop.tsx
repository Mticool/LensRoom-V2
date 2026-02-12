'use client';

import { useEffect, useId, useMemo, useRef, useState, useCallback } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { toast } from 'sonner';
import {
  ChevronDown,
  ImagePlus,
  Loader2,
  Plus,
  Settings,
  Sparkles,
  Star,
  X,
  ZoomIn,
} from 'lucide-react';

import { PHOTO_MODELS } from '@/config/models';
import { QuantityCounter } from './QuantityCounter';
import { AdvancedSettingsCollapse } from './AdvancedSettingsCollapse';
import { WanPromptTextarea } from './WanPromptTextarea';

interface WanPromptPanelDesktopProps {
  prompt: string;
  onPromptChange: (v: string) => void;
  promptPlaceholder: string;

  onSubmit: () => void;
  isGenerating: boolean;
  canSubmit: boolean;

  credits: number;
  estimatedCost: number;
  hasEnoughCredits: boolean;
  needsReference: boolean;
  hasAnyReference: boolean;
  needsPrompt: boolean;

  // Aspect
  aspectRatio: string;
  onAspectRatioChange: (v: string) => void;
  aspectRatioOptions?: string[];

  // Model
  displayName: string;
  modelId?: string;
  onModelChange?: (id: string) => void;

  // Settings / advanced
  quality: string;
  onQualityChange: (v: string) => void;
  qualityOptions?: string[];

  outputFormat?: 'png' | 'jpg' | 'webp';
  onOutputFormatChange?: (v: 'png' | 'jpg' | 'webp') => void;
  outputFormatOptions?: ReadonlyArray<'png' | 'jpg' | 'webp'>;

  quantity: number;
  onQuantityChange: (v: number) => void;
  quantityMax: number;
  isToolModel: boolean;
  isGrokImagine: boolean;

  showGalleryZoom: boolean;
  galleryZoom: number;
  onGalleryZoomChange?: (z: number) => void;

  supportsI2i: boolean;
  acceptAttr: string;
  maxReferenceImages: number;
  referenceCount: number;
  hasAnyReferenceVisual: boolean;
  isAddingRefs: boolean;
  pendingRefPreviews: string[];
  referenceList: string[];
  onPickFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAllRefs: () => void;
  onRemoveRefAt?: (idx: number) => void;

  negativePrompt?: string;
  onNegativePromptChange?: (v: string) => void;
  seed?: number | null;
  onSeedChange?: (v: number | null) => void;
  steps?: number;
  onStepsChange?: (v: number) => void;
}

function ratioToPreviewClasses(ratio: string): { outer: string; inner: string } {
  // Keep this intentionally approximate; it's just a visual hint like in Wan.
  const r = String(ratio || '').trim();
  switch (r) {
    case '1:1':
      return { outer: 'w-8 h-8', inner: 'w-6 h-6' };
    case '16:9':
      return { outer: 'w-10 h-8', inner: 'w-8 h-4' };
    case '9:16':
      return { outer: 'w-10 h-8', inner: 'w-4 h-7' };
    case '4:3':
      return { outer: 'w-10 h-8', inner: 'w-8 h-6' };
    case '3:4':
      return { outer: 'w-10 h-8', inner: 'w-6 h-7' };
    case '2:3':
      return { outer: 'w-10 h-8', inner: 'w-5 h-7' };
    case '3:2':
      return { outer: 'w-10 h-8', inner: 'w-8 h-5' };
    default:
      return { outer: 'w-10 h-8', inner: 'w-8 h-6' };
  }
}

export function WanPromptPanelDesktop(props: WanPromptPanelDesktopProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const uploadInputId = useId();

  const [isExpanded, setIsExpanded] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [aspectOpen, setAspectOpen] = useState(false);
  const [hoveredRefIdx, setHoveredRefIdx] = useState<number | null>(null);
  const [removingIdx, setRemovingIdx] = useState<number | null>(null);

  const charCount = useMemo(() => Math.min(1000, (props.prompt || '').length), [props.prompt]);
  const showGlow = useMemo(
    () => props.canSubmit && props.prompt.trim().length > 0,
    [props.canSubmit, props.prompt],
  );

  const hasRefs = props.pendingRefPreviews.length > 0 || props.referenceList.length > 0;
  const totalRefCount = props.referenceList.length + props.pendingRefPreviews.length;

  const aspectRatios = useMemo(
    () => props.aspectRatioOptions || ['1:1', '16:9', '9:16', '4:3', '3:4'],
    [props.aspectRatioOptions],
  );

  // Height: base 52 collapsed, expand more when refs present
  const panelHeight = useMemo(() => {
    if (!isExpanded) return 52;
    return hasRefs ? 140 : 96;
  }, [isExpanded, hasRefs]);

  const outerHeight = useMemo(() => panelHeight + 16, [panelHeight]);

  // Escape collapses.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        setModelsOpen(false);
        setAspectOpen(false);
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const collapse = () => {
    setSettingsOpen(false);
    setModelsOpen(false);
    setAspectOpen(false);
    setIsExpanded(false);
  };

  // Collapse when clicking outside the panel (but don't collapse while a dropdown is open).
  useEffect(() => {
    if (!isExpanded) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return;
      if (modelsOpen || settingsOpen || aspectOpen) return;
      collapse();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isExpanded, modelsOpen, settingsOpen, aspectOpen]);

  const handleSubmit = () => {
    if (props.canSubmit) {
      props.onSubmit();
      return;
    }
    if (!props.hasEnoughCredits) toast.error('Недостаточно звёзд');
    else if (props.needsReference && !props.hasAnyReference) toast.error('Загрузите изображение');
    else if (props.needsPrompt && props.prompt.trim().length === 0) toast.error('Введите промпт');
  };

  const handleRemoveRef = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemovingIdx(idx);
    setTimeout(() => {
      if (props.onRemoveRefAt) props.onRemoveRefAt(idx);
      else props.onRemoveAllRefs();
      setRemovingIdx(null);
    }, 200);
  }, [props.onRemoveRefAt, props.onRemoveAllRefs]);

  return (
    <>
      {/* Hover preview tooltip */}
      {hoveredRefIdx !== null && props.referenceList[hoveredRefIdx] && (
        <div
          className="fixed z-[200] pointer-events-none"
          style={{
            bottom: outerHeight + 8,
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'refPreviewIn 0.2s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div
            className="rounded-2xl overflow-hidden border border-white/15 shadow-2xl"
            style={{
              background: 'rgba(20,20,24,0.95)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={props.referenceList[hoveredRefIdx]}
              alt={`Reference ${hoveredRefIdx + 1} preview`}
              className="block max-w-[240px] max-h-[240px] object-contain"
            />
          </div>
        </div>
      )}

      {/* Outer wrapper: fixed, full-width, pointer-events:none so clicks pass through to gallery */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex justify-center pb-3"
        style={{ height: outerHeight }}
      >
        {/* Floating glass pill (wan.video style) */}
        <div
          ref={panelRef}
          data-expanded={isExpanded ? 'true' : 'false'}
          className="pointer-events-auto w-full max-w-[820px] mx-4 overflow-hidden"
          style={{
            height: panelHeight,
            borderRadius: isExpanded ? 22 : 26,
            background: 'radial-gradient(50% 50%, rgba(38,38,44,0.65) 0%, rgba(32,32,38,0.6) 100%)',
            backdropFilter: 'blur(32px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.2)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.35)',
            transition: 'height 0.35s cubic-bezier(0.34,1.56,0.64,1), border-radius 0.3s ease',
          }}
          onFocusCapture={() => setIsExpanded(true)}
          onMouseDown={() => setIsExpanded(true)}
        >
          <div className="h-full px-2 py-1 flex flex-col">
            {/* Hidden upload input */}
            <input
              id={uploadInputId}
              className="hidden"
              type="file"
              accept={props.acceptAttr}
              multiple={props.maxReferenceImages > 1}
              onChange={props.onPickFiles}
              disabled={!props.supportsI2i || props.isGenerating || props.isAddingRefs}
            />

            {/* ===== REFERENCE STRIP (expanded, above prompt) ===== */}
            {isExpanded && hasRefs && (
              <div
                className="shrink-0 flex items-center gap-1.5 px-1 pt-1 pb-0.5"
                style={{ animation: 'refStripSlideIn 0.3s cubic-bezier(0.16,1,0.3,1)' }}
              >
                {/* Upload more button */}
                {props.supportsI2i && totalRefCount < props.maxReferenceImages && (
                  <label
                    htmlFor={uploadInputId}
                    className={[
                      'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer',
                      'border-2 border-dashed border-white/15 hover:border-[#8cf425]/50 hover:bg-[#8cf425]/5',
                      'transition-all duration-200',
                      props.isGenerating || props.isAddingRefs ? 'opacity-30 cursor-not-allowed pointer-events-none' : '',
                    ].join(' ')}
                    title="Добавить ещё"
                  >
                    <Plus className="w-4 h-4 text-white/40" />
                  </label>
                )}

                {/* Pending uploads */}
                {props.pendingRefPreviews.map((src, idx) => (
                  <div
                    key={`pending-strip-${idx}`}
                    className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0"
                    style={{ animation: 'refThumbIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Загрузка..." className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-white/90" />
                    </div>
                  </div>
                ))}

                {/* Uploaded references */}
                {props.referenceList.map((src, idx) => (
                  <div
                    key={`ref-strip-${idx}`}
                    className={[
                      'group relative w-10 h-10 rounded-xl overflow-hidden shrink-0 cursor-pointer',
                      'border-2 transition-all duration-200',
                      hoveredRefIdx === idx ? 'border-[#8cf425] scale-105' : 'border-white/15 hover:border-white/30',
                      removingIdx === idx ? 'scale-0 opacity-0' : '',
                    ].join(' ')}
                    style={{
                      animation: removingIdx === idx ? undefined : 'refThumbIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                      transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease, border-color 0.2s ease',
                    }}
                    onMouseEnter={() => setHoveredRefIdx(idx)}
                    onMouseLeave={() => setHoveredRefIdx(null)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Референс ${idx + 1}`} className="w-full h-full object-cover" />
                    {/* Hover overlay with zoom icon */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                    </div>
                    {/* Delete button */}
                    {!props.isGenerating && !props.isAddingRefs && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveRef(idx, e)}
                        className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-black/80 border border-white/20 text-white/80 hover:text-white hover:bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150"
                        title="Удалить"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Counter badge */}
                {props.maxReferenceImages > 1 && (
                  <span className="text-[10px] text-white/30 font-medium tabular-nums pl-0.5">
                    {totalRefCount}/{props.maxReferenceImages}
                  </span>
                )}
              </div>
            )}

            {/* Top row: collapsed prompt hint + controls */}
            <div className="flex items-center gap-1 shrink-0" style={{ height: isExpanded ? 34 : 48 }}>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                {/* Upload button (always visible when supports i2i) */}
                {props.supportsI2i && (
                  <label
                    htmlFor={uploadInputId}
                    className={[
                      'shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200',
                      'hover:bg-white/10',
                      props.isAddingRefs ? 'bg-white/10' : '',
                      hasRefs && !isExpanded ? 'bg-[#8cf425]/10' : '',
                      props.isGenerating || props.isAddingRefs ? 'opacity-40 cursor-not-allowed pointer-events-none' : '',
                    ].join(' ')}
                    title={props.isAddingRefs ? 'Загрузка референса...' : 'Добавить изображение'}
                  >
                    {props.isAddingRefs ? (
                      <Loader2 className="w-4 h-4 text-white/70 animate-spin" />
                    ) : (
                      <ImagePlus className={`w-4 h-4 transition-colors ${hasRefs ? 'text-[#8cf425]/70' : 'text-white/55'}`} />
                    )}
                  </label>
                )}

                {/* Collapsed: compact thumbnails inline */}
                {!isExpanded && hasRefs && (
                  <div className="shrink-0 flex items-center gap-1 pr-1">
                    {props.pendingRefPreviews.map((src, idx) => (
                      <div
                        key={`pending-top-${idx}`}
                        className="relative w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0"
                        style={{ animation: 'refThumbIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="Reference pending" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-3 h-3 animate-spin text-white/90" />
                        </div>
                      </div>
                    ))}

                    {props.referenceList.map((src, idx) => (
                      <div
                        key={`ref-top-${idx}`}
                        className={[
                          'group relative w-8 h-8 rounded-lg overflow-hidden shrink-0',
                          'border-2 border-[#8cf425]/30 hover:border-[#8cf425]/60',
                          'transition-all duration-200',
                        ].join(' ')}
                        style={{ animation: 'refThumbIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                        {!props.isGenerating && !props.isAddingRefs && (
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRef(idx, e)}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/80 border border-white/20 text-white/80 hover:text-white hover:bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150"
                            title="Удалить"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Collapsed counter */}
                    {props.maxReferenceImages > 1 && totalRefCount > 0 && (
                      <span className="text-[9px] text-[#8cf425]/50 font-semibold tabular-nums">
                        {totalRefCount}
                      </span>
                    )}
                  </div>
                )}

                {/* Collapsed: prompt hint text. Expanded: spacer */}
                <div
                  className="flex-1 min-w-0 cursor-text select-none"
                  onClick={() => setIsExpanded(true)}
                >
                <span
                  className={[
                    'truncate block text-sm pl-2',
                    'transition-opacity duration-200',
                    isExpanded ? 'opacity-0 pointer-events-none h-0 overflow-hidden' : 'opacity-100',
                    props.prompt.trim() ? 'text-white/60' : 'text-white/35',
                  ].join(' ')}
                >
                  {props.prompt.trim() || props.promptPlaceholder}
                </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Model pill */}
                <DropdownMenu.Root open={modelsOpen} onOpenChange={setModelsOpen} modal={false}>
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        disabled={!props.onModelChange || props.isGenerating}
                        className={[
                          'h-8 px-2.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors',
                          !props.onModelChange || props.isGenerating
                            ? 'text-white/40 cursor-not-allowed'
                            : 'text-white/80 hover:bg-white/10',
                        ].join(' ')}
                        title="Модель"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white/60" />
                        <span className="max-w-[140px] truncate">{props.displayName}</span>
                        <ChevronDown className={`w-3 h-3 text-white/50 transition-transform ${modelsOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content side="top" align="end" sideOffset={10} className="z-[2000]">
                        <div className="w-[360px] rounded-2xl border border-white/10 bg-[#141416]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                          <div className="px-4 pt-4 pb-2">
                            <div className="text-xs text-white/50 uppercase tracking-wider">Models</div>
                          </div>
                          <div className="max-h-[420px] overflow-y-auto pb-2">
                            {PHOTO_MODELS
                              .slice()
                              .sort((a, b) => {
                                if (a.featured !== b.featured) return a.featured ? -1 : 1;
                                if (a.rank !== b.rank) return a.rank - b.rank;
                                return a.name.localeCompare(b.name);
                              })
                              .map((m) => {
                                const selected = m.id === props.modelId;
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      props.onModelChange?.(m.id);
                                      setModelsOpen(false);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-start gap-3"
                                  >
                                    <div className="w-5 h-5 mt-0.5 flex items-center justify-center">
                                      {selected ? <Star className="w-4 h-4 text-[#8cf425]" /> : null}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-sm font-semibold text-white truncate">{m.name}</div>
                                      <div className="text-xs text-white/45 leading-snug line-clamp-2">
                                        {m.shortDescription || m.description || ''}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>

                  {/* Aspect ratio */}
                  <DropdownMenu.Root open={aspectOpen} onOpenChange={setAspectOpen} modal={false}>
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        disabled={props.isGenerating || props.isToolModel}
                        className={[
                          'h-8 px-2.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors',
                          props.isGenerating || props.isToolModel
                            ? 'text-white/40 cursor-not-allowed'
                            : 'text-white/80 hover:bg-white/10',
                        ].join(' ')}
                        title="Пропорции"
                      >
                        <span className="tabular-nums">{props.aspectRatio}</span>
                        <ChevronDown className={`w-3 h-3 text-white/50 transition-transform ${aspectOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content side="top" align="end" sideOffset={10} className="z-[2000]">
                        <div className="w-[320px] rounded-2xl border border-white/10 bg-[#141416]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                          <div className="px-4 pt-4 pb-2">
                            <div className="text-xs text-white/50 uppercase tracking-wider">Aspect</div>
                          </div>
                          <div className="px-4 pb-4">
                            <div className="grid grid-cols-5 gap-2">
                              {aspectRatios.slice(0, 10).map((ratio) => {
                                const selected = ratio === props.aspectRatio;
                                const preview = ratioToPreviewClasses(ratio);
                                return (
                                  <button
                                    key={ratio}
                                    type="button"
                                    onClick={() => {
                                      props.onAspectRatioChange(ratio);
                                      setAspectOpen(false);
                                    }}
                                    className={[
                                      'py-2 rounded-xl border transition-colors flex flex-col items-center justify-center gap-1',
                                      selected
                                        ? 'bg-white text-black border-white'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-white',
                                    ].join(' ')}
                                    title={ratio}
                                  >
                                    <div className={`${preview.outer} flex items-center justify-center`}>
                                      <div
                                        className={[
                                          preview.inner,
                                          'rounded-sm border',
                                          selected ? 'border-black/60' : 'border-white/60',
                                        ].join(' ')}
                                      />
                                    </div>
                                    <span className={[
                                      'text-[10px] font-semibold tabular-nums',
                                      selected ? 'text-black' : 'text-white/70',
                                    ].join(' ')}>
                                      {ratio}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>

                  {/* Collapsed-only: compact generate button */}
                  {!isExpanded && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                      disabled={!props.canSubmit}
                      className={[
                        'h-8 w-8 rounded-full flex items-center justify-center',
                        'bg-white text-black',
                        'transition-all duration-200',
                        'active:scale-[0.95]',
                        props.canSubmit ? 'cursor-pointer hover:bg-white/90' : 'opacity-40 cursor-not-allowed',
                      ].join(' ')}
                      title={`Generate (${props.estimatedCost}⭐)`}
                    >
                      {props.isGenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Star className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {/* Settings */}
                  <DropdownMenu.Root open={settingsOpen} onOpenChange={setSettingsOpen} modal={false}>
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        disabled={props.isGenerating}
                        data-testid="studio-settings-button"
                        className={[
                          'w-8 h-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center',
                          props.isGenerating ? 'opacity-50 cursor-not-allowed' : '',
                        ].join(' ')}
                        title="Настройки"
                      >
                        <Settings className="w-3.5 h-3.5 text-white/60" />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        data-testid="studio-settings-panel"
                        side="top"
                        align="end"
                        sideOffset={10}
                        className="z-[2000]"
                        onCloseAutoFocus={(e) => e.preventDefault()}
                        onFocusOutside={(e) => e.preventDefault()}
                        onPointerDownOutside={(e) => e.preventDefault()}
                        onEscapeKeyDown={() => setSettingsOpen(false)}
                      >
                        <div
                          className="w-[300px] rounded-2xl overflow-hidden"
                          style={{
                            background: 'radial-gradient(50% 50%, rgba(38,38,44,0.95) 0%, rgba(28,28,34,0.92) 100%)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1), 0 12px 40px rgba(0,0,0,0.5)',
                          }}
                        >
                          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                            <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">Settings</span>
                            <button
                              type="button"
                              onClick={() => setSettingsOpen(false)}
                              className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
                            >
                              Close
                            </button>
                          </div>

                          <div className="px-4 pb-4 space-y-3.5 max-h-[360px] overflow-y-auto">
                            {(props.qualityOptions?.length ?? 0) > 0 && (
                              <div className="space-y-1.5">
                                <div className="text-[10px] text-white/35 uppercase tracking-wider font-medium">Quality</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {props.qualityOptions!.map((q) => {
                                    const selected = q === props.quality;
                                    return (
                                      <button
                                        key={q}
                                        type="button"
                                        onClick={() => props.onQualityChange(q)}
                                        disabled={props.isGenerating}
                                        className={[
                                          'h-7 px-3 rounded-full text-[11px] font-semibold transition-colors',
                                          selected
                                            ? 'bg-white text-black'
                                            : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                                        ].join(' ')}
                                      >
                                        {q}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {props.onOutputFormatChange && (props.outputFormatOptions?.length ?? 0) > 0 && (
                              <div className="space-y-1.5">
                                <div className="text-[10px] text-white/35 uppercase tracking-wider font-medium">Format</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {props.outputFormatOptions!.map((fmt) => {
                                    const selected = fmt === (props.outputFormat ?? 'png');
                                    return (
                                      <button
                                        key={fmt}
                                        type="button"
                                        onClick={() => props.onOutputFormatChange?.(fmt)}
                                        disabled={props.isGenerating}
                                        className={[
                                          'h-7 px-3 rounded-full text-[11px] font-semibold transition-colors',
                                          selected
                                            ? 'bg-white text-black'
                                            : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                                        ].join(' ')}
                                      >
                                        {fmt.toUpperCase()}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {!props.isToolModel && (
                              <div className="space-y-1.5">
                                <div className="text-[10px] text-white/35 uppercase tracking-wider font-medium">Quantity</div>
                                <QuantityCounter
                                  value={props.quantity}
                                  onChange={props.onQuantityChange}
                                  min={1}
                                  max={props.quantityMax}
                                  disabled={props.isGenerating || props.isGrokImagine || props.quantityMax <= 1}
                                />
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => setAdvancedOpen((v) => !v)}
                              className="w-full h-8 px-3 rounded-full bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-white/70 transition-colors flex items-center justify-between"
                            >
                              <span>Advanced</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {advancedOpen && props.onNegativePromptChange && (
                              <AdvancedSettingsCollapse
                                negativePrompt={props.negativePrompt || ''}
                                onNegativePromptChange={props.onNegativePromptChange}
                                seed={props.seed}
                                onSeedChange={props.onSeedChange}
                                steps={props.steps}
                                onStepsChange={props.onStepsChange}
                                disabled={props.isGenerating}
                              />
                            )}
                          </div>
                        </div>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </div>

              {/* Prompt row (expanded only) */}
              {isExpanded && (
                <div className="flex items-end gap-2 flex-1 min-h-0 mt-1">
                  {/* Textarea (no wrapper, no border — seamless) */}
                  <div className="flex-1 min-w-0">
                    <WanPromptTextarea
                      value={props.prompt}
                      onChange={props.onPromptChange}
                      placeholder={props.promptPlaceholder}
                      disabled={props.isGenerating}
                      maxLength={1000}
                      onSubmit={handleSubmit}
                      onFocus={() => setIsExpanded(true)}
                    />
                  </div>

                  {/* Right side: char count + generate */}
                  <div className="shrink-0 flex items-end gap-2 pb-0.5">
                    <span className="text-[10px] text-white/30 tabular-nums self-center">{charCount}</span>

                    {/* Generate button */}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!props.canSubmit}
                      className={[
                        'h-9 px-3.5 rounded-full flex items-center justify-center gap-1.5',
                        'bg-white text-black',
                        'transition-all duration-200 ease-out',
                        'active:scale-[0.97]',
                        props.canSubmit ? 'cursor-pointer hover:bg-white/90' : 'opacity-40 cursor-not-allowed',
                        showGlow ? 'wan-send-glow' : '',
                      ].join(' ')}
                      title={
                        !props.hasEnoughCredits
                          ? `Недостаточно звёзд (нужно ${props.estimatedCost}⭐, есть ${props.credits}⭐)`
                          : props.needsReference && !props.hasAnyReference
                            ? 'Загрузите изображение'
                            : props.needsPrompt && props.prompt.trim().length === 0
                              ? 'Введите промпт'
                              : `Списать ${props.estimatedCost}⭐`
                      }
                    >
                      {props.isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Star className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold tabular-nums">{props.estimatedCost}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

          </div>
        </div>
      </div>
    </>
  );
}
