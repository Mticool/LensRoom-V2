import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  favorites: Set<string>;
  addFavorite: (id: string) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  fetchFavorites: () => Promise<void>;
}

// Convert Set to/from Array for localStorage persistence
const setToArray = (set: Set<string>) => Array.from(set);
const arrayToSet = (arr: string[]) => new Set(arr);

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: new Set<string>(),

      addFavorite: async (id: string) => {
        // Optimistic update
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
          // Rollback on error
          set((state) => {
            const newFavorites = new Set(state.favorites);
            newFavorites.delete(id);
            return { favorites: newFavorites };
          });
          console.error('Failed to add favorite:', error);
        }
      },

      removeFavorite: async (id: string) => {
        // Optimistic update
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
          // Rollback on error
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
      // Custom serialization for Set
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          return {
            ...data,
            state: {
              ...data.state,
              favorites: arrayToSet(data.state.favorites || []),
            },
          };
        },
        setItem: (name, value) => {
          const data = {
            ...value,
            state: {
              ...value.state,
              favorites: setToArray(value.state.favorites),
            },
          };
          localStorage.setItem(name, JSON.stringify(data));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
