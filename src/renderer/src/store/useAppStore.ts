import { create } from 'zustand'
import type { Script, AppSettings, PrompterStatus } from '../../../shared/types'
import { DEFAULT_SETTINGS } from '../../../shared/types'

type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

// Listen for OS theme changes when set to 'system'
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const saved = localStorage.getItem('nochepro-theme') as Theme | null
  if (saved === 'system') applyTheme('system')
})

interface AppState {
  // Initialization
  initialized: boolean
  init: () => Promise<void>

  // Theme
  theme: Theme
  setTheme: (theme: Theme) => void

  // Script
  currentScript: Script | null
  scripts: Script[]
  setCurrentScript: (script: Script | null) => void
  setScripts: (scripts: Script[]) => void
  addScript: (script: Script) => void
  updateScript: (id: string, updates: Partial<Script>) => void
  deleteScript: (id: string) => void

  // Prompter
  status: PrompterStatus
  currentPosition: number
  setStatus: (status: PrompterStatus) => void
  setCurrentPosition: (position: number) => void

  // Speech
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  speechError: string | null
  setIsListening: (listening: boolean) => void
  setIsSpeaking: (speaking: boolean) => void
  setTranscript: (transcript: string) => void
  setSpeechError: (error: string | null) => void

  // Settings
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
}

// Helper to persist scripts
const persistScripts = (scripts: Script[]) => {
  window.api.setScripts(scripts)
}

// Helper to persist settings
const persistSettings = (settings: AppSettings) => {
  window.api.setSettings(settings)
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initialization
  initialized: false,
  init: async () => {
    if (get().initialized) return
    try {
      const [scripts, settings] = await Promise.all([
        window.api.getScripts(),
        window.api.getSettings()
      ])
      const savedTheme = (localStorage.getItem('nochepro-theme') as Theme) || 'light'
      applyTheme(savedTheme)
      set({
        scripts: (scripts as Script[]) || [],
        settings: (settings as AppSettings) || DEFAULT_SETTINGS,
        theme: savedTheme,
        initialized: true
      })
    } catch {
      set({ initialized: true })
    }
  },

  // Theme
  theme: 'light',
  setTheme: (theme) => {
    applyTheme(theme)
    localStorage.setItem('nochepro-theme', theme)
    set({ theme })
  },

  // Script
  currentScript: null,
  scripts: [],
  setCurrentScript: (script) => set({ currentScript: script }),
  setScripts: (scripts) => {
    set({ scripts })
    persistScripts(scripts)
  },
  addScript: (script) => {
    const scripts = [...get().scripts, script]
    set({ scripts })
    persistScripts(scripts)
  },
  updateScript: (id, updates) => {
    const state = get()
    const scripts = state.scripts.map((s) => (s.id === id ? { ...s, ...updates } : s))
    const currentScript =
      state.currentScript?.id === id
        ? { ...state.currentScript, ...updates }
        : state.currentScript
    set({ scripts, currentScript })
    persistScripts(scripts)
  },
  deleteScript: (id) => {
    const state = get()
    const scripts = state.scripts.filter((s) => s.id !== id)
    const currentScript = state.currentScript?.id === id ? null : state.currentScript
    set({ scripts, currentScript })
    persistScripts(scripts)
  },

  // Prompter
  status: 'idle',
  currentPosition: 0,
  setStatus: (status) => set({ status }),
  setCurrentPosition: (position) => set({ currentPosition: position }),

  // Speech
  isListening: false,
  isSpeaking: false,
  transcript: '',
  speechError: null,
  setIsListening: (isListening) => set({ isListening }),
  setIsSpeaking: (isSpeaking) => set({ isSpeaking }),
  setTranscript: (transcript) => set({ transcript }),
  setSpeechError: (speechError) => set({ speechError }),

  // Settings
  settings: DEFAULT_SETTINGS,
  updateSettings: (updates) => {
    const settings = { ...get().settings, ...updates }
    set({ settings })
    persistSettings(settings)
  }
}))
