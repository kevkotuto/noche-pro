# NochePro

Teleprompter intelligent pilote par la voix. Affiche un script dans une fenetre flottante positionnee dans l'encoche du MacBook (ou en haut de l'ecran sous Windows). Le texte defile automatiquement en synchronisation avec la voix de l'utilisateur.

## Fonctionnalites

- **Fenetre flottante** — Positionnee dans l'encoche Mac / barre Windows, transparente, toujours au-dessus
- **Scroll pilote par la voix** — Transcription audio temps reel + fuzzy matching avec le script
- **Gestion des pauses** — Detection du silence, pause automatique, reprise a la voix
- **Editeur de scripts** — Import .txt/.md, editeur integre, sauvegarde locale
- **Parametres** — Vitesse, taille police, couleurs, sensibilite silence, choix micro, langue

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Desktop | Electron + electron-vite |
| UI | React + TailwindCSS |
| Speech-to-Text | Web Speech API (MVP) |
| Fuzzy matching | Fuse.js |
| Etat global | Zustand |
| Persistance | electron-store |
| Build | electron-builder |

## Structure du projet

```
noche-pro/
├── src/
│   ├── main/                  # Processus principal Electron
│   │   └── index.ts           # Creation des fenetres (main + prompteur)
│   ├── preload/               # Bridge securise
│   │   ├── index.ts
│   │   └── index.d.ts
│   ├── renderer/              # App React (UI)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Prompter.tsx      # Fenetre teleprompter
│   │   │   │   ├── Editor.tsx        # Editeur de script
│   │   │   │   ├── Settings.tsx      # Parametres
│   │   │   │   └── ControlPanel.tsx  # Play/pause/stop
│   │   │   ├── hooks/
│   │   │   │   ├── useSpeech.ts      # Detection voix
│   │   │   │   └── useScroll.ts      # Controle du scroll + fuzzy matching
│   │   │   ├── store/
│   │   │   │   └── useAppStore.ts    # Etat global Zustand
│   │   │   ├── types/
│   │   │   │   └── speech.d.ts       # Types Web Speech API
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   └── index.html
│   └── shared/                # Types partages main/renderer
│       └── types.ts
├── electron-builder.yml
├── electron.vite.config.ts
└── package.json
```

## Installation

```bash
# Cloner le projet
git clone <repo-url>
cd noche-pro

# Installer les dependances
npm install
```

## Developpement

```bash
npm run dev
```

## Build

```bash
# Build general
npm run build

# macOS (.dmg)
npm run build:mac

# Windows (.exe)
npm run build:win

# Linux (.AppImage, .deb, .snap)
npm run build:linux
```

## Notes

- **macOS** : L'app demande automatiquement l'acces au microphone au demarrage
- **Web Speech API** : Necessite une connexion internet (utilise les serveurs Google en arriere-plan)
- **Click-through** : La fenetre prompteur ne capte pas les clics souris (on peut interagir avec le bureau derriere)

## Licence

Prive
