import { useRef, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'

const SAMPLE_RATE = 16000

export function useAudioCapture() {
  const { settings } = useAppStore()
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCapture = useCallback(async () => {
    if (audioContextRef.current) return

    const constraints: MediaStreamConstraints = {
      audio:
        settings.selectedMicrophone !== 'default'
          ? { deviceId: { exact: settings.selectedMicrophone }, sampleRate: SAMPLE_RATE }
          : { sampleRate: SAMPLE_RATE }
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    streamRef.current = stream

    const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
    audioContextRef.current = audioContext

    const source = audioContext.createMediaStreamSource(stream)

    // Use ScriptProcessorNode to get raw PCM samples
    // Buffer size of 1024 = ~64ms at 16kHz (was 4096 = 256ms — 4x latency improvement)
    const processor = audioContext.createScriptProcessor(1024, 1, 1)
    processorRef.current = processor

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0)
      // Copy the Float32Array since it gets reused
      const samples = new Float32Array(inputData.length)
      samples.set(inputData)
      // Send to main process
      window.api.sendAudioChunk(samples.buffer)
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
  }, [settings.selectedMicrophone])

  const stopCapture = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  return { startCapture, stopCapture }
}
