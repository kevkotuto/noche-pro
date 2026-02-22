import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { Script } from '../../../shared/types'

interface SidebarProps {
  onOpenSettings: () => void
  onEditScript: () => void
}

export default function Sidebar({ onOpenSettings, onEditScript }: SidebarProps) {
  const { currentScript, scripts, setCurrentScript, addScript, deleteScript, status } =
    useAppStore()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleNew = () => {
    const newScript: Script = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    addScript(newScript)
    setCurrentScript(newScript)
    onEditScript()
  }

  const handleSelect = (script: Script) => {
    if (status !== 'idle') return
    setCurrentScript(script)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      deleteScript(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.md,.srt'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      const name = file.name.replace(/\.(txt|md|srt)$/, '')
      const newScript: Script = {
        id: crypto.randomUUID(),
        title: name,
        content: text,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      addScript(newScript)
      setCurrentScript(newScript)
    }
    input.click()
  }

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "À l'instant"
    if (mins < 60) return `${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="w-56 flex flex-col bg-[var(--color-sidebar-bg)] border-r border-[var(--color-border)] h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <span className="text-[13px] font-semibold text-[var(--color-text)] tracking-[-0.01em]">
          Scripts
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNew}
            disabled={status !== 'idle'}
            title="Nouveau script"
            className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={handleImport}
            disabled={status !== 'idle'}
            title="Importer un fichier (.txt, .md, .srt)"
            className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Script list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {scripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 px-4">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-subtle)" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
              </svg>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] text-center leading-relaxed">
              Aucun script.<br />Cliquez sur + pour commencer.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {scripts.map((script) => {
              const isSelected = currentScript?.id === script.id
              return (
                <div
                  key={script.id}
                  onClick={() => handleSelect(script)}
                  className={`group relative pl-4 pr-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-[var(--color-surface)]'
                      : 'hover:bg-[var(--color-surface)]/70'
                  } ${status !== 'idle' ? 'pointer-events-none opacity-50' : ''}`}
                >
                  {/* Active indicator */}
                  {isSelected && (
                    <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[var(--color-primary)]" />
                  )}

                  <div className="flex items-start justify-between gap-1.5">
                    <span
                      className={`text-[13px] font-medium truncate leading-snug ${
                        isSelected ? 'text-[var(--color-text)]' : 'text-[var(--color-text)]'
                      }`}
                    >
                      {script.title || 'Sans titre'}
                    </span>
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, script.id)}
                      className={`shrink-0 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer ${
                        confirmDelete === script.id
                          ? 'opacity-100 bg-red-500/15 text-red-500'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-red-500'
                      }`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5 leading-relaxed pr-1">
                    {script.content.slice(0, 55) || 'Script vide'}
                  </p>
                  <span className="text-[10px] text-[var(--color-text-subtle)] mt-1 block">
                    {formatTime(script.updatedAt)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer: settings */}
      <div className="px-4 py-3.5 border-t border-[var(--color-border)]">
        <button
          onClick={onOpenSettings}
          title="Paramètres"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-all duration-150 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </div>
    </div>
  )
}
