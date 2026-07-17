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

## Roadmap de cierre

La lista completa de pendientes de producto vive en:

- `docs/PLATFORM_COMPLETION_ROADMAP.md`
- `public/platform/completion-roadmap.json`

El roadmap cubre responsive, backend, seguridad, administrador de juegos, mapas, noticias, notificaciones, usuarios, soporte, chat cloud, configuracion, Fallout 4/tomos, juegos nuevos, guardados, dashboards, mobile, pruebas y limpieza tecnica.

Para validar que el inventario no pierda ningun modulo critico:

```bash
npm run test:roadmap
```

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
npm run backend:local
npm run tauri:dev
npm run tauri:build
```

## Ambiente local completo

Para trabajar sin simular cloud, levanta el backend local y el frontend:

```bash
npm run backend:local
npm run dev
```

El flujo local, permisos, backups y validaciones estan documentados en:

- `docs/local-development.md`

Validacion recomendada:

```bash
npm run test:backend
npm run test:security
npm run test:critical
npm run build
```

Para móvil, después de configurar Android Studio/Xcode:

```bash
npm run tauri:android
npm run tauri:ios
```

## Nota importante

La app ya tiene fallback visual y datos de Fallout 3 para iniciar aunque no hayas seleccionado una carpeta todavía.

La pantalla **Archivos** está preparada para seleccionar la carpeta `games/` usando Tauri y cargar los JSON reales.
