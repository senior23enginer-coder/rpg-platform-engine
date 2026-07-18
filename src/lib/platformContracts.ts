import type { AppMetadata, AppNewsEntry, AppNotificationEntry, AppSupportTicket } from "./appMetadataStorage";
import type { GameConfig } from "../types/game";
import type { PlayerProfile, PlayerSave } from "../types/profile";

export type PlatformPersistenceMode = "local" | "cloud" | "hybrid";

export type PlatformAuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.password_reset"
  | "admin.user.update"
  | "admin.game.update"
  | "admin.news.update"
  | "admin.notification.update"
  | "admin.map.update"
  | "support.ticket.update"
  | "chat.message.send"
  | "savegame.update"
  | "admin.settings.update";

export type PlatformAuditEntry = {
  id: string;
  action: PlatformAuditAction | string;
  actorId: string;
  targetId?: string;
  module: "auth" | "users" | "games" | "maps" | "news" | "notifications" | "support" | "chat" | "saves" | "settings";
  createdAt: string;
  metadata?: Record<string, string | number | boolean | undefined>;
};

export type PlatformSession = {
  id: string;
  userId: string;
  role: PlayerProfile["role"];
  deviceId?: string;
  remember: boolean;
  issuedAt: string;
  expiresAt: string;
  lastActivityAt: string;
  revokedAt?: string;
};

export type PlatformCredentials = {
  usernameOrEmail: string;
  password: string;
  remember: boolean;
};

export type PlatformAuthResult = {
  profile: PlayerProfile;
  session: PlatformSession;
};

export type PlatformMapDocument = {
  id: string;
  gameId: string;
  campaignId?: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  image?: string;
  layers: Array<{
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    tiles?: string[][];
    markers?: Array<{ id: string; type: string; x: number; y: number; label?: string }>;
  }>;
  updatedAt: string;
};

export type PlatformPlayableType =
  | "missions"
  | "locations"
  | "locationMaps"
  | "bestiary"
  | "weapons"
  | "equipment"
  | "settlements"
  | "factions"
  | "collectibles"
  | "weather"
  | "biomes"
  | "nodeTypes";

export type PlatformPlayableListResult<T = Record<string, unknown>> = {
  gameId: string;
  type: PlatformPlayableType | string;
  total: number;
  offset: number;
  limit: number;
  items: T[];
};

export type PlatformPlayableSummary = {
  gameId: string;
  generatedAt?: string;
  counts: Record<string, number>;
  catalogs: Record<string, number>;
  rules: Record<string, number>;
  patches: number;
  mapsSaved: number;
};

export type PlatformChatMessage = {
  id: string;
  roomId: string;
  channelId: string;
  authorId: string;
  body: string;
  type?: "message" | "presence" | "audio" | "system";
  audio?: string;
  mimeType?: string;
  createdAt: string;
};

export type PlatformCloudConfig = {
  provider: "local" | "local-http" | "disabled" | "custom" | "firebase" | "supabase" | "websocket";
  endpoint: string;
  realtimeEndpoint?: string;
  storageBucket?: string;
  region?: string;
};

export type PlatformRepository = {
  mode: PlatformPersistenceMode;
  auth: {
    login(credentials: PlatformCredentials): Promise<PlatformAuthResult>;
    logout(sessionId: string): Promise<void>;
    refreshSession(sessionId: string): Promise<PlatformSession>;
    requestPasswordReset(usernameOrEmail: string): Promise<void>;
  };
  users: {
    list(): Promise<PlayerProfile[]>;
    save(profile: PlayerProfile): Promise<PlayerProfile>;
    block(userId: string, blocked: boolean): Promise<void>;
  };
  games: {
    list(): Promise<GameConfig[]>;
    save(game: GameConfig): Promise<GameConfig>;
  };
  maps: {
    list(gameId?: string): Promise<PlatformMapDocument[]>;
    detail(id: string): Promise<PlatformMapDocument>;
    save(map: PlatformMapDocument): Promise<PlatformMapDocument>;
    export(id: string): Promise<Record<string, unknown>>;
    import(payload: Record<string, unknown>): Promise<PlatformMapDocument>;
  };
  playable: {
    summary(gameId: string): Promise<PlatformPlayableSummary>;
    list<T = Record<string, unknown>>(
      gameId: string,
      type: PlatformPlayableType | string,
      query?: { q?: string; offset?: number; limit?: number }
    ): Promise<PlatformPlayableListResult<T>>;
    detail<T = Record<string, unknown>>(gameId: string, type: PlatformPlayableType | string, id: string): Promise<T>;
    save<T = Record<string, unknown>>(gameId: string, type: PlatformPlayableType | string, id: string, patch: Partial<T>): Promise<T>;
    listAssets<T = Record<string, unknown>>(gameId: string, type: PlatformPlayableType | string, id: string): Promise<T[]>;
    saveAssets<T = Record<string, unknown>>(gameId: string, type: PlatformPlayableType | string, id: string, assets: T[]): Promise<T[]>;
    export(gameId: string, type?: PlatformPlayableType | string): Promise<Record<string, unknown>>;
    import(gameId: string, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
  content: {
    metadata(): Promise<AppMetadata>;
    saveMetadata(metadata: AppMetadata): Promise<AppMetadata>;
    saveNews(news: AppNewsEntry[]): Promise<AppNewsEntry[]>;
    saveNotifications(notifications: AppNotificationEntry[]): Promise<AppNotificationEntry[]>;
  };
  support: {
    listTickets(): Promise<AppSupportTicket[]>;
    saveTicket(ticket: AppSupportTicket): Promise<AppSupportTicket>;
  };
  chat: {
    listMessages(roomId: string, channelId: string): Promise<PlatformChatMessage[]>;
    sendMessage(message: PlatformChatMessage): Promise<PlatformChatMessage>;
  };
  saves: {
    list(userId: string, gameId?: string): Promise<PlayerSave[]>;
    save(save: PlayerSave): Promise<PlayerSave>;
  };
  audit: {
    append(entry: PlatformAuditEntry): Promise<PlatformAuditEntry>;
    list(limit?: number): Promise<PlatformAuditEntry[]>;
  };
};
