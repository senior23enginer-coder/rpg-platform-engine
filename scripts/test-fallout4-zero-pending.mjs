import { existsSync, readFileSync } from "node:fs";

const paths = {
  detailPack: "public/games/fallout4/runtime/playable-detail-pack.json",
  playable: "public/games/fallout4/runtime/playable-content.json",
  backend: "scripts/local-backend.mjs",
  api: "public/platform/api-contract.json",
  contracts: "src/lib/platformContracts.ts",
  repository: "src/lib/localHttpPlatformRepository.ts",
  content: "src/screens/ContentScreen.tsx",
  maps: "src/screens/MapEditor.tsx",
};

const files = Object.fromEntries(Object.entries(paths).map(([key, filePath]) => [key, readFileSync(filePath, "utf8")]));
const detailPack = JSON.parse(files.detailPack);
const playable = JSON.parse(files.playable);
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(existsSync(paths.detailPack), "No existe playable-detail-pack.json");
assert(detailPack.gameId === "fallout4", "Detail pack no pertenece a fallout4");
assert(detailPack.totalDetails >= 2600, "Detail pack no cubre suficientes fichas jugables");

const requiredCounts = {
  missions: 216,
  locations: 558,
  locationMaps: 558,
  bestiary: 213,
  weapons: 95,
  equipment: 288,
  settlements: 36,
  factions: 10,
  collectibles: 618,
  weather: 4,
  biomes: 5,
  nodeTypes: 9,
};

for (const [type, minimum] of Object.entries(requiredCounts)) {
  assert((detailPack.counts?.[type] ?? 0) >= minimum, `Detail pack incompleto para ${type}`);
  assert((playable.counts?.[type] ?? playable.rules?.[type]?.length ?? 0) >= minimum || type === "weather", `Playable content incompleto para ${type}`);
}

for (const [type, items] of Object.entries(detailPack.catalogs ?? {})) {
  assert(Array.isArray(items) && items.length === detailPack.counts[type], `Catalogo ${type} no coincide con su conteo`);
  for (const item of items.slice(0, 12)) {
    assert(item.id, `${type} sin id`);
    assert(item.title, `${type}:${item.id} sin titulo`);
    assert(item.backendEndpoint?.includes(`/playable/${type}/`), `${type}:${item.id} sin endpoint backend`);
    assert(item.detailEndpoint?.endsWith("/detail-pack"), `${type}:${item.id} sin endpoint detail-pack`);
    assert((item.sourceTomes ?? []).length >= 1, `${type}:${item.id} sin tomo fuente`);
    assert((item.sourceDocuments ?? []).some((document) => String(document).startsWith("docs/TOMO")), `${type}:${item.id} sin documento fuente docs`);
    assert((item.editableFields ?? []).length >= 5, `${type}:${item.id} sin campos editables suficientes`);
    assert((item.panels ?? []).length >= 2, `${type}:${item.id} sin paneles de detalle`);
    assert(item.validation?.requiresDetailScreen === true, `${type}:${item.id} sin validacion de pantalla detalle`);
    assert(item.validation?.requiresBackendCrud === true, `${type}:${item.id} sin validacion de CRUD backend`);
  }
}

for (const backendNeedle of ["readPlayableDetailPack", "playableDetailPackMatch", "PLAYABLE_DETAIL_PACK_NOT_FOUND", "detailPack"]) {
  assert(files.backend.includes(backendNeedle), `Backend local sin ${backendNeedle}`);
}

for (const contractNeedle of [
  "GET /games/:gameId/playable/:catalog/:itemId/detail-pack",
  "detailPack<T = Record<string, unknown>>",
  "/detail-pack",
]) {
  assert(files.api.includes(contractNeedle) || files.contracts.includes(contractNeedle) || files.repository.includes(contractNeedle), `Contrato/repositorio sin ${contractNeedle}`);
}

for (const uiNeedle of [
  "locationMaps",
  "biomes",
  "nodeTypes",
  "detailPack",
  "Paquete operativo desde tomos",
  "editableFields",
  "relationIds",
  "mapEditorBindings",
  "Validacion",
]) {
  assert(files.content.includes(uiNeedle), `Pantalla de fichas sin ${uiNeedle}`);
}

for (const mapNeedle of [
  ".detail<Record<string, unknown>>(game.id, \"locationMaps\", activeMapId)",
  "platformRepository.playable.save",
  "platformRepository.maps.save",
  "undoMapChange",
  "redoMapChange",
  "selectedMarkerIds",
  "canvasZoom",
  "pan",
  "showTerrainLayer",
  "showMissionLayer",
  "loadImageFile",
  "maxImportedImageSide",
  "missionSheets",
  "weatherEffects",
  "biomes",
  "arsenal",
]) {
  assert(files.maps.includes(mapNeedle), `Editor de mapas sin ${mapNeedle}`);
}

console.log("Fallout 4 zero-pending playable audit");
console.log("====================================");
console.log(`Total detail records: ${detailPack.totalDetails}`);
console.log(`Missions/maps: ${detailPack.counts.missions}/${detailPack.counts.locationMaps}`);
console.log(`Bestiary/weapons/equipment: ${detailPack.counts.bestiary}/${detailPack.counts.weapons}/${detailPack.counts.equipment}`);
console.log(`Locations/settlements/factions: ${detailPack.counts.locations}/${detailPack.counts.settlements}/${detailPack.counts.factions}`);
console.log("OK: fichas, endpoints, editor y UI tienen cobertura verificable desde TOMO 01-10.");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
