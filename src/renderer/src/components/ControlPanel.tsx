import { useAppStore } from '../store/useAppStore'
import { useSpeech } from '../hooks/useSpeech'
import { useScroll } from '../hooks/useScroll'

export default function ControlPanel() {
  const { status, setStatus, setCurrentPosition, currentScript, isListening, isSpeaking } =
    useAppStore()
  const { start: startSpeech, stop: stopSpeech } = useSpeech()
  const { totalWords } = useScroll()

  const handlePlay = () => {
    if (!currentScript) return
    setStatus('playing')
    startSpeech()
  }

  const handlePause = () => {
    setStatus('paused')
    stopSpeech()
  }

  const handleStop = () => {
    setStatus('idle')
    setCurrentPosition(0)
    stopSpeech()
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
      {/* Status indicator */}
      <div className="flex items-center gap-2 flex-1">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            status === 'playing' && isSpeaking
              ? 'bg-green-400 animate-pulse'
              : status === 'playing'
                ? 'bg-green-400'
                : status === 'paused'
                  ? 'bg-yellow-400'
                  : 'bg-white/20'
          }`}
        />
        <span className="text-sm text-[var(--color-text-muted)]">
          {status === 'playing' && isSpeaking
            ? 'En lecture...'
            : status === 'playing'
              ? 'En attente de voix...'
              : status === 'paused'
                ? 'En pause'
                : 'Prêt'}
        </span>
        {isListening && (
          <span className="text-xs text-indigo-400 ml-2">Micro actif</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {status === 'idle' ? (
          <button
            onClick={handlePlay}
            disabled={!currentScript}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Démarrer
          </button>
        ) : (
          <>
            {status === 'playing' ? (
              <button
                onClick={handlePause}
                className="px-4 py-2 text-sm bg-yellow-600 hover:bg-yellow-500 rounded-lg transition-colors"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                Reprendre
              </button>
            )}
            <button
              onClick={handleStop}
              className="px-4 py-2 text-sm bg-red-600/80 hover:bg-red-500 rounded-lg transition-colors"
            >
              Stop
            </button>
          </>
        )}
      </div>

      {/* Word count */}
      {currentScript && (
        <span className="text-xs text-[var(--color-text-muted)]">{totalWords} mots</span>
      )}
    </div>
  )
}
