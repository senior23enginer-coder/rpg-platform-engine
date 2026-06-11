import type { GameConfig } from "../types/game";
import type { PlayerProfile, PlayerSave } from "../types/profile";

export type SavedGameDocument = {
  schemaVersion: 1;
  save: PlayerSave;
  user: {
    id: string;
    name: string;
    username?: string;
  };
  game: {
    id: string;
    name: string;
    configPath?: string;
  };
  state: {
    characterName: string;
    attributes?: Record<string, number>;
    contentEnabled: {
      dlc: string[];
      features: string[];
      extras: string[];
    };
  };
};

export function getSaveGameDirectory(gameId: string, userId: string, saveId: string) {
  return `/games/${gameId}/saves/${userId}/${saveId}`;
}

export function getSaveGamePath(gameId: string, userId: string, saveId: string) {
  return `${getSaveGameDirectory(gameId, userId, saveId)}/save.game.json`;
}

export function createSaveGameDocument({
  game,
  profile,
  save,
  attributes,
}: {
  game: GameConfig;
  profile: PlayerProfile;
  save: PlayerSave;
  attributes?: Record<string, number>;
}): SavedGameDocument {
  return {
    schemaVersion: 1,
    save,
    user: {
      id: profile.id,
      name: profile.name,
      username: profile.username,
    },
    game: {
      id: game.id,
      name: game.name,
      configPath: game.configPath,
    },
    state: {
      characterName: save.playerName,
      attributes,
      contentEnabled: {
        dlc: game.content.dlc.filter((item) => item.enabled).map((item) => item.id),
        features: game.content.features.filter((item) => item.enabled).map((item) => item.id),
        extras: game.content.extras.filter((item) => item.enabled).map((item) => item.id),
      },
    },
  };
}
