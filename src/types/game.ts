export type ContentItem = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
};

export type Campaign = {
  id: string;
  title: string;
  implemented: boolean;
  description?: string;
};

export type GameConfig = {
  id: string;
  name: string;
  short: string;
  description: string;
  cover?: string;
  configPath?: string;
  tags?: string[];
  templateFuture?: boolean;
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
