/**
 * Marketplace Profiles Configuration
 * Defines platform-specific constraints for WB and Ozon product cards
 */

// ===== TYPES =====

export interface SafeArea {
  /** Top safe zone in % of canvas height */
  top: number;
  /** Right safe zone in % of canvas width */
  right: number;
  /** Bottom safe zone in % of canvas height */
  bottom: number;
  /** Left safe zone in % of canvas width */
  left: number;
}

export interface CanvasPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  ratio: string;
  description: string;
}

export interface TypographyScale {
  /** Title font size in px (base for 1000px canvas) */
  titleSize: number;
  /** Body/subtitle font size in px */
  bodySize: number;
  /** Small text / captions */
  captionSize: number;
  /** Line height multiplier */
  lineHeight: number;
  /** Letter spacing in em */
  letterSpacing: number;
  /** Recommended max title length in chars */
  maxTitleChars: number;
}

export interface LayoutZone {
  /** Position from edge in % */
  x: number;
  y: number;
  /** Max width in % of canvas */
  maxWidth: number;
  /** Max height in % of canvas */
  maxHeight: number;
  /** Anchor point */
  anchor: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
}

export interface CoverLayout {
  /** Logo placement zone */
  logoZone: LayoutZone;
  /** Price badge zone */
  priceBadgeZone: LayoutZone;
  /** Discount badge zone */
  discountBadgeZone: LayoutZone;
  /** Main product area (center) */
  productZone: LayoutZone;
  /** Text overlay zones */
  textZones: LayoutZone[];
}

export interface MarketplaceProfile {
  id: string;
  name: string;
  nameRu: string;
  /** Brand color for UI hints */
  brandColor: string;
  /** Safe areas for text placement (avoid cropping) */
  safeArea: SafeArea;
  /** Available canvas presets */
  canvasPresets: CanvasPreset[];
  /** Default canvas preset ID */
  defaultCanvasId: string;
  /** Typography recommendations */
  typography: TypographyScale;
  /** Cover slide layout constraints */
  coverLayout: CoverLayout;
  /** Platform-specific notes */
  notes: string[];
}

// ===== MARKETPLACE PROFILES =====

