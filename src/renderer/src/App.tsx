import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ContentArea from './components/ContentArea'
import ControlPanel from './components/ControlPanel'
import Settings from './components/Settings'
import Prompter from './components/Prompter'
import { useAppStore } from './store/useAppStore'

const isPrompterWindow = window.location.hash === '#prompter'

function App(): React.JSX.Element {
  const { init, initialized } = useAppStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (!isPrompterWindow) init()
  }, [init])

  if (isPrompterWindow) return <Prompter />

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] text-[var(--color-text-muted)]">Chargement…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)] animate-fade-in">
      {/* ── Title bar (draggable) ── */}
      <div className="drag-region h-[46px] flex items-center justify-between px-6 shrink-0">
        {/* macOS traffic-light spacer */}
        <div className="w-[72px] no-drag" />

        {/* Center: app name */}
        <span className="text-[13px] font-medium text-[var(--color-text-muted)] select-none pointer-events-none">
          NochePro
        </span>

        {/* Right: control panel */}
        <div className="no-drag">
          <ControlPanel />
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden border-t border-[var(--color-border)]">
        <Sidebar
          onOpenSettings={() => setSettingsOpen(true)}
          onEditScript={() => setIsEditing(true)}
        />
        <ContentArea isEditing={isEditing} setIsEditing={setIsEditing} />
      </div>

      {/* ── Settings modal ── */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/25 animate-modal-overlay backdrop-blur-[2px]"
            onClick={() => setSettingsOpen(false)}
          />
          <div className="relative bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] w-[620px] h-[500px] overflow-hidden animate-modal-panel flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-[18px] border-b border-[var(--color-border)] shrink-0">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Paramètres</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-all duration-150 cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal body (tabs + content) */}
            <div className="flex-1 min-h-0">
              <Settings />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
