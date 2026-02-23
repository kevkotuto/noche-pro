# NochePro — Teleprompter vocal intelligent

> Teleprompter pilote par la voix, affiche dans l'encoche du MacBook (ou en fenetre flottante). Le texte defile automatiquement en synchronisation avec votre voix, sans connexion internet requise.

**Version actuelle : v0.1.0** — [Telecharger](https://noche.generale-ci.com) | [Site officiel](https://noche.generale-ci.com)

---

## Fonctionnalites

### Affichage
- **Fenetre notch** — S'integre dans l'encoche du MacBook, transparente, toujours au-dessus
- **Fenetre flottante** — Mode fenetre independante redimensionnable (Mac + Windows)
- **Dynamic Island** — Animations d'expansion/retraction fluides au lancement et a l'arret
- **Themes** — Clair, sombre, systeme. Couleurs de texte et fond entierement personnalisables
- **Opacite et dimensions** — Largeur, hauteur et opacite reglables depuis les parametres

### Reconnaissance vocale (100 % hors-ligne)
- **Sherpa-ONNX** — Moteur de transcription embarque, aucune donnee envoyee en ligne
  - Modeles Zipformer streaming pour le francais et d'autres langues
  - Telechargement des modeles directement depuis l'interface
- **Whisper** — Moteur alternatif (OpenAI Whisper via ONNX)
- **Web Speech API** — Option navigateur (necessite Internet, utilise les serveurs Google)

### Modes de defilement
- **Mode voix** — Fuzzy matching en temps reel entre la transcription et le script (Fuse.js). Le texte suit automatiquement votre elocution
- **Mode autoscroll** — Defilement a vitesse constante reglable (mots/minute)
- **Gestion des pauses** — Detection du silence configurable, pause et reprise automatiques

### Editeur de scripts
- Creation, edition et suppression de scripts directement dans l'app
- Import de fichiers `.txt` et `.md`
- Sauvegarde locale (JSON, aucun cloud requis)
- Barre laterale avec liste de scripts et recherche

### Parametres avances
- Choix du microphone
- Langue de reconnaissance vocale
- Seuil de silence (ms)
- Taille de police
- Vitesse de defilement
- Couleurs et opacite du teleprompter

### Mise a jour automatique
- Verification des mises a jour au demarrage (10 s apres lancement, uniquement si packagé)
- Bandeau de notification en cas de nouvelle version disponible
- Windows : telechargement et installation silencieuse
- macOS : redirection vers la page de telechargement

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Desktop | Electron 39 + electron-vite 5 |
| UI | React 19.2 + TailwindCSS 4.2 |
| STT offline | Sherpa-ONNX / Whisper ONNX |
| Fuzzy matching | Fuse.js |
| Etat global | Zustand 5 |
| Persistance | JsonStore (fs, CJS-compatible) |
| Build/distribution | electron-builder |
| CI/CD | GitHub Actions (Mac + Windows) |
| Auto-update | electron-updater |

---

## Structure du projet

```
noche-pro/
├── src/
│   ├── main/
│   │   ├── index.ts          # Fenetres Electron, IPC, JsonStore
│   │   ├── stt-engine.ts     # Moteurs STT (Sherpa, Whisper, WebSpeech)
│   │   ├── models.ts         # Telechargement et gestion des modeles STT
│   │   └── updater.ts        # Auto-update (electron-updater)
│   ├── preload/
│   │   ├── index.ts          # contextBridge + ipcRenderer
│   │   └── index.d.ts        # Types exposes au renderer
│   ├── renderer/src/
│   │   ├── components/
│   │   │   ├── Prompter.tsx       # Fenetre teleprompter
│   │   │   ├── Editor.tsx         # Editeur de script
│   │   │   ├── Settings.tsx       # Parametres (display/engine/voice/general)
│   │   │   ├── ControlPanel.tsx   # Play/pause/stop
│   │   │   ├── Sidebar.tsx        # Liste des scripts
│   │   │   ├── ContentArea.tsx    # Zone principale
│   │   │   └── UpdateBanner.tsx   # Bandeau mise a jour
│   │   ├── hooks/
│   │   │   ├── useSpeech.ts       # Detection voix
│   │   │   └── useScroll.ts       # Controle du scroll + fuzzy matching
│   │   ├── store/
│   │   │   └── useAppStore.ts     # Etat global Zustand
│   │   └── App.tsx
│   └── shared/
│       └── types.ts           # Types partages (Script, AppSettings, SttModel, etc.)
├── landing/
│   └── index.html             # Page web deployee sur noche.generale-ci.com
├── .github/workflows/
│   └── release.yml            # CI/CD : build Mac+Win + deploy SSH
├── electron-builder.yml
├── electron.vite.config.ts
└── package.json
```

---

## Installation (developpement)

> **Important** : L'app doit etre lancee depuis un terminal standard, pas depuis le terminal integre VS Code (`ELECTRON_RUN_AS_NODE=1` dans VS Code empeche le chargement d'Electron).

```bash
# Cloner le projet
git clone https://github.com/kevkotuto/noche-pro.git
cd noche-pro

# Installer les dependances
npm install

# Lancer en developpement
npm run dev
```

---

## Build

```bash
# macOS (DMG arm64 + x64)
npm run build:mac

# Windows (installeur NSIS x64)
npm run build:win

# Build generique
npm run build
```

Les artefacts sont produits dans `dist/`.

---

## Deploiement continu

Pousser sur la branche `production` declenche automatiquement GitHub Actions :

1. Build macOS (arm64 + x64) sur `macos-latest`
2. Build Windows (x64) sur `windows-latest`
3. Deploy SSH vers `https://noche.generale-ci.com/releases/`

```bash
git push origin main:production
```

---

## Notes

- **macOS** : L'app demande l'acces au microphone au premier lancement
- **Modeles STT** : Telechargez le modele depuis Parametres > Moteur de reconnaissance. Le modele est stocke localement et fonctionne entierement hors-ligne
- **Click-through** : La fenetre prompteur ne capte pas les clics souris — vous pouvez interagir avec le bureau en arriere-plan
- **Gatekeeper macOS** : L'app est signee et notariee, elle s'ouvre sans avertissement de securite

---

## Licence

MIT — Voir [LICENSE](LICENSE)
