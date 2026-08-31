'use client'

import { create } from 'zustand'
import type {
  AppView,
  User,
  Workspace,
  Folder,
  Tag,
} from '@/lib/types'

interface AppState {
  // Auth
  user: User | null
  workspace: Workspace | null
  loading: boolean
  initialized: boolean

  // Navigation
  view: AppView
  selectedFormId: string | null
  selectedFolderId: string | null
  formDetailTab: string

  // Sidebar
  sidebarCollapsed: boolean
  folders: Folder[]
  tags: Tag[]

  // Theme
  theme: 'light' | 'dark' | 'vibrant'

  // Actions
  init: (user: User, workspace: Workspace) => void
  setView: (view: AppView) => void
  selectForm: (formId: string, tab?: string) => void
  selectFolder: (folderId: string | null) => void
  toggleSidebar: () => void
  setFolders: (folders: Folder[]) => void
  setTags: (tags: Tag[]) => void
  setTheme: (theme: 'light' | 'dark' | 'vibrant') => void
  logout: () => void
}

export const useApp = create<AppState>((set) => ({
  user: null,
  workspace: null,
  loading: false,
  initialized: false,

  view: 'dashboard',
  selectedFormId: null,
  selectedFolderId: null,
  formDetailTab: 'submissions',

  sidebarCollapsed: false,
  folders: [],
  tags: [],

  theme: 'light',

  init: (user, workspace) => set({ user, workspace, initialized: true }),
  setView: (view) => set({ view }),
  selectForm: (formId, tab = 'submissions') =>
    set({ selectedFormId: formId, view: 'builder', formDetailTab: tab }),
  selectFolder: (folderId) => set({ selectedFolderId: folderId, view: 'forms' }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setFolders: (folders) => set({ folders }),
  setTags: (tags) => set({ tags }),
  setTheme: (theme) => set({ theme }),
  logout: () => set({ user: null, workspace: null, initialized: false, view: 'login' }),
}))
