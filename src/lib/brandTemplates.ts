/**
 * Brand Templates - Local Storage MVP
 * Allows users to save and reuse brand presets
 */

// ===== TYPES =====

export type BadgeStyle = "rounded" | "pill" | "square" | "circle";

export interface BrandTemplate {
  id: string;
  name: string;
  /** Primary accent color (hex) */
  accentColor: string;
  /** Secondary accent color (hex, optional) */
  accentColor2?: string;
  /** Badge/tag style */
  badgeStyle: BadgeStyle;
  /** Corner radius in px */
  cornerRadius: number;
  /** Logo URL (data URL or external) */
  logoUrl?: string;
  /** Font family preference */
  fontFamily?: string;
  /** Created timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt?: string;
}

export type BrandTemplateInput = Omit<BrandTemplate, "id" | "createdAt" | "updatedAt">;

// ===== CONSTANTS =====

const STORAGE_KEY = "lensroom_brand_templates";
const MAX_TEMPLATES = 20;

// ===== HELPERS =====

function generateId(): string {
  return `brand_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseTemplates(json: string | null): BrandTemplate[] {
  if (!json) return [];
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveToStorage(templates: BrandTemplate[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

// ===== CRUD FUNCTIONS =====

/**
 * Get all saved brand templates
 */
export function listBrandTemplates(): BrandTemplate[] {
  if (typeof window === "undefined") return [];
  const json = localStorage.getItem(STORAGE_KEY);
  return parseTemplates(json);
}

/**
 * Get a single brand template by ID
 */
export function getBrandTemplate(id: string): BrandTemplate | undefined {
  const templates = listBrandTemplates();
  return templates.find(t => t.id === id);
}

/**
 * Save a new brand template
 * Returns the created template with generated ID
 */
export function saveBrandTemplate(input: BrandTemplateInput): BrandTemplate {
  const templates = listBrandTemplates();
  
  // Enforce max limit
  if (templates.length >= MAX_TEMPLATES) {
    // Remove oldest template
    templates.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    templates.shift();
  }
  
  const newTemplate: BrandTemplate = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  
  templates.push(newTemplate);
  saveToStorage(templates);
  
  return newTemplate;
}

/**
 * Update an existing brand template
 * Returns updated template or undefined if not found
 */
export function updateBrandTemplate(
  id: string, 
  updates: Partial<BrandTemplateInput>
): BrandTemplate | undefined {
  const templates = listBrandTemplates();
  const index = templates.findIndex(t => t.id === id);
  
  if (index === -1) return undefined;
  
  const updated: BrandTemplate = {
    ...templates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  templates[index] = updated;
  saveToStorage(templates);
  
  return updated;
}

/**
 * Delete a brand template by ID
 * Returns true if deleted, false if not found
 */
export function deleteBrandTemplate(id: string): boolean {
  const templates = listBrandTemplates();
  const index = templates.findIndex(t => t.id === id);
  
  if (index === -1) return false;
  
  templates.splice(index, 1);
  saveToStorage(templates);
  
  return true;
}

/**
 * Clear all brand templates
 */
export function clearBrandTemplates(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Duplicate an existing template with a new name
 */
export function duplicateBrandTemplate(
  id: string, 
  newName?: string
): BrandTemplate | undefined {
  const original = getBrandTemplate(id);
  if (!original) return undefined;
  
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = original;
  
  return saveBrandTemplate({
    ...rest,
    name: newName ?? `${original.name} (копия)`,
  });
}

// ===== PRESET TEMPLATES =====

export const PRESET_BRAND_TEMPLATES: BrandTemplateInput[] = [
  {
    name: "Минимал",
    accentColor: "#000000",
    badgeStyle: "rounded",
    cornerRadius: 8,
  },
  {
    name: "Премиум Gold",
    accentColor: "#C9A962",
    accentColor2: "#1A1A1A",
    badgeStyle: "pill",
    cornerRadius: 12,
  },
  {
    name: "Свежий",
    accentColor: "#00B894",
    accentColor2: "#FFFFFF",
    badgeStyle: "rounded",
    cornerRadius: 16,
  },
  {
    name: "Энергия",
    accentColor: "#FF6B6B",
    accentColor2: "#FFA502",
    badgeStyle: "pill",
    cornerRadius: 24,
  },
  {
    name: "Корпоративный",
    accentColor: "#2C3E50",
    accentColor2: "#3498DB",
    badgeStyle: "square",
    cornerRadius: 4,
  },
];

/**
 * Initialize with preset templates if storage is empty
 */
export function initializePresetsIfEmpty(): void {
  const existing = listBrandTemplates();
  if (existing.length > 0) return;
  
  for (const preset of PRESET_BRAND_TEMPLATES) {
    saveBrandTemplate(preset);
  }
}

// ===== VALIDATION =====

export function validateBrandTemplate(input: Partial<BrandTemplateInput>): string[] {
  const errors: string[] = [];
  
  if (!input.name || input.name.trim().length === 0) {
    errors.push("Название обязательно");
  }
  
  if (!input.accentColor || !/^#[0-9A-Fa-f]{6}$/.test(input.accentColor)) {
    errors.push("Некорректный основной цвет (используйте HEX)");
  }
  
  if (input.accentColor2 && !/^#[0-9A-Fa-f]{6}$/.test(input.accentColor2)) {
    errors.push("Некорректный дополнительный цвет (используйте HEX)");
  }
  
  if (input.cornerRadius !== undefined && (input.cornerRadius < 0 || input.cornerRadius > 50)) {
    errors.push("Радиус скругления должен быть от 0 до 50");
  }
  
  return errors;
}

// ===== UTILITIES =====

export function getBadgeStyleLabel(style: BadgeStyle): string {
  const labels: Record<BadgeStyle, string> = {
    rounded: "Скруглённый",
    pill: "Капсула",
    square: "Прямоугольный",
    circle: "Круглый",
  };
  return labels[style] || style;
}

export function getCornerRadiusOptions(): { value: number; label: string }[] {
  return [
    { value: 0, label: "0px — Острые" },
    { value: 4, label: "4px — Минимальные" },
    { value: 8, label: "8px — Стандарт" },
    { value: 12, label: "12px — Средние" },
    { value: 16, label: "16px — Крупные" },
    { value: 24, label: "24px — Капсула" },
  ];
}



