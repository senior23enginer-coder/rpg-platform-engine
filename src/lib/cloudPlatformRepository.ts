import type {
  PlatformAuditEntry,
  PlatformAuthResult,
  PlatformChatMessage,
  PlatformCloudConfig,
  PlatformCredentials,
  PlatformMapDocument,
  PlatformRepository,
  PlatformSession,
} from "./platformContracts";
import type { AppMetadata, AppNewsEntry, AppNotificationEntry, AppSupportTicket } from "./appMetadataStorage";
import type { GameConfig } from "../types/game";
import type { PlayerProfile, PlayerSave } from "../types/profile";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
};

function normalizeEndpoint(endpoint: string) {
  return endpoint.trim().replace(/\/+$/, "");
}

async function requestJson<T>(endpoint: string, path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${normalizeEndpoint(endpoint)}${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`CLOUD_${response.status}`);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export function createCloudPlatformRepository(config: PlatformCloudConfig, token?: string): PlatformRepository {
  const endpoint = config.endpoint;

  return {
    mode: "cloud",
    auth: {
      login(credentials: PlatformCredentials): Promise<PlatformAuthResult> {
        return requestJson(endpoint, "/auth/login", { body: credentials });
      },
      logout(sessionId: string): Promise<void> {
        return requestJson(endpoint, `/auth/sessions/${encodeURIComponent(sessionId)}/logout`, { method: "POST", token });
      },
      refreshSession(sessionId: string): Promise<PlatformSession> {
        return requestJson(endpoint, `/auth/sessions/${encodeURIComponent(sessionId)}/refresh`, { method: "POST", token });
      },
      requestPasswordReset(usernameOrEmail: string): Promise<void> {
        return requestJson(endpoint, "/auth/password-reset", { body: { usernameOrEmail } });
      },
    },
    users: {
      list(): Promise<PlayerProfile[]> {
        return requestJson(endpoint, "/users", { token });
      },
      save(profile: PlayerProfile): Promise<PlayerProfile> {
        return requestJson(endpoint, `/users/${encodeURIComponent(profile.id)}`, { method: "PATCH", body: profile, token });
      },
      block(userId: string, blocked: boolean): Promise<void> {
        return requestJson(endpoint, `/users/${encodeURIComponent(userId)}/block`, { method: "POST", body: { blocked }, token });
      },
    },
    games: {
      list(): Promise<GameConfig[]> {
        return requestJson(endpoint, "/games", { token });
      },
      save(game: GameConfig): Promise<GameConfig> {
        return requestJson(endpoint, `/games/${encodeURIComponent(game.id)}`, { method: "PATCH", body: game, token });
      },
    },
    maps: {
      list(gameId?: string): Promise<PlatformMapDocument[]> {
        return requestJson(endpoint, gameId ? `/maps?gameId=${encodeURIComponent(gameId)}` : "/maps", { token });
      },
      save(map: PlatformMapDocument): Promise<PlatformMapDocument> {
        return requestJson(endpoint, `/maps/${encodeURIComponent(map.id)}`, { method: "PATCH", body: map, token });
      },
    },
    playable: {
      summary(gameId: string) {
        return requestJson(endpoint, `/games/${encodeURIComponent(gameId)}/playable/summary`, { token });
      },
      list(gameId: string, type: string, query = {}) {
        const params = new URLSearchParams();
        if (query.q) params.set("q", query.q);
        if (query.offset !== undefined) params.set("offset", String(query.offset));
        if (query.limit !== undefined) params.set("limit", String(query.limit));
        const suffix = params.toString() ? `?${params.toString()}` : "";
        return requestJson(endpoint, `/games/${encodeURIComponent(gameId)}/playable/${encodeURIComponent(type)}${suffix}`, { token });
      },
      detail(gameId: string, type: string, id: string) {
        return requestJson(endpoint, `/games/${encodeURIComponent(gameId)}/playable/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { token });
      },
      save<T = Record<string, unknown>>(gameId: string, type: string, id: string, patch: Partial<T>) {
        return requestJson<T>(endpoint, `/games/${encodeURIComponent(gameId)}/playable/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { method: "PATCH", body: patch, token });
      },
      listAssets(gameId: string, type: string, id: string) {
        return requestJson(endpoint, `/games/${encodeURIComponent(gameId)}/playable/${encodeURIComponent(type)}/${encodeURIComponent(id)}/assets`, { token });
      },
      saveAssets<T = Record<string, unknown>>(gameId: string, type: string, id: string, assets: T[]) {
        return requestJson<T[]>(endpoint, `/games/${encodeURIComponent(gameId)}/playable/${encodeURIComponent(type)}/${encodeURIComponent(id)}/assets`, { method: "PATCH", body: { assets }, token });
      },
    },
    content: {
      metadata(): Promise<AppMetadata> {
        return requestJson(endpoint, "/metadata", { token });
      },
      saveMetadata(metadata: AppMetadata): Promise<AppMetadata> {
        return requestJson(endpoint, "/metadata", { method: "PATCH", body: metadata, token });
      },
      saveNews(news: AppNewsEntry[]): Promise<AppNewsEntry[]> {
        return requestJson(endpoint, "/news", { method: "POST", body: { news }, token });
      },
      saveNotifications(notifications: AppNotificationEntry[]): Promise<AppNotificationEntry[]> {
        return requestJson(endpoint, "/notifications", { method: "POST", body: { notifications }, token });
      },
    },
    support: {
      listTickets(): Promise<AppSupportTicket[]> {
        return requestJson(endpoint, "/support/tickets", { token });
      },
      saveTicket(ticket: AppSupportTicket): Promise<AppSupportTicket> {
        return requestJson(endpoint, `/support/tickets/${encodeURIComponent(ticket.id)}`, { method: "PATCH", body: ticket, token });
      },
    },
    chat: {
      listMessages(roomId: string, channelId: string): Promise<PlatformChatMessage[]> {
        return requestJson(endpoint, `/chat/rooms/${encodeURIComponent(roomId)}/channels/${encodeURIComponent(channelId)}/messages`, { token });
      },
      sendMessage(message: PlatformChatMessage): Promise<PlatformChatMessage> {
        return requestJson(endpoint, `/chat/rooms/${encodeURIComponent(message.roomId)}/channels/${encodeURIComponent(message.channelId)}/messages`, { body: message, token });
      },
    },
    saves: {
      list(userId: string, gameId?: string): Promise<PlayerSave[]> {
        const query = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
        return requestJson(endpoint, `/users/${encodeURIComponent(userId)}/saves${query}`, { token });
      },
      save(save: PlayerSave): Promise<PlayerSave> {
        return requestJson(endpoint, `/users/${encodeURIComponent(save.userId ?? "")}/saves/${encodeURIComponent(save.saveId)}`, { method: "PATCH", body: save, token });
      },
    },
    audit: {
      append(entry: PlatformAuditEntry): Promise<PlatformAuditEntry> {
        return requestJson(endpoint, "/audit", { body: entry, token });
      },
      list(limit = 100): Promise<PlatformAuditEntry[]> {
        return requestJson(endpoint, `/audit?limit=${limit}`, { token });
      },
    },
  };
}
