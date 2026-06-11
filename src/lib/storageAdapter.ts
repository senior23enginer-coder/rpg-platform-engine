import { Capacitor } from "@capacitor/core";
import type { AppMetadata } from "./appMetadataStorage";
import type { SavedGameDocument } from "./saveGameStorage";
import type { PlayerProfile } from "../types/profile";

const ROOT_DIR = "RPG Platform Engine";
const DATABASE_DIR = `${ROOT_DIR}/database`;
const DATABASE_INDEX_PATH = `${DATABASE_DIR}/index.json`;
const PROFILE_PATH = `${DATABASE_DIR}/profile.json`;
const METADATA_PATH = `${DATABASE_DIR}/metadata.json`;
const DATABASE_KEY = "rpg-platform.database.v1";

type NativeFileDriver = {
  readText(path: string): Promise<string>;
  writeText(path: string, data: string): Promise<void>;
};

export type PlatformDatabase = {
  schemaVersion: 1;
  updatedAt: string;
  profile?: PlayerProfile;
  users: PlayerProfile[];
  currentUserId?: string;
  metadata?: AppMetadata;
  saveIndex: Array<{
    saveId: string;
    gameId: string;
    userId?: string;
    campaignId: string;
    name: string;
    playerName: string;
    level: number;
    updatedAt: string;
    storagePath?: string;
  }>;
};

function normalizeRelativePath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function toStoragePath(path: string) {
  const normalized = normalizeRelativePath(path);
  return normalized.startsWith(ROOT_DIR) ? normalized : `${ROOT_DIR}/${normalized}`;
}

async function createTauriDriver(): Promise<NativeFileDriver | undefined> {
  if (!("__TAURI_INTERNALS__" in window)) return undefined;

  const [{ BaseDirectory }, fs] = await Promise.all([
    import("@tauri-apps/api/path"),
    import("@tauri-apps/plugin-fs"),
  ]);

  return {
    async readText(path: string) {
      return fs.readTextFile(toStoragePath(path), { baseDir: BaseDirectory.Document });
    },
    async writeText(path: string, data: string) {
      const targetPath = toStoragePath(path);
      const targetDir = targetPath.split("/").slice(0, -1).join("/");
      await fs.mkdir(targetDir, { baseDir: BaseDirectory.Document, recursive: true });
      await fs.writeTextFile(targetPath, data, { baseDir: BaseDirectory.Document });
    },
  };
}

