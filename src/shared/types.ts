export interface Script {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export type PrompterMode = 'voice' | 'autoscroll'

export interface AppSettings {
  prompterMode: PrompterMode
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
  sttEngine: SttEngineType
  sttModelId: string
  displayMode: 'notch' | 'floating'
}

export const DEFAULT_SETTINGS: AppSettings = {
  prompterMode: 'autoscroll',
  scrollSpeed: 150,
  fontSize: 19,
  textColor: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 1)',
  silenceThreshold: 1500,
  selectedMicrophone: 'default',
  prompterOpacity: 1,
  prompterWidth: 400,
  prompterHeight: 96,
  language: 'fr-FR',
  sttEngine: 'sherpa',
  sttModelId: 'sherpa-streaming-zipformer-fr',
  displayMode: 'notch'
}

export interface SpeechState {
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  currentPosition: number
}

export type PrompterStatus = 'idle' | 'playing' | 'paused'

export type DynamicIslandState = 'hidden' | 'compact' | 'expanded'

export interface PrompterData {
  words: string[]
  currentPosition: number
  status: PrompterStatus
  isSpeaking: boolean
  settings: AppSettings
  islandState: DynamicIslandState
}

export interface StoreData {
  scripts: Script[]
  settings: AppSettings
}

// ── STT (Speech-to-Text) ──

export type SttEngineType = 'sherpa' | 'whisper'

export interface SttModel {
  id: string
  engine: SttEngineType
  name: string
  description: string
  size: string
  sizeBytes: number
  url: string
  downloaded: boolean
  language: string
}

export interface SttDownloadProgress {
  modelId: string
  percent: number
  downloadedBytes: number
  totalBytes: number
}

export interface SttResult {
  text: string
  isFinal: boolean
}
