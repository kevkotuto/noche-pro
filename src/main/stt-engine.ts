import { join } from 'path'
import { readdirSync } from 'fs'
import type { SttResult } from '../shared/types'

// ── Abstract STT Engine interface ──

export interface SttEngine {
  start(): void
  feedAudio(samples: Float32Array): void
  stop(): void
  destroy(): void
  onResult: ((result: SttResult) => void) | null
}

// ── Sherpa-ONNX streaming engine ──

export class SherpaEngine implements SttEngine {
  onResult: ((result: SttResult) => void) | null = null
  private recognizer: any = null
  private stream: any = null
  private lastText = ''

  constructor(private modelPath: string) {}

  start(): void {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OnlineRecognizer } = require('sherpa-onnx-node')

    // Find model files in the model directory
    const files = readdirSync(this.modelPath)
    const tokensFile = files.find((f: string) => f.includes('tokens'))
    const encoderFile = files.find((f: string) => f.includes('encoder'))
    const decoderFile = files.find((f: string) => f.includes('decoder'))
    const joinerFile = files.find((f: string) => f.includes('joiner'))

    if (!tokensFile || !encoderFile || !decoderFile || !joinerFile) {
      throw new Error(
        `Missing model files in ${this.modelPath}. Found: ${files.join(', ')}`
      )
    }

    this.recognizer = new OnlineRecognizer({
      modelConfig: {
        transducer: {
          encoder: join(this.modelPath, encoderFile),
          decoder: join(this.modelPath, decoderFile),
          joiner: join(this.modelPath, joinerFile)
        },
        tokens: join(this.modelPath, tokensFile),
        // 4 threads — faster per-chunk inference vs 2
        numThreads: 4,
        debug: false
      },
      featConfig: {
        sampleRate: 16000,
        featureDim: 80
      },
      decodingMethod: 'greedy_search',
      enableEndpoint: true,
      // Reduced from 2.4 / 1.2 / 20 — original values kept the stream open
      // too long after a pause, making results lag during read-aloud use.
      rule1MinTrailingSilence: 1.0,
      rule2MinTrailingSilence: 0.5,
      rule3MinUtteranceLength: 12
    })

    this.stream = this.recognizer.createStream()
    this.lastText = ''
  }

  feedAudio(samples: Float32Array): void {
    if (!this.recognizer || !this.stream) return

    this.stream.acceptWaveform({ samples, sampleRate: 16000 })

    while (this.recognizer.isReady(this.stream)) {
      this.recognizer.decode(this.stream)
    }

    const result = this.recognizer.getResult(this.stream)
    const text = (result.text || '').trim()

    if (text && text !== this.lastText) {
      this.lastText = text
      const isFinal = this.recognizer.isEndpoint(this.stream)
      this.onResult?.({ text, isFinal })

      if (isFinal) {
        this.recognizer.reset(this.stream)
        this.lastText = ''
      }
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.inputFinished()
      // Final decode
      if (this.recognizer) {
        while (this.recognizer.isReady(this.stream)) {
          this.recognizer.decode(this.stream)
        }
        const result = this.recognizer.getResult(this.stream)
        const text = (result.text || '').trim()
        if (text && text !== this.lastText) {
          this.onResult?.({ text, isFinal: true })
        }
      }
    }
  }

  destroy(): void {
    this.stream = null
    this.recognizer = null
    this.onResult = null
  }
}

// ── Whisper.cpp engine (batch processing) ──

export class WhisperEngine implements SttEngine {
  onResult: ((result: SttResult) => void) | null = null
  private whisper: any = null
  private audioBuffer: Float32Array[] = []
  private processTimer: ReturnType<typeof setInterval> | null = null
  private isProcessing = false
  private fullTranscript = ''

  constructor(
    private modelPath: string,
    private language: string = 'fr'
  ) {}

  start(): void {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const whisperModule = require('@fugood/whisper.node')

    // Find the .bin model file
    const files = readdirSync(this.modelPath)
    const binFile = files.find((f: string) => f.endsWith('.bin'))
    if (!binFile) {
      throw new Error(`No .bin model file found in ${this.modelPath}`)
    }

    const modelFile = join(this.modelPath, binFile)
    this.whisper = new whisperModule.Whisper(modelFile)
    this.audioBuffer = []
    this.fullTranscript = ''
    this.isProcessing = false

    // Process accumulated audio every 3 seconds
    this.processTimer = setInterval(() => {
      this.processAudio()
    }, 3000)
  }

  feedAudio(samples: Float32Array): void {
    if (!this.whisper) return
    this.audioBuffer.push(samples)
  }

  private async processAudio(): Promise<void> {
    if (this.isProcessing || !this.whisper || this.audioBuffer.length === 0) return

    this.isProcessing = true

    try {
      // Merge all buffered audio
      const totalLength = this.audioBuffer.reduce((acc, buf) => acc + buf.length, 0)
      if (totalLength < 4800) {
        // Less than 0.3s of audio at 16kHz, skip
        this.isProcessing = false
        return
      }

      const merged = new Float32Array(totalLength)
      let offset = 0
      for (const buf of this.audioBuffer) {
        merged.set(buf, offset)
        offset += buf.length
      }

      // Clear buffer after merging
      this.audioBuffer = []

      // Transcribe
      const result = await this.whisper.transcribe(merged, {
        language: this.language,
        n_threads: 2
      })

      const text = (result?.text || result || '').toString().trim()
      if (text) {
        this.fullTranscript += (this.fullTranscript ? ' ' : '') + text
        this.onResult?.({ text: this.fullTranscript, isFinal: false })
      }
    } catch (err) {
      console.error('Whisper transcription error:', err)
    }

    this.isProcessing = false
  }

  stop(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer)
      this.processTimer = null
    }
    // Process remaining audio
    this.processAudio()
  }

  destroy(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer)
      this.processTimer = null
    }
    this.whisper = null
    this.audioBuffer = []
    this.onResult = null
  }
}

// ── Factory ──

export function createEngine(
  engine: 'sherpa' | 'whisper',
  modelPath: string,
  language: string
): SttEngine {
  if (engine === 'sherpa') {
    return new SherpaEngine(modelPath)
  } else {
    return new WhisperEngine(modelPath, language)
  }
}
