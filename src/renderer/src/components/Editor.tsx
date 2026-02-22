import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { Script } from '../../../shared/types'

export default function Editor() {
  const {
    currentScript,
    scripts,
    setCurrentScript,
    addScript,
    updateScript,
    deleteScript,
    status
  } = useAppStore()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-save timer
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isEditing || !currentScript) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)

    autoSaveRef.current = setTimeout(() => {
      if (content.trim()) {
        updateScript(currentScript.id, {
          title: title || 'Sans titre',
          content,
          updatedAt: Date.now()
        })
      }
    }, 2000)

    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [content, title, isEditing, currentScript, updateScript])

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
    setTitle('')
    setContent('')
    setIsEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleSave = () => {
    if (!content.trim()) return

    if (currentScript) {
      updateScript(currentScript.id, {
        title: title || 'Sans titre',
        content,
        updatedAt: Date.now()
      })
    }
    setIsEditing(false)
  }

  const handleSelect = (script: Script) => {
    if (status !== 'idle') return
    setCurrentScript(script)
    setTitle(script.title)
    setContent(script.content)
    setIsEditing(false)
  }

  const handleEdit = () => {
    if (!currentScript) return
    setTitle(currentScript.title)
    setContent(currentScript.content)
    setIsEditing(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      deleteScript(id)
      if (currentScript?.id === id) {
        setTitle('')
        setContent('')
        setIsEditing(false)
      }
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
      setTitle(name)
      setContent(text)
      setIsEditing(false)
    }
    input.click()
  }

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

  const formatDate = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold flex-1 text-[var(--color-text-muted)] uppercase tracking-wider">
          Scripts
        </h2>
        <button
          onClick={handleNew}
          disabled={status !== 'idle'}
          className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          + Nouveau
        </button>
        <button
          onClick={handleImport}
          disabled={status !== 'idle'}
          className="px-3 py-1.5 text-xs font-medium bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Importer
        </button>
      </div>

      {isEditing ? (
        /* Editing view */
        <div className="flex flex-col flex-1 gap-2.5 min-h-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du script..."
            className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Collez ou tapez votre texte ici..."
            className="flex-1 w-full px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed transition-colors min-h-0"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Sauvegarder
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-1.5 text-xs font-medium bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg transition-colors"
            >
              Fermer
            </button>
            <span className="text-xs text-[var(--color-text-muted)] ml-auto">
              {wordCount(content)} mots
            </span>
          </div>
        </div>
      ) : (
        /* Script list */
        <div className="flex flex-col flex-1 gap-1.5 overflow-y-auto min-h-0">
          {scripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 py-12">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6" />
                  <line x1="16" x2="8" y1="13" y2="13" />
                  <line x1="16" x2="8" y1="17" y2="17" />
                  <line x1="10" x2="8" y1="9" y2="9" />
                </svg>
              </div>
              <p className="text-[var(--color-text-muted)] text-xs text-center">
                Aucun script. Créez-en un ou importez un fichier.
              </p>
            </div>
          ) : (
            scripts.map((script) => (
              <div
                key={script.id}
                onClick={() => handleSelect(script)}
                className={`group p-3 rounded-lg cursor-pointer border transition-all duration-200 ${
                  currentScript?.id === script.id
                    ? 'bg-indigo-600/10 border-indigo-500/30'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-text-muted)]/20'
                } ${status !== 'idle' ? 'pointer-events-none opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {currentScript?.id === script.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">{script.title || 'Sans titre'}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {currentScript?.id === script.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit()
                        }}
                        className="text-xs px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        Modifier
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(script.id)
                      }}
                      className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                        confirmDelete === script.id
                          ? 'bg-red-500/30 text-red-300'
                          : 'bg-white/5 hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-400'
                      }`}
                    >
                      {confirmDelete === script.id ? 'Confirmer ?' : 'Suppr.'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-[var(--color-text-muted)] truncate flex-1">
                    {script.content.slice(0, 80) || 'Script vide'}
                  </p>
                  <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">
                    {wordCount(script.content)} mots · {formatDate(script.updatedAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