export const MARKETPLACE_PROFILES: Record<string, MarketplaceProfile> = {
  wb: {
    id: "wb",
    name: "Wildberries",
    nameRu: "Wildberries",
    brandColor: "#CB11AB",
    safeArea: {
      top: 8,    // Top bar overlay on mobile
      right: 5,
      bottom: 12, // Price/cart button overlay
      left: 5,
    },
    canvasPresets: [
      {
        id: "wb-standard",
        name: "Стандарт",
        width: 900,
        height: 1200,
        ratio: "3:4",
        description: "Основной формат карточки WB",
      },
      {
        id: "wb-square",
        name: "Квадрат",
        width: 1000,
        height: 1000,
        ratio: "1:1",
        description: "Для превью в каталоге",
      },
      {
        id: "wb-wide",
        name: "Широкий",
        width: 1200,
        height: 900,
        ratio: "4:3",
        description: "Для горизонтальных слайдов",
      },
    ],
    defaultCanvasId: "wb-standard",
    typography: {
      titleSize: 72,
      bodySize: 36,
      captionSize: 24,
      lineHeight: 1.2,
      letterSpacing: -0.02,
      maxTitleChars: 40,
    },
    coverLayout: {
      logoZone: {
        x: 5,
        y: 5,
        maxWidth: 20,
        maxHeight: 10,
        anchor: "top-left",
      },
      priceBadgeZone: {
        x: 5,
        y: 5,
        maxWidth: 25,
        maxHeight: 12,
        anchor: "top-right",
      },
      discountBadgeZone: {
        x: 5,
        y: 15,
        maxWidth: 20,
        maxHeight: 10,
        anchor: "top-right",
      },
      productZone: {
        x: 10,
        y: 15,
        maxWidth: 80,
        maxHeight: 60,
        anchor: "center",
      },
      textZones: [
        {
          x: 5,
          y: 75,
          maxWidth: 90,
          maxHeight: 20,
          anchor: "bottom-left",
        },
      ],
    },
    notes: [
      "Первый слайд — обложка, виден в каталоге",
      "Текст на обложке — максимум 2 строки",
      "Цена и скидка добавляются WB автоматически",
      "Белый фон повышает CTR на 15–20%",
    ],
  },

  ozon: {
    id: "ozon",
    name: "Ozon",
    nameRu: "Озон",
    brandColor: "#005BFF",
    safeArea: {
      top: 10,   // Ozon overlay (heart, share)
      right: 8,
      bottom: 15, // Price bar is larger
      left: 5,
    },
    canvasPresets: [
      {
        id: "ozon-standard",
        name: "Стандарт",
        width: 1000,
        height: 1000,
        ratio: "1:1",
        description: "Основной формат Ozon",
      },
      {
        id: "ozon-vertical",
        name: "Вертикальный",
        width: 900,
        height: 1200,
        ratio: "3:4",
        description: "Для детальных фото",
      },
      {
        id: "ozon-rich",
        name: "Rich-контент",
        width: 1200,
        height: 1600,
        ratio: "3:4",
        description: "Для Rich Content блоков",
      },
    ],
    defaultCanvasId: "ozon-standard",
    typography: {
      titleSize: 64,
      bodySize: 32,
      captionSize: 22,
      lineHeight: 1.25,
      letterSpacing: -0.01,
      maxTitleChars: 50,
    },
    coverLayout: {
      logoZone: {
        x: 5,
        y: 5,
        maxWidth: 18,
        maxHeight: 10,
        anchor: "top-left",
      },
      priceBadgeZone: {
        x: 5,
        y: 5,
        maxWidth: 22,
        maxHeight: 10,
        anchor: "top-right",
      },
      discountBadgeZone: {
        x: 5,
        y: 12,
        maxWidth: 18,
        maxHeight: 8,
        anchor: "top-right",
      },
      productZone: {
        x: 10,
        y: 12,
        maxWidth: 80,
        maxHeight: 65,
        anchor: "center",
      },
      textZones: [
        {
          x: 5,
          y: 78,
          maxWidth: 90,
          maxHeight: 18,
          anchor: "bottom-left",
        },
      ],
    },
    notes: [
      "Квадратный формат — основной для каталога",
      "Rich Content позволяет до 15 слайдов",
      "Озон строже к качеству изображений (мин. 900px)",
      "Инфографика с иконками повышает конверсию",
    ],
  },
};

// ===== HELPERS =====

export function getMarketplaceProfile(id: string): MarketplaceProfile | undefined {
  return MARKETPLACE_PROFILES[id];
}

export function getDefaultCanvas(marketplaceId: string): CanvasPreset | undefined {
  const profile = MARKETPLACE_PROFILES[marketplaceId];
  if (!profile) return undefined;
  return profile.canvasPresets.find(c => c.id === profile.defaultCanvasId);
}

export function getCanvasPreset(marketplaceId: string, canvasId: string): CanvasPreset | undefined {
  const profile = MARKETPLACE_PROFILES[marketplaceId];
  if (!profile) return undefined;
  return profile.canvasPresets.find(c => c.id === canvasId);
}

export function getAllMarketplaces(): MarketplaceProfile[] {
  return Object.values(MARKETPLACE_PROFILES);
}

export function getSafeAreaInPixels(
  marketplaceId: string,
  canvasWidth: number,
  canvasHeight: number
): { top: number; right: number; bottom: number; left: number } | undefined {
  const profile = MARKETPLACE_PROFILES[marketplaceId];
  if (!profile) return undefined;
  
  return {
    top: (profile.safeArea.top / 100) * canvasHeight,
    right: (profile.safeArea.right / 100) * canvasWidth,
    bottom: (profile.safeArea.bottom / 100) * canvasHeight,
    left: (profile.safeArea.left / 100) * canvasWidth,
  };
}


