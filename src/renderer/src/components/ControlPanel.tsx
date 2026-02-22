import { useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useSpeech } from '../hooks/useSpeech'
import { useScroll } from '../hooks/useScroll'

/**
 * Returns the delay multiplier for a given word based on its trailing punctuation
 * and the active language. Handles CJK full-width punctuation and French typography
 * (where ! and ? are often separate tokens: "Bonjour !").
 */
function getWordPauseMult(word: string, language: string): number {
  const lang = language.slice(0, 2).toLowerCase()

  // CJK: full-width sentence/clause punctuation
  if (lang === 'zh' || lang === 'ja' || lang === 'ko') {
    if (/[。！？…]+$/.test(word)) return 3
    if (/[、，；：]+$/.test(word)) return 1.5
    return 1
  }

  // French typography: ! ? ; : can appear as standalone tokens preceded by a space
  if (lang === 'fr') {
    if (/^[!?…]$/.test(word) || /[.!?…]+$/.test(word)) return 3
    if (/^[;:]$/.test(word) || /[,;:—]+$/.test(word)) return 1.5
    return 1
  }

  // Generic: English, Spanish, German, Italian, Portuguese, Arabic, etc.
  if (/[.!?…]+$/.test(word)) return 3
  if (/[,;:—]+$/.test(word)) return 1.5
  return 1
}