async function createCapacitorDriver(): Promise<NativeFileDriver | undefined> {
  if (!Capacitor.isNativePlatform()) return undefined;

  const { Directory, Encoding, Filesystem } = await import("@capacitor/filesystem");

  return {
    async readText(path: string) {
      const result = await Filesystem.readFile({
        path: toStoragePath(path),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      return String(result.data);
    },
    async writeText(path: string, data: string) {
      await Filesystem.writeFile({
        path: toStoragePath(path),
        data,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
    },
  };
}

let nativeDriverPromise: Promise<NativeFileDriver | undefined> | undefined;

async function getNativeDriver() {
  nativeDriverPromise ??= createTauriDriver().then((driver) => driver ?? createCapacitorDriver());
  return nativeDriverPromise;
}

async function readJsonFile<T>(path: string): Promise<T | undefined> {
  const driver = await getNativeDriver();
  if (!driver) return undefined;

  try {
    return JSON.parse(await driver.readText(path)) as T;
  } catch {
    return undefined;
  }
}

async function writeJsonFile(path: string, value: unknown) {
  const driver = await getNativeDriver();
  if (!driver) return false;

  try {
    await driver.writeText(path, JSON.stringify(value, null, 2));
    return true;
  } catch {
    return false;
  }
}

export async function loadNativeProfile() {
  const database = await loadPersistentDatabase();
  const activeUser = database.currentUserId
    ? database.users.find((user) => user.id === database.currentUserId)
    : undefined;
  return activeUser ?? database.profile ?? readJsonFile<PlayerProfile>(PROFILE_PATH);
}

export async function savePersistentProfile(profile: PlayerProfile) {
  const wroteNative = await writeJsonFile(PROFILE_PATH, profile);
  await updatePersistentDatabase({ profile, currentUserId: profile.id });
  window.localStorage.setItem("rpg-platform.player-profile.v5", JSON.stringify(profile));
  return wroteNative;
}

export async function loadNativeMetadata() {
  const database = await loadPersistentDatabase();
  return database?.metadata ?? readJsonFile<AppMetadata>(METADATA_PATH);
}

export async function savePersistentMetadata(metadata: AppMetadata) {
  const wroteNative = await writeJsonFile(METADATA_PATH, metadata);
  await updatePersistentDatabase({ metadata });
  window.localStorage.setItem("rpg-platform.app-metadata.v1", JSON.stringify(metadata));
  return wroteNative;
}

export async function savePersistentGameDocument(document: SavedGameDocument) {
  const savePath = document.save.storagePath ?? `/games/${document.game.id}/saves/${document.user.id}/${document.save.saveId}/save.game.json`;
  const wroteNative = await writeJsonFile(savePath, document);
  await updatePersistentDatabase({ saveDocument: document });
  return wroteNative;
}

export async function loadNativeDatabase() {
  return readJsonFile<PlatformDatabase>(DATABASE_INDEX_PATH);
}

export async function loadPersistentDatabase() {
  const nativeDatabase = await loadNativeDatabase();
  if (nativeDatabase) return normalizeDatabase(nativeDatabase);

  try {
    const raw = window.localStorage.getItem(DATABASE_KEY);
    if (raw) return normalizeDatabase(JSON.parse(raw) as Partial<PlatformDatabase>);
  } catch {
    // Ignore malformed fallback data and rebuild from legacy profile storage.
  }

  try {
    const legacyProfile = window.localStorage.getItem("rpg-platform.player-profile.v5");
    if (legacyProfile) return createDatabase({ profile: JSON.parse(legacyProfile) as PlayerProfile });
  } catch {
    // Ignore malformed legacy profile data.
  }

  return createDatabase();
}

export async function loadPersistentUsers() {
  const database = await loadPersistentDatabase();
  return database.users;
}

function createDatabase(partial: Partial<PlatformDatabase> = {}): PlatformDatabase {
  const users = partial.users ?? (partial.profile ? [partial.profile] : []);
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    profile: partial.profile ?? users[0],
    users,
    currentUserId: partial.currentUserId ?? partial.profile?.id ?? users[0]?.id,
    metadata: partial.metadata,
    saveIndex: partial.saveIndex ?? [],
  };
}

function normalizeDatabase(database: Partial<PlatformDatabase>): PlatformDatabase {
  const users = Array.isArray(database.users) ? database.users : [];
  const profile = database.profile;
  const mergedUsers = profile && !users.some((user) => user.id === profile.id)
    ? [profile, ...users]
    : users;

  return createDatabase({
    profile: database.profile ?? mergedUsers[0],
    users: mergedUsers,
    currentUserId: database.currentUserId ?? database.profile?.id ?? mergedUsers[0]?.id,
    metadata: database.metadata,
    saveIndex: Array.isArray(database.saveIndex) ? database.saveIndex : [],
  });
}

async function updatePersistentDatabase({
  profile,
  metadata,
  saveDocument,
  currentUserId,
}: {
  profile?: PlayerProfile;
  metadata?: AppMetadata;
  saveDocument?: SavedGameDocument;
  currentUserId?: string;
}) {
  const current = await loadPersistentDatabase();
  const saveIndex = [...current.saveIndex];
  const users = [...current.users];

  if (profile) {
    const existingUserIndex = users.findIndex((user) => user.id === profile.id);
    if (existingUserIndex >= 0) {
      users[existingUserIndex] = profile;
    } else {
      users.unshift(profile);
    }
  }

  if (saveDocument) {
    const indexedSave = {
      saveId: saveDocument.save.saveId,
      gameId: saveDocument.save.gameId,
      userId: saveDocument.save.userId,
      campaignId: saveDocument.save.campaignId,
      name: saveDocument.save.name,
      playerName: saveDocument.save.playerName,
      level: saveDocument.save.level,
      updatedAt: saveDocument.save.updatedAt,
      storagePath: saveDocument.save.storagePath,
    };
    const existingIndex = saveIndex.findIndex((item) => item.saveId === indexedSave.saveId);
    if (existingIndex >= 0) {
      saveIndex[existingIndex] = indexedSave;
    } else {
      saveIndex.unshift(indexedSave);
    }
  }

  const nextDatabase = createDatabase({
    profile: profile ?? current.profile,
    users,
    currentUserId: currentUserId ?? current.currentUserId,
    metadata: metadata ?? current.metadata,
    saveIndex: saveIndex.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
  });

  window.localStorage.setItem(DATABASE_KEY, JSON.stringify(nextDatabase));
  await writeJsonFile(DATABASE_INDEX_PATH, nextDatabase);
}
