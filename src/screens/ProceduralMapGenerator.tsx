import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Download, FileJson, Hammer, Layers, Map as MapIcon, Route, Save, Shuffle, SlidersHorizontal } from "lucide-react";
import type { GameConfig, GameMap, MapNodeType, TacticalMarkerType, TacticalTerrainType } from "../types/game";
import { buildFallout4TomeMapLibrary } from "../lib/fallout4TomeCatalog";

type Props = {
  game: GameConfig;
  onSaveMap: (map: GameMap) => void;
};

type AssetCatalog = {
  buildingTemplates: BuildingTemplate[];
  poiLabels: string[];
  propLabels: string[];
};

type BuildingTemplate = {
  id: string;
  label: string;
  type: TacticalMarkerType;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  floors: number;
  roofAccessible: boolean;
  importance: number;
};

type GeneratorConfig = {
  seed: string;
  name: string;
  sourceId: string;
  mapKind: MapKind;
  widthMeters: number;
  heightMeters: number;
  gridSizeMeters: number;
  buildingCount: number;
  nodeTarget: number;
  destruction: number;
  coverDensity: number;
  roadComplexity: number;
  roofLinks: number;
};

type MapKind = "auto" | "urban" | "settlement" | "vault" | "wilderness" | "industrial" | "interior" | "road";

type SourceProfile = {
  id: string;
  label: string;
  kind: MapKind;
  sourceType: "tomeLocationMap" | "tomeLocation" | "existingMap" | "campaign" | "free";
  width?: number;
  height?: number;
  biome?: string;
  danger?: number;
  description?: string;
  locationId?: string;
  missionId?: string;
  terrain?: TacticalTerrainType;
  labels: string[];
  props: string[];
  enemies: string[];
  sourceTomes: string[];
};

type GeneratedBuilding = {
  id: string;
  label: string;
  templateId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floors: number;
  damage: number;
  roofAccessible: boolean;
  markerType: TacticalMarkerType;
};

type GeneratedProp = {
  id: string;
  label: string;
  x: number;
  y: number;
  markerType: TacticalMarkerType;
};

type GeneratedCity = {
  map: GameMap;
  buildings: GeneratedBuilding[];
  props: GeneratedProp[];
  roads: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  validation: string[];
};

const defaultCatalog: AssetCatalog = {
  buildingTemplates: [
    { id: "church", label: "Iglesia", type: "objective", minW: 3, maxW: 5, minH: 4, maxH: 6, floors: 3, roofAccessible: true, importance: 10 },
    { id: "museum", label: "Museo", type: "objective", minW: 4, maxW: 6, minH: 3, maxH: 5, floors: 2, roofAccessible: true, importance: 8 },
    { id: "library", label: "Biblioteca", type: "objective", minW: 4, maxW: 6, minH: 3, maxH: 5, floors: 2, roofAccessible: false, importance: 7 },
    { id: "colonial_house", label: "Casa colonial", type: "spawn", minW: 2, maxW: 4, minH: 2, maxH: 4, floors: 2, roofAccessible: false, importance: 3 },
  ],
  poiLabels: ["Concord Church", "Museum of Freedom", "Public Library", "Concord Crossroads"],
  propLabels: ["Auto abandonado", "Barricada", "Escombros", "Crater"],
};

const defaultConfig: GeneratorConfig = {
  seed: "rpg-seed-2287",
  name: "Mapa procedural",
  sourceId: "auto",
  mapKind: "auto",
  widthMeters: 120,
  heightMeters: 90,
  gridSizeMeters: 5,
  buildingCount: 18,
  nodeTarget: 140,
  destruction: 68,
  coverDensity: 56,
  roadComplexity: 64,
  roofLinks: 3,
};

function riskToDanger(risk?: string | number) {
  if (typeof risk === "number") return clamp(Math.round(risk), 1, 5);
  const value = String(risk ?? "").toLowerCase();
  if (value.includes("extremo") || value.includes("alto")) return 4;
  if (value.includes("medio")) return 3;
  if (value.includes("bajo")) return 1;
  return 2;
}

