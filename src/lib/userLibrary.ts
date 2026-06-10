import type { PlayerProfile } from "../types/profile";

const userProfileModules = import.meta.glob("/public/users/*/profile.json", {
  eager: true,
  query: "?raw",
  import: "default",
});

function normalizePublicPath(path: string) {
  return path.replace(/^\/public\//, "/").replace(/^public\//, "/").replace(/\\/g, "/");
}

export function resolveUserAsset(profile: PlayerProfile, path?: string) {
  if (!path) return undefined;
  if (/^(https?:|data:|blob:|\/)/.test(path)) return normalizePublicPath(path);
  return `${profile.basePath ?? `/users/${profile.id}`}/${path}`.replace(/\/{2,}/g, "/");
}

export function normalizeUserProfile(profile: PlayerProfile, profilePath?: string): PlayerProfile {
  const id = profile.id.trim();
  const basePath = profilePath
    ? normalizePublicPath(profilePath).replace(/\/profile\.json$/, "")
    : profile.basePath ?? `/users/${id}`;

  return {
    ...profile,
    id,
    basePath,
    profilePath: profilePath ? normalizePublicPath(profilePath) : profile.profilePath ?? `${basePath}/profile.json`,
  };
}

export function loadBundledUserProfiles(): PlayerProfile[] {
  return Object.entries(userProfileModules)
    .map(([path, raw]) => {
      try {
        return normalizeUserProfile(JSON.parse(String(raw)) as PlayerProfile, path);
      } catch (error) {
        console.warn("Invalid bundled user profile:", path, error);
        return null;
      }
    })
    .filter((profile): profile is PlayerProfile => Boolean(profile));
}
