import type { AudioManifest, CharacterSheetConfig, GameConfig } from "../types/game";
import { seedAudioManifest, seedCharacters, seedGames } from "./seedLibrary";

const gameConfigModules = import.meta.glob("/public/games/*/game.config.json", {
  eager: true,
  query: "?raw",
  import: "default",
});

function normalizePublicPath(path: string) {
  return path.replace(/^\/public\//, "/").replace(/^public\//, "/").replace(/\\/g, "/");
}

function resolveFromBase(basePath: string, path?: string) {
  if (!path) return undefined;
  if (/^(https?:|data:|blob:|\/)/.test(path)) return normalizePublicPath(path);
  return `${basePath}/${path}`.replace(/\/{2,}/g, "/");
}

export function resolveGameAsset(game: GameConfig, path?: string) {
  if (!path) return undefined;
  if (/^(https?:|data:|blob:|\/)/.test(path)) return normalizePublicPath(path);
  return `${game.basePath ?? `/games/${game.id}`}/${path}`.replace(/\/{2,}/g, "/");
}

export function gameArt(game: GameConfig) {
  const hero = resolveGameAsset(game, game.assets?.hero ?? "assets/hero/internet.jpg");
  const generatedHero = resolveGameAsset(game, game.assets?.generatedHero ?? "assets/hero/generated.png");
  const cover = resolveGameAsset(game, game.assets?.cover ?? game.cover ?? `assets/cover/${game.id}.svg`);

  return `
    linear-gradient(rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.28)),
    url("${hero}"),
    url("${generatedHero}"),
    url("${cover}")
  `;
}

export function gameHeroVars(game: GameConfig) {
  return {
    "--active-game-art": `url("${resolveGameAsset(game, game.assets?.generatedHero ?? "assets/hero/generated.png")}")`,
    "--active-game-net-art": `url("${resolveGameAsset(game, game.assets?.hero ?? "assets/hero/internet.jpg")}")`,
    "--active-game-home-art": `url("${resolveGameAsset(game, game.assets?.homeHero ?? game.assets?.hero ?? "assets/hero/internet.jpg")}")`,
    "--active-game-preview-art": `url("${resolveGameAsset(game, game.assets?.worldPreview ?? game.assets?.hero ?? "assets/hero/internet.jpg")}")`,
    "--active-game-campaign-art": `url("${resolveGameAsset(game, game.campaigns[0]?.image ?? game.assets?.campaignImage ?? game.assets?.hero ?? "assets/hero/internet.jpg")}")`,
  };
}

export function contentThumbnail(game: GameConfig, category: "dlc" | "features" | "extras", itemId: string, itemThumbnail?: string) {
  const pattern = game.assets?.contentThumbs?.[category];
  const fromPattern = pattern?.replace("{id}", itemId).replace("{category}", category);
  return resolveGameAsset(game, itemThumbnail ?? fromPattern ?? `assets/content-thumbs/${category}/${itemId}.png`);
}

export function diceCatalog(game: GameConfig) {
  return resolveGameAsset(game, game.assets?.diceCatalog ?? "assets/dice/catalog.png") ?? `/games/${game.id}/assets/dice/catalog.png`;
}

export function characterSheetPath(game: GameConfig) {
  return resolveGameAsset(game, game.characterSheet ?? "characters/characters.json") ?? `/games/${game.id}/characters/characters.json`;
}

export function audioManifestPath(game: GameConfig) {
  return resolveGameAsset(game, game.manifests?.audio ?? "audio/audio.manifest.json") ?? `/games/${game.id}/audio/audio.manifest.json`;
}

export function normalizeGameConfig(game: GameConfig, configPath?: string): GameConfig {
  const id = game.id.trim();
  const basePath = configPath
    ? normalizePublicPath(configPath).replace(/\/game\.config\.json$/, "")
    : game.basePath ?? `/games/${id}`;

  return {
    ...game,
    id,
    basePath,
    configPath: configPath ? normalizePublicPath(configPath) : game.configPath ?? `${basePath}/game.config.json`,
    content: {
      dlc: game.content?.dlc ?? [],
      features: game.content?.features ?? [],
      extras: game.content?.extras ?? [],
    },
    campaigns: game.campaigns ?? [],
  };
}

export function loadBundledGames(): GameConfig[] {
  const games = Object.entries(gameConfigModules)
    .map(([path, raw]) => {
      try {
        return normalizeGameConfig(JSON.parse(String(raw)) as GameConfig, path);
      } catch (error) {
        console.warn("Invalid bundled game config:", path, error);
        return null;
      }
    })
    .filter((game): game is GameConfig => Boolean(game));

  return games.length ? games.sort((a, b) => a.name.localeCompare(b.name)) : seedGames;
}

export async function loadGameAudioManifest(game: GameConfig): Promise<AudioManifest> {
  try {
    const manifestPath = audioManifestPath(game);
    const response = await fetch(manifestPath);
    if (!response.ok) return seedAudioManifest;
    const manifest = (await response.json()) as AudioManifest;
    const audioBasePath = manifestPath.replace(/\/[^/]*$/, "");

    return {
      ...manifest,
      tracks: Object.fromEntries(
        Object.entries(manifest.tracks).map(([group, tracks]) => [
          group,
          tracks.map((track) => ({
            ...track,
            path: resolveFromBase(audioBasePath, track.path),
          })),
        ])
      ),
    };
  } catch (error) {
    console.warn("Using audio manifest fallback.", error);
    return seedAudioManifest;
  }
}

export async function loadGameCharacterSheet(game: GameConfig): Promise<CharacterSheetConfig> {
  try {
    const response = await fetch(characterSheetPath(game));
    if (!response.ok) return seedCharacters;
    return (await response.json()) as CharacterSheetConfig;
  } catch (error) {
    console.warn("Using character sheet fallback.", error);
    return seedCharacters;
  }
}
