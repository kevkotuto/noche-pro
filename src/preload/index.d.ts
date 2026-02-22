interface SttDownloadProgress {
  modelId: string
  percent: number
  downloadedBytes: number
  totalBytes: number
}

interface SttResultEvent {
  text: string
  isFinal: boolean
}

interface NocheProAPI {
  showPrompter: () => void
  hidePrompter: () => void
  updatePrompter: (data: unknown) => void
  resizePrompter: (size: { width: number; height: number }) => void
  onPrompterData: (callback: (data: unknown) => void) => () => void
  setPrompterInteractive: () => void
  setPrompterPassthrough: () => void
  sendPrompterCommand: (cmd: string) => void
  onPrompterCommand: (callback: (cmd: string) => void) => () => void
  getScripts: () => Promise<unknown[]>
  setScripts: (scripts: unknown) => Promise<void>
  getSettings: () => Promise<unknown>
  setSettings: (settings: unknown) => Promise<void>
  getMicrophones: () => Promise<{ deviceId: string; label: string }[]>
  checkMicPermission: () => Promise<string>
  togglePrompter: () => void
  setIslandState: (state: string) => void
  onIslandState: (callback: (state: string) => void) => () => void

  // STT Models
  listSttModels: () => Promise<unknown[]>
  downloadSttModel: (modelId: string) => Promise<{ success: boolean; error?: string }>
  deleteSttModel: (modelId: string) => Promise<{ success: boolean; error?: string }>
  onDownloadProgress: (callback: (progress: SttDownloadProgress) => void) => () => void

  // STT Engine
  startStt: (opts: { modelId: string; language: string }) => Promise<{ success: boolean; error?: string }>
  stopStt: () => Promise<{ success: boolean }>
  sendAudioChunk: (chunk: ArrayBuffer) => void
  onSttResult: (callback: (result: SttResultEvent) => void) => () => void
}

export {}

declare global {
  interface Window {
    api: NocheProAPI
  }
}
