import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, rmSync, readdirSync, statSync, renameSync } from 'fs'
import { spawn, exec } from 'child_process'
import type { SttModel, SttEngineType } from '../shared/types'

// Track active downloads
const activeDownloads = new Set<string>()

// ── Model catalog ──

interface ModelCatalogEntry {
  id: string
  engine: SttEngineType
  name: string
  description: string
  size: string
  sizeBytes: number
  url: string
  language: string
  extractedDir?: string
}

const MODELS_BASE_URL = 'https://noche.generale-ci.com/releases/models'

const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    id: 'sherpa-streaming-zipformer-fr',
    engine: 'sherpa',
    name: 'Sherpa Zipformer FR (streaming)',
    description: 'Modèle français streaming — reconnaissance en temps réel, mot à mot',
    size: '380 MB',
    sizeBytes: 398_444_115,
    url: `${MODELS_BASE_URL}/sherpa-onnx-streaming-zipformer-fr-2023-04-14.tar.bz2`,
    language: 'fr',
    extractedDir: 'sherpa-onnx-streaming-zipformer-fr-2023-04-14'
  },
  {
    id: 'sherpa-streaming-zipformer-en',
    engine: 'sherpa',
    name: 'Sherpa Zipformer EN (streaming)',
    description: 'Modèle anglais streaming — reconnaissance en temps réel, mot à mot',
    size: '296 MB',
    sizeBytes: 310_414_022,
    url: `${MODELS_BASE_URL}/sherpa-onnx-streaming-zipformer-en-2023-06-26.tar.bz2`,
    language: 'en',
    extractedDir: 'sherpa-onnx-streaming-zipformer-en-2023-06-26'
  },
  {
    id: 'whisper-tiny',
    engine: 'whisper',
    name: 'Whisper Tiny',
    description: 'Modèle OpenAI Whisper léger — rapide, multilingue',
    size: '74 MB',
    sizeBytes: 77_691_713,
    url: `${MODELS_BASE_URL}/ggml-tiny.bin`,
    language: 'multi'
  },
  {
    id: 'whisper-base',
    engine: 'whisper',
    name: 'Whisper Base',
    description: 'Modèle OpenAI Whisper équilibré — bonne qualité, multilingue',
    size: '141 MB',
    sizeBytes: 147_951_465,
    url: `${MODELS_BASE_URL}/ggml-base.bin`,
    language: 'multi'
  },
  {
    id: 'whisper-small',
    engine: 'whisper',
    name: 'Whisper Small',
    description: 'Modèle OpenAI Whisper précis — haute qualité, multilingue',
    size: '465 MB',
    sizeBytes: 487_601_967,
    url: `${MODELS_BASE_URL}/ggml-small.bin`,
    language: 'multi'
  }
]

// ── Helpers ──

