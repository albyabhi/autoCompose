import { create } from "zustand";

interface LayoutState {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  activeView: "compose" | "sessions" | "settings" | "dashboard";
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setActiveView: (view: LayoutState["activeView"]) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: true,
  mobileSidebarOpen: false,
  activeView: "dashboard",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
}));
