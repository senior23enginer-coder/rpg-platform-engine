export type ContentItem = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  thumbnail?: string;
};

export type Campaign = {
  id: string;
  title: string;
  implemented: boolean;
  description?: string;
  image?: string;
};

export type PlayerOption = {
  value: number;
  label: string;
  mode: string;
};

export type GameConfig = {
  id: string;
  name: string;
  short: string;
  description: string;
  loadedDescription?: string;
  cover?: string;
  configPath?: string;
  tags?: string[];
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
  };
  characterSheet?: string;
  rules?: string;
  campaigns: Campaign[];
  content: {
    dlc: ContentItem[];
    features: ContentItem[];
    extras: ContentItem[];
  };
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
