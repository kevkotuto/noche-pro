import { useEffect, useRef, useCallback } from 'react'
import Fuse from 'fuse.js'
import { useAppStore } from '../store/useAppStore'

export function useScroll() {
  const { currentScript, transcript, isSpeaking, status, setCurrentPosition } = useAppStore()
  const wordsRef = useRef<string[]>([])
  const fuseRef = useRef<Fuse<{ text: string; index: number }> | null>(null)

  // Initialise l'index Fuse quand le script change
  useEffect(() => {
    if (!currentScript) {
      wordsRef.current = []
      fuseRef.current = null
      return
    }

    const words = currentScript.content.split(/\s+/).filter(Boolean)
    wordsRef.current = words

    // Créer des fenêtres glissantes de 6 mots pour le matching
    const windows = words.reduce<{ text: string; index: number }[]>((acc, _, i) => {
      if (i <= words.length - 6) {
        acc.push({
          text: words.slice(i, i + 6).join(' '),
          index: i
        })
      }
      return acc
    }, [])

    fuseRef.current = new Fuse(windows, {
      keys: ['text'],
      threshold: 0.4,
      includeScore: true
    })
  }, [currentScript])

  // Match les mots transcrits avec le script
  const matchPosition = useCallback(() => {
    if (!fuseRef.current || !transcript) return

    const spokenWords = transcript.trim().split(/\s+/).slice(-6).join(' ')
    if (spokenWords.length < 3) return

    const results = fuseRef.current.search(spokenWords)
    if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.5) {
      setCurrentPosition(results[0].item.index)
    }
  }, [transcript, setCurrentPosition])

  // Lancer le matching quand on reçoit du transcript pendant le play
  useEffect(() => {
    if (status === 'playing' && isSpeaking) {
      matchPosition()
    }
  }, [transcript, status, isSpeaking, matchPosition])

  return {
    totalWords: wordsRef.current.length
  }
}
