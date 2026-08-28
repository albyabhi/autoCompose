import { create } from "zustand";

interface DraftData {
  prompt: string;
  category: string;
}

interface LayoutState {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  activeView: "compose" | "sessions" | "settings" | "dashboard";
  draft: DraftData | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setActiveView: (view: LayoutState["activeView"]) => void;
  setDraft: (draft: DraftData | null) => void;
  clearDraft: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: true,
  mobileSidebarOpen: false,
  activeView: "dashboard",
  draft: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));

// ============================================================
// FILE: src/features/layout/stores/layout-store.ts
// ============================================================
// PURPOSE: Global UI state manager (Zustand) for layout things that multiple components need — sidebar visibility, current page view, and draft persistence.
// HOW IT WORKS: Zustand store with 5 state pieces:
//   - sidebarOpen: Desktop sidebar expanded/collapsed (default true).
//   - mobileSidebarOpen: Mobile sidebar overlay visible (default false).
//   - activeView: Current top-level page — "dashboard" | "compose" | "sessions" | "settings" (default "dashboard").
//   - draft: Saved GenerateForm draft {prompt, category} for surviving navigation (default null).
//   Actions: toggleSidebar, setSidebarOpen, setMobileSidebarOpen, setActiveView, setDraft, clearDraft.
//   Components: Header (toggles sidebar), Sidebar (reads sidebarOpen), AppShell (reads sidebarOpen for CSS class), GenerateForm (saves/reads draft), navigation (sets activeView).
// INTEGRATION: Zustand create(). Used by Header, Sidebar, AppShell, GenerateForm, and navigation components.
// ============================================================
