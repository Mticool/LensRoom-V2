"use client";

import { useState, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Upload,
  X,
  Check,
  Star,
  Image as ImageIcon,
  Layers,
  Scissors,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  Save,
  Palette,
  Settings2,
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
import {
  PRODUCT_NICHES,
  getNicheById,
  getBenefitPlaceholders,
  getToneLabel,
  type ProductNiche,
} from "@/config/productNiches";
import {
  LIFESTYLE_SCENES,
  getSceneById,
  type LifestyleScene,
} from "@/config/lifestyleScenes";
import {
  getMarketplaceProfile,
  type MarketplaceProfile,
} from "@/config/marketplaceProfiles";
import {
  listBrandTemplates,
  saveBrandTemplate,
  type BrandTemplate,
  type BadgeStyle,
} from "@/lib/brandTemplates";

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
  nicheId: string | null;
  sceneId: string | null;
  brandTemplateId: string | null;
}

interface ProductWizardProps {
  state: ProductWizardState;
  onChange: (state: Partial<ProductWizardState>) => void;
  marketplaceProfile?: MarketplaceProfile;
}

// ===== CONSTANTS =====

const MARKETPLACES = [
  { id: "wb" as Marketplace, name: "Wildberries" },
  { id: "ozon" as Marketplace, name: "Ozon" },
];

const TEMPLATE_STYLES = [
  { id: "minimal" as TemplateStyle, name: "Минимал", description: "Чистый фон" },
  { id: "premium" as TemplateStyle, name: "Премиум", description: "Глянец, свет" },
  { id: "sale" as TemplateStyle, name: "Распродажа", description: "Акценты, бейджи" },
];

const MAX_PHOTOS = 3;
const MAX_BENEFITS = 5;

// ===== COMPONENT =====

