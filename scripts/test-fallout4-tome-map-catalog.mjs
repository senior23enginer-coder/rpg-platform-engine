import { readFileSync } from "node:fs";

const templates = JSON.parse(readFileSync("public/games/fallout4/templates/templates.json", "utf8"));
const playable = JSON.parse(readFileSync("public/games/fallout4/runtime/playable-content.json", "utf8"));
const editorIndex = JSON.parse(readFileSync("public/games/fallout4/runtime/playable-editor-index.json", "utf8"));
const mapEditorSource = readFileSync("src/screens/MapEditor.tsx", "utf8");
const catalogSource = readFileSync("src/lib/fallout4TomeCatalog.ts", "utf8");

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const counts = templates.counts ?? {};
const catalogs = templates.catalogs ?? {};

assert(counts.missions >= 216 && catalogs.missions?.length >= 216, "Misiones de TOMO 02 incompletas");
assert(counts.locations >= 558 && catalogs.locations?.length >= 558, "Ubicaciones de TOMO 06 incompletas");
assert(counts.bestiary >= 213 && catalogs.bestiary?.length >= 213, "Bestiario de TOMO 03 incompleto");
assert(counts.weapons >= 95 && catalogs.weapons?.length >= 95, "Armas de TOMO 04 incompletas");
assert(counts.equipment >= 288 && catalogs.equipment?.length >= 288, "Equipo/objetos de TOMO 05 incompletos");
assert(counts.settlements >= 36 && catalogs.settlements?.length >= 36, "Asentamientos de TOMO 07 incompletos");
assert(counts.factions >= 10 && catalogs.factions?.length >= 10, "Facciones de TOMO 08 incompletas");
assert(counts.collectibles >= 618 && catalogs.collectibles?.length >= 618, "Coleccionables de TOMO 09 incompletos");

assert(playable.counts?.locationMaps >= 558 && playable.catalogs?.locationMaps?.length >= 558, "No hay un mapa independiente por ubicacion del TOMO 06");
assert(playable.counts?.locationEvents >= 12692, "Eventos de ubicacion/subzona incompletos");
assert(playable.counts?.missionStages >= 1600, "Etapas de mision del TOMO 02 no estan aplicadas");
assert(playable.rules?.nodeTypes?.length >= 9, "Tipos de nodos, cobertura y movimiento no estan mapeados");
assert(playable.rules?.weatherEffects?.length >= 4, "Clima/dia-noche del TOMO 10 no esta disponible para mapas");
assert(playable.rules?.biomes?.length >= 1, "Biomas del atlas no estan disponibles para mapas");
assert(playable.tomeMatrix?.length === 10, "La matriz jugable debe cubrir TOMO 01-10");
assert(editorIndex.counts?.locationMaps === playable.counts?.locationMaps, "Indice de editor no conserva mapas por ubicacion");
assert(editorIndex.catalogs?.locationMaps?.length === playable.catalogs?.locationMaps?.length, "Indice de editor no conserva listado de mapas");
assert(editorIndex.source?.playableContent?.includes("playable-content.json"), "Indice de editor debe apuntar al JSON completo");

for (const tome of Array.from({ length: 10 }, (_, index) => `TOMO ${String(index + 1).padStart(2, "0")}`)) {
  assert(playable.tomeMatrix.some((item) => item.id === tome && item.editorSurfaces?.length), `Falta superficie de editor para ${tome}`);
}

assert(catalogSource.includes("createFallout4LocationMaps"), "No existe generador de mapas por ubicacion");
assert(catalogSource.includes("buildFallout4TomeMapLibrary"), "No existe normalizador de libreria tactica desde tomos");
assert(catalogSource.includes("runtime/playable-editor-index.json"), "El editor no consume el indice jugable optimizado");
assert(mapEditorSource.includes("buildFallout4TomeMapLibrary"), "MapEditor no consume libreria de tomos");
assert(mapEditorSource.includes("createFallout4LocationMaps"), "MapEditor no crea mapas por ubicacion");
assert(mapEditorSource.includes("tome-coverage-strip"), "MapEditor no muestra cobertura real de tomos");
assert(mapEditorSource.includes("map-tome-context"), "MapEditor no muestra contexto jugable de la ubicacion");
assert(mapEditorSource.includes("nodeTypes"), "MapEditor no expone nodos/cobertura/movimiento desde tomos");

console.log("Fallout 4 tome map catalog");
console.log("==========================");
console.log(`Missions: ${counts.missions}`);
console.log(`Locations/maps: ${counts.locations}`);
console.log(`Bestiary: ${counts.bestiary}`);
console.log(`Weapons: ${counts.weapons}`);
console.log(`Equipment: ${counts.equipment}`);
console.log(`Settlements: ${counts.settlements}`);
console.log(`Factions: ${counts.factions}`);
console.log(`Collectibles: ${counts.collectibles}`);
console.log(`Location events: ${playable.counts.locationEvents}`);
console.log(`Mission stages: ${playable.counts.missionStages}`);
console.log(`Node types: ${playable.counts.nodeTypes}`);

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log("OK: editor alimentado por catalogos jugables completos de TOMO 01-10.");
