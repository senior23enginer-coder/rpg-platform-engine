import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const runtimeDir = path.join(root, "public", "games", "fallout4", "runtime");
const playablePath = path.join(runtimeDir, "playable-content.json");
const matrixPath = path.join(runtimeDir, "tome-application-matrix.json");
const outputPath = path.join(runtimeDir, "playable-detail-pack.json");

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function compact(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function short(value, max = 260) {
  const text = compact(typeof value === "object" ? JSON.stringify(value) : value ?? "");
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function itemId(item) {
  return String(item?.id ?? item?.locationId ?? item?.name ?? "sin_id");
}

function itemTitle(item) {
  return String(item?.name ?? item?.title ?? item?.originalName ?? item?.id ?? "Ficha jugable");
}

function sourceTomesFor(type, item) {
  const direct = asArray(item.sourceTomes ?? item.sourceTome);
  if (direct.length) return direct.map(String);
  const byType = {
    missions: ["TOMO 02"],
    locations: ["TOMO 06"],
    locationMaps: ["TOMO 06", "TOMO 01", "TOMO 02", "TOMO 03", "TOMO 09", "TOMO 10"],
    bestiary: ["TOMO 03"],
    weapons: ["TOMO 04"],
    equipment: ["TOMO 05"],
    settlements: ["TOMO 07"],
    factions: ["TOMO 08"],
    collectibles: ["TOMO 09"],
    weather: ["TOMO 10"],
    biomes: ["TOMO 06", "TOMO 10"],
    nodeTypes: ["TOMO 01", "TOMO 06"],
  };
  return byType[type] ?? ["TOMO 01"];
}

function sourceDocuments(sourceTomes, matrixById) {
  return sourceTomes
    .map((tome) => matrixById.get(tome)?.sourceDocument)
    .filter(Boolean);
}

function relationIds(type, item) {
  const ids = [];
  if (type === "missions") ids.push(...asArray(item.linkedLocationIds), ...asArray(item.enemies).map((entry) => entry.id ?? entry));
  if (type === "locations") ids.push(`map_${item.id}`, ...asArray(item.enemies), ...asArray(item.collectibles).map((entry) => entry.id ?? entry));
  if (type === "locationMaps") ids.push(item.locationId, ...asArray(item.missions).map((entry) => entry.id ?? entry), ...asArray(item.enemies), ...asArray(item.collectibles).map((entry) => entry.id ?? entry));
  if (type === "bestiary") ids.push(...asArray(item.loot).map((entry) => entry.id ?? entry));
  if (type === "settlements") ids.push(...asArray(item.routes).map((entry) => entry.id ?? entry));
  if (type === "factions") ids.push(...asArray(item.allies), ...asArray(item.enemies ?? item.rivals));
  if (type === "collectibles") ids.push(item.locationId, item.location);
  return [...new Set(ids.filter(Boolean).map(String))].slice(0, 18);
}

function editableFields(type) {
  const common = ["adminNotes", "playableStatus", "tags", "image", "gallery"];
  const byType = {
    missions: ["status", "objectives", "conditions", "rewards", "linkedLocationIds", "consequences"],
    locations: ["biome", "risk", "faction", "subzones", "enemies", "loot", "weatherHooks"],
    locationMaps: ["width", "height", "tileSize", "layers", "markers", "nodes", "background"],
    bestiary: ["hp", "threat", "behavior", "attacks", "loot", "resistances"],
    weapons: ["damage", "range", "ammo", "mods", "rarity", "value"],
    equipment: ["defense", "weight", "effects", "parts", "durability", "value"],
    settlements: ["population", "food", "water", "beds", "defense", "routes"],
    factions: ["reputation", "ranks", "allies", "rivals", "territory", "hostility"],
    collectibles: ["collectibleType", "locationId", "subzone", "apRule", "effect", "value"],
    weather: ["visibility", "movementModifier", "damage", "survival", "duration", "biomes"],
    biomes: ["terrain", "movementModifier", "encounterRisk", "weather", "resources"],
    nodeTypes: ["apCost", "coverage", "movement", "lineOfSight", "marker", "use"],
  };
  return [...common, ...(byType[type] ?? [])];
}

function editorPanels(type, item) {
  const panels = [
    {
      id: "resumen",
      title: "Resumen",
      fields: {
        id: itemId(item),
        title: itemTitle(item),
        description: short(item.summary ?? item.objective ?? item.useInPlay ?? item.description ?? item.rule, 500),
      },
    },
    {
      id: "tomo",
      title: "Fuente de tomo",
      fields: {
        sourceTomes: sourceTomesFor(type, item),
        playableStatus: item.playableStatus ?? "template-ready",
      },
    },
  ];

  if (type === "missions") {
    panels.push({ id: "flujo", title: "Flujo de mision", fields: { stages: asArray(item.stages).length, rewards: asArray(item.rewards).length, npcs: asArray(item.npcs).length, linkedLocations: asArray(item.linkedLocationIds).length } });
  }
  if (type === "locations" || type === "locationMaps") {
    panels.push({ id: "mapa", title: "Mapa tactico", fields: { biome: item.biome, category: item.category, risk: item.risk, subzones: asArray(item.subzones).length, events: asArray(item.events).length, markers: asArray(item.markers).length } });
  }
  if (type === "bestiary") panels.push({ id: "combate", title: "Combate e IA", fields: { hp: item.hp, threat: item.threat, behavior: short(item.behavior ?? item.useInPlay) } });
  if (type === "weapons" || type === "equipment") panels.push({ id: "inventario", title: "Inventario y comercio", fields: { type: item.type ?? item.category, value: item.value, tags: item.tags, use: short(item.useInPlay) } });
  if (type === "settlements") panels.push({ id: "asentamiento", title: "Recursos", fields: { population: item.population, food: item.food, water: item.water, beds: item.beds, defense: item.defense } });
  if (type === "factions") panels.push({ id: "politica", title: "Reputacion", fields: { role: item.role, reputation: item.reputation, territory: item.territory } });
  if (type === "collectibles") panels.push({ id: "pista", title: "Objeto y pista", fields: { collectibleType: item.collectibleType, location: item.location, subzone: item.subzone, apRule: item.apRule } });
  if (type === "weather" || type === "biomes") panels.push({ id: "ambiente", title: "Ambiente", fields: { visibility: item.visibility, movementModifier: item.movementModifier, survival: item.survival, terrain: item.terrain } });
  if (type === "nodeTypes") panels.push({ id: "nodo", title: "Nodo tactico", fields: { apCost: item.apCost, marker: item.marker, coverage: item.coverage, use: item.use } });
  return panels;
}

function buildDetail(type, item, matrixById) {
  const id = itemId(item);
  const sourceTomes = sourceTomesFor(type, item);
  return {
    id,
    type,
    title: itemTitle(item),
    sourceTomes,
    sourceDocuments: sourceDocuments(sourceTomes, matrixById),
    backendEndpoint: `/api/games/fallout4/playable/${type}/${encodeURIComponent(id)}`,
    detailEndpoint: `/api/games/fallout4/playable/${type}/${encodeURIComponent(id)}/detail-pack`,
    editorScreen: type === "locationMaps" || type === "locations" ? "MapEditor" : "ContentScreen",
    mapEditorBindings: {
      availableAsPalette: ["missions", "locations", "bestiary", "weapons", "equipment", "settlements", "factions", "collectibles", "weather", "biomes", "nodeTypes"].includes(type),
      layer: type === "locationMaps" ? "all" : type === "weather" || type === "biomes" ? "clima/bioma" : type === "bestiary" ? "enemigos" : type === "collectibles" ? "loot" : type,
      markerType: type === "bestiary" ? "enemy" : type === "collectibles" ? "loot" : type === "weather" ? "weather" : type === "settlements" ? "shop" : "objective",
    },
    editableFields: editableFields(type),
    relationIds: relationIds(type, item),
    panels: editorPanels(type, item),
    validation: {
      requiresDetailScreen: true,
      requiresBackendCrud: true,
      requiresExportImport: type === "locationMaps" || type === "missions" || type === "locations",
      requiresMapBinding: ["missions", "locations", "locationMaps", "bestiary", "collectibles", "weather", "biomes", "nodeTypes"].includes(type),
    },
  };
}

const playable = readJson(playablePath);
const matrix = readJson(matrixPath);
const matrixById = new Map((matrix.tomes ?? []).map((tome) => [tome.id, tome]));
const catalogs = {
  ...playable.catalogs,
  weather: playable.rules?.weatherEffects ?? [],
  biomes: playable.rules?.biomes ?? [],
  nodeTypes: playable.rules?.nodeTypes ?? [],
};

const detailCatalogs = {};
for (const [type, items] of Object.entries(catalogs)) {
  if (!Array.isArray(items)) continue;
  detailCatalogs[type] = items.map((item) => buildDetail(type, item, matrixById));
}

const counts = Object.fromEntries(Object.entries(detailCatalogs).map(([type, items]) => [type, items.length]));
const detailPack = {
  schemaVersion: 1,
  gameId: "fallout4",
  generatedAt: new Date().toISOString(),
  source: {
    playableContent: "public/games/fallout4/runtime/playable-content.json",
    tomeMatrix: "public/games/fallout4/runtime/tome-application-matrix.json",
  },
  counts,
  totalDetails: Object.values(counts).reduce((sum, value) => sum + value, 0),
  catalogs: detailCatalogs,
};

if (!existsSync(runtimeDir)) mkdirSync(runtimeDir, { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(detailPack, null, 2)}\n`, "utf8");
console.log(`Fallout 4 playable detail pack generated: ${path.relative(root, outputPath)}`);
console.log(`Details: ${detailPack.totalDetails}`);
