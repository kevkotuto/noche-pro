import { create } from 'zustand'
import type { Script, AppSettings, PrompterStatus } from '../../../shared/types'
import { DEFAULT_SETTINGS } from '../../../shared/types'

interface AppState {
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
  setIsListening: (listening: boolean) => void
  setIsSpeaking: (speaking: boolean) => void
  setTranscript: (transcript: string) => void

  // Settings
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Script
  currentScript: null,
  scripts: [],
  setCurrentScript: (script) => set({ currentScript: script }),
  setScripts: (scripts) => set({ scripts }),
  addScript: (script) =>
    set((state) => ({ scripts: [...state.scripts, script] })),
  updateScript: (id, updates) =>
    set((state) => ({
      scripts: state.scripts.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      currentScript:
        state.currentScript?.id === id
          ? { ...state.currentScript, ...updates }
          : state.currentScript
    })),
  deleteScript: (id) =>
    set((state) => ({
      scripts: state.scripts.filter((s) => s.id !== id),
      currentScript: state.currentScript?.id === id ? null : state.currentScript
    })),

  // Prompter
  status: 'idle',
  currentPosition: 0,
  setStatus: (status) => set({ status }),
  setCurrentPosition: (position) => set({ currentPosition: position }),

  // Speech
  isListening: false,
  isSpeaking: false,
  transcript: '',
  setIsListening: (isListening) => set({ isListening }),
  setIsSpeaking: (isSpeaking) => set({ isSpeaking }),
  setTranscript: (transcript) => set({ transcript }),

  // Settings
  settings: DEFAULT_SETTINGS,
  updateSettings: (updates) =>
    set((state) => ({ settings: { ...state.settings, ...updates } }))
}))
