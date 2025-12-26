import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface FavoritesState {
  favorites: Set<string>;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  addFavorite: (id: string) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  fetchFavorites: () => Promise<void>;
}

// Convert Set to Array for localStorage persistence
const setToArray = (set: Set<string>) => Array.from(set);

// Safe localStorage wrapper for SSR
const safeStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const str = localStorage.getItem(name);
      if (!str) return null;
      const data = JSON.parse(str);
      return JSON.stringify({
        ...data,
        state: {
          ...data.state,
          favorites: data.state?.favorites || [],
        },
      });
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      const parsed = JSON.parse(value);
      const data = {
        ...parsed,
        state: {
          ...parsed.state,
          favorites: parsed.state?.favorites ? setToArray(parsed.state.favorites) : [],
        },
      };
      localStorage.setItem(name, JSON.stringify(data));
    } catch {
      // Ignore errors
    }
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: new Set<string>(),
      _hasHydrated: false,
      
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      addFavorite: async (id: string) => {
        set((state) => ({
          favorites: new Set([...state.favorites, id]),
        }));

        try {
          await fetch(`/api/generations/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ is_favorite: true }),
          });
        } catch (error) {
          set((state) => {
            const newFavorites = new Set(state.favorites);
            newFavorites.delete(id);
            return { favorites: newFavorites };
          });
          console.error('Failed to add favorite:', error);
        }
      },

      removeFavorite: async (id: string) => {
        set((state) => {
          const newFavorites = new Set(state.favorites);
          newFavorites.delete(id);
          return { favorites: newFavorites };
        });

        try {
          await fetch(`/api/generations/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ is_favorite: false }),
          });
        } catch (error) {
          set((state) => ({
            favorites: new Set([...state.favorites, id]),
          }));
          console.error('Failed to remove favorite:', error);
        }
      },

      toggleFavorite: async (id: string) => {
        const { favorites, addFavorite, removeFavorite } = get();
        if (favorites.has(id)) {
          await removeFavorite(id);
        } else {
          await addFavorite(id);
        }
      },

      isFavorite: (id: string) => {
        return get().favorites.has(id);
      },

      fetchFavorites: async () => {
        try {
          const res = await fetch('/api/generations?favorites=true&limit=100', {
            credentials: 'include',
          });
          if (!res.ok) return;
          
          const data = await res.json();
          const ids = (data.generations || []).map((g: any) => g.id);
          set({ favorites: new Set(ids) });
        } catch (error) {
          console.error('Failed to fetch favorites:', error);
        }
      },
    }),
    {
      name: 'lensroom-favorites',
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Convert array back to Set after hydration
        if (state && Array.isArray(state.favorites)) {
          state.favorites = new Set(state.favorites as unknown as string[]);
        }
      },
      partialize: (state) => ({ 
        favorites: setToArray(state.favorites),
      }),
    }
  )
);

