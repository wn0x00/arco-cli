import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LocaleCode = 'en-US' | 'zh-CN';

type LocaleStore = {
  locale: LocaleCode;
  set: (l: LocaleCode) => void;
};

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: 'en-US',
      set: (locale) => set({ locale }),
    }),
    { name: 'arco-pro-locale' }
  )
);
