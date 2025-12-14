import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  id: string | null;
  email: string | null;
  name: string | null;
  avatar: string | null;
  isAuthenticated: boolean;
  setUser: (user: { id: string; email: string; name?: string; avatar?: string }) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      id: null,
      email: null,
      name: null,
      avatar: null,
      isAuthenticated: false,
      setUser: (user) =>
        set({
          id: user.id,
          email: user.email,
          name: user.name || null,
          avatar: user.avatar || null,
          isAuthenticated: true,
        }),
      clearUser: () =>
        set({
          id: null,
          email: null,
          name: null,
          avatar: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'lensroom-user',
    }
  )
);



