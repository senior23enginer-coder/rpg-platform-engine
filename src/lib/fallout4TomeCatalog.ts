import type { GameConfig, GameMap } from "../types/game";

const tomeCatalogModules = import.meta.glob("/public/games/*/templates/templates.json", {
  eager: true,
  query: "?raw",
  import: "default",
});

type TomeCatalogItem = {
  id?: string;
  name?: string;
  originalName?: string;
  templateType?: string;
  playableStatus?: string;
  sourceTome?: string;
  type?: string;
  category?: string;
  biome?: string;
  risk?: string | number;
  settlement?: boolean;
  enemies?: string[];
  subzones?: string[];
  summary?: string;
  useInPlay?: string;
  hp?: number;
  threat?: number;
  unlock?: string;
  collectibleType?: string;
  location?: string;
  locationId?: string;
  subzone?: string;
  apRule?: string;
  activation?: string;
  execution?: string;
  completion?: string;
};

type TomeTemplates = {
  counts?: Record<string, number>;
  catalogs?: {
    missions?: TomeCatalogItem[];
    locations?: TomeCatalogItem[];
    bestiary?: TomeCatalogItem[];
    weapons?: TomeCatalogItem[];
    equipment?: TomeCatalogItem[];
    settlements?: TomeCatalogItem[];
    factions?: TomeCatalogItem[];
    collectibles?: TomeCatalogItem[];
  };
  gameplayTemplates?: Array<{ id: string; name: string; rule?: string; sourceTomes?: string[] }>;
};

export type Fallout4TomeMapLibrary = Pick<GameMap, "missionSheets" | "locations" | "weatherEffects" | "biomes" | "arsenal"> & {
  counts: Record<string, number>;
  factions: Array<{ id: string; name: string; description?: string }>;
  settlements: Array<{ id: string; name: string; description?: string }>;
};

