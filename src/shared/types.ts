export interface Script {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  scrollSpeed: number // mots/minute
  fontSize: number
  textColor: string
  backgroundColor: string
  silenceThreshold: number // ms avant pause
  selectedMicrophone: string
  prompterOpacity: number
  prompterWidth: number
  prompterHeight: number
  language: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  scrollSpeed: 150,
  fontSize: 16,
  textColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  silenceThreshold: 1500,
  selectedMicrophone: 'default',
  prompterOpacity: 0.9,
  prompterWidth: 460,
  prompterHeight: 52,
  language: 'fr-FR'
}

export interface SpeechState {
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  currentPosition: number
}

export type PrompterStatus = 'idle' | 'playing' | 'paused'
