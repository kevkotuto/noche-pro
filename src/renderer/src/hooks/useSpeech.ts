import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'

export function useSpeech() {
  const { settings, setIsListening, setIsSpeaking, setTranscript } = useAppStore()
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const lastSpeechTimeRef = useRef<number>(Date.now())
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = useCallback(() => {
    if (recognitionRef.current) return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.error('Web Speech API non supportée')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = settings.language

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      lastSpeechTimeRef.current = Date.now()
      setIsSpeaking(true)

      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ')
      setTranscript(transcript)
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        stop()
      }
    }

    recognition.onend = () => {
      // Auto-restart si on est toujours en écoute
      if (recognitionRef.current) {
        recognition.start()
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)

    // Timer de détection de silence
    silenceTimerRef.current = setInterval(() => {
      if (Date.now() - lastSpeechTimeRef.current > settings.silenceThreshold) {
        setIsSpeaking(false)
      }
    }, 200)
  }, [settings.language, settings.silenceThreshold, setIsListening, setIsSpeaking, setTranscript])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    setIsListening(false)
    setIsSpeaking(false)
  }, [setIsListening, setIsSpeaking])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return { start, stop }
}
