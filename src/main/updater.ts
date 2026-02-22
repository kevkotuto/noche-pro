import { autoUpdater, UpdateInfo } from 'electron-updater'
import { ipcMain, BrowserWindow } from 'electron'

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  // In dev, autoUpdater needs a special config to work (or is silently skipped)
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    getMainWindow()?.webContents.send('update:checking')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    getMainWindow()?.webContents.send('update:available', {
      version: info.version,
      releaseDate: info.releaseDate
    })
  })

  autoUpdater.on('update-not-available', () => {
    getMainWindow()?.webContents.send('update:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    getMainWindow()?.webContents.send('update:progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    getMainWindow()?.webContents.send('update:downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err: Error) => {
    // Silently ignore update errors so they don't disrupt the user
    console.error('[AutoUpdater] Error:', err.message)
  })

  // IPC from renderer
  ipcMain.handle('update:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      // noop
    }
  })

  ipcMain.on('update:download', () => {
    autoUpdater.downloadUpdate().catch(() => {
      /* noop */
    })
  })

  ipcMain.on('update:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // Check for updates 10s after startup to not block initial load
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      /* noop */
    })
  }, 10_000)
}
