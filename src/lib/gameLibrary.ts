import type { AudioManifest, CharacterSheetConfig, GameConfig, GameJsonFile } from "../types/game";
import { seedAudioManifest, seedCharacters } from "./seedLibrary";

const gameConfigModules = import.meta.glob("/public/games/*/game.config.json", {
  eager: true,
  query: "?raw",
  import: "default",
});

const gameJsonModules = import.meta.glob(
  [
    "/public/games/**/*.json",
    "!/public/games/**/coverage/runtime-depth.json",
    "!/public/games/**/missions/mission-details.json",
    "!/public/games/**/missions/mission-polish.json",
    "!/public/games/**/locations/location-events.json",
    "!/public/games/**/runtime/playable-content.json",
    "!/public/games/**/runtime/playable-editor-index.json",
  ],
  {
    eager: true,
    query: "?raw",
    import: "default",
  }
);

const gameModuleConfigModules = import.meta.glob(
  "/public/games/*/{dlc,features,extras,campaigns}/*/config.json",
  {
    eager: true,
    query: "?raw",
    import: "default",
  }
);

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

type FolderModule = {
  gameId: string;
  category: "dlc" | "features" | "extras" | "campaigns";
  moduleId: string;
  configPath: string;
  basePath: string;
  payload: unknown;
};

function loadFolderModules(): FolderModule[] {
  return Object.entries(gameModuleConfigModules)
    .map(([path, raw]) => {
      const normalizedPath = normalizePublicPath(path);
      const match = normalizedPath.match(/^\/games\/([^/]+)\/(dlc|features|extras|campaigns)\/([^/]+)\/config\.json$/);
      if (!match) return null;
      try {
        const [, gameId, category, moduleId] = match;
        return {
          gameId,
          category: category as FolderModule["category"],
          moduleId,
          configPath: normalizedPath,
          basePath: normalizedPath.replace(/\/config\.json$/, ""),
          payload: JSON.parse(String(raw)),
        };
      } catch (error) {
        console.warn("Invalid module config:", normalizedPath, error);
        return null;
      }
    })
    .filter((module): module is FolderModule => Boolean(module));
}

function itemFromFolderModule(module: FolderModule) {
  const payload = module.payload as Partial<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    thumbnail: string;
    assets: { thumbnail?: string; hero?: string; gallery?: string[] };
  }>;

  return {
    ...payload,
    id: payload.id ?? module.moduleId,
    name: payload.name ?? module.moduleId,
    description: payload.description,
    enabled: payload.enabled ?? false,
    thumbnail: payload.thumbnail ?? payload.assets?.thumbnail,
    configPath: module.configPath,
    basePath: module.basePath,
  };
}

function campaignFromFolderModule(module: FolderModule) {
  const payload = module.payload as Partial<GameConfig["campaigns"][number]>;
  return {
    ...payload,
    id: payload.id ?? module.moduleId,
    title: payload.title ?? module.moduleId,
    implemented: payload.implemented ?? false,
    configPath: module.configPath,
    basePath: module.basePath,
  };
}

function mergeByFolderConfig<T extends { id: string }>(inlineItems: T[], folderItems: T[]) {
  const byId = new Map<string, T>();
  for (const item of inlineItems) byId.set(item.id, item);
  for (const item of folderItems) byId.set(item.id, { ...byId.get(item.id), ...item });
  return [...byId.values()];
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

  const folderModules = loadFolderModules().filter((module) => module.gameId === id);
  const folderDlc = folderModules.filter((module) => module.category === "dlc").map(itemFromFolderModule);
  const folderFeatures = folderModules.filter((module) => module.category === "features").map(itemFromFolderModule);
  const folderExtras = folderModules.filter((module) => module.category === "extras").map(itemFromFolderModule);
  const folderCampaigns = folderModules.filter((module) => module.category === "campaigns").map(campaignFromFolderModule);

  return {
    ...game,
    id,
    enabled: game.enabled ?? true,
    basePath,
    configPath: configPath ? normalizePublicPath(configPath) : game.configPath ?? `${basePath}/game.config.json`,
    content: {
      dlc: mergeByFolderConfig(game.content?.dlc ?? [], folderDlc),
      features: mergeByFolderConfig(game.content?.features ?? [], folderFeatures),
      extras: mergeByFolderConfig(game.content?.extras ?? [], folderExtras),
    },
    campaigns: mergeByFolderConfig(game.campaigns ?? [], folderCampaigns),
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

  return games.sort((a, b) => a.name.localeCompare(b.name));
}

export function loadBundledGameJsonFiles(): GameJsonFile[] {
  return Object.entries(gameJsonModules)
    .map(([path, raw]) => {
      const normalizedPath = normalizePublicPath(path);
      const match = normalizedPath.match(/^\/games\/([^/]+)\/(.+)$/);
      if (!match) return null;
      const [, gameId, relativePath] = match;
      return {
        gameId,
        path: normalizedPath,
        relativePath,
        fileName: relativePath.split("/").pop() ?? relativePath,
        raw: String(raw),
        isConfig: relativePath === "game.config.json",
      };
    })
    .filter((file): file is GameJsonFile => Boolean(file))
    .sort((a, b) => a.gameId.localeCompare(b.gameId) || a.relativePath.localeCompare(b.relativePath));
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