function normalizePublicPath(path: string) {
  return path.replace(/^\/public\//, "/").replace(/^public\//, "/").replace(/\\/g, "/");
}

function readTemplates(game: GameConfig): TomeTemplates | undefined {
  const basePath = game.basePath ?? `/games/${game.id}`;
  const expectedPath = `${basePath}/templates/templates.json`;
  const entry = Object.entries(tomeCatalogModules).find(([path]) => normalizePublicPath(path) === expectedPath);
  if (!entry) return undefined;
  try {
    return JSON.parse(String(entry[1])) as TomeTemplates;
  } catch {
    return undefined;
  }
}

function riskToDanger(risk?: string | number) {
  if (typeof risk === "number") return Math.max(1, Math.min(5, Math.round(risk)));
  const value = String(risk ?? "").toLowerCase();
  if (value.includes("alto") || value.includes("extremo")) return 4;
  if (value.includes("medio")) return 2;
  if (value.includes("bajo")) return 1;
  return 3;
}

function uniqById<T extends { id: string }>(items: T[]) {
  const byId = new Map<string, T>();
  for (const item of items) byId.set(item.id, item);
  return [...byId.values()];
}

export function buildFallout4TomeMapLibrary(game: GameConfig): Fallout4TomeMapLibrary | undefined {
  const templates = readTemplates(game);
  const catalogs = templates?.catalogs;
  if (!catalogs) return undefined;

  const locations = uniqById([
    ...(catalogs.locations ?? []).map((item) => ({
      id: item.id ?? item.name ?? "location",
      name: item.name ?? item.id ?? "Ubicacion",
      biome: item.biome ?? item.category ?? (item.settlement ? "Asentamiento" : "Commonwealth"),
      danger: riskToDanger(item.risk),
      description: item.summary ?? item.useInPlay ?? String(item.risk ?? "Ficha de ubicacion del tomo."),
    })),
    ...(catalogs.settlements ?? []).map((item) => ({
      id: item.id ?? item.name ?? "settlement",
      name: item.name ?? item.id ?? "Asentamiento",
      biome: "Asentamiento",
      danger: 2,
      description: item.unlock ?? item.useInPlay ?? "Asentamiento configurable desde TOMO 07.",
    })),
  ]);

  const biomes = uniqById(
    locations
      .map((location) => location.biome)
      .filter((biome): biome is string => Boolean(biome))
      .map((biome) => ({
        id: `biome_${biome.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        name: biome,
        movementModifier: biome.toLowerCase().includes("agua") || biome.toLowerCase().includes("montana") ? 2 : biome.toLowerCase().includes("urbano") ? 0 : 1,
        encounterRisk: locations.filter((location) => location.biome === biome).reduce((sum, location) => sum + (location.danger ?? 1), 0) / Math.max(1, locations.filter((location) => location.biome === biome).length),
        description: `Bioma extraido del atlas/tomos para ${biome}.`,
      }))
  );

  const missionSheets = (catalogs.missions ?? []).map((mission) => ({
    id: mission.id ?? mission.name ?? "mission",
    title: mission.name ?? mission.originalName ?? mission.id ?? "Mision",
    objective: [mission.activation, mission.execution, mission.completion, mission.useInPlay].filter(Boolean).join(" | ") || "Mision extraida de TOMO 02.",
    locationId: mission.locationId,
    recommendedLevel: mission.type === "main" ? 1 : 2,
    status: "ready" as const,
  }));

  const weatherEffects = [
    { id: "weather_clear", name: "Despejado", visibility: 100, movementModifier: 0, description: "Condicion base sin penalizadores." },
    { id: "weather_radstorm", name: "Tormenta radiactiva", visibility: 45, movementModifier: 1, damage: "radiacion", description: "TOMO 10: clima hostil, radiacion y visibilidad limitada." },
    { id: "weather_rain", name: "Lluvia acida", visibility: 65, movementModifier: 1, damage: "desgaste", description: "TOMO 10: afecta movimiento, equipo y rastreo." },
    { id: "weather_night", name: "Noche", visibility: 35, movementModifier: 0, description: "Ciclo dia/noche aplicable a sigilo, percepcion y encuentros." },
  ];

  const arsenal = [
    ...(catalogs.weapons ?? []).map((item) => ({
      id: item.id ?? item.name ?? "weapon",
      name: item.name ?? item.id ?? "Arma",
      category: "weapon" as const,
      tags: [item.sourceTome ?? "TOMO 04", item.playableStatus ?? "template-ready"],
      description: item.useInPlay ?? "Ficha de arma extraida de TOMO 04.",
    })),
    ...(catalogs.equipment ?? []).map((item) => ({
      id: item.id ?? item.name ?? "equipment",
      name: item.name ?? item.id ?? "Equipo",
      category: "equipment" as const,
      tags: [item.sourceTome ?? "TOMO 05", item.playableStatus ?? "template-ready"],
      description: item.useInPlay ?? "Ficha de equipo/objeto extraida de TOMO 05.",
    })),
    ...(catalogs.bestiary ?? []).map((item) => ({
      id: item.id ?? item.name ?? "bestiary",
      name: item.name ?? item.id ?? "Bestiario",
      category: "bestiary" as const,
      tags: [item.sourceTome ?? "TOMO 03", `HP ${item.hp ?? "-"}`, `Amenaza ${item.threat ?? "-"}`],
      description: item.useInPlay ?? "Ficha de bestiario extraida de TOMO 03.",
    })),
    ...(catalogs.factions ?? []).map((item) => ({
      id: item.id ?? item.name ?? "faction",
      name: item.name ?? item.id ?? "Faccion",
      category: "unit" as const,
      tags: [item.sourceTome ?? "TOMO 08", "faccion"],
      description: item.useInPlay ?? "Ficha de faccion extraida de TOMO 08.",
    })),
    ...(catalogs.collectibles ?? []).map((item) => ({
      id: item.id ?? item.name ?? "collectible",
      name: item.name ?? item.id ?? "Coleccionable",
      category: "equipment" as const,
      tags: [item.sourceTome ?? "TOMO 09", item.collectibleType ?? "coleccionable", item.location ?? ""].filter(Boolean),
      description: item.useInPlay ?? item.apRule ?? "Ficha de objeto/coleccionable extraida de TOMO 09.",
    })),
  ];

  return {
    counts: templates.counts ?? {},
    missionSheets,
    locations,
    weatherEffects,
    biomes,
    arsenal: uniqById(arsenal),
    settlements: (catalogs.settlements ?? []).map((item) => ({ id: item.id ?? item.name ?? "settlement", name: item.name ?? item.id ?? "Asentamiento", description: item.unlock ?? item.useInPlay })),
    factions: (catalogs.factions ?? []).map((item) => ({ id: item.id ?? item.name ?? "faction", name: item.name ?? item.id ?? "Faccion", description: item.useInPlay })),
  };
}

export function createFallout4LocationMaps(game: GameConfig): GameMap[] {
  const library = buildFallout4TomeMapLibrary(game);
  if (!library?.locations?.length) return [];
  return library.locations.map((location, index) => {
    const width = 14;
    const height = 10;
    const mission = library.missionSheets?.[index % Math.max(1, library.missionSheets.length)];
    return {
      id: `map_${location.id}`,
      name: `Mapa - ${location.name}`,
      description: location.description,
      width,
      height,
      tileSize: 48,
      backgroundMode: "none",
      gridOpacity: 0.55,
      terrainOpacity: 0.38,
      markerScale: 1,
      nodes: [
        {
          id: `node_${location.id}`,
          name: location.name,
          type: location.biome === "Asentamiento" ? "settlement" : "location",
          x: 1,
          y: 1,
          biome: location.biome,
          danger: location.danger,
          locationId: location.id,
          missionId: mission?.id,
          movementCost: location.biome === "Asentamiento" ? 1 : 2,
          coverage: location.biome?.toLowerCase().includes("urbano") ? "heavy" : "light",
          connections: [],
        },
      ],
      tiles: Array.from({ length: width * height }, (_, tileIndex) => ({
        x: tileIndex % width,
        y: Math.floor(tileIndex / width),
        terrain: location.biome === "Asentamiento" ? "base" : location.biome?.toLowerCase().includes("urbano") ? "city" : "plain",
      })),
      markers: [
        { id: `marker_location_${location.id}`, x: 1, y: 1, type: "objective", label: location.name, biome: location.biome, missionId: mission?.id, movementCost: 1, coverage: "light" },
      ],
      missionSheets: library.missionSheets,
      locations: library.locations,
      weatherEffects: library.weatherEffects,
      biomes: library.biomes,
      arsenal: library.arsenal,
    };
  });
}
