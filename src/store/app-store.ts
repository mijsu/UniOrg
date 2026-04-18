import { create } from 'zustand'

interface AppState {
  currentOrgId: string | null
  setCurrentOrgId: (orgId: string | null) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  clear: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentOrgId: null,
  setCurrentOrgId: (orgId) => set({ currentOrgId: orgId }),
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  clear: () => set({ currentOrgId: null, sidebarOpen: true }),
}))
