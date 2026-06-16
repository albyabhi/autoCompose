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

// ============================================================
// FILE: src/features/layout/stores/layout-store.ts
// ============================================================
// PURPOSE: Zustand store managing UI layout state for sidebar visibility and active view.
// HOW IT WORKS: Creates a Zustand store with sidebarOpen (desktop), mobileSidebarOpen (mobile overlay), and activeView (compose/sessions/settings/dashboard). Exposes toggle and setter actions consumed by Header, Sidebar, and AppShell.
// INTEGRATION: Zustand (create).
// ============================================================
