import { app, shell, BrowserWindow, ipcMain, screen, systemPreferences } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import icon from '../../resources/icon.png?asset'
import type { Script, AppSettings, DynamicIslandState } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'
import {
  listAvailableModels,
  downloadModel,
  deleteModel,
  getModelPath,
  getCatalogEntry,
  isModelDownloading
} from './models'
import { createEngine, type SttEngine } from './stt-engine'
import { setupAutoUpdater } from './updater'

// ── Simple JSON store (CJS-compatible, no ESM-only deps) ──
class JsonStore {
  private data: Record<string, unknown>
  private filePath = ''

  constructor(private defaults: Record<string, unknown>) {
    this.data = { ...defaults }
  }

  init(): void {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    this.filePath = join(dir, 'nochepro-config.json')
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8')
        this.data = { ...this.defaults, ...JSON.parse(raw) }
      }
    } catch {
      // corrupted → use defaults
    }
  }

  get<T>(key: string, fallback: T): T {
    return (this.data[key] as T) ?? fallback
  }

  set(key: string, value: unknown): void {
    this.data[key] = value
    try {
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch {
      /* noop */
    }
  }
}

const store = new JsonStore({ scripts: [], settings: DEFAULT_SETTINGS })

// ── Dynamic Island animation engine ──
let animationTimer: ReturnType<typeof setInterval> | null = null

function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function animateWindowTo(
  win: BrowserWindow,
  toW: number,
  toH: number,
  toX: number,
  toY: number,
  durationMs: number,
  onComplete?: () => void
): void {
  if (animationTimer) clearInterval(animationTimer)

  const bounds = win.getBounds()
  const fromW = bounds.width
  const fromH = bounds.height
  const fromX = bounds.x
  const fromY = bounds.y
  const startTime = Date.now()
  const interval = 1000 / 60

  animationTimer = setInterval(() => {
    const elapsed = Date.now() - startTime
    const rawProgress = Math.min(elapsed / durationMs, 1)
    const t = easeOutBack(rawProgress)

    const currentW = Math.max(1, Math.round(fromW + (toW - fromW) * t))
    const currentH = Math.max(1, Math.round(fromH + (toH - fromH) * t))
    const currentX = Math.round(fromX + (toX - fromX) * t)
    const currentY = Math.round(fromY + (toY - fromY) * t)

    try {
      win.setBounds({ x: currentX, y: currentY, width: currentW, height: currentH })
    } catch {
      // window may have been destroyed
    }

    if (rawProgress >= 1) {
      clearInterval(animationTimer!)
      animationTimer = null
      onComplete?.()
    }
  }, interval)
}

function getIslandBounds(
  state: DynamicIslandState,
  currentBounds?: Electron.Rectangle
): { w: number; h: number; x: number; y: number } {
  const display = screen.getPrimaryDisplay()
  const screenWidth = display.size.width
  const settings = store.get<AppSettings>('settings', DEFAULT_SETTINGS)

  let w: number, h: number
  switch (state) {
    case 'compact':
      w = 200
      h = 36
      break
    case 'expanded':
      w = settings.prompterWidth
      h = settings.prompterHeight
      break
    case 'hidden':
    default:
      w = 180
      h = 1
      break
  }

  let targetX = Math.round(screenWidth / 2 - w / 2)
  let targetY = 0

  if (settings.displayMode === 'floating' && currentBounds && state !== 'hidden') {
    // Keep it centered on its current position when resizing between compact and expanded
    targetX = Math.round(currentBounds.x + currentBounds.width / 2 - w / 2)
    targetY = currentBounds.y
    // Keep within screen bounds
    targetX = Math.max(0, Math.min(targetX, screenWidth - w))
  }

  return { w, h, x: targetX, y: targetY }
}

// ── STT engine ──
let activeSttEngine: SttEngine | null = null

// ── Windows ──
let mainWindow: BrowserWindow | null = null
let prompterWindow: BrowserWindow | null = null

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 860,
    height: 640,
    minWidth: 600,
    minHeight: 450,
    show: false,
    autoHideMenuBar: true,
    title: 'NochePro',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    prompterWindow?.close()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createPrompterWindow(): void {
  const { w, h, x, y } = getIslandBounds('compact')

  prompterWindow = new BrowserWindow({
    width: w,
    height: h,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: true,
    focusable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  prompterWindow.setIgnoreMouseEvents(true, { forward: true })
  prompterWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.platform === 'darwin') {
    prompterWindow.setAlwaysOnTop(true, 'screen-saver')
  }

  prompterWindow.on('closed', () => {
    prompterWindow = null
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    prompterWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#prompter`)
  } else {
    prompterWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'prompter' })
  }
}

