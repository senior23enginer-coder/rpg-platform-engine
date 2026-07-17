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
  target: "all" | "admins" | "users";
  gameId?: string;
  actionLabel?: string;
  actionUrl?: string;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type AppMetadata = {
  version: string;
  recentActivity: AppActivityEntry[];
  news: AppNewsEntry[];
  notifications: AppNotificationEntry[];
};

const APP_METADATA_KEY = "rpg-platform.app-metadata.v1";

const defaultMetadata: AppMetadata = {
  version: "0.8",
  recentActivity: [],
  news: [],
  notifications: [],
};

export function normalizeMetadata(metadata: Partial<AppMetadata>): AppMetadata {
  return {
    version: metadata.version || defaultMetadata.version,
    recentActivity: Array.isArray(metadata.recentActivity) ? metadata.recentActivity : [],
    news: Array.isArray(metadata.news)
      ? metadata.news.map((entry) => ({
          ...entry,
          publishedAt: entry.publishedAt || entry.scheduledAt || new Date().toISOString(),
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
