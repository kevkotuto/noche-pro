import { useState } from 'react'
import Editor from './components/Editor'
import Settings from './components/Settings'
import ControlPanel from './components/ControlPanel'
import Prompter from './components/Prompter'

// Détecter si on est dans la fenêtre prompteur (via hash)
const isPrompterWindow = window.location.hash === '#prompter'

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'editor' | 'settings'>('editor')

  if (isPrompterWindow) {
    return (
      <div className="h-screen w-screen" style={{ background: 'rgba(0, 0, 0, 0.85)' }}>
        <Prompter />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)]">
      {/* Title bar area */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h1 className="text-base font-bold tracking-tight">
          Noche<span className="text-indigo-400">Pro</span>
        </h1>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'editor'
                ? 'bg-indigo-600 text-white'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
            }`}
          >
            Script
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
            }`}
          >
            Paramètres
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden px-4 pb-2">
        {activeTab === 'editor' ? <Editor /> : <Settings />}
      </div>

      {/* Control panel */}
      <div className="px-4 pb-4">
        <ControlPanel />
      </div>
    </div>
  )
}

export default App