export function getModelsDir(): string {
  const dir = join(app.getPath('userData'), 'models')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function getModelDir(modelId: string): string {
  return join(getModelsDir(), modelId)
}

function isModelDownloaded(modelId: string): boolean {
  const dir = getModelDir(modelId)
  if (!existsSync(dir)) return false
  try {
    return readdirSync(dir).length > 0
  } catch {
    return false
  }
}

export function isModelDownloading(modelId: string): boolean {
  return activeDownloads.has(modelId)
}

// ── Public API ──

export function listAvailableModels(): SttModel[] {
  return MODEL_CATALOG.map((m) => ({
    id: m.id,
    engine: m.engine,
    name: m.name,
    description: m.description,
    size: m.size,
    sizeBytes: m.sizeBytes,
    url: m.url,
    language: m.language,
    downloaded: isModelDownloaded(m.id)
  }))
}

export function getModelPath(modelId: string): string | null {
  if (!isModelDownloaded(modelId)) return null
  return getModelDir(modelId)
}

export function deleteModel(modelId: string): void {
  const dir = getModelDir(modelId)
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function getCatalogEntry(modelId: string): ModelCatalogEntry | undefined {
  return MODEL_CATALOG.find((m) => m.id === modelId)
}

// ── IDM-style multi-segment parallel download ──

const NUM_SEGMENTS = 6

interface HeadInfo {
  contentLength: number
  acceptRanges: boolean
}

/** HEAD request to get file size and check Range support.
 *  Uses the LAST content-length in the header chain to handle redirects
 *  (e.g. GitHub returns Content-Length: 0 in the 302, then the real size in the CDN 200).
 */
function curlHead(url: string): Promise<HeadInfo> {
  return new Promise((resolve, reject) => {
    let output = ''
    const curl = spawn('curl', ['-sI', '-L', '-o', '/dev/null', '-w', '%{size_download}', '-D', '-', url])
    curl.stdout.on('data', (d: Buffer) => { output += d.toString() })
    curl.on('close', (code) => {
      if (code !== 0) { reject(new Error(`curl HEAD exited with code ${code}`)); return }
      // Use LAST content-length to get the final redirect's real size
      // (GitHub 302 returns Content-Length: 0, CDN 200 returns the real size)
      const clMatches = [...output.matchAll(/content-length:\s*(\d+)/gi)]
      const lastCl = clMatches.length > 0 ? clMatches[clMatches.length - 1] : null
      const contentLength = lastCl ? parseInt(lastCl[1], 10) : 0
      const acceptRanges = /accept-ranges:\s*bytes/i.test(output)
      resolve({ contentLength, acceptRanges })
    })
    curl.on('error', reject)
  })
}

/** Download a single segment with curl --range */
function curlSegment(
  url: string,
  destFile: string,
  rangeStart: number,
  rangeEnd: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '-L', '-f', '-s',
      '--range', `${rangeStart}-${rangeEnd}`,
      '-o', destFile,
      url
    ])
    curl.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`curl segment exited with code ${code}`))
    })
    curl.on('error', reject)
  })
}

/** Simple single-stream fallback (no Range support) */
function curlSingle(url: string, destFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', ['-L', '-f', '-s', '-o', destFile, url])
    curl.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`curl exited with code ${code}`))
    })
    curl.on('error', reject)
  })
}

/** Concatenate segment files into the final file */
function consolidateSegments(segmentPaths: string[], destFile: string): Promise<void> {
  const args = segmentPaths.map((p) => `"${p}"`).join(' ')
  return new Promise((resolve, reject) => {
    exec(`cat ${args} > "${destFile}"`, (err) => {
      if (err) { reject(err); return }
      for (const p of segmentPaths) {
        try { rmSync(p, { force: true }) } catch { /* noop */ }
      }
      resolve()
    })
  })
}

/** Multi-segment parallel download with progress aggregation */
function curlDownload(
  url: string,
  destFile: string,
  expectedBytes: number,
  onProgress: (percent: number, downloadedBytes: number, totalBytes: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    ;(async () => {
      // 1. HEAD request to get real size and check Range support
      let totalBytes = expectedBytes
      let supportsRange = false
      try {
        const head = await curlHead(url)
        if (head.contentLength > 0) totalBytes = head.contentLength
        supportsRange = head.acceptRanges
      } catch {
        // If HEAD fails, fall through to single-stream
      }

      // 2. If file is small (<5MB) or server doesn't support Range, use single stream
      if (!supportsRange || totalBytes < 5_000_000) {
        const progressInterval = setInterval(() => {
          try {
            if (existsSync(destFile)) {
              const size = statSync(destFile).size
              const percent = totalBytes > 0 ? Math.min(99, Math.round((size / totalBytes) * 100)) : 0
              onProgress(percent, size, totalBytes)
            }
          } catch { /* noop */ }
        }, 500)

        try {
          await curlSingle(url, destFile)
          clearInterval(progressInterval)
          onProgress(100, totalBytes, totalBytes)
          resolve()
        } catch (err) {
          clearInterval(progressInterval)
          reject(err)
        }
        return
      }

      // 3. Split into segments
      const segmentSize = Math.ceil(totalBytes / NUM_SEGMENTS)
      const segments: { start: number; end: number; path: string }[] = []

      for (let i = 0; i < NUM_SEGMENTS; i++) {
        const start = i * segmentSize
        const end = Math.min(start + segmentSize - 1, totalBytes - 1)
        segments.push({ start, end, path: `${destFile}.part${i}` })
      }

      // 4. Poll all segment files for aggregate progress
      const progressInterval = setInterval(() => {
        try {
          let downloaded = 0
          for (const seg of segments) {
            try {
              if (existsSync(seg.path)) downloaded += statSync(seg.path).size
            } catch { /* noop */ }
          }
          const percent = Math.min(99, Math.round((downloaded / totalBytes) * 100))
          onProgress(percent, downloaded, totalBytes)
        } catch { /* noop */ }
      }, 400)

      // 5. Download all segments in parallel
      try {
        await Promise.all(
          segments.map((seg) => curlSegment(url, seg.path, seg.start, seg.end))
        )
      } catch (err) {
        clearInterval(progressInterval)
        for (const seg of segments) {
          try { rmSync(seg.path, { force: true }) } catch { /* noop */ }
        }
        reject(err)
        return
      }

      clearInterval(progressInterval)

      // 6. Consolidate segments into final file
      try {
        await consolidateSegments(
          segments.map((s) => s.path),
          destFile
        )
        onProgress(100, totalBytes, totalBytes)
        resolve()
      } catch (err) {
        reject(err)
      }
    })()
  })
}

