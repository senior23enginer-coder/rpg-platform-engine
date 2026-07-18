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

function endpointFromConfig(config?: Partial<PlatformCloudConfig>) {
  const endpoint = config?.endpoint && config.endpoint.startsWith("http")
    ? config.endpoint
    : "http://127.0.0.1:8787/api";
  return endpoint.replace(/\/+$/, "");
}

async function requestJson<T>(endpoint: string, path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${endpoint}${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) throw new Error(`LOCAL_HTTP_${response.status}`);
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export function createLocalHttpPlatformRepository(config?: Partial<PlatformCloudConfig>, token?: string): PlatformRepository {
  const endpoint = endpointFromConfig(config);

  return {
    mode: "local",
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
      list: () => requestJson(endpoint, "/users", { token }),
      save: (profile: PlayerProfile) => requestJson(endpoint, `/users/${encodeURIComponent(profile.id)}`, { method: "PATCH", body: profile, token }),
      block: (userId: string, blocked: boolean) => requestJson(endpoint, `/users/${encodeURIComponent(userId)}/block`, { method: "POST", body: { blocked }, token }),
    },
    games: {
      list: () => requestJson(endpoint, "/games", { token }),
      save: (game: GameConfig) => requestJson(endpoint, `/games/${encodeURIComponent(game.id)}`, { method: "PATCH", body: game, token }),
    },
    maps: {
      list: (gameId?: string) => requestJson(endpoint, gameId ? `/maps?gameId=${encodeURIComponent(gameId)}` : "/maps", { token }),
      detail: (id: string) => requestJson(endpoint, `/maps/${encodeURIComponent(id)}`, { token }),
      save: (map: PlatformMapDocument) => requestJson(endpoint, `/maps/${encodeURIComponent(map.id)}`, { method: "PATCH", body: map, token }),
      export: (id: string) => requestJson(endpoint, `/maps/${encodeURIComponent(id)}/export`, { token }),
      import: (payload: Record<string, unknown>) => requestJson(endpoint, "/maps/import", { body: payload, token }),
    },
    playable: {
      summary: (gameId: string) => requestJson(endpoint, `/games/${encodeURIComponent(gameId)}/playable/summary`, { token }),
      list: (gameId: string, type: string, query = {}) => {
        const params = new URLSearchParams();
        if (query.q) params.set("q", query.q);
        if (query.offset !== undefined) params.set("offset", String(query.offset));
        if (query.limit !== undefined) params.set("limit", String(query.limit));
        const suffix = params.toString() ? `?${params.toString()}` : "";
        return requestJson(endpoint, `/games/${encodeURIComponent(gameId)}/playable/${encodeURIComponent(type)}${suffix}`, { token });
      },
      detail: (gameId: string, type: string, id: string) =>
        requestJson(endpoint, `/games/${encodeURIComponent(gameId)}/playable/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { token }),
      save: <T = Record<string, unknown>>(gameId: string, type: string, id: string, patch: Partial<T>) =>
        requestJson<T>(endpoint, `/games/${encodeURIComponent(gameId)}/playable/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { method: "PATCH", body: patch, token }),
      listAssets: (gameId: string, type: string, id: string) =>
        requestJson(endpoint, `/games/${encodeURIComponent(gameId)}/playable/${encodeURIComponent(type)}/${encodeURIComponent(id)}/assets`, { token }),
      saveAssets: <T = Record<string, unknown>>(gameId: string, type: string, id: string, assets: T[]) =>
        requestJson<T[]>(endpoint, `/games/${encodeURIComponent(gameId)}/playable/${encodeURIComponent(type)}/${encodeURIComponent(id)}/assets`, { method: "PATCH", body: { assets }, token }),
      export: (gameId: string, type?: string) => {
        const suffix = type ? `?type=${encodeURIComponent(type)}` : "";
        return requestJson(endpoint, `/games/${encodeURIComponent(gameId)}/playable/export${suffix}`, { token });
      },
      import: (gameId: string, payload: Record<string, unknown>) =>
        requestJson(endpoint, `/games/${encodeURIComponent(gameId)}/playable/import`, { body: payload, token }),
    },
    content: {
      metadata: () => requestJson(endpoint, "/metadata", { token }),
      saveMetadata: (metadata: AppMetadata) => requestJson(endpoint, "/metadata", { method: "PATCH", body: metadata, token }),
      saveNews: (news: AppNewsEntry[]) => requestJson(endpoint, "/news", { method: "POST", body: { news }, token }),
      saveNotifications: (notifications: AppNotificationEntry[]) => requestJson(endpoint, "/notifications", { method: "POST", body: { notifications }, token }),
    },
    support: {
      listTickets: () => requestJson(endpoint, "/support/tickets", { token }),
      saveTicket: (ticket: AppSupportTicket) => requestJson(endpoint, `/support/tickets/${encodeURIComponent(ticket.id)}`, { method: "PATCH", body: ticket, token }),
    },
    chat: {
      listMessages: (roomId: string, channelId: string) =>
        requestJson(endpoint, `/chat/rooms/${encodeURIComponent(roomId)}/channels/${encodeURIComponent(channelId)}/messages`, { token }),
      sendMessage: (message: PlatformChatMessage) =>
        requestJson(endpoint, `/chat/rooms/${encodeURIComponent(message.roomId)}/channels/${encodeURIComponent(message.channelId)}/messages`, { body: message, token }),
    },
    saves: {
      list: (userId: string, gameId?: string) => {
        const query = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
        return requestJson(endpoint, `/users/${encodeURIComponent(userId)}/saves${query}`, { token });
      },
      save: (save: PlayerSave) =>
        requestJson(endpoint, `/users/${encodeURIComponent(save.userId ?? "")}/saves/${encodeURIComponent(save.saveId)}`, { method: "PATCH", body: save, token }),
    },
    audit: {
      append: (entry: PlatformAuditEntry) => requestJson(endpoint, "/audit", { body: entry, token }),
      list: (limit = 100) => requestJson(endpoint, `/audit?limit=${limit}`, { token }),
    },
  };
}