export default function ControlPanel() {
  const {
    status,
    setStatus,
    setCurrentPosition,
    setTranscript,
    currentScript,
    currentPosition,
    isListening,
    isSpeaking,
    settings,
    updateSettings,
    speechError,
    setSpeechError
  } = useAppStore()
  const { start: startSpeech, stop: stopSpeech } = useSpeech()
  const { totalWords, progress } = useScroll()
  const autoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isVoiceMode = settings.prompterMode === 'voice'

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearTimeout(autoScrollTimerRef.current)
      autoScrollTimerRef.current = null
    }
  }, [])

  // Variable-delay autoscroll: pauses longer at sentence-ending punctuation
  const scheduleNextWord = useCallback(() => {
    autoScrollTimerRef.current = null
    const state = useAppStore.getState()
    if (state.status !== 'playing') return
    const content = state.currentScript?.content || ''
    const ws = content.split(/\s+/).filter(Boolean)
    const pos = state.currentPosition
    if (pos >= ws.length - 1) return

    const baseMs = 60000 / state.settings.scrollSpeed
    const word = ws[pos]

    // Extra-long pause at paragraph boundaries (last word before \n\n)
    let isParaEnd = false
    {
      let wIdx = 0
      for (const para of content.split(/\n\n+/)) {
        const pLen = para.split(/\s+/).filter(Boolean).length
        wIdx += pLen
        if (wIdx - 1 === pos) { isParaEnd = true; break }
      }
    }
    const mult = isParaEnd ? 5 : getWordPauseMult(word, state.settings.language)

    autoScrollTimerRef.current = setTimeout(() => {
      const s = useAppStore.getState()
      if (s.status !== 'playing') return
      const freshWs = s.currentScript?.content.split(/\s+/).filter(Boolean) || []
      const next = s.currentPosition + 1
      if (next <= freshWs.length - 1) s.setCurrentPosition(next)
      scheduleNextWord()
    }, baseMs * mult)
  }, [])

  const startAutoScroll = useCallback(() => {
    stopAutoScroll()
    scheduleNextWord()
  }, [stopAutoScroll, scheduleNextWord])

  // Restart on speed change; stop dangling timer when switching to voice mode
  useEffect(() => {
    if (!isVoiceMode && status === 'playing') startAutoScroll()
    else if (isVoiceMode) stopAutoScroll()
  }, [settings.scrollSpeed, isVoiceMode, status, startAutoScroll, stopAutoScroll])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAutoScroll()
  }, [stopAutoScroll])

  const handlePlay = useCallback(() => {
    if (!currentScript) return

    const words = currentScript.content.split(/\s+/).filter(Boolean)

    // Reset position BEFORE updating status so the sync useEffect fires with 0,
    // not the leftover position from a previous session.
    setCurrentPosition(0)
    setStatus('playing')

    window.api.showPrompter()
    // Send island state BEFORE data: the prompter renderer must be in 'expanded'
    // mode when the words arrive, otherwise the hidden guard swallows the frame.
    window.api.setIslandState('expanded')

    if (isVoiceMode) {
      startSpeech()
    } else {
      startAutoScroll()
    }

    window.api.updatePrompter({
      words,
      currentPosition: 0,
      status: 'playing',
      isSpeaking: false,
      settings: useAppStore.getState().settings,
      islandState: 'expanded'
    })
  }, [currentScript, setStatus, setCurrentPosition, startSpeech, isVoiceMode, startAutoScroll])

  const handlePause = useCallback(() => {
    setStatus('paused')
    if (isVoiceMode) {
      stopSpeech()
    } else {
      stopAutoScroll()
    }
    window.api.setIslandState('compact')
  }, [setStatus, stopSpeech, isVoiceMode, stopAutoScroll])

  const handleStop = useCallback(() => {
    setStatus('idle')
    setCurrentPosition(0)
    setTranscript('')
    if (isVoiceMode) {
      stopSpeech()
    } else {
      stopAutoScroll()
    }
    window.api.setIslandState('compact')
    setTimeout(() => {
      window.api.setIslandState('hidden')
      setTimeout(() => {
        window.api.hidePrompter()
      }, 350)
    }, 200)
  }, [setStatus, setCurrentPosition, setTranscript, stopSpeech, isVoiceMode, stopAutoScroll])

  const handleResume = useCallback(() => {
    setStatus('playing')
    if (isVoiceMode) {
      startSpeech()
    } else {
      startAutoScroll()
    }
    window.api.setIslandState('expanded')
  }, [setStatus, startSpeech, isVoiceMode, startAutoScroll])

  const handleRestart = useCallback(() => {
    if (!currentScript) return
    setCurrentPosition(0)
    setTranscript('')
    if (isVoiceMode) {
      stopSpeech()
    } else {
      stopAutoScroll()
    }
    setTimeout(() => {
      setStatus('playing')
      if (isVoiceMode) {
        startSpeech()
      } else {
        startAutoScroll()
      }
      window.api.setIslandState('expanded')
      const words = currentScript.content.split(/\s+/).filter(Boolean)
      window.api.updatePrompter({
        words,
        currentPosition: 0,
        status: 'playing',
        isSpeaking: false,
        settings: useAppStore.getState().settings,
        islandState: 'expanded'
      })
    }, 100)
  }, [currentScript, setCurrentPosition, setTranscript, setStatus, startSpeech, stopSpeech, isVoiceMode, startAutoScroll, stopAutoScroll])

  // Update prompter on state changes
  useEffect(() => {
    if (status === 'idle' || !currentScript) return
    const words = currentScript.content.split(/\s+/).filter(Boolean)
    window.api.updatePrompter({
      words,
      currentPosition,
      status,
      isSpeaking,
      settings,
      islandState: status === 'playing' ? 'expanded' : 'compact'
    })
  }, [currentPosition, status, isSpeaking, currentScript, settings])

  // Listen for commands from prompter hover controls
  useEffect(() => {
    const cleanup = window.api.onPrompterCommand((cmd) => {
      switch (cmd) {
        case 'stop':
          handleStop()
          break
        case 'pause':
          handlePause()
          break
        case 'resume':
          handleResume()
          break
        case 'restart':
          handleRestart()
          break
      }
    })
    return cleanup
  }, [handleStop, handlePause, handleResume, handleRestart])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      const mod = e.metaKey || e.ctrlKey

      if (e.code === 'Space') {
        e.preventDefault()
        if (status === 'idle') handlePlay()
        else if (status === 'playing') handlePause()
        else if (status === 'paused') handleResume()
      }

      if (e.code === 'Escape' && status !== 'idle') {
        e.preventDefault()
        handleStop()
      }

      if (e.key === 'r' && !mod && status !== 'idle') {
        e.preventDefault()
        handleRestart()
      }

      if (!mod && (e.code === 'ArrowUp' || e.key === '+' || e.key === '=')) {
        e.preventDefault()
        updateSettings({ scrollSpeed: Math.min(300, settings.scrollSpeed + 10) })
      }
      if (!mod && (e.code === 'ArrowDown' || e.key === '-')) {
        e.preventDefault()
        updateSettings({ scrollSpeed: Math.max(50, settings.scrollSpeed - 10) })
      }

      if (mod && e.key === ']') {
        e.preventDefault()
        updateSettings({ fontSize: Math.min(32, settings.fontSize + 1) })
      }
      if (mod && e.key === '[') {
        e.preventDefault()
        updateSettings({ fontSize: Math.max(12, settings.fontSize - 1) })
      }

      if (mod && e.code === 'ArrowUp' && status !== 'idle') {
        e.preventDefault()
        setCurrentPosition(Math.max(0, currentPosition - 5))
      }
      if (mod && e.code === 'ArrowDown' && status !== 'idle') {
        e.preventDefault()
        setCurrentPosition(Math.min(totalWords - 1, currentPosition + 5))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    status,
    settings,
    currentPosition,
    totalWords,
    handlePlay,
    handlePause,
    handleStop,
    handleResume,
    handleRestart,
    updateSettings,
    setCurrentPosition
  ])

  return (
    <div className="flex items-center gap-3">
      {/* Speech error toast */}
      {speechError && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 max-w-[260px]">
          <span className="text-[10px] text-red-400 leading-tight">{speechError}</span>
          <button
            onClick={() => setSpeechError(null)}
            className="shrink-0 text-red-400/60 hover:text-red-400 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Status when playing */}
      {status !== 'idle' && (
        <div className="flex items-center gap-2.5">
          {/* Listening indicator (voice) or auto-scroll indicator */}
          {isVoiceMode && isListening ? (
            <div className="flex items-center gap-[3px]">
              <div className="w-[3px] h-2.5 bg-[var(--color-primary)] rounded-full animate-pulse-glow" />
              <div className="w-[3px] h-3.5 bg-[var(--color-primary)] rounded-full animate-pulse-glow" style={{ animationDelay: '0.15s' }} />
              <div className="w-[3px] h-2 bg-[var(--color-primary)] rounded-full animate-pulse-glow" style={{ animationDelay: '0.3s' }} />
            </div>
          ) : !isVoiceMode && status === 'playing' ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" className="animate-pulse">
              <polyline points="7 13 12 18 17 13" />
              <polyline points="7 6 12 11 17 6" />
            </svg>
          ) : null}
          {/* Progress */}
          {totalWords > 0 && (
            <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
              {progress}%
            </span>
          )}
        </div>
      )}

      {/* Mode toggle: voice / autoscroll */}
      {status === 'idle' && (
        <button
          onClick={() => updateSettings({
            prompterMode: isVoiceMode ? 'autoscroll' : 'voice'
          })}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-text-muted)]/60 transition-colors cursor-pointer"
          title={isVoiceMode ? 'Mode : Reconnaissance vocale' : 'Mode : Défilement auto'}
        >
          {isVoiceMode ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 13 12 18 17 13" />
              <polyline points="7 6 12 11 17 6" />
            </svg>
          )}
          <span className="text-[12px] font-medium text-[var(--color-text-muted)]">
            {isVoiceMode ? 'Voix' : 'Auto'}
          </span>
        </button>
      )}

      {/* Play / Pause / Stop buttons */}
      {status === 'idle' ? (
        <button
          onClick={handlePlay}
          disabled={!currentScript}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          title="Démarrer (Espace)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {status === 'playing' ? (
            <button
              onClick={handlePause}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-amber-500 text-white hover:bg-amber-400 transition-all duration-200"
              title="Pause (Espace)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all duration-200"
              title="Reprendre (Espace)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </button>
          )}
          <button
            onClick={handleStop}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-300 transition-all duration-200"
            title="Stop (Esc)"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
