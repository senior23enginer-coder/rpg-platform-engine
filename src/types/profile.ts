export type ThemeMode = "dark" | "light";
export type HudColor = "green" | "amber" | "blue" | "red" | "purple";

export type TrackSelection = {
  background?: string;
  combat?: string;
  exploration?: string;
  vault?: string;
  day?: string;
  night?: string;
};

export type UserSettings = {
  theme: ThemeMode;
  hudColor: HudColor;
  animatedBackground: boolean;
  audioEnabled: boolean;
  tracks: TrackSelection;
  volumes: {
    music: number;
    sfx: number;
    master: number;
  };
};

export type PlayerSave = {
  saveId: string;
  gameId: string;
  campaignId: string;
  playerName: string;
  name: string;
  currentMission?: string;
  currentZone: string;
  level: number;
  sessions: number;
  updatedAt: string;
};

export type GameHistoryEntry = {
  gameId: string;
  lastPlayedAt: string;
  sessions: number;
  activeCampaignId?: string;
  activeSaveId?: string;
};

export type PlayerProfile = {
  id: string;
  name: string;
  level: number;
  basePath?: string;
  profilePath?: string;
  openSessions: number;
  gameProfilesStarted: number;
  completedCampaigns: number;
  lastActivityAt?: string;
  email?: string;
  avatar?: string;
  signedIn: boolean;
  activeGameId: string;
  history: GameHistoryEntry[];
  saves: PlayerSave[];
  settings: UserSettings;
};
