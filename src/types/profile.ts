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
  assetOverrides?: Record<string, string>;
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
  userId?: string;
  storagePath?: string;
  playerName: string;
  name: string;
  currentMission?: string;
  currentZone: string;
  progressPercent?: number;
  route?: string[];
  visitedZones?: string[];
  currentStep?: number;
  level: number;
  sessions: number;
  playTimeHours?: number;
  playStartedAt?: string;
  lastLoadedAt?: string;
  daysElapsed?: number;
  inGameDayStartedAt?: string;
  campaignState?: {
    sceneId?: string;
    nodeId?: string;
    ap?: number;
    turn?: number;
    visitedNodes?: string[];
    securedNodes?: string[];
    enemyHp?: Record<string, number>;
    actionLog?: string[];
    lastAction?: string;
    atlasLocationId?: string;
    atlasSubzoneIndex?: number;
    atlasVisitedLocations?: string[];
    atlasVisitedInternalNodes?: string[];
    atlasCompletedSubzones?: string[];
    atlasLocationStates?: Record<string, { visitedNodes: string[]; completedNodes: string[]; loot: string[] }>;
    activeMissionId?: string;
    xp?: number;
    caps?: number;
    inventory?: string[];
    updatedAt?: string;
  };
  createdAt?: string;
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
  username?: string;
  role?: "user" | "admin";
  gender?: string;
  password?: string;
  level: number;
  basePath?: string;
  profilePath?: string;
  openSessions: number;
  gameProfilesStarted: number;
  completedCampaigns: number;
  lastActivityAt?: string;
  lastLoginAt?: string;
  previousLastLoginAt?: string;
  passwordResetCode?: string;
  lastPasswordResetRequestAt?: string;
  email?: string;
  avatar?: string;
  avatarFit?: {
    x: number;
    y: number;
    scale: number;
  };
  signedIn: boolean;
  activeGameId: string;
  history: GameHistoryEntry[];
  saves: PlayerSave[];
  settings: UserSettings;
};
