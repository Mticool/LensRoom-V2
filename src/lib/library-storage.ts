// ===== LIBRARY STORAGE =====
// Stub implementation using localStorage for generated images

const STORAGE_KEY = "lensroom_library";
const MAX_ITEMS = 100; // Keep last 100 items

export interface LibraryItem {
  id: string;
  type: "product" | "photo" | "video";
  modeId: string;
  modelKey: string;
  imageUrl: string;
  thumbnailUrl?: string;
  prompt?: string;
  createdAt: string;
  metadata?: {
    generationType?: "single" | "pack";
    backgroundStyle?: string;
    marketplace?: string;
    productTitle?: string;
    [key: string]: unknown;
  };
}

/**
 * Get all library items
 */
export function getLibraryItems(): LibraryItem[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add item to library
 */
export function addToLibrary(item: Omit<LibraryItem, "id" | "createdAt">): LibraryItem {
  const newItem: LibraryItem = {
    ...item,
    id: `lib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  
  const items = getLibraryItems();
  const updated = [newItem, ...items].slice(0, MAX_ITEMS);
  
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  
  return newItem;
}

/**
 * Add multiple items to library
 */
export function addManyToLibrary(items: Omit<LibraryItem, "id" | "createdAt">[]): LibraryItem[] {
  const newItems: LibraryItem[] = items.map((item, index) => ({
    ...item,
    id: `lib_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  }));
  
  const existing = getLibraryItems();
  const updated = [...newItems, ...existing].slice(0, MAX_ITEMS);
  
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  
  return newItems;
}

/**
 * Remove item from library
 */
export function removeFromLibrary(id: string): void {
  const items = getLibraryItems();
  const filtered = items.filter((item) => item.id !== id);
  
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}

/**
 * Clear all library items
 */
export function clearLibrary(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Get items by type
 */
export function getLibraryItemsByType(type: LibraryItem["type"]): LibraryItem[] {
  return getLibraryItems().filter((item) => item.type === type);
}

/**
 * Get product images from library
 */
export function getProductImages(): LibraryItem[] {
  return getLibraryItemsByType("product");
}