// ── IPC ──
function setupIPC(): void {
  ipcMain.on('prompter:show', () => {
    if (!prompterWindow) createPrompterWindow()
    prompterWindow?.show()
  })

  ipcMain.on('prompter:hide', () => {
    prompterWindow?.hide()
  })

  ipcMain.on('prompter:update', (_event, data) => {
    prompterWindow?.webContents.send('prompter:data', data)
  })

  ipcMain.on('prompter:resize', (_event, { width, height }: { width: number; height: number }) => {
    if (!prompterWindow) return
    prompterWindow.setSize(width, height)

    const settings = store.get<AppSettings>('settings', DEFAULT_SETTINGS)
    if (settings.displayMode !== 'floating') {
      const display = screen.getPrimaryDisplay()
      const sw = display.size.width
      prompterWindow.setPosition(Math.round(sw / 2 - width / 2), 0)
    } else {
      // Keep center consistent if floating (optional, but good UX)
      // Actually for slider resize, maybe keep X and Y same?
      // Let's just keep x, y unchanged.
    }
  })

  // Hover controls: toggle mouse event passthrough
  ipcMain.on('prompter:set-interactive', () => {
    prompterWindow?.setIgnoreMouseEvents(false)
  })

  ipcMain.on('prompter:set-passthrough', () => {
    prompterWindow?.setIgnoreMouseEvents(true, { forward: true })
  })

  // Prompter commands relay (prompter window → main window)
  ipcMain.on('prompter:command', (_event, command: string) => {
    mainWindow?.webContents.send('prompter:command', command)
  })

  ipcMain.handle('store:get-scripts', () => store.get('scripts', []))
  ipcMain.handle('store:set-scripts', (_e, scripts: Script[]) => store.set('scripts', scripts))
  ipcMain.handle('store:get-settings', () => ({
    ...DEFAULT_SETTINGS,
    ...store.get('settings', DEFAULT_SETTINGS)
  }))
  ipcMain.handle('store:set-settings', (_e, settings: AppSettings) =>
    store.set('settings', settings)
  )

  ipcMain.handle('app:get-microphones', async () => {
    if (!mainWindow) return []
    try {
      return await mainWindow.webContents.executeJavaScript(
        `navigator.mediaDevices.enumerateDevices().then(d => d.filter(x => x.kind === 'audioinput').map(x => ({ deviceId: x.deviceId, label: x.label || 'Microphone ' + x.deviceId.slice(0, 4) })))`
      )
    } catch {
      return []
    }
  })

  ipcMain.handle('app:mic-permission', () => {
    return systemPreferences.getMediaAccessStatus('microphone')
  })

  // Dynamic Island state transitions
  ipcMain.on('prompter:set-island-state', (_event, state: DynamicIslandState) => {
    if (!prompterWindow) return
    const { w, h, x, y } = getIslandBounds(state, prompterWindow.getBounds())

    if (state === 'hidden') {
      animateWindowTo(prompterWindow, w, h, x, y, 250, () => {
        prompterWindow?.hide()
      })
    } else {
      animateWindowTo(prompterWindow, w, h, x, y, 350)
    }

    // Forward state to renderer
    prompterWindow.webContents.send('prompter:island-state', state)
  })

  // ── STT: Model management ──
  ipcMain.handle('stt:list-models', () => listAvailableModels())

  ipcMain.handle('stt:download-model', async (_e, modelId: string) => {
    try {
      await downloadModel(modelId, (percent, downloadedBytes, totalBytes) => {
        mainWindow?.webContents.send('stt:download-progress', {
          modelId,
          percent,
          downloadedBytes,
          totalBytes
        })
      })
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('stt:delete-model', async (_e, modelId: string) => {
    try {
      deleteModel(modelId)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // ── STT: Engine control ──
  ipcMain.handle('stt:start', (_e, opts: { modelId: string; language: string }) => {
    try {
      if (!opts.modelId) {
        return { success: false, error: 'Aucun modèle sélectionné' }
      }

      // Stop any existing engine
      if (activeSttEngine) {
        activeSttEngine.stop()
        activeSttEngine.destroy()
        activeSttEngine = null
      }

      if (isModelDownloading(opts.modelId)) {
        return { success: false, error: 'Modèle en cours de téléchargement, veuillez patienter…' }
      }

      const modelPath = getModelPath(opts.modelId)
      if (!modelPath) {
        return {
          success: false,
          error: 'Modèle non téléchargé. Allez dans Paramètres pour le télécharger.'
        }
      }

      const entry = getCatalogEntry(opts.modelId)
      if (!entry) {
        return { success: false, error: 'Modèle inconnu' }
      }

      const engine = createEngine(entry.engine, modelPath, opts.language)
      engine.onResult = (result) => {
        mainWindow?.webContents.send('stt:result', result)
      }
      engine.start()
      activeSttEngine = engine

      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.on('stt:audio-chunk', (_e, chunk: ArrayBuffer) => {
    if (!activeSttEngine) return
    const samples = new Float32Array(chunk)
    activeSttEngine.feedAudio(samples)
  })

  ipcMain.handle('stt:stop', () => {
    if (activeSttEngine) {
      activeSttEngine.stop()
      activeSttEngine.destroy()
      activeSttEngine = null
    }
    return { success: true }
  })

  ipcMain.on('app:toggle-prompter', () => {
    if (prompterWindow?.isVisible()) {
      prompterWindow.hide()
    } else {
      if (!prompterWindow) createPrompterWindow()
      prompterWindow?.show()
    }
  })
}

// ── App lifecycle ──
app.whenReady().then(async () => {
  app.setAppUserModelId('com.nochepro.app')
  store.init()

  if (process.platform === 'darwin') {
    const micAccess = await systemPreferences.askForMediaAccess('microphone')
    if (!micAccess) {
      console.warn('NochePro: Microphone access denied by user')
    }
  }

  setupIPC()
  createMainWindow()
  if (app.isPackaged) setupAutoUpdater(() => mainWindow)
  // Create prompter window in advance so it's ready when the user hits Play.
  // If created lazily (on first 'prompter:show'), IPC messages sent immediately
  // after arrive while webcontents are still loading and are silently dropped.
  createPrompterWindow()

  // Auto-download default Sherpa model on first launch
  const defaultModelId = 'sherpa-streaming-zipformer-fr'
  if (!getModelPath(defaultModelId)) {
    // Wait for main window to be ready before sending progress
    mainWindow?.webContents.once('did-finish-load', () => {
      downloadModel(defaultModelId, (percent, downloadedBytes, totalBytes) => {
        mainWindow?.webContents.send('stt:download-progress', {
          modelId: defaultModelId,
          percent,
          downloadedBytes,
          totalBytes
        })
      }).catch((err) => {
        console.error('Auto-download of default STT model failed:', err)
      })
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