function terrainFromBiome(value?: string): TacticalTerrainType {
  const biome = String(value ?? "").toLowerCase();
  if (biome.includes("asentamiento") || biome.includes("base")) return "base";
  if (biome.includes("vault") || biome.includes("interior") || biome.includes("instalacion")) return "wall";
  if (biome.includes("urbano") || biome.includes("ciudad") || biome.includes("industrial")) return "city";
  if (biome.includes("bosque") || biome.includes("forest")) return "forest";
  if (biome.includes("agua") || biome.includes("costa")) return "water";
  if (biome.includes("montana") || biome.includes("roca")) return "mountain";
  return "plain";
}

function inferMapKind(profile?: Partial<SourceProfile>): MapKind {
  const text = `${profile?.label ?? ""} ${profile?.biome ?? ""} ${profile?.description ?? ""}`.toLowerCase();
  if (text.includes("vault") || text.includes("bunker") || text.includes("subterr")) return "vault";
  if (text.includes("asentamiento") || text.includes("settlement") || text.includes("base")) return "settlement";
  if (text.includes("interior") || text.includes("instalacion") || text.includes("factory") || text.includes("fabrica")) return "interior";
  if (text.includes("industrial") || text.includes("planta") || text.includes("almacen")) return "industrial";
  if (text.includes("bosque") || text.includes("yermo") || text.includes("wild") || text.includes("costa")) return "wilderness";
  if (text.includes("road") || text.includes("ruta") || text.includes("camino")) return "road";
  return "urban";
}

function buildSourceProfiles(game: GameConfig): SourceProfile[] {
  const tomeLibrary = buildFallout4TomeMapLibrary(game);
  const profiles: SourceProfile[] = [];

  for (const map of tomeLibrary?.locationMaps ?? []) {
    profiles.push({
      id: `tome-map:${map.id}`,
      label: map.name.replace(/^Mapa - /, ""),
      kind: inferMapKind({ label: map.name, biome: map.biome, description: map.description }),
      sourceType: "tomeLocationMap",
      width: map.width,
      height: map.height,
      biome: map.biome,
      danger: riskToDanger(map.risk),
      description: map.description,
      locationId: map.locationId,
      missionId: map.missions?.[0]?.id,
      terrain: terrainFromBiome(map.biome ?? map.category ?? map.terrain),
      labels: [
        map.name.replace(/^Mapa - /, ""),
        ...(map.subzones ?? []).map((subzone) => subzone.name).filter(Boolean) as string[],
        ...(map.missions ?? []).map((mission) => mission.name).filter(Boolean),
      ],
      props: [
        ...(map.events ?? []).map((event) => event.type ?? event.rule ?? "Evento"),
        ...(map.collectibles ?? []).map((item) => item.name ?? item.id ?? "Coleccionable"),
      ],
      enemies: map.enemies ?? [],
      sourceTomes: map.sourceTomes ?? [],
    });
  }

  for (const location of tomeLibrary?.locations ?? []) {
    profiles.push({
      id: `tome-location:${location.id}`,
      label: location.name,
      kind: inferMapKind({ label: location.name, biome: location.biome, description: location.description }),
      sourceType: "tomeLocation",
      biome: location.biome,
      danger: location.danger,
      description: location.description,
      locationId: location.id,
      terrain: terrainFromBiome(location.biome),
      labels: [location.name],
      props: tomeLibrary?.arsenal?.slice(0, 12).map((item) => item.name) ?? [],
      enemies: tomeLibrary?.arsenal?.filter((item) => item.category === "bestiary").slice(0, 10).map((item) => item.name) ?? [],
      sourceTomes: [],
    });
  }

  for (const map of game.maps ?? []) {
    profiles.push({
      id: `existing-map:${map.id}`,
      label: map.name,
      kind: inferMapKind({ label: map.name, biome: map.biomes?.[0]?.name, description: map.description }),
      sourceType: "existingMap",
      width: map.width,
      height: map.height,
      biome: map.biomes?.[0]?.name ?? map.locations?.[0]?.biome,
      danger: map.locations?.[0]?.danger,
      description: map.description,
      locationId: map.locations?.[0]?.id,
      missionId: map.missionSheets?.[0]?.id,
      terrain: terrainFromBiome(map.biomes?.[0]?.name ?? map.locations?.[0]?.biome),
      labels: [map.name, ...(map.locations ?? []).slice(0, 8).map((location) => location.name)],
      props: (map.markers ?? []).slice(0, 16).map((marker) => marker.label),
      enemies: (map.markers ?? []).filter((marker) => marker.type === "enemy" || marker.type === "beast").map((marker) => marker.label),
      sourceTomes: [],
    });
  }

  for (const campaign of game.campaigns) {
    profiles.push({
      id: `campaign:${campaign.id}`,
      label: campaign.title,
      kind: inferMapKind({ label: campaign.title, description: campaign.description }),
      sourceType: "campaign",
      description: campaign.description,
      missionId: campaign.id,
      labels: [campaign.title, ...(campaign.simulation?.route ?? [])],
      props: ["Objetivo", "Evento", "Recurso", "Entrada", "Salida"],
      enemies: [],
      sourceTomes: [],
    });
  }

  profiles.push({
    id: "free",
    label: "Mapa libre generico",
    kind: "urban",
    sourceType: "free",
    biome: "Generico",
    description: "Generacion libre sin ubicacion preseleccionada.",
    labels: ["Punto de interes", "Entrada", "Objetivo", "Zona segura", "Salida"],
    props: defaultCatalog.propLabels,
    enemies: [],
    sourceTomes: [],
  });

  return profiles.filter((profile, index, array) => array.findIndex((item) => item.id === profile.id) === index);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: string) {
  let state = hashSeed(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };
}

