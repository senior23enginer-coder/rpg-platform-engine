import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const gameRoot = path.join(root, "public", "games", "fallout4");
const outputDir = path.join(gameRoot, "runtime");
const outputPath = path.join(outputDir, "playable-content.json");
const editorIndexPath = path.join(outputDir, "playable-editor-index.json");
const tomeMatrixPath = path.join(outputDir, "tome-application-matrix.json");

function readJson(...parts) {
  return JSON.parse(readFileSync(path.join(root, ...parts), "utf8"));
}

function slug(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compact(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function shortText(value = "", max = 180) {
  const text = compact(value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function indexById(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

function terrainFromBiome(biome = "", category = "") {
  const text = `${biome} ${category}`.toLowerCase();
  if (/agua|rio|mar|laguna|pantano/.test(text)) return "water";
  if (/monta|colina|roca|cantera|cueva/.test(text)) return "mountain";
  if (/bosque|forest|parque|vegetacion/.test(text)) return "forest";
  if (/vault|subterraneo|bunker|metro|tunel|base/.test(text)) return "base";
  if (/urbano|ciudad|town|district|calle|ruina|edificio/.test(text)) return "city";
  if (/ruta|camino|carretera|road|puente/.test(text)) return "road";
  return "plain";
}

function eventTypeToMarker(type = "") {
  if (type === "enemy") return "enemy";
  if (type === "loot" || type === "terminal" || type === "lock") return "loot";
  if (type === "weather") return "weather";
  return "objective";
}

const templates = readJson("public", "games", "fallout4", "templates", "templates.json");
const missionDetails = readJson("public", "games", "fallout4", "missions", "mission-details.json");
const missionPolish = readJson("public", "games", "fallout4", "missions", "mission-polish.json");
const locationEvents = readJson("public", "games", "fallout4", "locations", "location-events.json");
const bestiaryRuntime = readJson("public", "games", "fallout4", "bestiary", "bestiary.json");
const advancedRules = readJson("public", "games", "fallout4", "rules", "advanced-rules.json");
const coverage = readJson("public", "games", "fallout4", "coverage", "core-book-coverage.json");
const runtimeDepth = readJson("public", "games", "fallout4", "coverage", "runtime-depth.json");

const catalogs = templates.catalogs ?? {};
const missionsById = indexById(catalogs.missions ?? []);
const missionDetailsById = indexById(missionDetails.missions ?? []);
const missionPolishById = indexById(missionPolish.missions ?? []);
const locationsById = indexById(catalogs.locations ?? []);
const eventsByLocationId = indexById(locationEvents.locations ?? []);
const collectiblesByLocation = new Map();
for (const item of catalogs.collectibles ?? []) {
  if (!item.locationId) continue;
  if (!collectiblesByLocation.has(item.locationId)) collectiblesByLocation.set(item.locationId, []);
  collectiblesByLocation.get(item.locationId).push(item);
}

const missionSheets = (catalogs.missions ?? []).map((mission) => {
  const detail = missionDetailsById.get(mission.id) ?? {};
  const polish = missionPolishById.get(mission.id) ?? {};
  const linkedLocationIds = unique([
    ...(detail.stages ?? []).map((stage) => stage.locationId),
    ...(runtimeDepth.missions ?? []).find((item) => item.id === mission.id)?.linkedLocationIds ?? [],
  ]);
  return {
    id: mission.id,
    name: mission.name,
    originalName: mission.originalName,
    sourceTome: "TOMO 02",
    type: mission.type,
    playableStatus: detail.playableStatus ?? mission.playableStatus,
    prerequisite: mission.prerequisite,
    activation: mission.activation,
    execution: mission.execution,
    completion: mission.completion,
    stages: detail.stages ?? polish.stages ?? [],
    npcs: detail.npcs ?? [],
    enemies: detail.enemies ?? [],
    requiredItems: detail.requiredItems ?? [],
    rewards: detail.rewards ?? [],
    linkedLocationIds,
    systems: ["ap", "2d20", "mission-state", "location-map", "encounter", "loot", "save-game"],
  };
});

const missionByLocation = new Map();
for (const mission of missionSheets) {
  for (const locationId of mission.linkedLocationIds ?? []) {
    if (!missionByLocation.has(locationId)) missionByLocation.set(locationId, []);
    missionByLocation.get(locationId).push(mission);
  }
}

const locationMaps = (catalogs.locations ?? []).map((location, locationIndex) => {
  const events = eventsByLocationId.get(location.id)?.events ?? [];
  const collectibles = collectiblesByLocation.get(location.id) ?? [];
  const missions = missionByLocation.get(location.id) ?? [];
  const subzones = Array.isArray(location.subzones) ? location.subzones : [];
  const width = Math.max(14, Math.min(32, Math.ceil(Math.sqrt(Math.max(1, subzones.length + events.length)) * 4)));
  const height = Math.max(10, Math.min(24, Math.ceil((subzones.length + events.length + 4) / 3)));
  const terrain = terrainFromBiome(location.biome, location.category);
  const eventMarkers = events.slice(0, Math.min(40, events.length)).map((event, index) => ({
    id: `marker_${event.id}`,
    x: 1 + (index * 3) % Math.max(2, width - 2),
    y: 1 + Math.floor((index * 3) / Math.max(2, width - 2)) % Math.max(2, height - 2),
    type: eventTypeToMarker(event.type),
    label: compact(`${event.subzone ?? "Evento"} - ${event.type}`),
    linkedEventId: event.id,
    movementCost: event.apCost ?? 1,
    coverage: /interior|vault|edificio|oficina|sala/i.test(event.subzone ?? "") ? "heavy" : "light",
  }));
  return {
    id: `map_${location.id}`,
    locationId: location.id,
    name: `Mapa - ${location.name}`,
    sourceTomes: ["TOMO 06", "TOMO 02", "TOMO 03", "TOMO 09", "TOMO 10"],
    width,
    height,
    tileSize: 48,
    terrain,
    biome: location.biome,
    category: location.category,
    risk: location.risk,
    settlement: Boolean(location.settlement),
    description: location.summary ?? location.useInPlay,
    subzones,
    events,
    enemies: location.enemies ?? [],
    collectibles,
    missions: missions.map((mission) => ({ id: mission.id, name: mission.name, stages: mission.stages.length })),
    weatherHooks: ["weather_clear", "weather_radstorm", "weather_rain", "weather_night"],
    markers: [
      {
        id: `marker_location_${location.id}`,
        x: 1,
        y: 1,
        type: "objective",
        label: location.name,
        biome: location.biome,
        movementCost: 1,
        coverage: "light",
      },
      ...eventMarkers,
    ],
    tiles: Array.from({ length: width * height }, (_, index) => ({
      x: index % width,
      y: Math.floor(index / width),
      terrain,
    })),
    sortOrder: locationIndex + 1,
  };
});

const biomes = unique((catalogs.locations ?? []).map((location) => location.biome)).map((name) => {
  const related = (catalogs.locations ?? []).filter((location) => location.biome === name);
  return {
    id: `biome_${slug(name)}`,
    name,
    sourceTome: "TOMO 06",
    terrain: terrainFromBiome(name),
    locations: related.length,
    movementModifier: /agua|monta|pantano|subterraneo/i.test(name) ? 2 : /urbano|ciudad/i.test(name) ? 0 : 1,
    encounterRisk: Math.max(1, Math.round(related.length / Math.max(1, (catalogs.locations ?? []).length) * 10)),
    useInMap: "Define terreno base, coste de movimiento, riesgo y encuentros.",
  };
});

const weatherEffects = [
  { id: "weather_clear", name: "Despejado", sourceTome: "TOMO 10", visibility: 100, movementModifier: 0, survival: [] },
  { id: "weather_radstorm", name: "Tormenta radiactiva", sourceTome: "TOMO 10", visibility: 45, movementModifier: 1, survival: ["radiation", "fatigue"] },
  { id: "weather_rain", name: "Lluvia acida", sourceTome: "TOMO 10", visibility: 65, movementModifier: 1, survival: ["equipment-wear", "disease-risk"] },
  { id: "weather_night", name: "Noche", sourceTome: "TOMO 10", visibility: 35, movementModifier: 0, survival: ["sleep", "ambush-risk"] },
];

const nodeTypes = [
  { id: "movement", sourceTomes: ["TOMO 01", "TOMO 06"], label: "Movimiento", marker: "objective", apCost: 1, use: "Conectar subzonas y rutas." },
  { id: "cover-light", sourceTomes: ["TOMO 01", "TOMO 06"], label: "Cobertura ligera", marker: "cover", defense: 1, use: "Reducir dano o dificultad de defensa." },
  { id: "cover-heavy", sourceTomes: ["TOMO 01", "TOMO 06"], label: "Cobertura pesada", marker: "cover", defense: 2, use: "Bloquear linea de tiro parcial." },
  { id: "hazard-weather", sourceTomes: ["TOMO 10"], label: "Peligro climatico", marker: "weather", apCost: 1, use: "Aplicar clima, radiacion, hambre, sed, enfermedad o fatiga." },
  { id: "enemy-spawn", sourceTomes: ["TOMO 03", "TOMO 06"], label: "Encuentro enemigo", marker: "enemy", apCost: 1, use: "Instanciar ficha de bestiario en mapa." },
  { id: "loot-node", sourceTomes: ["TOMO 04", "TOMO 05", "TOMO 09"], label: "Botin/objeto", marker: "loot", apCost: 1, use: "Vincular arma, equipo, terminal, nota o llave." },
  { id: "settlement-node", sourceTomes: ["TOMO 07"], label: "Asentamiento", marker: "shop", apCost: 1, use: "Gestionar comida, agua, camas, defensa, rutas y economia." },
  { id: "faction-node", sourceTomes: ["TOMO 08"], label: "Faccion", marker: "unit", apCost: 1, use: "Aplicar reputacion, hostilidad, contratos y patrullas." },
  { id: "mission-objective", sourceTomes: ["TOMO 02"], label: "Objetivo de mision", marker: "objective", apCost: 1, use: "Completar etapa o activar consecuencia." },
];

const tomeApplications = {
  "TOMO 01": {
    sourceDocument: "docs/TOMO 01 - Iteracion 5.8.9 Nodos AP Movimiento Ataque.txt",
    gameplaySystems: ["SPECIAL", "2d20", "AP", "nodos tacticos", "movimiento", "ataque", "cobertura", "linea de vision", "inventario", "dialogos", "progresion"],
    editorSurfaces: ["editor de mapas", "inspector de nodos", "paleta de cobertura", "modo prueba", "fichas de personajes/NPC"],
    engineHooks: ["resolveFallout4NodeAction", "fallout4MovementCost", "fallout4CoverageModifier", "rollFallout4Test", "resolveFallout4Combat"],
    backendCatalogs: ["rules", "nodeTypes", "characters", "saves"],
  },
  "TOMO 02": {
    sourceDocument: "docs/TOMO 02 - Iteracion 5.1 Libro Publicable Refinado.txt",
    gameplaySystems: ["misiones", "objetivos", "etapas", "recompensas", "consecuencias", "rutas de campana"],
    editorSurfaces: ["editor de misiones", "vinculo mision-mapa", "flujo de objetivos", "ficha de recompensa"],
    engineHooks: ["resolveFallout4MissionStep", "awardFallout4Caps"],
    backendCatalogs: ["missions", "missionDetails", "missionRuntime", "saves"],
  },
  "TOMO 03": {
    sourceDocument: "docs/TOMO 03 - Iteracion 5.1 Libro Publicable Refinado.txt",
    gameplaySystems: ["bestiario", "NPC", "companeros", "IA", "encuentros", "amenaza"],
    editorSurfaces: ["ficha de criatura", "ficha NPC", "paleta de unidades", "encuentros por ubicacion"],
    engineHooks: ["resolveFallout4Combat", "fallout4RiskDifficulty"],
    backendCatalogs: ["bestiary", "companions", "encounters"],
  },
  "TOMO 04": {
    sourceDocument: "docs/TOMO 04 - Iteracion 5.1 Libro Publicable Refinado.txt",
    gameplaySystems: ["armas", "municion", "mods", "dano", "alcance", "rareza"],
    editorSurfaces: ["editor de armas", "loot", "loadout", "recompensas de mision"],
    engineHooks: ["fallout4AmmoTypeForWeapon", "fallout4WeaponDamage", "resolveFallout4Trade"],
    backendCatalogs: ["weapons", "mods", "ammo", "loot"],
  },
  "TOMO 05": {
    sourceDocument: "docs/TOMO 05 - Iteracion 5.1 Libro Publicable Refinado.txt",
    gameplaySystems: ["armaduras", "equipo", "servoarmadura", "resistencia", "piezas", "desgaste"],
    editorSurfaces: ["editor de equipo", "armaduras", "inventario", "servoarmadura"],
    engineHooks: ["fallout4Defense", "resolveFallout4Trade"],
    backendCatalogs: ["equipment", "armor", "powerArmor", "inventory"],
  },
  "TOMO 06": {
    sourceDocument: "docs/TOMO 06 - Iteracion 5.6 Atlas Correccion Final Clima DiaNoche Ciclos.txt",
    gameplaySystems: ["atlas", "ubicaciones", "subzonas", "biomas", "rutas", "mapas tacticos", "eventos"],
    editorSurfaces: ["editor de mapamundi", "editor de ubicacion", "editor tactico", "capas", "minimapa"],
    engineHooks: ["resolveFallout4NodeAction", "fallout4MovementCost", "resolveFallout4WeatherTick"],
    backendCatalogs: ["locations", "locationMaps", "locationEvents", "biomes"],
  },
  "TOMO 07": {
    sourceDocument: "docs/TOMO 07 - Iteracion 5.1 Libro Publicable Refinado.txt",
    gameplaySystems: ["asentamientos", "poblacion", "recursos", "defensa", "rutas comerciales", "ataques"],
    editorSurfaces: ["editor de asentamientos", "recursos", "defensas", "rutas"],
    engineHooks: ["resolveFallout4SettlementBuild", "resolveFallout4Trade"],
    backendCatalogs: ["settlements", "resources", "routes"],
  },
  "TOMO 08": {
    sourceDocument: "docs/TOMO 08 - Iteracion 5.1 Libro Publicable Refinado.txt",
    gameplaySystems: ["facciones", "reputacion", "rangos", "territorio", "hostilidad", "alianzas"],
    editorSurfaces: ["editor de facciones", "territorios", "reputacion", "dialogos"],
    engineHooks: ["resolveFallout4FactionReputation", "resolveFallout4MissionStep"],
    backendCatalogs: ["factions", "reputation", "territories"],
  },
  "TOMO 09": {
    sourceDocument: "docs/TOMO 09 - Iteracion 5.1 Libro Publicable Refinado.txt",
    gameplaySystems: ["coleccionables", "objetos unicos", "terminales", "llaves", "notas", "holocintas"],
    editorSurfaces: ["editor de objetos", "terminales", "llaves", "botin", "galeria de pistas"],
    engineHooks: ["resolveFallout4LockOrTerminal", "resolveFallout4NodeAction"],
    backendCatalogs: ["collectibles", "terminals", "locks", "keys", "notes"],
  },
  "TOMO 10": {
    sourceDocument: "docs/TOMO 10 - Iteracion 5.6 Supervivencia Correccion Final Clima DiaNoche Ciclos.txt",
    gameplaySystems: ["supervivencia", "hambre", "sed", "sueno", "fatiga", "radiacion", "clima", "dia/noche", "campamento"],
    editorSurfaces: ["clima por mapa", "ciclos", "biomas", "peligros", "modo supervivencia"],
    engineHooks: ["applyFallout4SurvivalTurn", "resolveFallout4WeatherTick"],
    backendCatalogs: ["survival", "weather", "biomes", "saves"],
  },
};

const tomeMatrix = coverage.tomes.map((tome) => ({
  id: tome.id,
  fileName: path.basename((tomeApplications[tome.id] ?? {}).sourceDocument ?? tome.fileName),
  role: tome.role,
  runtimeSystems: tome.runtimeSystems,
  catalogCounts: tome.catalogCounts,
  applied: true,
  completeness: "runtime-editor-backend",
  ...(tomeApplications[tome.id] ?? {}),
  editorSurfaces: {
    "TOMO 01": ["reglas", "nodos", "cobertura", "movimiento", "economia", "combate"],
    "TOMO 02": ["misiones", "etapas", "objetivos", "recompensas", "desbloqueos"],
    "TOMO 03": ["bestiario", "encuentros", "unidades", "amenaza"],
    "TOMO 04": ["armas", "municion", "mods", "botin"],
    "TOMO 05": ["equipo", "armaduras", "servoarmadura", "objetos"],
    "TOMO 06": ["ubicaciones", "mapas", "subzonas", "biomas", "rutas"],
    "TOMO 07": ["asentamientos", "recursos", "defensa", "rutas comerciales"],
    "TOMO 08": ["facciones", "reputacion", "territorios", "hostilidad"],
    "TOMO 09": ["coleccionables", "terminales", "notas", "llaves", "pistas"],
    "TOMO 10": ["clima", "dia-noche", "supervivencia", "radiacion", "fatiga"],
  }[tome.id] ?? [],
}));

const playableContent = {
  schemaVersion: 1,
  gameId: "fallout4",
  generatedAt: new Date().toISOString(),
  source: {
    tomes: "docs/TOMO 01-10",
    normalizedTomes: "public/games/fallout4/rules/tomes",
    applicationMatrix: "public/games/fallout4/runtime/tome-application-matrix.json",
    templates: "public/games/fallout4/templates/templates.json",
    missionDetails: "public/games/fallout4/missions/mission-details.json",
    locationEvents: "public/games/fallout4/locations/location-events.json",
    advancedRules: "public/games/fallout4/rules/advanced-rules.json",
  },
  counts: {
    ...templates.counts,
    missionStages: missionDetails.counts?.stages ?? 0,
    locationEvents: locationEvents.counts?.events ?? 0,
    terminals: locationEvents.counts?.terminals ?? 0,
    locks: locationEvents.counts?.locks ?? 0,
    locationEnemies: locationEvents.counts?.enemies ?? 0,
    locationLoot: locationEvents.counts?.loot ?? 0,
    locationMaps: locationMaps.length,
    biomes: biomes.length,
    nodeTypes: nodeTypes.length,
  },
  tomeMatrix,
  rules: {
    core: advancedRules.rules,
    runtimeSystems: runtimeDepth.runtimeSystems,
    nodeTypes,
    weatherEffects,
    biomes,
  },
  catalogs: {
    missions: missionSheets,
    locations: catalogs.locations ?? [],
    locationMaps,
    bestiary: bestiaryRuntime.creatures ?? catalogs.bestiary ?? [],
    weapons: catalogs.weapons ?? [],
    equipment: catalogs.equipment ?? [],
    settlements: catalogs.settlements ?? [],
    factions: catalogs.factions ?? [],
    collectibles: catalogs.collectibles ?? [],
  },
};

if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(playableContent, null, 2)}\n`, "utf8");
writeFileSync(tomeMatrixPath, `${JSON.stringify({
  schemaVersion: 1,
  gameId: playableContent.gameId,
  generatedAt: playableContent.generatedAt,
  purpose: "Matriz verificable de aplicacion de los 10 tomos al juego Fallout 4: datos, reglas, editor, backend y runtime.",
  counts: playableContent.counts,
  tomes: playableContent.tomeMatrix,
}, null, 2)}\n`, "utf8");
const editorIndex = {
  schemaVersion: 1,
  gameId: playableContent.gameId,
  generatedAt: playableContent.generatedAt,
  source: {
    playableContent: "public/games/fallout4/runtime/playable-content.json",
    purpose: "Indice ligero para editor visual; el JSON completo queda disponible para backend/local.",
  },
  counts: playableContent.counts,
  tomeMatrix: playableContent.tomeMatrix,
  rules: playableContent.rules,
  catalogs: {
    missions: playableContent.catalogs.missions.map((mission) => ({
      id: mission.id,
      name: mission.name,
      originalName: mission.originalName,
      sourceTome: mission.sourceTome,
      type: mission.type,
      playableStatus: mission.playableStatus,
      linkedLocationIds: mission.linkedLocationIds,
      stagesCount: mission.stages.length,
      npcCount: mission.npcs.length,
      enemyCount: mission.enemies.length,
      requiredItemCount: mission.requiredItems.length,
      rewardsCount: mission.rewards.length,
    })),
    locations: playableContent.catalogs.locations.map((location) => ({
      id: location.id,
      name: location.name,
      sourceTome: location.sourceTome,
      category: location.category,
      biome: location.biome,
      risk: shortText(location.risk, 140),
      settlement: location.settlement,
      subzoneCount: Array.isArray(location.subzones) ? location.subzones.length : 0,
      enemies: location.enemies,
      summary: shortText(location.summary, 220),
      useInPlay: shortText(location.useInPlay, 180),
    })),
    locationMaps: playableContent.catalogs.locationMaps.map((map) => ({
      id: map.id,
      locationId: map.locationId,
      name: map.name,
      sourceTomes: map.sourceTomes,
      width: map.width,
      height: map.height,
      tileSize: map.tileSize,
      terrain: map.terrain,
      biome: map.biome,
      category: map.category,
      risk: shortText(map.risk, 140),
      settlement: map.settlement,
      description: shortText(map.description, 140),
      subzoneCount: map.subzones.length,
      eventCount: map.events.length,
      enemyCount: map.enemies.length,
      collectibleCount: map.collectibles.length,
      missionCount: map.missions.length,
      subzones: map.subzones.slice(0, 8),
      enemies: map.enemies.slice(0, 8),
      missions: map.missions,
      markers: map.markers.slice(0, 4),
    })),
    bestiary: playableContent.catalogs.bestiary.map((item) => ({ id: item.id, name: item.name, hp: item.hp, threat: item.threat, sourceTome: item.sourceTome, useInPlay: shortText(item.useInPlay, 160) })),
    weapons: playableContent.catalogs.weapons.map((item) => ({ id: item.id, name: item.name, sourceTome: item.sourceTome, useInPlay: shortText(item.useInPlay, 160) })),
    equipment: playableContent.catalogs.equipment.map((item) => ({ id: item.id, name: item.name, sourceTome: item.sourceTome, useInPlay: shortText(item.useInPlay, 160) })),
    settlements: playableContent.catalogs.settlements.map((item) => ({ id: item.id, name: item.name, sourceTome: item.sourceTome, unlock: item.unlock, useInPlay: shortText(item.useInPlay, 160) })),
    factions: playableContent.catalogs.factions.map((item) => ({ id: item.id, name: item.name, sourceTome: item.sourceTome, useInPlay: shortText(item.useInPlay, 160) })),
    collectibles: playableContent.catalogs.collectibles.map((item) => ({
      id: item.id,
      name: item.name,
      sourceTome: item.sourceTome,
      collectibleType: item.collectibleType,
      location: item.location,
      locationId: item.locationId,
      subzone: item.subzone,
      apRule: shortText(item.apRule, 120),
      useInPlay: shortText(item.useInPlay, 160),
    })),
  },
};
writeFileSync(editorIndexPath, `${JSON.stringify(editorIndex, null, 2)}\n`, "utf8");
console.log(`Playable Fallout 4 content generated: ${path.relative(root, outputPath)}`);
console.log(`Editor index generated: ${path.relative(root, editorIndexPath)}`);
console.log(`Tome matrix generated: ${path.relative(root, tomeMatrixPath)}`);
console.log(`Maps: ${locationMaps.length}, missions: ${missionSheets.length}, events: ${playableContent.counts.locationEvents}`);

const detailPackResult = spawnSync(process.execPath, ["scripts/generate-fallout4-playable-detail-pack.mjs"], {
  cwd: root,
  stdio: "inherit",
});
if (detailPackResult.status !== 0) process.exit(detailPackResult.status ?? 1);