export async function downloadModel(
  modelId: string,
  onProgress: (percent: number, downloadedBytes: number, totalBytes: number) => void
): Promise<void> {
  const entry = getCatalogEntry(modelId)
  if (!entry) throw new Error(`Unknown model: ${modelId}`)

  if (isModelDownloaded(modelId)) return
  if (activeDownloads.has(modelId)) return

  const modelDir = getModelDir(modelId)

  // Clean up from a previous failed download
  if (existsSync(modelDir)) {
    rmSync(modelDir, { recursive: true, force: true })
  }

  mkdirSync(modelDir, { recursive: true })
  activeDownloads.add(modelId)

  const url = entry.url

  try {
    if (entry.engine === 'whisper') {
      // Whisper: single .bin file → download directly into modelDir
      const destFile = join(modelDir, `${modelId}.bin`)
      await curlDownload(url, destFile, entry.sizeBytes, onProgress)
    } else if (url.endsWith('.tar.bz2')) {
      // Sherpa: tar.bz2 → download to temp, extract, rename
      const tmpFile = join(getModelsDir(), `${modelId}.tar.bz2`)

      await curlDownload(url, tmpFile, entry.sizeBytes, onProgress)

      // Extract + rename (progress stays at 100% during extraction)
      await new Promise<void>((resolve, reject) => {
        exec(`tar xjf "${tmpFile}" -C "${getModelsDir()}"`, (err) => {
          try { rmSync(tmpFile, { force: true }) } catch { /* noop */ }

          if (err) {
            reject(new Error(`Extraction failed: ${err.message}`))
            return
          }

          // Rename extracted dir to modelDir
          if (entry.extractedDir) {
            const extracted = join(getModelsDir(), entry.extractedDir)
            try {
              if (existsSync(extracted) && extracted !== modelDir) {
                rmSync(modelDir, { recursive: true, force: true })
                renameSync(extracted, modelDir)
              }
            } catch (renameErr) {
              reject(new Error(`Rename failed: ${(renameErr as Error).message}`))
              return
            }
          }

          // Verify the model directory has files
          if (!isModelDownloaded(modelId)) {
            reject(new Error('Extraction succeeded but model directory is empty'))
            return
          }

          resolve()
        })
      })
    } else if (url.endsWith('.zip')) {
      // ZIP: download to temp, extract
      const tmpZip = join(getModelsDir(), `${modelId}.zip`)

      await curlDownload(url, tmpZip, entry.sizeBytes, onProgress)

      await new Promise<void>((resolve, reject) => {
        exec(`unzip -o "${tmpZip}" -d "${modelDir}"`, (err) => {
          try { rmSync(tmpZip, { force: true }) } catch { /* noop */ }
          if (err) {
            reject(new Error(`Extraction failed: ${err.message}`))
            return
          }
          resolve()
        })
      })
    } else {
      // Generic file
      const fileName = url.split('/').pop() || 'model'
      const destFile = join(modelDir, fileName)
      await curlDownload(url, destFile, entry.sizeBytes, onProgress)
    }
  } catch (err) {
    // Clean up on failure
    try { rmSync(modelDir, { recursive: true, force: true }) } catch { /* noop */ }
    activeDownloads.delete(modelId)
    throw err
  }

  activeDownloads.delete(modelId)
}
