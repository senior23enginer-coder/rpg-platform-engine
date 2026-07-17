export type ThemeMode = "dark" | "light";
export type HudColor = "green" | "amber" | "blue" | "red" | "purple";
export type LanguageCode = "es" | "en";

export type TrackSelection = {
  background?: string;
  combat?: string;
  exploration?: string;
  vault?: string;
  day?: string;
  night?: string;
};

export type UserSettings = {
  language: LanguageCode;
  theme: ThemeMode;
  hudColor: HudColor;
  animatedBackground: boolean;
  audioEnabled: boolean;
  audioPreferenceSaved?: boolean;
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
    atlasWorldRoute?: string[];
    atlasVisitedLocations?: string[];
    atlasVisitedInternalNodes?: string[];
    atlasCompletedSubzones?: string[];
    atlasLocationStates?: Record<string, { visitedNodes: string[]; completedNodes: string[]; loot: string[] }>;
    atlasEnemyStates?: Record<string, { enemyId: string; name: string; hp: number; maxHp: number; defeated: boolean }>;
    missionRuntime?: Record<string, { status: "locked" | "active" | "completed"; currentStep: number; completedSteps: string[]; failedChecks: number }>;
    discoveredCollectibles?: string[];
    activeMissionId?: string;
    activeMissionStep?: number;
    completedMissionSteps?: string[];
    unlockedMissionIds?: string[];
    momentum?: number;
    noise?: number;
    ruleState?: {
      actionPointsSpent: number;
      testsRolled: number;
      combatRounds: number;
      socialChecks: number;
      technicalChecks: number;
      travelActions: number;
      failures: number;
      complications: string[];
      criticalSuccesses?: number;
      criticalFailures?: number;
      damageDealt?: number;
      damageTaken?: number;
      defenseApplied?: number;
      capsEarned?: number;
      capsSpent?: number;
    };
    perkState?: {
      active: string[];
      pendingPerkChoices: number;
      damageBonus: number;
      defenseBonus: number;
      difficultyReduction: number;
    };
    equippedWeaponId?: string;
    equippedArmorId?: string;
    ammo?: Record<string, number>;
    factionReputation?: Record<string, number>;
    settlementStates?: Record<string, { population: number; food: number; water: number; beds: number; defense: number; linked: boolean }>;
    survival?: { hunger: number; thirst: number; sleep: number; disease: number; radiation: number; fatigue: number };
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
