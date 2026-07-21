import { loadAppMetadata, normalizeMetadata } from "./appMetadataStorage";
import { createPasswordHash, redactPasswordFields, verifyPassword } from "./authSecurity";
import { loadBundledGames, normalizeGameConfig } from "./gameLibrary";
import { normalizeProfile } from "./playerProfile";
import {
  appendPersistentAudit,
  appendPersistentChatMessage,
  loadPersistentDatabase,
  revokePersistentSession,
  savePersistentDatabase,
  savePersistentGames,
  savePersistentMaps,
  savePersistentMetadata,
  savePersistentSession,
  savePersistentUsers,
} from "./storageAdapter";
import type {
  PlatformAuditEntry,
  PlatformAuthResult,
  PlatformChatMessage,
  PlatformCredentials,
  PlatformMapDocument,
  PlatformRepository,
  PlatformSession,
} from "./platformContracts";
import type { AppMetadata, AppNewsEntry, AppNotificationEntry, AppSupportTicket } from "./appMetadataStorage";
import type { GameConfig } from "../types/game";
import type { PlayerProfile, PlayerSave } from "../types/profile";

const bundledGames = loadBundledGames();
const defaultSessionHours = 8;
const rememberSessionHours = 72;

function nowIso() {
  return new Date().toISOString();
}

function createSession(user: PlayerProfile, remember: boolean): PlatformSession {
  const now = Date.now();
  return {
    id: `session_${user.id}_${now}`,
    userId: user.id,
    role: user.role,
    remember,
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (remember ? rememberSessionHours : defaultSessionHours) * 60 * 60 * 1000).toISOString(),
    lastActivityAt: new Date(now).toISOString(),
  };
}

function createPlatformAudit(entry: Omit<PlatformAuditEntry, "id" | "createdAt">): PlatformAuditEntry {
  return {
    ...entry,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: nowIso(),
  };
}

function matchesAccount(user: PlayerProfile, value: string) {
  const normalized = value.trim().toLowerCase();
  return [user.username, user.email, user.id, user.name]
    .filter(Boolean)
    .some((item) => String(item).trim().toLowerCase() === normalized);
}

async function loadPlayableRuntime(gameId: string, detail = false) {
  const fileName = detail ? "playable-content.json" : "playable-editor-index.json";
  const response = await fetch(`/games/${gameId}/runtime/${fileName}`);
  if (!response.ok && detail) return loadPlayableRuntime(gameId, false);
  if (!response.ok) throw new Error("PLAYABLE_CONTENT_NOT_FOUND");
  return response.json();
}

async function loadPlayableDetailPack(gameId: string) {
  const response = await fetch(`/games/${gameId}/runtime/playable-detail-pack.json`);
  if (!response.ok) throw new Error("PLAYABLE_DETAIL_PACK_NOT_FOUND");
  return response.json();
}

function normalizePlayableType(type: string) {
  const aliases: Record<string, string> = {
    maps: "locationMaps",
    map: "locationMaps",
    locationmaps: "locationMaps",
    weather: "weather",
    climate: "weather",
    biomes: "biomes",
    nodes: "nodeTypes",
    nodetypes: "nodeTypes",
  };
  const key = type.trim().toLowerCase();
  return aliases[key] ?? type;
}

function getPlayableCatalog(playable: any, type: string) {
  const key = normalizePlayableType(type);
  if (key === "weather") return playable.rules?.weatherEffects ?? [];
  if (key === "biomes") return playable.rules?.biomes ?? [];
  if (key === "nodeTypes") return playable.rules?.nodeTypes ?? [];
  return playable.catalogs?.[key] ?? [];
}

function playableItemId(item: any) {
  return String(item?.id ?? item?.locationId ?? item?.name ?? "");
}

function applyPlayablePatches(items: any[], patches: Array<{ id: string; patch?: Record<string, unknown> }>) {
  const patchById = new Map(patches.map((entry) => [entry.id, entry.patch ?? {}]));
  return items.map((item) => {
    const id = playableItemId(item);
    return patchById.has(id) ? { ...item, ...patchById.get(id), id } : item;
  });
}

