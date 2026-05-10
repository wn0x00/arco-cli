import { create } from 'zustand';

type SidebarStore = {
  collapsed: boolean;
  toggle: () => void;
  set: (collapsed: boolean) => void;
};

export const useSidebarStore = create<SidebarStore>((set, get) => ({
  collapsed: false,
  toggle: () => set({ collapsed: !get().collapsed }),
  set: (collapsed) => set({ collapsed }),
}));
