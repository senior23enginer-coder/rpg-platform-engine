import type { GameConfig } from "../types/game";
import type { PlayerProfile, PlayerSave, UserSettings } from "../types/profile";
import { loadBundledUserProfiles } from "./userLibrary";

const PROFILE_KEY = "rpg-platform.player-profile.v5";

export const defaultSettings: UserSettings = {
  language: "es",
  theme: "dark",
  hudColor: "green",
  animatedBackground: true,
  audioEnabled: true,
  audioPreferenceSaved: false,
  assetOverrides: {},
  tracks: {
    background: "01_fallout_4_main_theme",
    combat: "06_combat_ready",
    exploration: "44_explore_and_discover",
    vault: "07_deeper_and_darker",
    day: "09_brightness_calling",
    night: "32_darkness_falls",
  },
  volumes: {
    music: 0.7,
    sfx: 0.8,
    master: 1,
  },
};

export function seedSaves(games: GameConfig[]): PlayerSave[] {
  const fallout3 = games.find((game) => game.id === "fallout3");
  const fallout4 = games.find((game) => game.id === "fallout4");

  return [
    {
      saveId: "fo3_megaton_001",
      gameId: "fallout3",
      campaignId: fallout3?.campaigns[0]?.id ?? "vault101_megaton",
      playerName: "Operador",
      name: "Megaton - Exploracion",
      currentMission: "Envio de agua limpia",
      currentZone: "Megaton",
      level: 18,
      sessions: 0,
      updatedAt: "2026-06-09T14:32:00-05:00",
    },
    {
      saveId: "fo3_metro_002",
      gameId: "fallout3",
      campaignId: fallout3?.campaigns[0]?.id ?? "vault101_megaton",
      playerName: "Operador",
      name: "Estacion de Metro Central",
      currentMission: "Explorar tuneles del metro",
      currentZone: "Metro Central",
      level: 12,
      sessions: 0,
      updatedAt: "2026-06-08T23:11:00-05:00",
    },
    {
      saveId: "fo4_sanctuary_001",
      gameId: "fallout4",
      campaignId: fallout4?.campaigns[0]?.id ?? "sanctuary_commonwealth",
      playerName: "Operador",
      name: "Sanctuary - Reconstruccion",
      currentMission: "Reforzar el asentamiento",
      currentZone: "Sanctuary",
      level: 7,
      sessions: 0,
      updatedAt: "2026-06-07T19:07:00-05:00",
    },
  ];
}

function createBlankDefaultProfile(games: GameConfig[]): PlayerProfile {
  return {
    id: "invitado-local",
    name: "Invitado local",
    username: "invitado-local",
    gender: "",
    password: "",
    email: "",
    avatar: "avatar.svg",
    basePath: "/users/invitado-local",
    profilePath: "/users/invitado-local/profile.json",
    level: 1,
    openSessions: 0,
    gameProfilesStarted: 0,
    completedCampaigns: 0,
    lastActivityAt: undefined,
    lastLoginAt: undefined,
    previousLastLoginAt: undefined,
    passwordResetCode: undefined,
    lastPasswordResetRequestAt: undefined,
    signedIn: false,
    avatarFit: { x: 50, y: 50, scale: 1 },
    activeGameId: games[0]?.id ?? "fallout3",
    saves: [],
    history: [],
    settings: defaultSettings,
  };
}

export function normalizeProfile(profile: PlayerProfile, games: GameConfig[], fallback = createBlankDefaultProfile(games)): PlayerProfile {
  const saves = (profile.saves ?? []).map((save) => ({
    ...save,
    playerName: save.playerName ?? save.name?.split(" - ")[0] ?? profile.name ?? "Invitado local",
    sessions: save.sessions ?? 0,
  }));
  const latestActivity = [
    profile.lastActivityAt,
    ...saves.map((save) => save.updatedAt),
    ...(profile.history ?? []).map((entry) => entry.lastPlayedAt),
  ]
    .filter(Boolean)
    .map((date) => new Date(String(date)))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  return {
    ...fallback,
    ...profile,
    name: profile.name || fallback.name,
    username: profile.username ?? fallback.username,
    gender: profile.gender ?? fallback.gender,
    password: profile.password ?? fallback.password,
    passwordHash: profile.passwordHash ?? fallback.passwordHash,
    passwordUpdatedAt: profile.passwordUpdatedAt ?? fallback.passwordUpdatedAt,
    blocked: profile.blocked ?? fallback.blocked ?? false,
    permissions: profile.permissions ?? fallback.permissions ?? {},
    level: profile.level ?? 1,
    avatar: profile.avatar === "local" ? fallback.avatar : profile.avatar ?? fallback.avatar,
    basePath: profile.avatar === "local" ? fallback.basePath : profile.basePath ?? fallback.basePath,
    profilePath: profile.profilePath ?? fallback.profilePath,
    openSessions: profile.openSessions ?? 0,
    gameProfilesStarted: profile.gameProfilesStarted ?? saves.length,
    completedCampaigns: profile.completedCampaigns ?? 0,
    lastActivityAt: latestActivity?.toISOString(),
    lastLoginAt: profile.lastLoginAt ?? fallback.lastLoginAt,
    previousLastLoginAt: profile.previousLastLoginAt ?? fallback.previousLastLoginAt,
    passwordResetCode: profile.passwordResetCode ?? fallback.passwordResetCode,
    lastPasswordResetRequestAt: profile.lastPasswordResetRequestAt ?? fallback.lastPasswordResetRequestAt,
    avatarFit: profile.avatarFit ?? fallback.avatarFit,
    saves,
    history: profile.history ?? [],
    settings: {
      ...defaultSettings,
      ...profile.settings,
      audioEnabled: profile.settings?.audioPreferenceSaved ? profile.settings.audioEnabled : defaultSettings.audioEnabled,
      audioPreferenceSaved: profile.settings?.audioPreferenceSaved ?? defaultSettings.audioPreferenceSaved,
      tracks: { ...defaultSettings.tracks, ...profile.settings?.tracks },
      volumes: { ...defaultSettings.volumes, ...profile.settings?.volumes },
    },
  };
}

export function createDefaultProfile(games: GameConfig[]): PlayerProfile {
  const bundledUser = loadBundledUserProfiles()[0];
  return normalizeProfile(bundledUser ?? createBlankDefaultProfile(games), games);
}

export function loadProfile(games: GameConfig[]): PlayerProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return createDefaultProfile(games);
    const parsed = JSON.parse(raw) as PlayerProfile;
    return normalizeProfile(parsed, games);
  } catch {
    return createDefaultProfile(games);
  }
}

export function saveProfile(profile: PlayerProfile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getGameSaves(profile: PlayerProfile, gameId: string) {
  return profile.saves
    .filter((save) => save.gameId === gameId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getActiveSave(profile: PlayerProfile, gameId: string) {
  const activeId = profile.history.find((entry) => entry.gameId === gameId)?.activeSaveId;
  const saves = getGameSaves(profile, gameId);
  return saves.find((save) => save.saveId === activeId) ?? saves[0];
}

export function getActiveCampaign(game: GameConfig, profile: PlayerProfile) {
  const campaignId = profile.history.find((entry) => entry.gameId === game.id)?.activeCampaignId;
  return game.campaigns.find((campaign) => campaign.id === campaignId) ?? game.campaigns[0];
}