export function createLocalPlatformRepository(): PlatformRepository {
  return {
    mode: "local",
    auth: {
      async login(credentials: PlatformCredentials): Promise<PlatformAuthResult> {
        const database = await loadPersistentDatabase();
        const user = database.users.find((item) => matchesAccount(item, credentials.usernameOrEmail));
        if (!user || user.blocked) throw new Error("AUTH_INVALID");
        const validPassword = await verifyPassword(credentials.password, user.passwordHash, user.password);
        if (!validPassword) throw new Error("AUTH_INVALID");

        const passwordHash = user.passwordHash || await createPasswordHash(credentials.password);
        const profile = normalizeProfile(
          redactPasswordFields({ ...user, signedIn: true, lastLoginAt: nowIso(), lastActivityAt: nowIso() }, passwordHash),
          bundledGames
        );
        const session = createSession(profile, credentials.remember);
        await savePersistentUsers([profile, ...database.users.filter((item) => item.id !== profile.id)], profile.id);
        await savePersistentSession(session);
        await appendPersistentAudit(createPlatformAudit({ action: "auth.login", module: "auth", actorId: profile.id, targetId: profile.id }));
        return { profile, session };
      },
      async logout(sessionId: string) {
        const database = await loadPersistentDatabase();
        const session = database.sessions.find((item) => item.id === sessionId);
        if (session) {
          await revokePersistentSession(sessionId);
          await appendPersistentAudit(createPlatformAudit({ action: "auth.logout", module: "auth", actorId: session.userId, targetId: session.userId }));
        }
      },
      async refreshSession(sessionId: string) {
        const database = await loadPersistentDatabase();
        const session = database.sessions.find((item) => item.id === sessionId && !item.revokedAt);
        if (!session || new Date(session.expiresAt).getTime() <= Date.now()) throw new Error("SESSION_EXPIRED");
        const refreshed = { ...session, lastActivityAt: nowIso() };
        await savePersistentSession(refreshed);
        return refreshed;
      },
      async requestPasswordReset(usernameOrEmail: string) {
        const database = await loadPersistentDatabase();
        const user = database.users.find((item) => matchesAccount(item, usernameOrEmail));
        if (user) {
          await appendPersistentAudit(createPlatformAudit({ action: "auth.password_reset", module: "auth", actorId: user.id, targetId: user.id }));
        }
      },
    },
    users: {
      async list() {
        return (await loadPersistentDatabase()).users;
      },
      async save(profile: PlayerProfile) {
        const database = await loadPersistentDatabase();
        const normalized = normalizeProfile(profile, bundledGames);
        await savePersistentUsers([normalized, ...database.users.filter((user) => user.id !== normalized.id)], database.currentUserId);
        await appendPersistentAudit(createPlatformAudit({ action: "admin.user.update", module: "users", actorId: database.currentUserId ?? normalized.id, targetId: normalized.id }));
        return normalized;
      },
      async block(userId: string, blocked: boolean) {
        const database = await loadPersistentDatabase();
        await savePersistentUsers(database.users.map((user) => (user.id === userId ? { ...user, blocked } : user)), database.currentUserId);
      },
    },
    games: {
      async list() {
        const database = await loadPersistentDatabase();
        return database.games.length ? database.games : bundledGames;
      },
      async save(game: GameConfig) {
        const database = await loadPersistentDatabase();
        const normalized = normalizeGameConfig(game);
        await savePersistentGames([normalized, ...database.games.filter((item) => item.id !== normalized.id)]);
        await appendPersistentAudit(createPlatformAudit({ action: "admin.game.update", module: "games", actorId: database.currentUserId ?? "system", targetId: normalized.id }));
        return normalized;
      },
    },
    maps: {
      async list(gameId?: string) {
        const maps = (await loadPersistentDatabase()).maps;
        return gameId ? maps.filter((map) => map.gameId === gameId) : maps;
      },
      async detail(id: string) {
        const map = (await loadPersistentDatabase()).maps.find((item) => item.id === id);
        if (!map) throw new Error("MAP_NOT_FOUND");
        return map;
      },
      async save(map: PlatformMapDocument) {
        const database = await loadPersistentDatabase();
        const normalized = { ...map, updatedAt: nowIso() };
        await savePersistentMaps([normalized, ...database.maps.filter((item) => item.id !== normalized.id)]);
        await appendPersistentAudit(createPlatformAudit({ action: "admin.map.update", module: "maps", actorId: database.currentUserId ?? "system", targetId: normalized.id }));
        return normalized;
      },
      async export(id: string) {
        const database = await loadPersistentDatabase();
        const map = database.maps.find((item) => item.id === id);
        if (!map) throw new Error("MAP_NOT_FOUND");
        return { exportedAt: nowIso(), map, assets: database.mapAssets?.filter((asset) => asset.itemId === id) ?? [] };
      },
      async import(payload: Record<string, unknown>) {
        const map = (payload.map ?? payload) as PlatformMapDocument;
        return this.save(map);
      },
    },
    playable: {
      async summary(gameId: string) {
        const playable = await loadPlayableRuntime(gameId, false);
        const database = await loadPersistentDatabase();
        return {
          gameId,
          generatedAt: playable.generatedAt,
          counts: playable.counts ?? {},
          catalogs: Object.fromEntries(Object.entries(playable.catalogs ?? {}).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0])),
          rules: {
            nodeTypes: playable.rules?.nodeTypes?.length ?? 0,
            weatherEffects: playable.rules?.weatherEffects?.length ?? 0,
            biomes: playable.rules?.biomes?.length ?? 0,
          },
          patches: 0,
          mapsSaved: database.maps.filter((map) => map.gameId === gameId).length,
        };
      },
      async list(gameId: string, type: string, query = {}) {
        const playable = await loadPlayableRuntime(gameId, false);
        const database = await loadPersistentDatabase();
        const q = String(query.q ?? "").trim().toLowerCase();
        const offset = Math.max(0, Number(query.offset ?? 0) || 0);
        const limit = Math.max(1, Math.min(100, Number(query.limit ?? 25) || 25));
        const normalizedType = normalizePlayableType(type);
        const patches = database.playablePatches?.filter((patch) => patch.gameId === gameId && normalizePlayableType(patch.type) === normalizedType) ?? [];
        const items = applyPlayablePatches(getPlayableCatalog(playable, type), patches);
        const filtered = q ? items.filter((item: unknown) => JSON.stringify(item).toLowerCase().includes(q)) : items;
        return { gameId, type: normalizedType, total: filtered.length, offset, limit, items: filtered.slice(offset, offset + limit) };
      },
      async detail(gameId: string, type: string, id: string) {
        const playable = await loadPlayableRuntime(gameId, true);
        const database = await loadPersistentDatabase();
        const normalizedType = normalizePlayableType(type);
        const item = getPlayableCatalog(playable, type).find((entry: any) => playableItemId(entry) === id);
        if (!item) throw new Error("PLAYABLE_ITEM_NOT_FOUND");
        const patch = database.playablePatches?.find((entry) => entry.gameId === gameId && normalizePlayableType(entry.type) === normalizedType && entry.id === id)?.patch ?? {};
        const detailPack = (await loadPlayableDetailPack(gameId).catch(() => undefined))?.catalogs?.[normalizedType]?.find((entry: any) => playableItemId(entry) === id);
        return { ...item, detailPack, ...patch, id: playableItemId(item) };
      },
      async detailPack(gameId: string, type: string, id: string) {
        const normalizedType = normalizePlayableType(type);
        const detailPack = await loadPlayableDetailPack(gameId);
        const detail = detailPack.catalogs?.[normalizedType]?.find((entry: any) => playableItemId(entry) === id);
        if (!detail) throw new Error("PLAYABLE_DETAIL_PACK_NOT_FOUND");
        return detail;
      },
      async save<T = Record<string, unknown>>(gameId: string, type: string, id: string, patch: Partial<T>) {
        const database = await loadPersistentDatabase();
        const normalizedType = normalizePlayableType(type);
        const nextPatch = {
          id,
          gameId,
          type: normalizedType,
          patch: patch as Record<string, unknown>,
          updatedAt: nowIso(),
          actorId: database.currentUserId ?? "system",
        };
        await savePersistentDatabase({
          ...database,
          playablePatches: [nextPatch, ...(database.playablePatches ?? []).filter((entry) => !(entry.gameId === gameId && normalizePlayableType(entry.type) === normalizedType && entry.id === id))],
        });
        await appendPersistentAudit(createPlatformAudit({ action: "admin.playable.update", module: "games", actorId: database.currentUserId ?? "system", targetId: id, metadata: { gameId, type: normalizedType } }));
        return this.detail(gameId, type, id) as Promise<T>;
      },
      async listAssets<T = Record<string, unknown>>(_gameId: string, type: string, id: string) {
        const database = await loadPersistentDatabase();
        const normalizedType = normalizePlayableType(type);
        return (database.mapAssets ?? []).filter((asset) => normalizePlayableType(String(asset.type ?? "")) === normalizedType && asset.itemId === id) as T[];
      },
      async saveAssets<T = Record<string, unknown>>(gameId: string, type: string, id: string, assets: T[]) {
        const database = await loadPersistentDatabase();
        const normalizedType = normalizePlayableType(type);
        const normalizedAssets = assets.map((asset, index) => ({
          ...(asset as Record<string, unknown>),
          id: String((asset as Record<string, unknown>).id ?? `asset_${gameId}_${normalizedType}_${id}_${index}`),
          gameId,
          type: normalizedType,
          itemId: id,
          updatedAt: nowIso(),
        }));
        await savePersistentDatabase({
          ...database,
          mapAssets: [
            ...normalizedAssets,
            ...(database.mapAssets ?? []).filter((asset) => !(asset.gameId === gameId && normalizePlayableType(String(asset.type ?? "")) === normalizedType && asset.itemId === id)),
          ],
        });
        await appendPersistentAudit(createPlatformAudit({ action: "admin.map.update", module: "maps", actorId: database.currentUserId ?? "system", targetId: id, metadata: { gameId, type: normalizedType, assets: normalizedAssets.length } }));
        return assets;
      },
      async export(gameId: string, type?: string) {
        const playable = await loadPlayableRuntime(gameId, true);
        const database = await loadPersistentDatabase();
        return {
          exportedAt: nowIso(),
          gameId,
          type,
          playable,
          patches: database.playablePatches?.filter((patch) => patch.gameId === gameId && (!type || normalizePlayableType(patch.type) === normalizePlayableType(type))) ?? [],
          assets: database.mapAssets?.filter((asset) => asset.gameId === gameId && (!type || normalizePlayableType(String(asset.type ?? "")) === normalizePlayableType(type))) ?? [],
        };
      },
      async import(gameId: string, payload: Record<string, unknown>) {
        const database = await loadPersistentDatabase();
        const patches = Array.isArray(payload.patches) ? payload.patches : [];
        const assets = Array.isArray(payload.assets) ? payload.assets : [];
        await savePersistentDatabase({
          ...database,
          playablePatches: [
            ...patches.map((patch: any) => ({ ...patch, gameId, type: normalizePlayableType(String(patch.type ?? "")), updatedAt: nowIso() })),
            ...(database.playablePatches ?? []).filter((patch) => patch.gameId !== gameId),
          ],
          mapAssets: [
            ...assets.map((asset: any) => ({ ...asset, gameId, updatedAt: nowIso() })),
            ...(database.mapAssets ?? []).filter((asset) => asset.gameId !== gameId),
          ],
        });
        await appendPersistentAudit(createPlatformAudit({ action: "admin.playable.update", module: "games", actorId: database.currentUserId ?? "system", targetId: gameId }));
        return { gameId, importedAt: nowIso(), patches: patches.length, assets: assets.length };
      },
    },
    content: {
      async metadata() {
        const database = await loadPersistentDatabase();
        return normalizeMetadata(database.metadata ?? loadAppMetadata());
      },
      async saveMetadata(metadata: AppMetadata) {
        const normalized = normalizeMetadata(metadata);
        await savePersistentMetadata(normalized);
        return normalized;
      },
      async listNews() {
        const database = await loadPersistentDatabase();
        return normalizeMetadata(database.metadata ?? loadAppMetadata()).news;
      },
      async saveNews(news: AppNewsEntry[]) {
        const database = await loadPersistentDatabase();
        const metadata = normalizeMetadata({ ...(database.metadata ?? loadAppMetadata()), news });
        await savePersistentMetadata(metadata);
        return metadata.news;
      },
      async saveNewsEntry(news: AppNewsEntry) {
        const database = await loadPersistentDatabase();
        const metadata = normalizeMetadata(database.metadata ?? loadAppMetadata());
        const existing = metadata.news.find((entry) => entry.id === news.id);
        if (existing?.status === "published" && news.status !== "archived" && news.status !== "published") {
          throw new Error("NEWS_PUBLISHED_LOCKED");
        }
        const nextNews = { ...existing, ...news, updatedAt: nowIso() };
        await savePersistentMetadata({
          ...metadata,
          news: [nextNews, ...metadata.news.filter((entry) => entry.id !== nextNews.id)],
        });
        await appendPersistentAudit(createPlatformAudit({ action: "admin.news.update", module: "news", actorId: database.currentUserId ?? "system", targetId: nextNews.id }));
        return nextNews;
      },
      async deleteNewsEntry(newsId: string) {
        const database = await loadPersistentDatabase();
        const metadata = normalizeMetadata(database.metadata ?? loadAppMetadata());
        await savePersistentMetadata({ ...metadata, news: metadata.news.filter((entry) => entry.id !== newsId) });
        await appendPersistentAudit(createPlatformAudit({ action: "admin.news.update", module: "news", actorId: database.currentUserId ?? "system", targetId: newsId }));
      },
      async listNotifications() {
        const database = await loadPersistentDatabase();
        return normalizeMetadata(database.metadata ?? loadAppMetadata()).notifications;
      },
      async saveNotifications(notifications: AppNotificationEntry[]) {
        const database = await loadPersistentDatabase();
        const metadata = normalizeMetadata({ ...(database.metadata ?? loadAppMetadata()), notifications });
        await savePersistentMetadata(metadata);
        return metadata.notifications;
      },
      async saveNotificationEntry(notification: AppNotificationEntry) {
        const database = await loadPersistentDatabase();
        const metadata = normalizeMetadata(database.metadata ?? loadAppMetadata());
        const nextNotification = { ...metadata.notifications.find((entry) => entry.id === notification.id), ...notification, updatedAt: nowIso() };
        await savePersistentMetadata({
          ...metadata,
          notifications: [nextNotification, ...metadata.notifications.filter((entry) => entry.id !== nextNotification.id)],
        });
        await appendPersistentAudit(createPlatformAudit({ action: "admin.notification.update", module: "notifications", actorId: database.currentUserId ?? "system", targetId: nextNotification.id }));
        return nextNotification;
      },
      async deleteNotificationEntry(notificationId: string) {
        const database = await loadPersistentDatabase();
        const metadata = normalizeMetadata(database.metadata ?? loadAppMetadata());
        await savePersistentMetadata({ ...metadata, notifications: metadata.notifications.filter((entry) => entry.id !== notificationId) });
        await appendPersistentAudit(createPlatformAudit({ action: "admin.notification.update", module: "notifications", actorId: database.currentUserId ?? "system", targetId: notificationId }));
      },
    },
    support: {
      async listTickets() {
        return normalizeMetadata((await loadPersistentDatabase()).metadata ?? loadAppMetadata()).supportTickets;
      },
      async createPublicTicket(ticket: Partial<AppSupportTicket>) {
        const metadata = normalizeMetadata((await loadPersistentDatabase()).metadata ?? loadAppMetadata());
        const now = nowIso();
        const nextTicket: AppSupportTicket = {
          id: ticket.id ?? `ticket_public_${Date.now()}`,
          title: ticket.title ?? "Solicitud desde login",
          description: ticket.description ?? "",
          requesterId: ticket.requesterId ?? "public_guest",
          requesterName: ticket.requesterName ?? "Invitado",
          status: ticket.status ?? "open",
          priority: ticket.priority ?? "normal",
          category: ticket.category ?? "account",
          assignedTo: ticket.assignedTo,
          createdAt: ticket.createdAt ?? now,
          updatedAt: now,
          messages: ticket.messages ?? [],
        };
        await savePersistentMetadata({
          ...metadata,
          supportTickets: [nextTicket, ...metadata.supportTickets.filter((item) => item.id !== nextTicket.id)],
        });
        return nextTicket;
      },
      async saveTicket(ticket: AppSupportTicket) {
        const metadata = normalizeMetadata((await loadPersistentDatabase()).metadata ?? loadAppMetadata());
        const nextTicket = { ...ticket, updatedAt: nowIso() };
        await savePersistentMetadata({
          ...metadata,
          supportTickets: [nextTicket, ...metadata.supportTickets.filter((item) => item.id !== nextTicket.id)],
        });
        return nextTicket;
      },
    },
    chat: {
      async listMessages(roomId: string, channelId: string) {
        return (await loadPersistentDatabase()).chatMessages.filter((message) => message.roomId === roomId && message.channelId === channelId);
      },
      async sendMessage(message: PlatformChatMessage) {
        const nextMessage = { ...message, createdAt: message.createdAt || nowIso() };
        await appendPersistentChatMessage(nextMessage);
        return nextMessage;
      },
    },
    saves: {
      async list(userId: string, gameId?: string): Promise<PlayerSave[]> {
        const user = (await loadPersistentDatabase()).users.find((item) => item.id === userId);
        const saves = user?.saves ?? [];
        return gameId ? saves.filter((save) => save.gameId === gameId) : saves;
      },
      async save(save: PlayerSave) {
        const database = await loadPersistentDatabase();
        const users = database.users.map((user) =>
          user.id === save.userId
            ? { ...user, saves: [save, ...user.saves.filter((item) => item.saveId !== save.saveId)] }
            : user
        );
        await savePersistentUsers(users, database.currentUserId);
        return save;
      },
    },
    audit: {
      async append(entry: PlatformAuditEntry) {
        await appendPersistentAudit(entry);
        return entry;
      },
      async list(limit = 100) {
        return (await loadPersistentDatabase()).auditLog.slice(0, limit);
      },
    },
    backup: {
      async export() {
        const database = await loadPersistentDatabase();
        await appendPersistentAudit(createPlatformAudit({ action: "admin.settings.update", module: "settings", actorId: database.currentUserId ?? "system", targetId: "backup-export" }));
        return { exportedAt: nowIso(), schemaVersion: database.schemaVersion, database };
      },
      async import(payload: Record<string, unknown>) {
        const imported = (payload.database ?? payload) as Partial<Awaited<ReturnType<typeof loadPersistentDatabase>>>;
        const current = await loadPersistentDatabase();
        const nextDatabase = await savePersistentDatabase({ ...current, ...imported, mode: "local", updatedAt: nowIso() } as Awaited<ReturnType<typeof loadPersistentDatabase>>);
        await appendPersistentAudit(createPlatformAudit({ action: "admin.settings.update", module: "settings", actorId: nextDatabase.currentUserId ?? "system", targetId: "backup-import" }));
        return { ok: true, importedAt: nowIso() };
      },
    },
  };
}
