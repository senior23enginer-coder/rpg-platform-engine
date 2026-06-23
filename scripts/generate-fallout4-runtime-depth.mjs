import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const templates = JSON.parse(readFileSync(path.join(root, "public/games/fallout4/templates/templates.json"), "utf8"));
let missionDetails;
try {
  missionDetails = JSON.parse(readFileSync(path.join(root, "public/games/fallout4/missions/mission-details.json"), "utf8"));
} catch {
  missionDetails = { missions: [] };
}
const catalogs = templates.catalogs ?? {};
const missions = catalogs.missions ?? [];
const locations = catalogs.locations ?? [];
const bestiary = catalogs.bestiary ?? [];
const weapons = catalogs.weapons ?? [];
const equipment = catalogs.equipment ?? [];
const settlements = catalogs.settlements ?? [];
const factions = catalogs.factions ?? [];
const collectibles = catalogs.collectibles ?? [];

function normalize(value = "") {
  return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function deterministicIndex(seed, size) {
  if (!size) return 0;
  return [...String(seed)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % size;
}

function missionLocations(mission) {
  const text = normalize(`${mission.name} ${mission.originalName ?? ""} ${mission.type ?? ""} ${mission.activation ?? ""} ${mission.execution ?? ""} ${mission.completion ?? ""}`);
  const direct = locations.filter((location) => text.includes(normalize(location.name))).slice(0, 6);
  if (direct.length) return direct;
  const start = deterministicIndex(`${mission.id}:${mission.name}`, locations.length);
  return Array.from({ length: 4 }, (_, index) => locations[(start + index * 17) % locations.length]).filter(Boolean);
}

function missionDepth(mission) {
  const detail = missionDetails.missions?.find((item) => item.id === mission.id);
  const route = missionLocations(mission);
  const generatedSteps = detail?.stages?.length || route.reduce((sum, location) => {
    const subzones = location.subzones?.length ?? 0;
    const base = 4 + (location.settlement ? 1 : 0);
    return sum + Math.max(base, Math.min(8, subzones));
  }, 0);
  const hasSpecificText = Boolean(detail?.stages?.length || mission.activation || mission.execution || mission.completion);
  return {
    id: mission.id,
    name: mission.name,
    sourceTome: mission.sourceTome,
    status: hasSpecificText ? "specific-runtime" : "generic-runtime",
    playableSteps: generatedSteps,
    linkedLocationIds: detail?.stages?.some((stage) => stage.locationId)
      ? [...new Set(detail.stages.map((stage) => stage.locationId).filter(Boolean))]
      : route.map((location) => location.id),
    npcCount: detail?.npcs?.length ?? 0,
    enemyCount: detail?.enemies?.length ?? 0,
    requiredItemCount: detail?.requiredItems?.length ?? 0,
    systems: ["ap", "2d20", "mission-state", "location-map", "encounter", "loot", "save-game"],
  };
}

function locationDepth(location) {
  const enemies = location.enemies ?? [];
  const localCollectibles = collectibles.filter((item) => item.locationId === location.id);
  return {
    id: location.id,
    name: location.name,
    sourceTome: location.sourceTome,
    status: location.subzones?.length ? "internal-map-runtime" : "fallback-internal-map-runtime",
    subzones: location.subzones?.length ?? 3,
    hasEnemies: enemies.length > 0,
    collectibleCount: localCollectibles.length,
    settlement: Boolean(location.settlement),
    systems: ["world-position", "internal-map", "ap-movement", "risk-check", "encounter", "loot", "save-state"],
  };
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  gameId: "fallout4",
  scope: "base-game",
  summary: {
    missions: missions.length,
    missionsSpecificRuntime: missions.filter((mission) => missionDetails.missions?.find((item) => item.id === mission.id)?.stages?.length || mission.activation || mission.execution || mission.completion).length,
    missionsGenericRuntime: missions.filter((mission) => !(missionDetails.missions?.find((item) => item.id === mission.id)?.stages?.length || mission.activation || mission.execution || mission.completion)).length,
    missionStages: missionDetails.counts?.stages ?? 0,
    missionNpcs: missionDetails.counts?.npcs ?? 0,
    missionRequiredItems: missionDetails.counts?.requiredItems ?? 0,
    locations: locations.length,
    locationsWithInternalMaps: locations.filter((location) => location.subzones?.length).length,
    locationsWithEnemies: locations.filter((location) => location.enemies?.length).length,
    bestiary: bestiary.length,
    weapons: weapons.length,
    equipment: equipment.length,
    settlements: settlements.length,
    factions: factions.length,
    collectibles: collectibles.length,
  },
  runtimeSystems: {
    tome01: ["ap", "2d20", "difficulty", "momentum", "noise", "ruleState", "save persistence"],
    tome02: ["missionRuntime", "generated playable steps", "unlock state", "completion state"],
    tome03: ["persistent enemy state", "scaled hp", "combat rounds", "defeat loot"],
    tome04: ["weapon loadout", "catalog loot fallback"],
    tome05: ["armor/equipment loadout", "defense state placeholder"],
    tome06: ["world location", "internal map per location", "subzone AP movement"],
    tome07: ["settlement state", "food/water/beds/defense", "linked route"],
    tome08: ["faction reputation", "mission consequence hook"],
    tome09: ["collectible discovery", "location/subzone matching"],
    tome10: ["hunger", "thirst", "sleep", "disease", "radiation", "fatigue"],
  },
  missions: missions.map(missionDepth),
  locations: locations.map(locationDepth),
  nonCanonicalRuntime: [
    {
      id: "generic-runtime-steps",
      reason: "Cuando Tomo 02 no trae campos finos de activacion/ejecucion/cierre, el motor genera pasos jugables deterministas para no bloquear la partida.",
    },
    {
      id: "scaled-enemy-hp",
      reason: "Las fichas de Tomo 03 se escalan a PV de mesa textual para mantener combates cortos en UI.",
    },
  ],
};

writeFileSync(
  path.join(root, "public/games/fallout4/coverage/runtime-depth.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);

console.log(`Runtime depth manifest generated: ${manifest.summary.missions} missions, ${manifest.summary.locations} locations.`);
