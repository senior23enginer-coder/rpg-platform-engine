export type AppActivityEntry = {
  id: string;
  label: string;
  createdAt: string;
};

export type AppNewsEntry = {
  id: string;
  title: string;
  publishedAt: string;
};

export type AppMetadata = {
  version: string;
  recentActivity: AppActivityEntry[];
  news: AppNewsEntry[];
};

const APP_METADATA_KEY = "rpg-platform.app-metadata.v1";

const defaultMetadata: AppMetadata = {
  version: "0.8",
  recentActivity: [],
  news: [],
};

function normalizeMetadata(metadata: Partial<AppMetadata>): AppMetadata {
  return {
    version: metadata.version || defaultMetadata.version,
    recentActivity: Array.isArray(metadata.recentActivity) ? metadata.recentActivity : [],
    news: Array.isArray(metadata.news) ? metadata.news : [],
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
