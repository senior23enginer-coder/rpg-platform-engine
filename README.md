# RPG Platform Engine — Tauri 2 + React + Vite + TypeScript

Base reconstruida para una app real tipo launcher/editor RPG, con estética inspirada en las referencias Pip-Boy/terminal que compartiste.

## Stack

- Tauri 2
- React
- Vite
- TypeScript
- Plugins Tauri:
  - filesystem
  - dialog
  - store

## Objetivo

Esta versión está pensada para que la app pueda:

- abrirse como aplicación Windows, Android o iOS;
- leer carpetas reales con `games/`;
- cargar `game.config.json`;
- cargar reglas, misiones, bestiario, features, personajes y DLC;
- cargar manifiestos de audio;
- conservar UI web precisa con HTML/CSS/React;
- replicar el estilo visual de launcher/Pip-Boy de las imágenes de referencia.

## Estructura de juegos

```txt
public/games/fallout3/
  game.config.json
  rules/rules.json
  missions/missions.json
  bestiary/bestiary.json
  features/features.json
  characters/characters.json
  dlc/
  audio/audio.manifest.json
```

## Comandos

```bash
npm install
npm run dev
npm run tauri:dev
npm run tauri:build
```

Para móvil, después de configurar Android Studio/Xcode:

```bash
npm run tauri:android
npm run tauri:ios
```

## Nota importante

La app ya tiene fallback visual y datos de Fallout 3 para iniciar aunque no hayas seleccionado una carpeta todavía.

La pantalla **Archivos** está preparada para seleccionar la carpeta `games/` usando Tauri y cargar los JSON reales.
