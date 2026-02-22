import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { Script } from '../../../shared/types'

export default function Editor() {
  const { currentScript, scripts, setCurrentScript, addScript, updateScript, deleteScript } =
    useAppStore()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const handleNew = () => {
    setTitle('')
    setContent('')
    setIsEditing(true)
  }

  const handleSave = () => {
    if (!content.trim()) return

    if (currentScript && isEditing) {
      updateScript(currentScript.id, {
        title: title || 'Sans titre',
        content,
        updatedAt: Date.now()
      })
    } else {
      const newScript: Script = {
        id: crypto.randomUUID(),
        title: title || 'Sans titre',
        content,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      addScript(newScript)
      setCurrentScript(newScript)
    }
    setIsEditing(false)
  }

  const handleSelect = (script: Script) => {
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
  }

  const handleDelete = (id: string) => {
    deleteScript(id)
    if (currentScript?.id === id) {
      setTitle('')
      setContent('')
      setIsEditing(false)
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.md'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      setTitle(file.name.replace(/\.(txt|md)$/, ''))
      setContent(text)
      setIsEditing(true)
    }
    input.click()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold flex-1">Scripts</h2>
        <button
          onClick={handleNew}
          className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
        >
          Nouveau
        </button>
        <button
          onClick={handleImport}
          className="px-3 py-1.5 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg transition-colors"
        >
          Importer
        </button>
      </div>

      {isEditing ? (
        /* Editing view */
        <div className="flex flex-col flex-1 gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du script..."
            className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-indigo-500"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Collez votre script ici..."
            className="flex-1 w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm resize-none focus:outline-none focus:border-indigo-500 leading-relaxed"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              Sauvegarder
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        /* Script list */
        <div className="flex flex-col flex-1 gap-2 overflow-y-auto">
          {scripts.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-sm text-center py-8">
              Aucun script. Cliquez sur &quot;Nouveau&quot; pour commencer.
            </p>
          ) : (
            scripts.map((script) => (
              <div
                key={script.id}
                onClick={() => handleSelect(script)}
                className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                  currentScript?.id === script.id
                    ? 'bg-indigo-600/20 border-indigo-500/50'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{script.title}</span>
                  <div className="flex gap-1">
                    {currentScript?.id === script.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit()
                        }}
                        className="text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
                      >
                        Modifier
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(script.id)
                      }}
                      className="text-xs px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400"
                    >
                      Suppr.
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                  {script.content.slice(0, 100)}...
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
