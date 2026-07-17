export type ContentItem = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  thumbnail?: string;
  configPath?: string;
  basePath?: string;
  assets?: {
    thumbnail?: string;
    hero?: string;
    gallery?: string[];
  };
};

export type CampaignCharacter = {
  id: string;
  name: string;
  role?: string;
  sheetImage?: string;
  attributes?: Record<string, number>;
};

export type Campaign = {
  id: string;
  title: string;
  implemented: boolean;
  description?: string;
  image?: string;
  configPath?: string;
  basePath?: string;
  characters?: CampaignCharacter[];
  freeModeSheetImage?: string;
  simulation?: {
    style?: string;
    route?: string[];
    interface?: string;
  };
};

export type MapNodeType = "start" | "settlement" | "dungeon" | "wilds" | "city" | "quest" | "exit";
export type TacticalTerrainType = "plain" | "forest" | "mountain" | "water" | "road" | "city" | "base" | "wall";
export type TacticalMarkerType = "player" | "enemy" | "objective" | "spawn" | "shop";

export type GameMapNode = {
  id: string;
  name: string;
  type: MapNodeType;
  x: number;
  y: number;
  description?: string;
  biome?: string;
  danger?: number;
  connections: string[];
};

export type GameMap = {
  id: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  tileSize?: number;
  background?: string;
  backgroundMode?: "none" | "image";
  backgroundSourceName?: string;
  gridOpacity?: number;
  terrainOpacity?: number;
  markerScale?: number;
  nodes: GameMapNode[];
  tiles?: Array<{
    x: number;
    y: number;
    terrain: TacticalTerrainType;
  }>;
  markers?: Array<{
    id: string;
    x: number;
    y: number;
    type: TacticalMarkerType;
    label: string;
  }>;
};

export type PlayerOption = {
  value: number;
  label: string;
  mode: string;
};

export type NewGameSetupConfig = {
  title?: string;
  subtitle?: string;
  loadedDescription?: string;
  recommended?: {
    title?: string;
    description?: string;
  };
  labels?: {
    species?: string;
    quote?: string;
    system?: string;
    defaultCharacterName?: string;
    fallbackCampaignTitle?: string;
    fallbackMission?: string;
  };
  blocks?: {
    gameLoaded?: string;
    campaign?: string;
    mode?: string;
    players?: string;
    survival?: string;
    content?: string;
  };
  modes?: {
    guided?: {
      label?: string;
      description?: string;
    };
    free?: {
      label?: string;
      description?: string;
    };
  };
  survival?: {
    description?: string;
  };
  content?: {
    description?: string;
  };
  fallbackOrigins?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  fallbackSkills?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  footer?: {
    note?: string;
    guidedStart?: string;
    freeStart?: string;
    guidedHint?: string;
    freeHint?: string;
  };
};

export type GameConfig = {
  id: string;
  name: string;
  short: string;
  description: string;
  loadedDescription?: string;
  category?: string;
  modes?: {
    free?: boolean;
    survival?: boolean;
  };
  cover?: string;
  configPath?: string;
  tags?: string[];
  enabled?: boolean;
  templateFuture?: boolean;
  basePath?: string;
  maxPlayers?: number;
  playerOptions?: PlayerOption[];
  assets?: {
    hero?: string;
    generatedHero?: string;
    homeHero?: string;
    worldPreview?: string;
    campaignImage?: string;
    cover?: string;
    diceCatalog?: string;
    contentThumbs?: Partial<Record<"dlc" | "features" | "extras", string>>;
  };
  manifests?: {
    audio?: string;
    assets?: string;
    coverage?: string;
    runtimeDepth?: string;
  };
  characterSheet?: string;
  rules?: string;
  rulesLibrary?: string;
  businessRules?: string;
  sourceMap?: string;
  baseMechanics?: {
    source: string;
    description?: string;
  };
  templates?: string;
  newGame?: string;
  maps?: GameMap[];
  newGameSetup?: NewGameSetupConfig;
  campaigns: Campaign[];
  content: {
    dlc: ContentItem[];
    features: ContentItem[];
    extras: ContentItem[];
  };
};

export type GameJsonFile = {
  gameId: string;
  path: string;
  relativePath: string;
  fileName: string;
  raw: string;
  isConfig: boolean;
};

export type CharacterAttribute = {
  id: string;
  name: string;
  default: number;
  min?: number;
  max?: number;
};

export type CharacterSheetConfig = {
  creationMode: string;
  attributes: CharacterAttribute[];
  seeds: Array<{
    id: string;
    name: string;
    attributes?: Record<string, number>;
  }>;
};

export type AudioManifest = {
  tracks: Record<string, Array<{
    id: string;
    name: string;
    path?: string;
    mode?: "file" | "generated";
  }>>;
};