function randomInt(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick<T>(random: () => number, items: T[]) {
  return items[Math.floor(random() * items.length)] ?? items[0];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function createTiles(width: number, height: number, terrain: TacticalTerrainType = "plain") {
  return Array.from({ length: width * height }, (_, index) => ({
    x: index % width,
    y: Math.floor(index / width),
    terrain,
  }));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function generateCity(config: GeneratorConfig, catalog: AssetCatalog, game: GameConfig, source: SourceProfile): GeneratedCity {
  const effectiveKind = config.mapKind === "auto" ? source.kind : config.mapKind;
  const random = createRandom(`${game.id}:${source.id}:${effectiveKind}:${config.seed}:${config.widthMeters}:${config.heightMeters}`);
  const width = source.width ? clamp(source.width, 12, 40) : clamp(Math.round(config.widthMeters / config.gridSizeMeters), 16, 40);
  const height = source.height ? clamp(source.height, 10, 30) : clamp(Math.round(config.heightMeters / config.gridSizeMeters), 12, 30);
  const center = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  const roadCells = new Set<string>();
  const roads: GeneratedCity["roads"] = [];
  const buildings: GeneratedBuilding[] = [];
  const props: GeneratedProp[] = [];

  function addRoad(x1: number, y1: number, x2: number, y2: number) {
    roads.push({ x1, y1, x2, y2 });
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let step = 0; step <= steps; step += 1) {
      const x = Math.round(x1 + ((x2 - x1) * step) / steps);
      const y = Math.round(y1 + ((y2 - y1) * step) / steps);
      roadCells.add(`${x}:${y}`);
      roadCells.add(`${clamp(x + 1, 0, width - 1)}:${y}`);
    }
  }

  if (effectiveKind === "vault" || effectiveKind === "interior") {
    addRoad(2, center.y, width - 3, center.y);
    addRoad(center.x, 2, center.x, height - 3);
    addRoad(Math.floor(width * 0.25), Math.floor(height * 0.25), Math.floor(width * 0.25), Math.floor(height * 0.78));
    addRoad(Math.floor(width * 0.68), Math.floor(height * 0.18), Math.floor(width * 0.68), Math.floor(height * 0.82));
  } else if (effectiveKind === "road" || effectiveKind === "wilderness") {
    addRoad(1, Math.floor(height * 0.65), width - 2, Math.floor(height * 0.35) + randomInt(random, -2, 2));
    addRoad(Math.floor(width * 0.22), 1, Math.floor(width * 0.78), height - 2);
  } else {
    addRoad(1, center.y, width - 2, center.y + randomInt(random, -1, 1));
    addRoad(center.x, 1, center.x + randomInt(random, -1, 1), height - 2);
    addRoad(2, Math.floor(height * 0.25), width - 3, Math.floor(height * 0.18) + randomInt(random, -1, 2));
    addRoad(Math.floor(width * 0.18), 2, Math.floor(width * 0.12), height - 3);
  }
  for (let index = 0; index < Math.round(config.roadComplexity / 18); index += 1) {
    const start = { x: randomInt(random, 1, width - 2), y: randomInt(random, 1, height - 2) };
    const end = random() > 0.5 ? { x: center.x, y: start.y } : { x: start.x, y: center.y };
    addRoad(start.x, start.y, end.x, end.y);
  }

  function overlaps(candidate: GeneratedBuilding) {
    return buildings.some((building) =>
      candidate.x < building.x + building.w + 1 &&
      candidate.x + candidate.w + 1 > building.x &&
      candidate.y < building.y + building.h + 1 &&
      candidate.y + candidate.h + 1 > building.y
    );
  }

  const preferredByKind: Record<MapKind, string[]> = {
    auto: [],
    urban: ["church", "museum", "library", "city_hall"],
    settlement: ["garage", "hardware", "colonial_house", "brick_store"],
    vault: ["bunker", "clinic", "warehouse", "garage"],
    wilderness: ["colonial_house", "garage", "warehouse"],
    industrial: ["warehouse", "hardware", "garage", "brick_store"],
    interior: ["warehouse", "clinic", "brick_store", "garage"],
    road: ["garage", "colonial_house", "hardware"],
  };
  const requiredTemplates = preferredByKind[effectiveKind]
    .map((id) => catalog.buildingTemplates.find((item) => item.id === id))
    .filter(Boolean) as BuildingTemplate[];
  const weightedTemplates = [...requiredTemplates, ...catalog.buildingTemplates].sort((left, right) => right.importance - left.importance);

  for (let attempt = 0; buildings.length < config.buildingCount && attempt < config.buildingCount * 18; attempt += 1) {
    const template = buildings.length < requiredTemplates.length ? requiredTemplates[buildings.length] : pick(random, weightedTemplates);
    const w = randomInt(random, template.minW, template.maxW);
    const h = randomInt(random, template.minH, template.maxH);
    const quadrantBias = template.id === "church" ? 0.18 : template.id === "museum" ? 0.3 : template.id === "library" ? 0.72 : random();
    const x = clamp(randomInt(random, 1, width - w - 2), 1, width - w - 1);
    const yBase = template.id === "church" ? 1 : template.id === "museum" ? randomInt(random, 2, Math.max(3, center.y - 4)) : randomInt(random, 1, height - h - 2);
    const candidate: GeneratedBuilding = {
      id: `building_${buildings.length + 1}`,
      label: source.labels[buildings.length] ?? catalog.poiLabels[buildings.length] ?? template.label,
      templateId: template.id,
      x: template.id === "library" ? clamp(Math.floor(width * 0.68), 1, width - w - 1) : quadrantBias < 0.35 ? clamp(x - 2, 1, width - w - 1) : x,
      y: yBase,
      w,
      h,
      floors: template.floors + (random() > 0.78 ? 1 : 0),
      damage: clamp(config.destruction + randomInt(random, -22, 18), 0, 100),
      roofAccessible: template.roofAccessible || random() < config.roofLinks / Math.max(1, config.buildingCount),
      markerType: template.type,
    };
    if (!overlaps(candidate)) buildings.push(candidate);
  }

  const baseTerrain = source.terrain ?? terrainFromBiome(source.biome);
  const tiles = createTiles(width, height, baseTerrain).map((tile) => {
    if (roadCells.has(`${tile.x}:${tile.y}`)) return { ...tile, terrain: "road" as TacticalTerrainType };
    if (effectiveKind === "vault" || effectiveKind === "interior") {
      const corridor = Math.abs(tile.x - center.x) <= 1 || Math.abs(tile.y - center.y) <= 1;
      return { ...tile, terrain: corridor ? "road" as TacticalTerrainType : "wall" as TacticalTerrainType };
    }
    const inUrbanCore = distance(tile, center) < Math.min(width, height) * 0.34;
    if ((effectiveKind === "urban" || effectiveKind === "industrial" || effectiveKind === "settlement") && inUrbanCore && random() > 0.22) return { ...tile, terrain: "city" as TacticalTerrainType };
    if ((effectiveKind === "wilderness" || baseTerrain === "forest") && random() < 0.34) return { ...tile, terrain: "forest" as TacticalTerrainType };
    if (baseTerrain === "base" && random() < 0.22) return { ...tile, terrain: "base" as TacticalTerrainType };
    if (random() < 0.16) return { ...tile, terrain: baseTerrain === "plain" ? "forest" as TacticalTerrainType : baseTerrain };
    if (random() < 0.05) return { ...tile, terrain: "mountain" as TacticalTerrainType };
    return tile;
  });

  const markers = buildings.map((building) => ({
    id: `marker_${building.id}`,
    x: clamp(Math.round(building.x + building.w / 2), 0, width - 1),
    y: clamp(Math.round(building.y + building.h / 2), 0, height - 1),
    type: building.markerType,
    label: building.label,
    coverage: building.damage > 72 ? "heavy" as const : "light" as const,
    movementCost: building.damage > 80 ? 2 : 1,
    biome: source.biome ?? "Mapa procedural",
  }));

  const propCount = Math.round((width * height * config.coverDensity) / 950);
  for (let index = 0; index < propCount; index += 1) {
    props.push({
      id: `prop_${index + 1}`,
      label: pick(random, source.props.length ? source.props : catalog.propLabels),
      x: randomInt(random, 1, width - 2),
      y: randomInt(random, 1, height - 2),
      markerType: random() > 0.72 ? "loot" : "cover",
    });
  }

  markers.push(
    ...props.map((prop) => ({
      id: `marker_${prop.id}`,
      x: prop.x,
      y: prop.y,
      type: prop.markerType,
      label: prop.label,
      coverage: prop.markerType === "cover" ? "heavy" as const : "light" as const,
      movementCost: prop.markerType === "cover" ? 2 : 1,
      biome: source.biome ?? "Ruinas",
    }))
  );

  const tacticalNodes = Array.from(roadCells)
    .slice(0, config.nodeTarget)
    .map((key, index) => {
      const [x, y] = key.split(":").map(Number);
      const nearby = buildings.find((building) => x >= building.x - 1 && x <= building.x + building.w + 1 && y >= building.y - 1 && y <= building.y + building.h + 1);
      return {
        id: `N${String(index + 1).padStart(3, "0")}`,
        name: nearby ? `Acceso ${nearby.label}` : `Nodo ${index + 1}`,
        type: (nearby ? "location" : "city") as MapNodeType,
        x,
        y,
        description: nearby ? `Entrada tactica a ${nearby.label}.` : "Nodo de calle transitable.",
        biome: nearby ? source.biome ?? "Interior/exterior" : source.biome ?? "Ruta transitable",
        danger: nearby?.damage ? Math.ceil(nearby.damage / 20) : source.danger ?? 2,
        coverage: nearby ? "heavy" as const : "light" as const,
        movementCost: nearby ? 2 : 1,
        connections: [] as string[],
      };
    });

  tacticalNodes.forEach((node) => {
    const nearest = tacticalNodes
      .filter((candidate) => candidate.id !== node.id)
      .sort((left, right) => distance(node, left) - distance(node, right))
      .slice(0, 3)
      .filter((candidate) => distance(node, candidate) <= 5);
    node.connections = nearest.map((candidate) => candidate.id);
  });

  const map: GameMap = {
    id: `generated_${slugify(source.label || config.name || "mapa")}_${slugify(config.seed || "seed")}`,
    name: config.name,
    description: `Mapa procedural generado desde ${source.label} (${source.sourceType}) con semilla ${config.seed}. ${source.description ?? ""}`,
    width,
    height,
    tileSize: 48,
    backgroundMode: "none",
    gridOpacity: 0.42,
    terrainOpacity: 0.48,
    markerScale: 1,
    nodes: tacticalNodes,
    tiles,
    markers,
    locations: buildings.map((building) => ({
      id: building.id,
      name: building.label,
      biome: source.biome ?? "Mapa procedural",
      danger: source.danger ?? Math.ceil(building.damage / 20),
      description: `${building.floors} pisos, dano ${building.damage}%, techo ${building.roofAccessible ? "accesible" : "cerrado"}.`,
    })),
    missionSheets: [
      {
        id: source.missionId ?? `mission_${slugify(config.seed)}`,
        title: `Reconocer ${config.name}`,
        objective: source.description ?? "Validar rutas, asegurar puntos de interes y marcar coberturas antes del encuentro.",
        locationId: source.locationId,
        recommendedLevel: source.danger ?? Math.max(1, Math.ceil(config.destruction / 25)),
        status: "draft",
      },
    ],
    biomes: [
      { id: `biome_${slugify(source.biome ?? effectiveKind)}`, name: source.biome ?? effectiveKind, movementModifier: baseTerrain === "road" || baseTerrain === "city" ? 0 : 1, encounterRisk: source.danger ?? 3, description: source.description ?? "Bioma procedimental derivado del juego activo." },
      { id: "dead_forest", name: "Bosque muerto", movementModifier: 1, encounterRisk: 3, description: "Periferia abierta con arboles secos y poca proteccion." },
    ],
    weatherEffects: [
      { id: "ash_haze", name: "Bruma de ceniza", visibility: 70, movementModifier: 0, description: "Reduce lectura a distancia sin bloquear rutas." },
    ],
    arsenal: source.enemies.map((enemy, index) => ({ id: `enemy_${index + 1}`, name: enemy, category: "bestiary" as const, tags: ["tomos"], description: "Amenaza sugerida desde ubicacion/tomos." })),
  };

  const validation = [
    tacticalNodes.length > 0 ? "Grafo tactico generado con nodos conectados." : "Sin nodos tacticos.",
    buildings.length >= Math.min(6, config.buildingCount) ? "Edificios principales colocados sin solapamiento critico." : "Pocos edificios colocados.",
    markers.some((marker) => marker.type === "cover") ? "Coberturas y obstaculos distribuidos." : "Faltan coberturas.",
    roads.length >= 4 ? "Calles principales y secundarias disponibles." : "Red vial insuficiente.",
    source.sourceType.startsWith("tome") ? `Contexto de tomos aplicado: ${source.sourceTomes.join(", ") || source.biome || "ubicacion"}.` : `Contexto aplicado: ${source.label}.`,
  ];

  return { map, buildings, props, roads, validation };
}

export function ProceduralMapGenerator({ game, onSaveMap }: Props) {
  const [catalog, setCatalog] = useState<AssetCatalog>(defaultCatalog);
  const [config, setConfig] = useState<GeneratorConfig>(defaultConfig);
  const [savedStatus, setSavedStatus] = useState("Sin guardar");
  const sourceProfiles = useMemo(() => buildSourceProfiles(game), [game]);
  const selectedSource = sourceProfiles.find((profile) => profile.id === config.sourceId) ?? sourceProfiles[0];
  const generated = useMemo(() => generateCity(config, catalog, game, selectedSource), [catalog, config, game, selectedSource]);
  const json = useMemo(() => JSON.stringify(generated.map, null, 2), [generated.map]);

  useEffect(() => {
    let active = true;
    fetch("/platform/procedural-map-assets.json")
      .then((response) => response.json())
      .then((data) => {
        if (active) setCatalog(data as AssetCatalog);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function updateConfig<K extends keyof GeneratorConfig>(key: K, value: GeneratorConfig[K]) {
    setSavedStatus("Cambios locales");
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function selectSource(sourceId: string) {
    const source = sourceProfiles.find((item) => item.id === sourceId) ?? sourceProfiles[0];
    setSavedStatus("Cambios locales");
    setConfig((current) => ({
      ...current,
      sourceId: source.id,
      name: source.label,
      seed: `${slugify(source.label)}-${current.seed.split("-").pop() ?? "seed"}`,
      mapKind: "auto",
      widthMeters: source.width ? source.width * current.gridSizeMeters : current.widthMeters,
      heightMeters: source.height ? source.height * current.gridSizeMeters : current.heightMeters,
      destruction: clamp((source.danger ?? 3) * 18, 20, 92),
    }));
  }

  function randomizeSeed() {
    updateConfig("seed", `waste-${Date.now().toString(36)}`);
  }

  function saveMap() {
    onSaveMap(generated.map);
    setSavedStatus("Guardado en el juego activo");
  }

  function downloadJson() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${generated.map.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const cellW = 100 / generated.map.width;
  const cellH = 100 / generated.map.height;

  return (
    <article className="admin-card procedural-generator">
      <div className="generator-hero">
        <div>
          <small>Motor procedural 2D</small>
          <strong><Hammer size={22} /> Generador tactico universal</strong>
          <p>Genera mapas desde ubicaciones de tomos, mapas existentes, campanas o configuracion libre. Usa semilla deterministica, biomas, riesgo, misiones, nodos, coberturas y JSON editable.</p>
        </div>
        <button className="green-button" onClick={saveMap}><Save size={16} /> Guardar mapa</button>
      </div>

      <div className="generator-layout">
        <aside className="generator-controls">
          <section>
            <div className="admin-panel-title compact">
              <strong><SlidersHorizontal size={16} /> Parametros</strong>
              <span className="admin-status-pill">{savedStatus}</span>
            </div>
            <label>
              <span>Fuente del mapa</span>
              <select value={selectedSource.id} onChange={(event) => selectSource(event.target.value)}>
                {sourceProfiles.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.label} - {source.sourceType}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Tipo de mapa</span>
              <select value={config.mapKind} onChange={(event) => updateConfig("mapKind", event.target.value as MapKind)}>
                <option value="auto">Automatico segun fuente</option>
                <option value="urban">Ciudad / ruinas urbanas</option>
                <option value="settlement">Asentamiento / base</option>
                <option value="vault">Vault / bunker</option>
                <option value="wilderness">Yermo / bosque / exterior</option>
                <option value="industrial">Industrial / almacen</option>
                <option value="interior">Interior tactico</option>
                <option value="road">Ruta / carretera</option>
              </select>
            </label>
            <label><span>Nombre</span><input value={config.name} onChange={(event) => updateConfig("name", event.target.value)} /></label>
            <label className="seed-row"><span>Semilla</span><input value={config.seed} onChange={(event) => updateConfig("seed", event.target.value)} /><button onClick={randomizeSeed}><Shuffle size={15} /></button></label>
            <div className="generator-two">
              <label><span>Ancho m</span><input type="number" min={60} max={200} value={config.widthMeters} onChange={(event) => updateConfig("widthMeters", Number(event.target.value) || config.widthMeters)} /></label>
              <label><span>Alto m</span><input type="number" min={60} max={200} value={config.heightMeters} onChange={(event) => updateConfig("heightMeters", Number(event.target.value) || config.heightMeters)} /></label>
            </div>
            <label><span>Escala metros/tile</span><input type="range" min={3} max={8} step={1} value={config.gridSizeMeters} onChange={(event) => updateConfig("gridSizeMeters", Number(event.target.value))} /><small>{config.gridSizeMeters}m</small></label>
            <label><span>Edificios</span><input type="range" min={8} max={32} value={config.buildingCount} onChange={(event) => updateConfig("buildingCount", Number(event.target.value))} /><small>{config.buildingCount}</small></label>
            <label><span>Nodos tacticos</span><input type="range" min={50} max={220} value={config.nodeTarget} onChange={(event) => updateConfig("nodeTarget", Number(event.target.value))} /><small>{config.nodeTarget}</small></label>
            <label><span>Destruccion</span><input type="range" min={0} max={100} value={config.destruction} onChange={(event) => updateConfig("destruction", Number(event.target.value))} /><small>{config.destruction}%</small></label>
            <label><span>Cobertura</span><input type="range" min={10} max={100} value={config.coverDensity} onChange={(event) => updateConfig("coverDensity", Number(event.target.value))} /><small>{config.coverDensity}%</small></label>
            <label><span>Calles</span><input type="range" min={10} max={100} value={config.roadComplexity} onChange={(event) => updateConfig("roadComplexity", Number(event.target.value))} /><small>{config.roadComplexity}%</small></label>
            <label><span>Techos conectados</span><input type="range" min={0} max={8} value={config.roofLinks} onChange={(event) => updateConfig("roofLinks", Number(event.target.value))} /><small>{config.roofLinks}</small></label>
          </section>

          <section className="generator-stats">
            <span><MapIcon size={16} /><strong>{generated.map.width}x{generated.map.height}</strong><small>tiles</small></span>
            <span><Route size={16} /><strong>{generated.map.nodes.length}</strong><small>nodos</small></span>
            <span><Layers size={16} /><strong>{generated.buildings.length}</strong><small>edificios</small></span>
            <span><CheckCircle2 size={16} /><strong>{generated.props.length}</strong><small>props</small></span>
          </section>
          <section className="generator-source-card">
            <strong>{selectedSource.label}</strong>
            <span>{selectedSource.sourceType} / {config.mapKind === "auto" ? selectedSource.kind : config.mapKind}</span>
            <small>{selectedSource.biome ?? "Sin bioma"} · Riesgo {selectedSource.danger ?? 2} · {selectedSource.labels.length} etiquetas · {selectedSource.props.length} recursos</small>
            <p>{selectedSource.description}</p>
          </section>
        </aside>

        <section className="generator-preview">
          <div className="generator-map-frame">
            <svg viewBox="0 0 100 100" role="img" aria-label={`Mapa generado ${generated.map.name}`} preserveAspectRatio="xMidYMid meet">
              <rect width="100" height="100" className="gen-terrain" />
              {(generated.map.tiles ?? []).filter((tile) => tile.terrain === "forest" || tile.terrain === "mountain").map((tile) => (
                <rect key={`${tile.x}-${tile.y}`} x={tile.x * cellW} y={tile.y * cellH} width={cellW} height={cellH} className={`gen-tile-${tile.terrain}`} />
              ))}
              {generated.roads.map((road, index) => (
                <line key={index} x1={(road.x1 + 0.5) * cellW} y1={(road.y1 + 0.5) * cellH} x2={(road.x2 + 0.5) * cellW} y2={(road.y2 + 0.5) * cellH} className="gen-road" />
              ))}
              {generated.buildings.map((building) => (
                <g key={building.id}>
                  <rect x={building.x * cellW} y={building.y * cellH} width={building.w * cellW} height={building.h * cellH} className={`gen-building damage-${building.damage > 70 ? "heavy" : "light"}`} />
                  <text x={(building.x + building.w / 2) * cellW} y={(building.y + building.h / 2) * cellH}>{building.label.split(" ")[0]}</text>
                </g>
              ))}
              {generated.map.nodes.slice(0, 160).map((node) => (
                <circle key={node.id} cx={(node.x + 0.5) * cellW} cy={(node.y + 0.5) * cellH} r="0.55" className="gen-node" />
              ))}
              {generated.props.map((prop) => (
                <circle key={prop.id} cx={(prop.x + 0.5) * cellW} cy={(prop.y + 0.5) * cellH} r="0.95" className={prop.markerType === "cover" ? "gen-cover" : "gen-loot"} />
              ))}
            </svg>
          </div>

          <div className="generator-validation">
            {generated.validation.map((item) => <span key={item}><CheckCircle2 size={15} /> {item}</span>)}
          </div>
        </section>

        <aside className="generator-json">
          <div className="admin-panel-title compact">
            <strong><FileJson size={16} /> JSON generado</strong>
            <div>
              <button onClick={() => void navigator.clipboard?.writeText(json)}><Copy size={15} /></button>
              <button onClick={downloadJson}><Download size={15} /></button>
            </div>
          </div>
          <textarea value={json} readOnly />
        </aside>
      </div>
    </article>
  );
}
