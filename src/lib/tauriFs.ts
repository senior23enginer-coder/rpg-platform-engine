import type { GameConfig } from "../types/game";
import { normalizeGameConfig } from "./gameLibrary";

export async function pickGamesFolder(): Promise<string | null> {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Selecciona la carpeta games/"
    });

    if (typeof selected === "string") return selected;
    return null;
  } catch (error) {
    console.warn("Folder picker unavailable in web preview.", error);
    return null;
  }
}

export async function readText(path: string): Promise<string | null> {
  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    return await readTextFile(path);
  } catch (error) {
    console.warn("Cannot read text file:", path, error);
    return null;
  }
}

export async function writeText(path: string, contents: string): Promise<boolean> {
  try {
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const candidates = [
      path,
      path.startsWith("/games/") ? `public${path}` : undefined,
      path.startsWith("public/games/") ? path.replace(/^public/, "") : undefined,
    ].filter((candidate): candidate is string => Boolean(candidate));
    for (const candidate of candidates) {
      try {
        await writeTextFile(candidate, contents);
        return true;
      } catch {
        // Try the next path shape; bundled web paths and Tauri disk paths differ.
      }
    }
    return false;
  } catch (error) {
    console.warn("Cannot write text file:", path, error);
    return false;
  }
}

export async function loadLibraryFromFolder(folderPath: string): Promise<GameConfig[]> {
  try {
    const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");
    const entries = await readDir(folderPath);
    const games: GameConfig[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory) continue;
      const configPath = `${folderPath}/${entry.name}/game.config.json`;
      try {
        const raw = await readTextFile(configPath);
        games.push(normalizeGameConfig(JSON.parse(raw) as GameConfig, configPath));
      } catch (error) {
        console.warn("Invalid game config:", configPath, error);
      }
    }

    return games.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.warn("Cannot load games folder.", error);
    return [];
  }
}
