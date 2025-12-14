"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Upload,
  X,
  Check,
  Star,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Scissors,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PRODUCT_IMAGE_MODES,
  PACK_SLIDES_DEFAULT,
  getSingleCost,
  getPackCost,
  getPackSavings,
  type ProductImageMode,
} from "@/config/productImageModes";

// ===== TYPES =====

export type Marketplace = "wb" | "ozon";
export type GenerationType = "single" | "pack";
export type TemplateStyle = "minimal" | "premium" | "sale";

export interface ProductWizardState {
  marketplace: Marketplace;
  modeId: string;
  generationType: GenerationType;
  templateStyle: TemplateStyle;
  productPhotos: string[];
  removeBackground: boolean;
  productTitle: string;
  productBenefits: string[];
}

interface ProductWizardProps {
  state: ProductWizardState;
  onChange: (state: Partial<ProductWizardState>) => void;
}

// ===== CONSTANTS =====

const MARKETPLACES = [
  { id: "wb" as Marketplace, name: "Wildberries", color: "#CB11AB" },
  { id: "ozon" as Marketplace, name: "Ozon", color: "#005BFF" },
];

const TEMPLATE_STYLES = [
  { id: "minimal" as TemplateStyle, name: "Минимал", description: "Чистый фон, фокус на товар" },
  { id: "premium" as TemplateStyle, name: "Премиум", description: "Глянец, свет, дорогая подача" },
  { id: "sale" as TemplateStyle, name: "Распродажа", description: "Яркие акценты, бейджи скидок" },
];

const MAX_PHOTOS = 3;
const MAX_BENEFITS = 5;

// ===== COMPONENT =====

