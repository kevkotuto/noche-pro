import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Prompter
  showPrompter: () => ipcRenderer.send('prompter:show'),
  hidePrompter: () => ipcRenderer.send('prompter:hide'),
  updatePrompter: (data: unknown) => ipcRenderer.send('prompter:update', data),
  resizePrompter: (size: { width: number; height: number }) =>
    ipcRenderer.send('prompter:resize', size),
  onPrompterData: (callback: (data: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('prompter:data', handler)
    return () => {
      ipcRenderer.removeListener('prompter:data', handler)
    }
  },

  // Prompter hover controls
  setPrompterInteractive: () => ipcRenderer.send('prompter:set-interactive'),
  setPrompterPassthrough: () => ipcRenderer.send('prompter:set-passthrough'),
  sendPrompterCommand: (cmd: string) => ipcRenderer.send('prompter:command', cmd),
  onPrompterCommand: (callback: (cmd: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, cmd: string) => callback(cmd)
    ipcRenderer.on('prompter:command', handler)
    return () => {
      ipcRenderer.removeListener('prompter:command', handler)
    }
  },

  // Persistence
  getScripts: () => ipcRenderer.invoke('store:get-scripts'),
  setScripts: (scripts: unknown) => ipcRenderer.invoke('store:set-scripts', scripts),
  getSettings: () => ipcRenderer.invoke('store:get-settings'),
  setSettings: (settings: unknown) => ipcRenderer.invoke('store:set-settings', settings),

  // Microphones
  getMicrophones: () => ipcRenderer.invoke('app:get-microphones'),
  checkMicPermission: () => ipcRenderer.invoke('app:mic-permission'),

  // Toggle prompter
  togglePrompter: () => ipcRenderer.send('app:toggle-prompter'),

  // Dynamic Island state
  setIslandState: (state: string) => ipcRenderer.send('prompter:set-island-state', state),
  onIslandState: (callback: (state: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: string) => callback(state)
    ipcRenderer.on('prompter:island-state', handler)
    return () => {
      ipcRenderer.removeListener('prompter:island-state', handler)
    }
  },

  // ── STT: Model management ──
  listSttModels: () => ipcRenderer.invoke('stt:list-models'),
  downloadSttModel: (modelId: string) => ipcRenderer.invoke('stt:download-model', modelId),
  deleteSttModel: (modelId: string) => ipcRenderer.invoke('stt:delete-model', modelId),
  onDownloadProgress: (
    callback: (progress: { modelId: string; percent: number; downloadedBytes: number; totalBytes: number }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      progress: { modelId: string; percent: number; downloadedBytes: number; totalBytes: number }
    ) => callback(progress)
    ipcRenderer.on('stt:download-progress', handler)
    return () => {
      ipcRenderer.removeListener('stt:download-progress', handler)
    }
  },

  // ── STT: Engine control ──
  startStt: (opts: { modelId: string; language: string }) =>
    ipcRenderer.invoke('stt:start', opts),
  stopStt: () => ipcRenderer.invoke('stt:stop'),
  sendAudioChunk: (chunk: ArrayBuffer) => ipcRenderer.send('stt:audio-chunk', chunk),
  onSttResult: (callback: (result: { text: string; isFinal: boolean }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      result: { text: string; isFinal: boolean }
    ) => callback(result)
    ipcRenderer.on('stt:result', handler)
    return () => {
      ipcRenderer.removeListener('stt:result', handler)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
