export type AppActivityEntry = {
  id: string;
  label: string;
  createdAt: string;
};

export type AppNewsEntry = {
  id: string;
  title: string;
  publishedAt: string;
  summary?: string;
  body?: string;
  gameId?: string;
  image?: string;
  gallery?: string[];
  status?: "draft" | "scheduled" | "published" | "archived";
  scheduledAt?: string;
  updatedAt?: string;
};

export type AppNotificationEntry = {
  id: string;
  title: string;
  message: string;
  platform: "android" | "ios" | "both";
  channel: "system" | "news" | "game" | "security" | "event";
  priority: "low" | "normal" | "high";
  status: "draft" | "scheduled" | "sent" | "archived";
  target: "platform" | "all" | "admins" | "users" | "group" | "user";
  targetGroup?: string;
  targetUserId?: string;
  gameId?: string;
  actionLabel?: string;
  actionUrl?: string;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type AppSupportTicket = {
  id: string;
  title: string;
  description: string;
  requesterId: string;
  requesterName: string;
  status: "open" | "in_progress" | "waiting_user" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "critical";
  category: "technical" | "account" | "game" | "billing" | "other";
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
  messages: Array<{
    id: string;
    authorId: string;
    authorName: string;
    body: string;
    createdAt: string;
  }>;
};

export type AppMetadata = {
  version: string;
  platformName: string;
  releaseChannel: string;
  languagesEnabled: Array<"es" | "en">;
  localizedText: Record<"es" | "en", { platformTitle: string; tagline: string; loginSubtitle: string }>;
  platformIcons: Record<string, string>;
  platformAudio: Record<string, string>;
  chatRelayUrl: string;
  chatRoom: string;
  recentActivity: AppActivityEntry[];
  news: AppNewsEntry[];
  notifications: AppNotificationEntry[];
  supportTickets: AppSupportTicket[];
};

const APP_METADATA_KEY = "rpg-platform.app-metadata.v1";

const defaultMetadata: AppMetadata = {
  version: "0.10-1625",
  platformName: "RPG Platform Engine",
  releaseChannel: "Pre-release",
  languagesEnabled: ["es", "en"],
  localizedText: {
    es: {
      platformTitle: "RPG Platform Engine",
      tagline: "Tu universo. Tu historia. Tu aventura.",
      loginSubtitle: "Accede a tu cuenta para continuar.",
    },
    en: {
      platformTitle: "RPG Platform Engine",
      tagline: "Your universe. Your story. Your adventure.",
      loginSubtitle: "Sign in to continue.",
    },
  },
  platformIcons: {
    logo: "/platform/uiux-icons/brand-gear.png",
    favicon: "/platform/vault-boy-favicon.svg",
    notification: "/platform/uiux-icons/notification.png",
  },
  platformAudio: {
    loginMain: "/audio/fallout-4-main-theme.mp3",
    ambientDefault: "/audio/fallout-4-main-theme.mp3",
    combatDefault: "/audio/combat-ready.mp3",
  },
  chatRelayUrl: "https://cloud.rpg-platform.local/realtime",
  chatRoom: "mesa-rpg",
  recentActivity: [],
  news: [],
  notifications: [],
  supportTickets: [],
};

export function normalizeMetadata(metadata: Partial<AppMetadata>): AppMetadata {
  return {
    version: metadata.version || defaultMetadata.version,
    platformName: metadata.platformName || defaultMetadata.platformName,
    releaseChannel: metadata.releaseChannel || defaultMetadata.releaseChannel,
    languagesEnabled: Array.isArray(metadata.languagesEnabled) && metadata.languagesEnabled.length ? metadata.languagesEnabled : defaultMetadata.languagesEnabled,
    localizedText: {
      es: { ...defaultMetadata.localizedText.es, ...(metadata.localizedText?.es ?? {}) },
      en: { ...defaultMetadata.localizedText.en, ...(metadata.localizedText?.en ?? {}) },
    },
    platformIcons: { ...defaultMetadata.platformIcons, ...(metadata.platformIcons ?? {}) },
    platformAudio: { ...defaultMetadata.platformAudio, ...(metadata.platformAudio ?? {}) },
    chatRelayUrl: metadata.chatRelayUrl || defaultMetadata.chatRelayUrl,
    chatRoom: metadata.chatRoom || defaultMetadata.chatRoom,
    recentActivity: Array.isArray(metadata.recentActivity) ? metadata.recentActivity : [],
    news: Array.isArray(metadata.news)
      ? metadata.news.map((entry) => ({
          ...entry,
          publishedAt: entry.publishedAt || entry.scheduledAt || new Date().toISOString(),
          gallery: Array.isArray(entry.gallery) ? entry.gallery : [],
          status: entry.status ?? "published",
        }))
      : [],
    notifications: Array.isArray(metadata.notifications)
      ? metadata.notifications.map((entry) => ({
          ...entry,
          platform: entry.platform ?? "both",
          channel: entry.channel ?? "system",
          priority: entry.priority ?? "normal",
          status: entry.status ?? "sent",
          target: entry.target ?? "all",
          createdAt: entry.createdAt ?? new Date().toISOString(),
        }))
      : [],
    supportTickets: Array.isArray(metadata.supportTickets)
      ? metadata.supportTickets.map((ticket) => ({
          ...ticket,
          status: ticket.status ?? "open",
          priority: ticket.priority ?? "normal",
          category: ticket.category ?? "technical",
          createdAt: ticket.createdAt ?? new Date().toISOString(),
          messages: Array.isArray(ticket.messages) ? ticket.messages : [],
        }))
      : [],
  };
}

export function loadAppMetadata(): AppMetadata {
  try {
    const raw = window.localStorage.getItem(APP_METADATA_KEY);
    if (!raw) return defaultMetadata;
    return normalizeMetadata(JSON.parse(raw) as Partial<AppMetadata>);
  } catch {
    return defaultMetadata;
  }
}

export function saveAppMetadata(metadata: AppMetadata) {
  window.localStorage.setItem(APP_METADATA_KEY, JSON.stringify(normalizeMetadata(metadata)));
}

export function createActivity(label: string): AppActivityEntry {
  return {
    id: `activity_${Date.now()}`,
    label,
    createdAt: new Date().toISOString(),
  };
}
