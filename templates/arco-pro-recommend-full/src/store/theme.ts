import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

type ThemeStore = {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggle: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
      set: (theme) => set({ theme }),
    }),
    { name: 'arco-pro-theme' }
  )
);
