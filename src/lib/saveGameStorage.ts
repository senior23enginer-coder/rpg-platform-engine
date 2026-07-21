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
      characterSetup?: {
        mode?: "guided" | "free";
        playerCount?: number;
        originId?: string;
        originName?: string;
        gender?: string;
        age?: string;
        notes?: string;
        selectedCharacterIds?: string[];
        survivalEnabled?: boolean;
      };
      campaign: {
      id: string;
      progressPercent: number;
      currentMission?: string;
      currentZone: string;
      route: string[];
      visitedZones: string[];
      currentStep: number;
      level: number;
      sessions: number;
      playTimeHours: number;
      daysElapsed: number;
      playStartedAt?: string;
      lastLoadedAt?: string;
    };
    contentEnabled: {
      dlc: string[];
      features: string[];
      extras: string[];
    };
    variables: Record<string, unknown>;
  };
  configSnapshot: {
    gameConfigPath?: string;
    rules?: string;
    templates?: string;
    characterSheet?: string;
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
  const contentEnabled = {
    dlc: game.content.dlc.filter((item) => item.enabled).map((item) => item.id),
    features: game.content.features.filter((item) => item.enabled).map((item) => item.id),
    extras: game.content.extras.filter((item) => item.enabled).map((item) => item.id),
  };

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
      characterSetup: {
        mode: save.gameMode,
        playerCount: save.playerCount,
        originId: save.characterOriginId,
        originName: save.characterOriginName,
        gender: save.characterGender,
        age: save.characterAge,
        notes: save.characterNotes,
        selectedCharacterIds: save.selectedCharacterIds,
        survivalEnabled: save.survivalEnabled,
      },
      campaign: {
        id: save.campaignId,
        progressPercent: save.progressPercent ?? 0,
        currentMission: save.currentMission,
        currentZone: save.currentZone,
        route: save.route ?? [],
        visitedZones: save.visitedZones ?? [save.currentZone],
        currentStep: save.currentStep ?? 0,
        level: save.level,
        sessions: save.sessions,
        playTimeHours: save.playTimeHours ?? 0,
        daysElapsed: save.daysElapsed ?? 0,
        playStartedAt: save.playStartedAt,
        lastLoadedAt: save.lastLoadedAt,
      },
      contentEnabled,
      variables: {
        campaignState: save.campaignState ?? {},
      },
    },
    configSnapshot: {
      gameConfigPath: game.configPath,
      rules: game.rules,
      templates: game.templates,
      characterSheet: game.characterSheet,
      contentEnabled,
    },
  };
}
