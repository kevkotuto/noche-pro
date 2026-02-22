import { app, shell, BrowserWindow, ipcMain, screen, systemPreferences } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null
let prompterWindow: BrowserWindow | null = null

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    show: false,
    autoHideMenuBar: true,
    title: 'NochePro',
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createPrompterWindow(): void {
  const display = screen.getPrimaryDisplay()
  const { width } = display.workAreaSize
  const prompterWidth = 460
  const prompterHeight = 52

  prompterWindow = new BrowserWindow({
    width: prompterWidth,
    height: prompterHeight,
    x: Math.round(width / 2) - Math.round(prompterWidth / 2),
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    show: false,
    ...(process.platform === 'darwin' ? { vibrancy: 'dark' as const } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  prompterWindow.setIgnoreMouseEvents(true, { forward: true })

  prompterWindow.on('closed', () => {
    prompterWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    prompterWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#prompter`)
  } else {
    prompterWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'prompter' })
  }
}

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
    prompterWindow?.setSize(width, height)
    const display = screen.getPrimaryDisplay()
    const screenWidth = display.workAreaSize.width
    prompterWindow?.setPosition(Math.round(screenWidth / 2) - Math.round(width / 2), 0)
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.nochepro.app')

  if (process.platform === 'darwin') {
    await systemPreferences.askForMediaAccess('microphone')
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupIPC()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
