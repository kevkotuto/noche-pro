import { useAppStore } from '../store/useAppStore'

export default function Settings() {
  const { settings, updateSettings } = useAppStore()

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Paramètres</h2>

      {/* Vitesse de défilement */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-[var(--color-text-muted)]">
          Vitesse de défilement ({settings.scrollSpeed} mots/min)
        </label>
        <input
          type="range"
          min={50}
          max={300}
          value={settings.scrollSpeed}
          onChange={(e) => updateSettings({ scrollSpeed: Number(e.target.value) })}
          className="w-full accent-indigo-500"
        />
      </div>

      {/* Taille de la police */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-[var(--color-text-muted)]">
          Taille de police ({settings.fontSize}px)
        </label>
        <input
          type="range"
          min={12}
          max={32}
          value={settings.fontSize}
          onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
          className="w-full accent-indigo-500"
        />
      </div>

      {/* Couleur du texte */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-[var(--color-text-muted)] flex-1">Couleur du texte</label>
        <input
          type="color"
          value={settings.textColor}
          onChange={(e) => updateSettings({ textColor: e.target.value })}
          className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
        />
      </div>

      {/* Seuil de silence */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-[var(--color-text-muted)]">
          Seuil de silence ({settings.silenceThreshold}ms)
        </label>
        <input
          type="range"
          min={500}
          max={5000}
          step={100}
          value={settings.silenceThreshold}
          onChange={(e) => updateSettings({ silenceThreshold: Number(e.target.value) })}
          className="w-full accent-indigo-500"
        />
      </div>

      {/* Opacité du prompteur */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-[var(--color-text-muted)]">
          Opacité du prompteur ({Math.round(settings.prompterOpacity * 100)}%)
        </label>
        <input
          type="range"
          min={30}
          max={100}
          value={settings.prompterOpacity * 100}
          onChange={(e) => updateSettings({ prompterOpacity: Number(e.target.value) / 100 })}
          className="w-full accent-indigo-500"
        />
      </div>

      {/* Langue */}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-[var(--color-text-muted)]">Langue de reconnaissance</label>
        <select
          value={settings.language}
          onChange={(e) => updateSettings({ language: e.target.value })}
          className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="fr-FR">Français</option>
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="es-ES">Español</option>
          <option value="de-DE">Deutsch</option>
          <option value="it-IT">Italiano</option>
          <option value="pt-BR">Português (BR)</option>
          <option value="ar-SA">العربية</option>
        </select>
      </div>
    </div>
  )
}
