import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useAudioCapture } from './useAudioCapture'

export function useSpeech() {
  const { settings, setIsListening, setIsSpeaking, setTranscript, setSpeechError } = useAppStore()
  const { startCapture, stopCapture } = useAudioCapture()
  const lastSpeechTimeRef = useRef<number>(Date.now())
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cleanupResultRef = useRef<(() => void) | null>(null)
  const activeRef = useRef(false)

  const start = useCallback(async () => {
    if (activeRef.current) return

    setSpeechError(null)

    // Check if a model is selected
    if (!settings.sttModelId) {
      setSpeechError("Aucun modèle sélectionné. Ouvrez Paramètres pour en télécharger un.")
      return
    }

    // Start STT engine in main process
    const result = await window.api.startStt({
      modelId: settings.sttModelId,
      language: settings.language
    })

    if (!result.success) {
      const error = result.error || "Impossible de démarrer la reconnaissance vocale."
      if (error.includes('non téléchargé') || error.includes('not found')) {
        setSpeechError("Modèle non téléchargé. Allez dans Paramètres → Moteur de reconnaissance.")
      } else {
        setSpeechError(error)
      }
      return
    }

    // Listen for STT results from main process
    cleanupResultRef.current = window.api.onSttResult((sttResult) => {
      lastSpeechTimeRef.current = Date.now()
      setIsSpeaking(true)
      setTranscript(sttResult.text)
    })

    // Start audio capture in renderer (sends PCM to main process)
    try {
      await startCapture()
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? "Accès au microphone refusé. Vérifiez les permissions dans Préférences Système → Confidentialité."
          : "Impossible d'accéder au microphone. Vérifiez qu'il est bien connecté."
      setSpeechError(msg)
      await window.api.stopStt()
      return
    }

    activeRef.current = true
    setIsListening(true)

    // Silence detection timer
    silenceTimerRef.current = setInterval(() => {
      if (Date.now() - lastSpeechTimeRef.current > settings.silenceThreshold) {
        setIsSpeaking(false)
      }
    }, 200)
  }, [settings.sttModelId, settings.language, settings.silenceThreshold, startCapture, setIsListening, setIsSpeaking, setTranscript, setSpeechError])

  const stop = useCallback(async () => {
    activeRef.current = false

    // Stop audio capture
    stopCapture()

    // Stop STT engine
    await window.api.stopStt()

    // Cleanup result listener
    if (cleanupResultRef.current) {
      cleanupResultRef.current()
      cleanupResultRef.current = null
    }

    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    setIsListening(false)
    setIsSpeaking(false)
  }, [stopCapture, setIsListening, setIsSpeaking])

  useEffect(() => {
    return () => {
      if (activeRef.current) {
        stopCapture()
        window.api.stopStt()
        if (cleanupResultRef.current) {
          cleanupResultRef.current()
        }
      }
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current)
      }
    }
  }, [stopCapture])

  return { start, stop }
}