export function ProductWizard({ state, onChange }: ProductWizardProps) {
  const selectedMode = PRODUCT_IMAGE_MODES.find(m => m.id === state.modeId) ?? PRODUCT_IMAGE_MODES[0];
  const packSavings = getPackSavings(state.modeId);

  // Photo upload handler
  const handlePhotoUpload = useCallback((files: FileList) => {
    const remaining = MAX_PHOTOS - state.productPhotos.length;
    if (remaining <= 0) {
      toast.error(`Максимум ${MAX_PHOTOS} фото`);
      return;
    }
    
    const newPhotos = Array.from(files)
      .slice(0, remaining)
      .map(file => URL.createObjectURL(file));
    
    onChange({ productPhotos: [...state.productPhotos, ...newPhotos] });
    toast.success(`${newPhotos.length} фото загружено`);
  }, [state.productPhotos, onChange]);

  const removePhoto = (index: number) => {
    onChange({ productPhotos: state.productPhotos.filter((_, i) => i !== index) });
  };

  // Benefits handlers
  const addBenefit = () => {
    if (state.productBenefits.length >= MAX_BENEFITS) return;
    onChange({ productBenefits: [...state.productBenefits, ""] });
  };

  const updateBenefit = (index: number, value: string) => {
    const updated = [...state.productBenefits];
    updated[index] = value;
    onChange({ productBenefits: updated });
  };

  const removeBenefit = (index: number) => {
    onChange({ productBenefits: state.productBenefits.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {/* 1. Marketplace Selector */}
      <Section title="Маркетплейс">
        <div className="flex gap-2 p-1 bg-[var(--surface2)] rounded-xl">
          {MARKETPLACES.map((mp) => (
            <button
              key={mp.id}
              onClick={() => onChange({ marketplace: mp.id })}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all",
                state.marketplace === mp.id
                  ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              )}
            >
              {mp.name}
            </button>
          ))}
        </div>
      </Section>

      {/* 2. Photo Mode Selector */}
      <Section title="Режим фото">
        <div className="space-y-3">
          {PRODUCT_IMAGE_MODES.map((mode) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              selected={state.modeId === mode.id}
              onClick={() => onChange({ modeId: mode.id })}
            />
          ))}
        </div>
      </Section>

      {/* 3. Generation Type */}
      <Section title="Тип генерации">
        <div className="grid grid-cols-2 gap-3">
          <TypeCard
            selected={state.generationType === "single"}
            onClick={() => onChange({ generationType: "single" })}
            icon={<ImageIcon className="w-5 h-5" />}
            title="Одна картинка"
            cost={getSingleCost(state.modeId)}
          />
          <TypeCard
            selected={state.generationType === "pack"}
            onClick={() => onChange({ generationType: "pack" })}
            icon={<Layers className="w-5 h-5" />}
            title={`Набор (${PACK_SLIDES_DEFAULT})`}
            cost={getPackCost(state.modeId)}
            savings={packSavings}
          />
        </div>
      </Section>

      {/* 4. Product Photos Upload */}
      <Section title="Фото товара">
        <div className="space-y-3">
          {/* Upload zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-4 transition-colors",
              state.productPhotos.length > 0
                ? "border-[var(--gold)]/30 bg-[var(--gold)]/5"
                : "border-[var(--border)] hover:border-[var(--gold)]/50"
            )}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
              className="hidden"
              id="product-photos"
            />
            <label htmlFor="product-photos" className="cursor-pointer flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface2)] flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5 text-[var(--muted)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[var(--text)] text-sm">
                  {state.productPhotos.length > 0
                    ? `${state.productPhotos.length} / ${MAX_PHOTOS} фото`
                    : "Загрузить фото товара"}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  PNG, JPG до 10MB • 1–3 фото
                </div>
              </div>
            </label>
          </div>

          {/* Photo previews */}
          {state.productPhotos.length > 0 && (
            <div className="flex gap-2">
              {state.productPhotos.map((photo, i) => (
                <div key={i} className="relative group">
                  <img
                    src={photo}
                    alt={`Product ${i + 1}`}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Remove background toggle */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface2)] cursor-pointer">
            <div className="flex items-center gap-3">
              <Scissors className="w-4 h-4 text-[var(--muted)]" />
              <span className="text-sm text-[var(--text)]">Удалить фон</span>
            </div>
            <div
              className={cn(
                "w-10 h-5 rounded-full transition-colors relative",
                state.removeBackground ? "bg-[var(--gold)]" : "bg-[var(--border)]"
              )}
              onClick={() => onChange({ removeBackground: !state.removeBackground })}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                  state.removeBackground ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </div>
          </label>
        </div>
      </Section>

      {/* 5. Product Info */}
      <Section title="Информация о товаре">
        <div className="space-y-3">
          {/* Title */}
          <input
            type="text"
            value={state.productTitle}
            onChange={(e) => onChange({ productTitle: e.target.value })}
            placeholder="Название товара"
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] text-sm"
          />

          {/* Benefits */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--muted)]">Преимущества ({state.productBenefits.length}/{MAX_BENEFITS})</span>
              {state.productBenefits.length < MAX_BENEFITS && (
                <button
                  onClick={addBenefit}
                  className="text-xs text-[var(--gold)] hover:text-[var(--gold-hover)] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Добавить
                </button>
              )}
            </div>
            {state.productBenefits.map((benefit, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={benefit}
                  onChange={(e) => updateBenefit(i, e.target.value)}
                  placeholder={`Преимущество ${i + 1}`}
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] text-sm"
                />
                <button
                  onClick={() => removeBenefit(i)}
                  className="p-2 rounded-lg hover:bg-[var(--surface2)] text-[var(--muted)] hover:text-red-400 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 6. Template Style */}
      <Section title="Стиль шаблона">
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATE_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onChange({ templateStyle: style.id })}
              className={cn(
                "p-3 rounded-xl border-2 text-center transition-all",
                state.templateStyle === style.id
                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                  : "border-[var(--border)] hover:border-[var(--gold)]/50"
              )}
            >
              <div className="text-sm font-medium text-[var(--text)]">{style.name}</div>
              <div className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{style.description}</div>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ===== SUB-COMPONENTS =====

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-[var(--text)] mb-3">{title}</h3>
      {children}
    </div>
  );
}

function ModeCard({ mode, selected, onClick }: { mode: ProductImageMode; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3",
        selected
          ? "border-[var(--gold)] bg-[var(--gold)]/10"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--gold)]/50"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
        selected ? "border-[var(--gold)] bg-[var(--gold)]" : "border-[var(--border)]"
      )}>
        {selected && <Check className="w-3 h-3 text-[#0a0a0f]" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-[var(--text)] text-sm">{mode.name}</span>
          {mode.badge && (
            <Badge variant="primary" className="text-[10px] px-1.5 py-0">
              {mode.badge}
            </Badge>
          )}
        </div>
        <div className="text-xs text-[var(--muted)] line-clamp-1">{mode.description}</div>
        <div className="flex items-center gap-1 mt-1.5 text-xs">
          <Star className="w-3 h-3 text-[var(--gold)] fill-[var(--gold)]" />
          <span className="text-[var(--text)] font-medium">{mode.costPerImageStars}</span>
          <span className="text-[var(--muted)]">/ изображение</span>
        </div>
      </div>
    </button>
  );
}

function TypeCard({ 
  selected, 
  onClick, 
  icon, 
  title, 
  cost, 
  savings 
}: { 
  selected: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  title: string; 
  cost: number; 
  savings?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border-2 text-left transition-all",
        selected
          ? "border-[var(--gold)] bg-[var(--gold)]/10"
          : "border-[var(--border)] hover:border-[var(--gold)]/50"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center mb-2",
        selected ? "bg-[var(--gold)]/20 text-[var(--gold)]" : "bg-[var(--surface2)] text-[var(--muted)]"
      )}>
        {icon}
      </div>
      <div className="font-medium text-sm text-[var(--text)]">{title}</div>
      <div className="flex items-center gap-2 mt-1">
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-[var(--gold)] fill-[var(--gold)]" />
          <span className="text-sm font-semibold text-[var(--text)]">{cost}</span>
        </div>
        {savings && savings > 0 && (
          <Badge variant="success" className="text-[10px]">-{savings}⭐</Badge>
        )}
      </div>
    </button>
  );
}
