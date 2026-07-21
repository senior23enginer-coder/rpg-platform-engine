import { readFileSync } from "node:fs";

const files = {
  engine: readFileSync("src/lib/fallout4PlayableEngine.ts", "utf8"),
  campaign: readFileSync("src/screens/Fallout4CampaignScreen.tsx", "utf8"),
  profile: readFileSync("src/types/profile.ts", "utf8"),
  backend: readFileSync("scripts/local-backend.mjs", "utf8"),
  api: readFileSync("public/platform/api-contract.json", "utf8"),
  playable: JSON.parse(readFileSync("public/games/fallout4/runtime/playable-content.json", "utf8")),
  index: JSON.parse(readFileSync("public/games/fallout4/runtime/playable-editor-index.json", "utf8")),
  tomeMatrix: JSON.parse(readFileSync("public/games/fallout4/runtime/tome-application-matrix.json", "utf8")),
  rules: JSON.parse(readFileSync("public/games/fallout4/rules/integrated/business-rules.json", "utf8")),
  advancedRules: JSON.parse(readFileSync("public/games/fallout4/rules/advanced-rules.json", "utf8")),
};

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

for (const exportedRule of [
  "rollFallout4Test",
  "resolveFallout4Combat",
  "fallout4AmmoTypeForWeapon",
  "applyFallout4SurvivalTurn",
  "awardFallout4Caps",
  "fallout4Defense",
  "fallout4WeaponDamage",
  "applyFallout4Difficulty",
  "fallout4MovementCost",
  "fallout4CoverageModifier",
  "resolveFallout4NodeAction",
  "resolveFallout4WeatherTick",
  "resolveFallout4Trade",
  "resolveFallout4SettlementBuild",
  "resolveFallout4FactionReputation",
  "resolveFallout4MissionStep",
  "resolveFallout4LockOrTerminal",
]) {
  assert(files.engine.includes(`export function ${exportedRule}`), `Motor jugable sin ${exportedRule}`);
}

for (const runtimeField of [
  "actionPointsSpent",
  "testsRolled",
  "combatRounds",
  "damageDealt",
  "damageTaken",
  "defenseApplied",
  "capsEarned",
  "capsSpent",
  "factionReputation",
  "settlementStates",
  "survival",
  "ammo",
  "inventory",
  "missionRuntime",
]) {
  assert(files.profile.includes(runtimeField), `Guardado sin campo jugable ${runtimeField}`);
}

for (const uiHook of [
  "resolveFallout4Combat",
  "awardFallout4Caps",
  "fallout4MovementCost",
  "resolveFallout4SettlementBuild",
  "resolveFallout4FactionReputation",
  "resolveFallout4WeatherTick",
  "setCaps",
  "setAmmo",
  "ammoValue: nextAmmo",
  "capsValue: nextCaps",
  "Resolver nodo interno",
  "Encuentro",
  "Asentamiento",
  "Suministro",
  "Perk",
]) {
  assert(files.campaign.includes(uiHook), `Campana Fallout 4 no usa ${uiHook}`);
}

const counts = files.playable.counts ?? files.index.counts ?? {};
assert(counts.missions >= 216, "No estan disponibles las 216 misiones");
assert(counts.locationMaps >= 558, "No estan disponibles los 558 mapas/ubicaciones");
assert(counts.bestiary >= 213, "No esta disponible el bestiario completo");
assert(counts.weapons >= 95, "No estan disponibles las armas completas");
assert(counts.equipment >= 288, "No esta disponible el equipo completo");
assert(counts.settlements >= 36, "No estan disponibles los asentamientos");
assert(counts.factions >= 10, "No estan disponibles las facciones");
assert(counts.collectibles >= 618, "No estan disponibles los objetos/coleccionables");
assert(counts.locationEvents >= 12692, "No estan disponibles eventos de ubicacion suficientes");
assert(files.playable.source?.tomes === "docs/TOMO 01-10", "Playable content no apunta a docs/TOMO 01-10");
assert(files.playable.source?.applicationMatrix?.includes("tome-application-matrix"), "Playable content sin matriz de aplicacion");

assert(files.tomeMatrix.tomes?.length === 10, "Matriz de tomos no cubre los 10 tomos");
for (const tome of files.tomeMatrix.tomes ?? []) {
  assert(tome.applied === true, `Tomo no marcado aplicado: ${tome.id}`);
  assert(tome.sourceDocument?.startsWith("docs/TOMO"), `Tomo sin fuente docs: ${tome.id}`);
  assert((tome.gameplaySystems ?? []).length >= 4, `Tomo sin sistemas jugables suficientes: ${tome.id}`);
  assert((tome.editorSurfaces ?? []).length >= 3, `Tomo sin superficies de editor suficientes: ${tome.id}`);
  assert((tome.engineHooks ?? []).length >= 1, `Tomo sin hooks de motor: ${tome.id}`);
  assert((tome.backendCatalogs ?? []).length >= 1, `Tomo sin catalogos backend: ${tome.id}`);
}

for (const playableDomain of ["rules", "missions", "locations", "creatures", "weapons", "equipment", "settlements", "factions", "collectibles", "survival", "economy", "weather"]) {
  assert(Object.hasOwn(files.rules.playableCounts ?? {}, playableDomain), `business-rules sin dominio jugable ${playableDomain}`);
}

for (const advancedDomain of ["tests", "combat", "perks", "economy", "loadout", "nodes", "missions", "locations", "bestiary", "weapons", "equipment", "settlements", "factions", "collectibles", "survival"]) {
  assert(Object.hasOwn(files.advancedRules.rules ?? {}, advancedDomain), `advanced-rules sin ${advancedDomain}`);
}

for (const backendHook of [
  "playableSummaryMatch",
  "playableListMatch",
  "playableItemMatch",
  "playableExportMatch",
  "playableImportMatch",
]) {
  assert(files.backend.includes(backendHook), `Backend local sin hook ${backendHook}`);
}

for (const contractHook of [
  "GET /games/:gameId/playable/summary",
  "GET /games/:gameId/playable/:catalog",
  "GET /games/:gameId/playable/:catalog/:itemId",
  "PATCH /games/:gameId/playable/:catalog/:itemId",
  "GET /games/:gameId/playable/export",
  "POST /games/:gameId/playable/import",
]) {
  assert(files.api.includes(contractHook), `Contrato API sin ${contractHook}`);
}

console.log("Fallout 4 playable engine audit");
console.log("===============================");
console.log(`Missions: ${counts.missions}`);
console.log(`Location maps: ${counts.locationMaps}`);
console.log(`Location events: ${counts.locationEvents}`);
console.log(`Bestiary: ${counts.bestiary}`);
console.log(`Weapons/equipment: ${counts.weapons}/${counts.equipment}`);
console.log("OK: Fallout 4 tiene motor jugable verificable para reglas, mapas, misiones y guardado.");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
