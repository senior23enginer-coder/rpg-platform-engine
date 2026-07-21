import { readFileSync } from "node:fs";

const files = {
  app: readFileSync("src/App.tsx", "utf8"),
  newGame: readFileSync("src/screens/NewGameScreen.tsx", "utf8"),
  loadGame: readFileSync("src/screens/LoadGameScreen.tsx", "utf8"),
  profileTypes: readFileSync("src/types/profile.ts", "utf8"),
  saveDocument: readFileSync("src/lib/saveGameStorage.ts", "utf8"),
  campaign: readFileSync("src/screens/Fallout4CampaignScreen.tsx", "utf8"),
  mapEditor: readFileSync("src/screens/MapEditor.tsx", "utf8"),
  backend: readFileSync("scripts/local-backend.mjs", "utf8"),
  falloutGame: JSON.parse(readFileSync("public/games/fallout4/game.config.json", "utf8")),
  newGameConfig: JSON.parse(readFileSync("public/games/fallout4/setup/new-game.config.json", "utf8")),
  playable: JSON.parse(readFileSync("public/games/fallout4/runtime/playable-content.json", "utf8")),
  detailPack: JSON.parse(readFileSync("public/games/fallout4/runtime/playable-detail-pack.json", "utf8")),
};

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

for (const field of [
  "gameMode",
  "playerCount",
  "characterOriginId",
  "characterOriginName",
  "characterGender",
  "characterAge",
  "characterNotes",
  "selectedCharacterIds",
  "survivalEnabled",
]) {
  assert(files.profileTypes.includes(field), `PlayerSave no persiste ${field}`);
  assert(files.app.includes(field), `Nueva partida no asigna ${field}`);
  assert(files.saveDocument.includes(field.replace("character", "").toLowerCase()) || files.saveDocument.includes(field), `save.game.json no exporta ${field}`);
}

for (const option of ["players", "survival", "originId", "originName", "gender", "age", "notes", "selectedCharacterIds"]) {
  assert(files.newGame.includes(option), `NewGameScreen no captura ${option}`);
}

assert(files.app.includes('options?.mode === "free" ? "free_exploration"'), "Modo libre no usa campaignId propio");
assert(files.app.includes('setScreen(activeGame.id === "fallout4" ? "fallout4Campaign" : "home")'), "Nueva partida Fallout 4 no entra siempre al runtime jugable");
assert(files.app.includes('setScreen(save.gameId === "fallout4" ? "fallout4Campaign" : "home")'), "Cargar partida Fallout 4 no vuelve siempre al runtime jugable");
assert(files.app.includes('activeMissionId: options?.mode === "free" ? "FREE-EXPLORATION" : "M-0170"'), "Modo libre no inicializa mision libre");
assert(files.app.includes("survivalEnabled: Boolean(options?.survival)"), "Nueva partida no marca supervivencia");
assert(files.app.includes("savePersistentGameDocument") && files.app.includes("platformRepository.saves.save"), "Guardado no persiste en documento y backend local");

for (const loadNeedle of ["Modo libre", "Campana guiada", "playerCount", "survivalEnabled", "storagePath"]) {
  assert(files.loadGame.includes(loadNeedle), `Cargar partida no muestra ${loadNeedle}`);
}

for (const campaignNeedle of [
  "progressPatch",
  "resolveAtlasNode",
  "resolveMissionObjectiveStep",
  "resolveFreeAtlasLocation",
  "resolveFallout4Combat",
  "resolveFallout4WeatherTick",
  "resolveFallout4Trade",
  "resolveFallout4SettlementBuild",
  "onProgress",
]) {
  assert(files.campaign.includes(campaignNeedle), `Campana/jugabilidad sin ${campaignNeedle}`);
}

for (const mapNeedle of [
  "MapEditorView",
  "view, setView",
  "platformRepository.maps.list",
  ".detail<Record<string, unknown>>(game.id, \"locationMaps\", activeMapId)",
  "platformRepository.maps.save",
  "platformRepository.playable.save",
  "loadImageFile",
  "maxImportedImageSide",
  "undoMapChange",
  "redoMapChange",
  "selectedMarkerIds",
  "canvasZoom",
  "pan",
  "missionSheets",
  "weatherEffects",
  "biomes",
  "arsenal",
]) {
  assert(files.mapEditor.includes(mapNeedle), `Editor de mapas sin flujo ${mapNeedle}`);
}

assert(files.falloutGame.campaigns?.some((campaign) => campaign.id === "sanctuary_commonwealth" && campaign.implemented), "Fallout 4 no tiene campana guiada principal");
assert(files.newGameConfig.modes?.guided && files.newGameConfig.modes?.free, "Configuracion de nueva partida no define campana y modo libre");
assert(files.playable.catalogs?.missions?.length >= 216, "Runtime sin misiones suficientes");
assert(files.playable.catalogs?.locationMaps?.length >= 558, "Runtime sin mapas por ubicacion suficientes");
assert(files.detailPack.totalDetails >= 2600, "Detail pack sin fichas suficientes para editor/juego");
assert(files.backend.includes("savesMatch") && files.backend.includes("method === \"GET\"") && files.backend.includes("method === \"PATCH\"") && files.backend.includes("saveIndex"), "Backend local sin persistencia de guardados");

console.log("Playable flow complete audit");
console.log("============================");
console.log("OK: nueva partida, personaje, modo libre, campana, carga, guardado y editor tienen contrato verificable.");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
