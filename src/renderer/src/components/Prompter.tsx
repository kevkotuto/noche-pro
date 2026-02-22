import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'

export default function Prompter() {
  const { currentScript, currentPosition, status, isSpeaking, settings } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const words = currentScript?.content.split(/\s+/).filter(Boolean) ?? []

  useEffect(() => {
    if (!containerRef.current || status === 'idle') return

    const highlightedEl = containerRef.current.querySelector('[data-active="true"]')
    if (highlightedEl) {
      highlightedEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentPosition, status])

  if (!currentScript || words.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/50 text-sm">Aucun script chargé</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-hidden px-3 flex items-center"
      style={{
        fontSize: `${settings.fontSize}px`,
        color: settings.textColor
      }}
    >
      <p className="leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
        {words.map((word, i) => (
          <span
            key={i}
            data-active={i === currentPosition}
            className={`transition-colors duration-150 ${
              i === currentPosition
                ? 'text-white font-bold'
                : i < currentPosition
                  ? 'text-white/30'
                  : 'text-white/70'
            }`}
          >
            {word}{' '}
          </span>
        ))}
      </p>
      <div
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
          status === 'playing' && isSpeaking
            ? 'bg-green-400'
            : status === 'paused'
              ? 'bg-yellow-400'
              : 'bg-white/20'
        }`}
      />
    </div>
  )
}
