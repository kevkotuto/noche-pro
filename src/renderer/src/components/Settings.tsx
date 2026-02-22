import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { SttModel, SttEngineType, PrompterMode } from '../../../shared/types'

type Theme = 'light' | 'dark' | 'system'
type Tab = 'display' | 'engine' | 'voice' | 'general'

interface Microphone {
  deviceId: string
  label: string
}

interface DownloadState {
  [modelId: string]: number
}

/* ── Shared atoms ── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] font-medium text-[var(--color-text)]">{children}</span>
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange
}: {
  label: string
  value: number
  display: string
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[12px] text-[var(--color-text-muted)] tabular-nums font-medium">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  )
}

function StyledSelect({
  value,
  onChange,
  children
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[13px] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors cursor-pointer"
    >
      {children}
    </select>
  )
}

/* ── Tab icons ── */
const TAB_ICONS: Record<Tab, React.ReactNode> = {
  display: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  engine: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ),
  voice: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  ),
  general: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'display', label: 'Affichage' },
  { id: 'engine', label: 'Moteur' },
  { id: 'voice', label: 'Voix' },
  { id: 'general', label: 'Général' }
]

/* ── Main component ── */
export default function Settings() {
  const { settings, updateSettings, theme, setTheme } = useAppStore()
  const [activeTab, setActiveTab] = useState<Tab>('display')
  const [microphones, setMicrophones] = useState<Microphone[]>([])
  const [loadingMics, setLoadingMics] = useState(false)
  const [models, setModels] = useState<SttModel[]>([])
  const [downloadProgress, setDownloadProgress] = useState<DownloadState>({})
  const [loadingModels, setLoadingModels] = useState(false)

  useEffect(() => {
    loadMicrophones()
    loadModels()
  }, [])

  useEffect(() => {
    const cleanup = window.api.onDownloadProgress((progress) => {
      setDownloadProgress((prev) => ({ ...prev, [progress.modelId]: progress.percent }))
    })
    return cleanup
  }, [])

  const loadMicrophones = async () => {
    setLoadingMics(true)
    try {
      const mics = await window.api.getMicrophones()
      setMicrophones(mics || [])
    } catch {
      setMicrophones([])
    }
    setLoadingMics(false)
  }

  const loadModels = useCallback(async () => {
    setLoadingModels(true)
    try {
      const list = (await window.api.listSttModels()) as SttModel[]
      setModels(list || [])
    } catch {
      setModels([])
    }
    setLoadingModels(false)
  }, [])

  const handleDownloadModel = async (modelId: string) => {
    setDownloadProgress((prev) => ({ ...prev, [modelId]: 0 }))
    const result = await window.api.downloadSttModel(modelId)
    if (result.success) await loadModels()
    setDownloadProgress((prev) => {
      const next = { ...prev }
      delete next[modelId]
      return next
    })
  }

  const handleDeleteModel = async (modelId: string) => {
    await window.api.deleteSttModel(modelId)
    await loadModels()
    if (settings.sttModelId === modelId) updateSettings({ sttModelId: '' })
  }

  const filteredModels = models.filter((m) => m.engine === settings.sttEngine)

  return (
    <div className="flex h-full min-h-0">
      {/* ── Tab sidebar ── */}
      <div className="w-[140px] shrink-0 flex flex-col gap-0.5 p-3 border-r border-[var(--color-border)]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 text-left w-full cursor-pointer ${
                isActive
                  ? 'bg-[var(--color-surface-hover)] text-[var(--color-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]/50'
              }`}
            >
              <span className={isActive ? 'text-[var(--color-primary)]' : 'opacity-70'}>
                {TAB_ICONS[tab.id]}
              </span>
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 min-w-0">

        {/* ── DISPLAY TAB ── */}
        {activeTab === 'display' && (
          <div className="flex flex-col gap-5">
            {/* Style d'affichage */}
            <div className="flex flex-col gap-2.5">
              <FieldLabel>Style d'affichage</FieldLabel>
              <div className="flex gap-2">
                {(
                  [
                    { value: 'notch', label: 'Encoche', desc: 'Intégré en haut' },
                    { value: 'floating', label: 'Flottante', desc: 'Fenêtre libre' }
                  ] as { value: 'notch' | 'floating'; label: string; desc: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings({ displayMode: opt.value })}
                    className={`flex-1 flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border transition-all duration-150 text-left cursor-pointer ${
                      settings.displayMode === opt.value
                        ? 'bg-[var(--color-primary)]/8 border-[var(--color-primary)]/40'
                        : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-text-muted)]/40'
                    }`}
                  >
                    <span
                      className={`text-[13px] font-medium ${
                        settings.displayMode === opt.value
                          ? 'text-[var(--color-primary)]'
                          : 'text-[var(--color-text)]'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)] leading-tight">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-[var(--color-border)] my-1" />

            {/* Mode selector */}
            <div className="flex flex-col gap-2.5">
              <FieldLabel>Mode de défilement</FieldLabel>
              <div className="flex gap-2">
                {(
                  [
                    { value: 'autoscroll' as PrompterMode, label: 'Auto', desc: 'Vitesse constante' },
                    { value: 'voice' as PrompterMode, label: 'Voix', desc: 'Suit votre voix' }
                  ] as { value: PrompterMode; label: string; desc: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateSettings({ prompterMode: opt.value })}
                    className={`flex-1 flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border transition-all duration-150 text-left cursor-pointer ${
                      settings.prompterMode === opt.value
                        ? 'bg-[var(--color-primary)]/8 border-[var(--color-primary)]/40'
                        : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-text-muted)]/40'
                    }`}
                  >
                    <span
                      className={`text-[13px] font-medium ${
                        settings.prompterMode === opt.value
                          ? 'text-[var(--color-primary)]'
                          : 'text-[var(--color-text)]'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="text-[11px] text-[var(--color-text-muted)] leading-tight">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            <SliderRow
              label="Taille de police"
              value={settings.fontSize}
              display={`${settings.fontSize}px`}
              min={12}
              max={32}
              onChange={(v) => updateSettings({ fontSize: v })}
            />
            <SliderRow
              label="Opacité"
              value={Math.round(settings.prompterOpacity * 100)}
              display={`${Math.round(settings.prompterOpacity * 100)}%`}
              min={30}
              max={100}
              onChange={(v) => updateSettings({ prompterOpacity: v / 100 })}
            />
            <SliderRow
              label="Largeur"
              value={settings.prompterWidth}
              display={`${settings.prompterWidth}px`}
              min={300}
              max={800}
              step={10}
              onChange={(v) => {
                updateSettings({ prompterWidth: v })
                window.api.resizePrompter({ width: v, height: settings.prompterHeight })
              }}
            />
            <SliderRow
              label="Hauteur"
              value={settings.prompterHeight}
              display={`${settings.prompterHeight}px`}
              min={80}
              max={400}
              step={8}
              onChange={(v) => {
                updateSettings({ prompterHeight: v })
                window.api.resizePrompter({ width: settings.prompterWidth, height: v })
              }}
            />

            {/* Text color */}
            <div className="flex items-center justify-between">
              <FieldLabel>Couleur du texte</FieldLabel>
              <div className="flex items-center gap-2.5">
                <span className="text-[12px] text-[var(--color-text-muted)] font-mono uppercase">
                  {settings.textColor}
                </span>
                <div
                  className="relative w-8 h-8 rounded-lg border border-[var(--color-border)] overflow-hidden cursor-pointer"
                  style={{ backgroundColor: settings.textColor }}
                >
                  <input
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => updateSettings({ textColor: e.target.value })}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ENGINE TAB ── */}
        {activeTab === 'engine' && (
          <div className="flex flex-col gap-5">
            {settings.prompterMode !== 'voice' && (
              <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-[12px] text-amber-600 leading-relaxed">
                  Activez le mode <strong>Voix</strong> dans l'onglet Affichage pour utiliser la reconnaissance.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <FieldLabel>Moteur</FieldLabel>
              <StyledSelect
                value={settings.sttEngine}
                onChange={(v) => updateSettings({ sttEngine: v as SttEngineType, sttModelId: '' })}
              >
                <option value="sherpa">Sherpa-ONNX (streaming temps réel)</option>
                <option value="whisper">Whisper (haute précision)</option>
              </StyledSelect>
            </div>

            {/* Models */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <FieldLabel>Modèles</FieldLabel>
                {loadingModels && (
                  <span className="text-[11px] text-[var(--color-text-muted)]">Chargement…</span>
                )}
              </div>

              {filteredModels.length === 0 && !loadingModels && (
                <p className="text-[12px] text-[var(--color-text-muted)] py-1">
                  Aucun modèle disponible pour ce moteur.
                </p>
              )}

              <div className="flex flex-col gap-2">
                {filteredModels.map((model) => {
                  const isDownloading = downloadProgress[model.id] !== undefined
                  const isSelected = settings.sttModelId === model.id
                  const percent = downloadProgress[model.id] ?? 0

                  return (
                    <div
                      key={model.id}
                      onClick={() => { if (model.downloaded) updateSettings({ sttModelId: model.id }) }}
                      className={`relative p-3.5 rounded-xl border transition-all duration-150 ${
                        isSelected
                          ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5'
                          : model.downloaded
                          ? 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-text-muted)]/40 cursor-pointer'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-medium">{model.name}</span>
                            <span className="text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface-hover)] px-1.5 py-0.5 rounded-md tabular-nums">
                              {model.size}
                            </span>
                            {isSelected && model.downloaded && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-semibold tracking-wide">
                                ACTIF
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
                            {model.description}
                          </p>
                        </div>

                        <div className="shrink-0">
                          {model.downloaded ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteModel(model.id) }}
                              title="Supprimer"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all duration-150 cursor-pointer"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          ) : isDownloading ? (
                            <span className="text-[12px] text-[var(--color-primary)] tabular-nums font-semibold min-w-[36px] text-right">
                              {percent}%
                            </span>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownloadModel(model.id) }}
                              className="text-[12px] px-3 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white transition-colors font-medium cursor-pointer"
                            >
                              Télécharger
                            </button>
                          )}
                        </div>
                      </div>

                      {isDownloading && (
                        <div className="mt-3 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── VOICE TAB ── */}
        {activeTab === 'voice' && (
          <div className="flex flex-col gap-5">
            <SliderRow
              label="Seuil de silence"
              value={settings.silenceThreshold}
              display={`${(settings.silenceThreshold / 1000).toFixed(1)}s`}
              min={500}
              max={5000}
              step={100}
              onChange={(v) => updateSettings({ silenceThreshold: v })}
            />

            <div className="flex flex-col gap-2">
              <FieldLabel>Langue</FieldLabel>
              <StyledSelect
                value={settings.language}
                onChange={(v) => updateSettings({ language: v })}
              >
                <option value="fr-FR">Français</option>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Español</option>
                <option value="de-DE">Deutsch</option>
                <option value="it-IT">Italiano</option>
                <option value="pt-BR">Português (BR)</option>
                <option value="ar-SA">العربية</option>
              </StyledSelect>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <FieldLabel>Microphone</FieldLabel>
                <button
                  onClick={loadMicrophones}
                  className="text-[12px] text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium transition-colors cursor-pointer"
                >
                  Actualiser
                </button>
              </div>
              {loadingMics ? (
                <div className="px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[13px] text-[var(--color-text-muted)]">
                  Chargement…
                </div>
              ) : (
                <StyledSelect
                  value={settings.selectedMicrophone}
                  onChange={(v) => updateSettings({ selectedMicrophone: v })}
                >
                  <option value="default">Microphone par défaut</option>
                  {microphones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label}
                    </option>
                  ))}
                </StyledSelect>
              )}
            </div>
          </div>
        )}

        {/* ── GENERAL TAB ── */}
        {activeTab === 'general' && (
          <div className="flex flex-col gap-5">
            <SliderRow
              label="Vitesse de défilement"
              value={settings.scrollSpeed}
              display={`${settings.scrollSpeed} mots/min`}
              min={50}
              max={300}
              onChange={(v) => updateSettings({ scrollSpeed: v })}
            />

            <div className="flex flex-col gap-2.5">
              <FieldLabel>Thème</FieldLabel>
              <div className="flex gap-2">
                {(
                  [
                    { value: 'light' as Theme, label: 'Clair' },
                    { value: 'dark' as Theme, label: 'Sombre' },
                    { value: 'system' as Theme, label: 'Système' }
                  ] as { value: Theme; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex-1 px-3 py-2.5 text-[13px] font-medium rounded-lg border transition-all duration-150 cursor-pointer ${
                      theme === opt.value
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-text-muted)]/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Keyboard shortcuts */}
            <div className="flex flex-col gap-2.5">
              <FieldLabel>Raccourcis clavier</FieldLabel>
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 flex flex-col gap-2">
                {[
                  ['Espace', 'Play / Pause / Reprendre'],
                  ['Échap', 'Arrêter'],
                  ['R', 'Redémarrer'],
                  ['⌘ ]', 'Police +'],
                  ['⌘ [', 'Police −'],
                  ['↑ / +', 'Vitesse +'],
                  ['↓ / −', 'Vitesse −']
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--color-text-muted)]">{desc}</span>
                    <kbd className="text-[11px] px-2 py-0.5 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)] font-mono">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