export function ProductWizard({ state, onChange, marketplaceProfile }: ProductWizardProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [brandTemplates, setBrandTemplates] = useState<BrandTemplate[]>([]);
  
  const selectedMode = PRODUCT_IMAGE_MODES.find(m => m.id === state.modeId) ?? PRODUCT_IMAGE_MODES[0];
  const selectedNiche = state.nicheId ? getNicheById(state.nicheId) : null;
  const selectedScene = state.sceneId ? getSceneById(state.sceneId) : null;
  const packSavings = getPackSavings(state.modeId);
  const isLifestyleMode = state.modeId === "lifestyle";

  // Load brand templates
  useEffect(() => {
    setBrandTemplates(listBrandTemplates());
  }, []);

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

  // Get benefit placeholders based on niche
  const getBenefitPlaceholder = (index: number): string => {
    if (selectedNiche && selectedNiche.benefitTemplates[index]) {
      return selectedNiche.benefitTemplates[index].placeholder;
    }
    return `Преимущество ${index + 1}`;
  };

  // Handle brand template save
  const handleBrandTemplateSaved = (template: BrandTemplate) => {
    setBrandTemplates(listBrandTemplates());
    onChange({ brandTemplateId: template.id });
    setShowBrandModal(false);
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
        {marketplaceProfile && (
          <div className="mt-2 text-xs text-[var(--muted)]">
            {marketplaceProfile.notes[0]}
          </div>
        )}
      </Section>

      {/* 2. Niche Selector */}
      <Section title="Ниша товара">
        <div className="grid grid-cols-5 gap-2">
          {PRODUCT_NICHES.map((niche) => (
            <button
              key={niche.id}
              onClick={() => onChange({ 
                nicheId: state.nicheId === niche.id ? null : niche.id,
                templateStyle: niche.defaultTemplateStyle,
              })}
              className={cn(
                "p-2 rounded-xl border-2 text-center transition-all",
                state.nicheId === niche.id
                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                  : "border-[var(--border)] hover:border-[var(--gold)]/50"
              )}
            >
              <div className="text-lg mb-0.5">{niche.emoji}</div>
              <div className="text-[10px] text-[var(--text)] font-medium truncate">{niche.nameRu}</div>
            </button>
          ))}
        </div>
        {selectedNiche && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Тон: {getToneLabel(selectedNiche.tone)}
            </Badge>
          </div>
        )}
      </Section>

      {/* 3. Photo Mode Selector */}
      <Section title="Режим фото">
        <div className="space-y-3">
          {PRODUCT_IMAGE_MODES.map((mode) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              selected={state.modeId === mode.id}
              onClick={() => onChange({ 
                modeId: mode.id,
                sceneId: mode.id !== "lifestyle" ? null : state.sceneId,
              })}
            />
          ))}
        </div>
      </Section>

      {/* 4. Scene Selector (only for Lifestyle mode) */}
      {isLifestyleMode && (
        <Section title="Сцена">
          <div className="grid grid-cols-3 gap-2">
            {LIFESTYLE_SCENES.map((scene) => (
              <button
                key={scene.id}
                onClick={() => onChange({ sceneId: scene.id })}
                className={cn(
                  "p-3 rounded-xl border-2 text-center transition-all",
                  state.sceneId === scene.id
                    ? "border-[var(--gold)] bg-[var(--gold)]/10"
                    : "border-[var(--border)] hover:border-[var(--gold)]/50"
                )}
              >
                <div className="text-lg mb-1">{scene.emoji}</div>
                <div className="text-xs text-[var(--text)] font-medium">{scene.labelRu}</div>
              </button>
            ))}
          </div>
          {selectedScene && (
            <div className="mt-2 text-xs text-[var(--muted)] italic">
              +"{selectedScene.promptAddon.slice(0, 40)}..."
            </div>
          )}
        </Section>
      )}

      {/* 5. Generation Type */}
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

      {/* 6. Product Photos Upload */}
      <Section title="Фото товара">
        <div className="space-y-3">
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

      {/* 7. Product Info */}
      <Section title="Информация о товаре">
        <div className="space-y-3">
          <input
            type="text"
            value={state.productTitle}
            onChange={(e) => onChange({ productTitle: e.target.value })}
            placeholder="Название товара"
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] text-sm"
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--muted)]">
                Преимущества ({state.productBenefits.length}/{MAX_BENEFITS})
              </span>
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
                  placeholder={getBenefitPlaceholder(i)}
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

      {/* 8. Template Style */}
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
              <div className="text-[10px] text-[var(--muted)] mt-0.5">{style.description}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* 9. Advanced Settings Accordion */}
      <div className="border border-[var(--border)] rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--surface2)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[var(--muted)]" />
            <span className="text-sm font-medium text-[var(--text)]">Доп. настройки</span>
          </div>
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4 text-[var(--muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
          )}
        </button>
        
        {showAdvanced && (
          <div className="p-4 pt-0 space-y-4 border-t border-[var(--border)]">
            {/* Brand Style */}
            <div>
              <label className="text-xs text-[var(--muted)] mb-2 block">Стиль бренда</label>
              <div className="flex gap-2">
                <select
                  value={state.brandTemplateId || ""}
                  onChange={(e) => onChange({ brandTemplateId: e.target.value || null })}
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--gold)]"
                >
                  <option value="">Без стиля</option>
                  {brandTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBrandModal(true)}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Canvas info from marketplace */}
            {marketplaceProfile && (
              <div>
                <label className="text-xs text-[var(--muted)] mb-2 block">Формат карточки</label>
                <div className="text-sm text-[var(--text)]">
                  {marketplaceProfile.canvasPresets.find(c => c.id === marketplaceProfile.defaultCanvasId)?.name} 
                  {" "}({marketplaceProfile.canvasPresets.find(c => c.id === marketplaceProfile.defaultCanvasId)?.ratio})
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Brand Style Modal */}
      {showBrandModal && (
        <BrandStyleModal
          onClose={() => setShowBrandModal(false)}
          onSave={handleBrandTemplateSaved}
        />
      )}
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

// ===== BRAND STYLE MODAL =====

interface BrandStyleModalProps {
  onClose: () => void;
  onSave: (template: BrandTemplate) => void;
}

function BrandStyleModal({ onClose, onSave }: BrandStyleModalProps) {
  const [name, setName] = useState("");
  const [accentColor, setAccentColor] = useState("#C9A962");
  const [accentColor2, setAccentColor2] = useState("");
  const [badgeStyle, setBadgeStyle] = useState<BadgeStyle>("rounded");
  const [cornerRadius, setCornerRadius] = useState(12);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Введите название стиля");
      return;
    }

    const template = saveBrandTemplate({
      name: name.trim(),
      accentColor,
      accentColor2: accentColor2 || undefined,
      badgeStyle,
      cornerRadius,
    });

    toast.success("Стиль бренда сохранён");
    onSave(template);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[var(--text)]">Сохранить стиль бренда</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-[var(--muted)] mb-1.5 block">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Мой бренд"
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] text-sm"
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--muted)] mb-1.5 block">Основной цвет</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)]"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] mb-1.5 block">Доп. цвет (опционально)</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={accentColor2 || "#FFFFFF"}
                  onChange={(e) => setAccentColor2(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)]"
                />
                <input
                  type="text"
                  value={accentColor2}
                  onChange={(e) => setAccentColor2(e.target.value)}
                  placeholder="#FFFFFF"
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Badge Style */}
          <div>
            <label className="text-xs text-[var(--muted)] mb-1.5 block">Стиль бейджей</label>
            <div className="grid grid-cols-4 gap-2">
              {(["rounded", "pill", "square", "circle"] as BadgeStyle[]).map((style) => (
                <button
                  key={style}
                  onClick={() => setBadgeStyle(style)}
                  className={cn(
                    "py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all",
                    badgeStyle === style
                      ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--text)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--gold)]/50"
                  )}
                >
                  {style === "rounded" && "Скр."}
                  {style === "pill" && "Капс."}
                  {style === "square" && "Прям."}
                  {style === "circle" && "Круг"}
                </button>
              ))}
            </div>
          </div>

          {/* Corner Radius */}
          <div>
            <label className="text-xs text-[var(--muted)] mb-1.5 block">Радиус скругления</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 4, label: "SM" },
                { value: 12, label: "MD" },
                { value: 24, label: "LG" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setCornerRadius(opt.value)}
                  className={cn(
                    "py-2 px-3 rounded-lg border-2 text-xs font-medium transition-all",
                    cornerRadius === opt.value
                      ? "border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--text)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--gold)]/50"
                  )}
                >
                  {opt.label} ({opt.value}px)
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl bg-[var(--surface2)] border border-[var(--border)]">
            <div className="text-xs text-[var(--muted)] mb-2">Превью</div>
            <div className="flex items-center gap-2">
              <div
                className="px-3 py-1 text-xs font-medium text-white"
                style={{
                  backgroundColor: accentColor,
                  borderRadius: `${cornerRadius}px`,
                }}
              >
                Бейдж
              </div>
              {accentColor2 && (
                <div
                  className="px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: accentColor2,
                    color: accentColor,
                    borderRadius: `${cornerRadius}px`,
                    border: `2px solid ${accentColor}`,
                  }}
                >
                  Вторичный
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Отмена
          </Button>
          <Button onClick={handleSave} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}
