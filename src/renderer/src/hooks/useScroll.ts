import { useEffect, useRef, useCallback, useMemo } from 'react'
import Fuse from 'fuse.js'
import { useAppStore } from '../store/useAppStore'

const WINDOW_SIZE = 6

export function useScroll() {
  const { currentScript, transcript, status, currentPosition, setCurrentPosition } =
    useAppStore()
  const fuseRef = useRef<Fuse<{ text: string; index: number }> | null>(null)
  const lastMatchedRef = useRef(0)

  const words = useMemo(() => {
    if (!currentScript) return []
    return currentScript.content.split(/\s+/).filter(Boolean)
  }, [currentScript])

  // Build Fuse index when script changes
  useEffect(() => {
    if (words.length === 0) {
      fuseRef.current = null
      return
    }

    const windows: { text: string; index: number }[] = []
    const windowCount = Math.max(0, words.length - WINDOW_SIZE + 1)

    for (let i = 0; i < windowCount; i++) {
      windows.push({
        text: words.slice(i, i + WINDOW_SIZE).join(' '),
        index: i
      })
    }

    // For short scripts, add single-word and smaller windows
    if (words.length < WINDOW_SIZE) {
      windows.push({
        text: words.join(' '),
        index: 0
      })
    }

    fuseRef.current = new Fuse(windows, {
      keys: ['text'],
      threshold: 0.4,
      includeScore: true,
      distance: 100
    })

    lastMatchedRef.current = 0
  }, [words])

  // Match spoken words against script
  const matchPosition = useCallback(() => {
    if (!fuseRef.current || !transcript) return

    const spokenWords = transcript.trim().split(/\s+/)
    const query = spokenWords.slice(-WINDOW_SIZE).join(' ')
    if (query.length < 3) return

    const results = fuseRef.current.search(query)
    if (results.length === 0) return

    const best = results[0]
    if (best.score !== undefined && best.score < 0.5) {
      const newPos = best.item.index + WINDOW_SIZE - 1
      // Only move forward (or small backward for corrections)
      if (newPos >= currentPosition - 3) {
        const clampedPos = Math.min(newPos, words.length - 1)
        if (clampedPos !== lastMatchedRef.current) {
          lastMatchedRef.current = clampedPos
          setCurrentPosition(clampedPos)
        }
      }
    }
  }, [transcript, currentPosition, words.length, setCurrentPosition])

  // Run matching on every transcript change while playing.
  // No isSpeaking guard needed — the transcript only changes when the STT
  // engine emits a new result, so there is no risk of spurious scrolling.
  useEffect(() => {
    if (status === 'playing') {
      matchPosition()
    }
  }, [transcript, status, matchPosition])

  return {
    totalWords: words.length,
    words,
    progress: words.length > 0 ? Math.round((currentPosition / words.length) * 100) : 0
  }
}
