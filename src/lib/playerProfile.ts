import type { GameConfig } from "../types/game";
import type { PlayerProfile, PlayerSave, UserSettings } from "../types/profile";

const PROFILE_KEY = "rpg-platform.player-profile.v1";

export const defaultSettings: UserSettings = {
  theme: "dark",
  hudColor: "green",
  animatedBackground: true,
  audioEnabled: false,
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
      name: "Megaton - Exploracion",
      currentMission: "Envio de agua limpia",
      currentZone: "Megaton",
      level: 18,
      updatedAt: "2026-06-09T14:32:00-05:00",
    },
    {
      saveId: "fo3_metro_002",
      gameId: "fallout3",
      campaignId: fallout3?.campaigns[0]?.id ?? "vault101_megaton",
      name: "Estacion de Metro Central",
      currentMission: "Explorar tuneles del metro",
      currentZone: "Metro Central",
      level: 12,
      updatedAt: "2026-06-08T23:11:00-05:00",
    },
    {
      saveId: "fo4_sanctuary_001",
      gameId: "fallout4",
      campaignId: fallout4?.campaigns[0]?.id ?? "sanctuary_commonwealth",
      name: "Sanctuary - Reconstruccion",
      currentMission: "Reforzar el asentamiento",
      currentZone: "Sanctuary",
      level: 7,
      updatedAt: "2026-06-07T19:07:00-05:00",
    },
  ];
}

export function createDefaultProfile(games: GameConfig[]): PlayerProfile {
  const saves = seedSaves(games);
  return {
    id: "local-operator",
    name: "Operador",
    email: "operador@vault.local",
    avatar: "local",
    level: 42,
    signedIn: false,
    activeGameId: games[0]?.id ?? "fallout3",
    saves,
    history: games.map((game, index) => ({
      gameId: game.id,
      sessions: index < 2 ? 3 - index : 0,
      lastPlayedAt: index === 0 ? "2026-06-09T14:32:00-05:00" : "2026-06-07T19:07:00-05:00",
      activeCampaignId: game.campaigns[0]?.id,
      activeSaveId: saves.find((save) => save.gameId === game.id)?.saveId,
    })),
    settings: defaultSettings,
  };
}

export function loadProfile(games: GameConfig[]): PlayerProfile {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return createDefaultProfile(games);
    const parsed = JSON.parse(raw) as PlayerProfile;
    return {
      ...createDefaultProfile(games),
      ...parsed,
      settings: {
        ...defaultSettings,
        ...parsed.settings,
        tracks: { ...defaultSettings.tracks, ...parsed.settings?.tracks },
        volumes: { ...defaultSettings.volumes, ...parsed.settings?.volumes },
      },
    };
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
