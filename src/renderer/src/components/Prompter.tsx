import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import type { PrompterData, DynamicIslandState } from '../../../shared/types'

export default function Prompter() {
  const [data, setData] = useState<PrompterData | null>(null)
  const [islandState, setIslandState] = useState<DynamicIslandState>('hidden')
  const [hovered, setHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeWordRef = useRef<HTMLSpanElement>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mark body as prompter window — fully transparent
  useEffect(() => {
    document.body.classList.add('prompter-window')
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'
  }, [])

  // Listen for data from main window
  useEffect(() => {
    const cleanupData = window.api.onPrompterData((raw) => {
      setData(raw as PrompterData)
    })
    const cleanupState = window.api.onIslandState((state) => {
      setIslandState(state as DynamicIslandState)
    })
    return () => {
      cleanupData()
      cleanupState()
    }
  }, [])

  // Smooth scroll to active word (vertical)
  const scrollToActive = useCallback(() => {
    if (!activeWordRef.current || !containerRef.current) return

    const container = containerRef.current
    const active = activeWordRef.current
    const containerRect = container.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()

    const targetScroll =
      active.offsetTop - containerRect.height * 0.35 + activeRect.height / 2

    container.scrollTo({
      top: Math.max(0, targetScroll),
      behavior: 'smooth'
    })
  }, [])

  useEffect(() => {
    scrollToActive()
  }, [data?.currentPosition, scrollToActive])

  // Hover controls
  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setHovered(true)
    if (data?.settings?.displayMode !== 'floating') {
      window.api.setPrompterInteractive()
    }
  }, [data?.settings?.displayMode])

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHovered(false)
      if (data?.settings?.displayMode !== 'floating') {
        window.api.setPrompterPassthrough()
      }
    }, 300)
  }, [data?.settings?.displayMode])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  // Sync interactive state when displayMode changes
  useEffect(() => {
    if (data?.settings?.displayMode === 'floating') {
      window.api.setPrompterInteractive()
    } else {
      if (!hovered) window.api.setPrompterPassthrough()
    }
  }, [data?.settings?.displayMode])

  // Parse words into sentence groups — language-aware punctuation detection
  const sentences = useMemo(() => {
    const ws = data?.words
    if (!ws?.length) return [] as number[][]
    const lang = (data?.settings?.language ?? 'en').slice(0, 2).toLowerCase()
    const isCJK = lang === 'zh' || lang === 'ja' || lang === 'ko'
    const isFr  = lang === 'fr'
    const groups: number[][] = []
    let cur: number[] = []
    ws.forEach((word, i) => {
      cur.push(i)
      const isSentEnd = isCJK
        ? /[。！？…]+$/.test(word)
        : (isFr && /^[!?…]$/.test(word)) || /[.!?…]+$/.test(word)
      if (isSentEnd || i === ws.length - 1) {
        groups.push([...cur])
        cur = []
      }
    })
    if (cur.length > 0) groups.push(cur)
    return groups
  }, [data?.words])

  // Map each word index → its sentence index for O(1) lookup
  const wordSentenceMap = useMemo((): number[] => {
    const total = sentences.reduce((acc, s) => acc + s.length, 0)
    if (!total) return []
    const map = new Array(total).fill(-1)
    sentences.forEach((sent, si) => sent.forEach(wi => { map[wi] = si }))
    return map
  }, [sentences])

  // ── Compact view (small pill: pause state or transition) ──
  if (islandState === 'compact') {
    return (
      <div className="h-screen w-screen flex items-start justify-center" style={{ background: 'transparent' }}>
        <div className="dynamic-island compact w-full h-full flex items-center justify-center animate-di-bounce-in">
          <div className="flex items-center gap-2.5 px-4">
            {/* Pulsing status dot */}
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-di-pulse" />
            <span className="text-white/80 text-xs font-medium">
              {data?.status === 'paused' ? 'En pause' : 'NochePro'}
            </span>
            {/* Mini progress */}
            {data && data.words.length > 0 && (
              <div className="h-1 w-12 bg-white/10 rounded-full overflow-hidden ml-1">
                <div
                  className="h-full bg-white/40 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((data.currentPosition / data.words.length) * 100)}%`
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Hidden / No data ──
  if (islandState === 'hidden' || !data || !data.words || data.words.length === 0) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ background: 'transparent' }}
      />
    )
  }

  // ── Expanded view (full Dynamic Island with word display) ──
  const { words, currentPosition, status, isSpeaking, settings } = data
  const currentSentenceIdx = wordSentenceMap[currentPosition] ?? -1

  // Language-aware sentence-end detection for the amber glow marker
  const activeLang = (settings.language ?? 'en').slice(0, 2).toLowerCase()
  const isActiveLangCJK = activeLang === 'zh' || activeLang === 'ja' || activeLang === 'ko'
  const isActiveLangFr  = activeLang === 'fr'
  const sentEndPattern  = isActiveLangCJK ? /[。！？…]+$/ : /[.!?…]+$/

  const isFloating = settings.displayMode === 'floating'

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`h-screen w-screen flex items-start justify-center ${isFloating ? 'p-2' : ''}`}
      style={{ background: 'transparent' }}
    >
      <div
        className={`w-full h-full relative overflow-hidden animate-di-fade-in flex flex-col ${
          isFloating
            ? 'rounded-3xl bg-[#1c1c1e]/85 backdrop-blur-2xl border border-white/10 shadow-2xl drag-region'
            : 'dynamic-island expanded bg-black'
        }`}
      >
        {!isFloating && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-indigo-500/30 blur-3xl rounded-[100%] pointer-events-none" />
        )}
        {/* Voice waveform bars (left side) */}
        {status === 'playing' && isSpeaking && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-[2px] z-10">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-[2px] h-3 bg-indigo-400/60 rounded-full origin-center"
                style={{
                  animation: 'wave-bar 0.8s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Word display */}
        <div
          ref={containerRef}
          className={`h-full overflow-hidden animate-di-content-enter flex-1 relative z-10 ${
            isFloating ? 'px-8 py-10' : 'px-8 pt-[42px] pb-5'
          }`}
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: isFloating ? '1.8' : '1.6',
            maskImage: isFloating
              ? 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
              : 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)',
            WebkitMaskImage: isFloating
              ? 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
              : 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)'
          }}
        >
          <div className={`flex flex-wrap items-baseline gap-x-[0.35em] gap-y-[0.2em] ${isFloating ? 'justify-center text-center' : 'justify-center text-center'}`}>
            {words.map((word, i) => {
              const isActive = i === currentPosition
              const isPast = i < currentPosition
              const wordSentIdx = wordSentenceMap[i] ?? -1
              const isCurrentSentence = currentSentenceIdx !== -1 && wordSentIdx === currentSentenceIdx
              const sentDist = (currentSentenceIdx !== -1 && wordSentIdx !== -1)
                ? Math.abs(wordSentIdx - currentSentenceIdx)
                : 1
              // Visual marker: active word at a sentence boundary gets a glow pulse
              const isSentenceEnd = isActive && (
                sentEndPattern.test(word) || (isActiveLangFr && /^[!?…]$/.test(word))
              )

              let wordOpacity: number
              let wordWeight: number
              if (isActive) {
                wordOpacity = 1
                wordWeight = 700
              } else if (isCurrentSentence) {
                // Whole current sentence lit up, fading slightly from active word
                const d = Math.abs(i - currentPosition)
                wordOpacity = Math.max(0.65, 0.88 - d * 0.04)
                wordWeight = 500
              } else if (isPast) {
                // Past sentences fade out progressively
                wordOpacity = Math.max(0.1, 0.3 - (sentDist - 1) * 0.08)
                wordWeight = 400
              } else {
                // Future sentences: visible but dimmer
                wordOpacity = Math.max(0.22, 0.55 - (sentDist - 1) * 0.08)
                wordWeight = 400
              }

              return (
                <span
                  key={i}
                  ref={isActive ? activeWordRef : undefined}
                  className={`di-word inline-block relative ${isActive && !isFloating ? 'di-word-active' : ''} ${isSentenceEnd ? 'di-word-sentence-end' : ''}`}
                  style={{
                    opacity: wordOpacity,
                    fontWeight: wordWeight,
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    color: settings.textColor || '#ffffff',
                    ...(isActive && isFloating ? { textShadow: '0 0 16px rgba(255,255,255,0.4)' } : {}),
                    ...(isActive && !isFloating ? { textShadow: '0 0 20px rgba(99,102,241,0.8)' } : {})
                  }}
                >
                  {word}
                </span>
              )
            })}
          </div>
        </div>

        {/* Specific controls for floating mode (Top Left and Top Right) */}
        {isFloating && (
          <div className={`absolute inset-x-0 top-0 px-4 py-3 flex items-start justify-between z-20 transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={() => window.api.sendPrompterCommand(status === 'playing' ? 'pause' : 'resume')}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all no-drag cursor-pointer"
            >
              {status === 'playing' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white" className="ml-0.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            <button
              onClick={() => window.api.sendPrompterCommand('stop')}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all no-drag cursor-pointer text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Start/Status indicator dot */}
        {!isFloating && (
          <div className="absolute right-3.5 top-3.5 z-20">
            <div
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                status === 'playing' && isSpeaking
                  ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'
                  : status === 'paused'
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,190,36,0.5)]'
                    : 'bg-white/20'
              }`}
            />
          </div>
        )}

        {/* Hover controls overlay (Notch mode only) */}
        {!isFloating && (
          <div
            className={`absolute inset-0 flex items-center justify-center gap-5 transition-all duration-300 z-30 ${
              hovered ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 pointer-events-none'
            }`}
            style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: 'inherit' }}
          >
            {/* Restart */}
            <button
              onClick={() => window.api.sendPrompterCommand('restart')}
              className="p-3 rounded-full bg-white/10 hover:bg-white/25 border border-white/5 transition-all outline-none"
              title="Recommencer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>

            {/* Pause / Resume */}
            <button
              onClick={() =>
                window.api.sendPrompterCommand(status === 'playing' ? 'pause' : 'resume')
              }
              className="p-4 rounded-full bg-indigo-500/80 hover:bg-indigo-500 border border-indigo-400/30 shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all outline-none"
              title={status === 'playing' ? 'Pause' : 'Reprendre'}
            >
              {status === 'playing' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="ml-0.5">
                  <path d="M6 4l14 8-14 8z" />
                </svg>
              )}
            </button>

            {/* Stop/Close */}
            <button
              onClick={() => window.api.sendPrompterCommand('stop')}
              className="p-3 rounded-full bg-white/10 hover:bg-red-500/80 border border-white/5 hover:border-red-400/30 transition-all outline-none"
              title="Fermer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
