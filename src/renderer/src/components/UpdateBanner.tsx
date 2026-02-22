import { useState, useEffect } from 'react'

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'available'; version: string }
  | { phase: 'downloading'; percent: number }
  | { phase: 'ready'; version: string }

export default function UpdateBanner(): React.JSX.Element | null {
  const [update, setUpdate] = useState<UpdateState>({ phase: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const offAvailable = window.api.onUpdateAvailable((info) => {
      setDismissed(false)
      setUpdate({ phase: 'available', version: info.version })
    })
    const offProgress = window.api.onUpdateProgress((p) => {
      setUpdate({ phase: 'downloading', percent: p.percent })
    })
    const offReady = window.api.onUpdateDownloaded((info) => {
      setUpdate({ phase: 'ready', version: info.version })
    })
    return () => {
      offAvailable()
      offProgress()
      offReady()
    }
  }, [])

  if (dismissed || update.phase === 'idle') return null

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--color-primary)]/10 border-b border-[var(--color-primary)]/20 text-[12px] shrink-0 animate-fade-in">
      {update.phase === 'available' && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
          <span className="text-[var(--color-text)] flex-1">
            Mise à jour disponible — <span className="font-medium">v{update.version}</span>
          </span>
          <button
            onClick={() => window.api.downloadUpdate()}
            className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-white font-medium text-[11px] hover:opacity-90 transition-opacity cursor-pointer"
          >
            Télécharger
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            aria-label="Ignorer"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </>
      )}

      {update.phase === 'downloading' && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse shrink-0" />
          <span className="text-[var(--color-text)] flex-1">
            Téléchargement de la mise à jour…
          </span>
          <div className="w-28 h-1 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
              style={{ width: `${update.percent}%` }}
            />
          </div>
          <span className="text-[var(--color-text-muted)] w-8 text-right tabular-nums">{update.percent}%</span>
        </>
      )}

      {update.phase === 'ready' && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[var(--color-text)] flex-1">
            v{update.version} prête — redémarrez pour appliquer
          </span>
          <button
            onClick={() => window.api.installUpdate()}
            className="px-3 py-1 rounded-md bg-emerald-500 text-white font-medium text-[11px] hover:opacity-90 transition-opacity cursor-pointer"
          >
            Redémarrer
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            aria-label="Plus tard"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
