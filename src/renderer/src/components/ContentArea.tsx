import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'

interface ContentAreaProps {
  isEditing: boolean
  setIsEditing: (v: boolean) => void
}

export default function ContentArea({ isEditing, setIsEditing }: ContentAreaProps) {
  const { currentScript, updateScript, status } = useAppStore()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (currentScript) {
      setTitle(currentScript.title)
      setContent(currentScript.content)
    } else {
      setTitle('')
      setContent('')
      setIsEditing(false)
    }
  }, [currentScript?.id])

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

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [isEditing])

  const handleEdit = () => {
    if (!currentScript || status !== 'idle') return
    setIsEditing(true)
  }

  const handleSave = () => {
    if (!content.trim() || !currentScript) return
    updateScript(currentScript.id, {
      title: title || 'Sans titre',
      content,
      updatedAt: Date.now()
    })
    setIsEditing(false)
  }

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

  /* ── Empty state ── */
  if (!currentScript) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-subtle)" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <line x1="16" x2="8" y1="13" y2="13" />
              <line x1="16" x2="8" y1="17" y2="17" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-[var(--color-text-muted)]">Aucun script sélectionné</p>
            <p className="text-[12px] text-[var(--color-text-subtle)]">Choisissez un script ou créez-en un nouveau</p>
          </div>
        </div>
      </div>
    )
  }

  /* ── Edit mode ── */
  if (isEditing) {
    return (
      <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
        {/* Edit header */}
        <div className="px-8 pt-6 pb-4 border-b border-[var(--color-border)]">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du script..."
            className="w-full text-[17px] font-semibold bg-transparent border-none outline-none placeholder:text-[var(--color-text-subtle)] tracking-[-0.02em]"
          />
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Collez ou tapez votre texte ici..."
          className="flex-1 w-full px-8 py-5 bg-transparent border-none outline-none text-[14px] leading-[1.85] resize-none min-h-0 placeholder:text-[var(--color-text-subtle)]"
          style={{ fontFamily: "'SF Mono', 'Menlo', 'Consolas', monospace" }}
        />

        {/* Bottom bar */}
        <div className="px-8 py-4 border-t border-[var(--color-border)] flex items-center gap-2.5">
          <button
            onClick={handleSave}
            className="px-4 py-2 text-[13px] font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] rounded-lg transition-colors cursor-pointer"
          >
            Terminé
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-lg transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--color-text-subtle)] tabular-nums">
              {wordCount(content)} mots
            </span>
            <span className="text-[11px] text-[var(--color-text-subtle)]">·</span>
            <span className="text-[11px] text-[var(--color-text-subtle)]">Sauvegarde auto</span>
          </div>
        </div>
      </div>
    )
  }

  /* ── View mode ── */
  return (
    <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
      {/* Content header */}
      <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-[var(--color-border)]">
        <h2 className="text-[17px] font-semibold truncate tracking-[-0.02em] pr-4">
          {currentScript.title || 'Sans titre'}
        </h2>
        {status === 'idle' && (
          <button
            onClick={handleEdit}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-all duration-150 cursor-pointer"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Modifier
          </button>
        )}
      </div>

      {/* Script text */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div
          className="text-[14px] leading-[1.9] text-[var(--color-text)] whitespace-pre-wrap max-w-[680px]"
          style={{ fontFamily: "'SF Mono', 'Menlo', 'Consolas', monospace", fontWeight: 400 }}
        >
          {currentScript.content || (
            <span className="text-[var(--color-text-subtle)] italic">Script vide</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-3 border-t border-[var(--color-border)] flex items-center gap-2">
        <span className="text-[11px] text-[var(--color-text-subtle)] tabular-nums">
          {wordCount(currentScript.content)} mots
        </span>
        {currentScript.content && (
          <>
            <span className="text-[11px] text-[var(--color-text-subtle)]">·</span>
            <span className="text-[11px] text-[var(--color-text-subtle)]">
              ~{Math.ceil(wordCount(currentScript.content) / 130)} min de lecture
            </span>
          </>
        )}
      </div>
    </div>
  )
}
