import { readFileSync } from "node:fs";

const templates = JSON.parse(readFileSync("public/games/fallout4/templates/templates.json", "utf8"));
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

assert(catalogSource.includes("createFallout4LocationMaps"), "No existe generador de mapas por ubicacion");
assert(catalogSource.includes("buildFallout4TomeMapLibrary"), "No existe normalizador de libreria tactica desde tomos");
assert(mapEditorSource.includes("buildFallout4TomeMapLibrary"), "MapEditor no consume libreria de tomos");
assert(mapEditorSource.includes("createFallout4LocationMaps"), "MapEditor no crea mapas por ubicacion");
assert(mapEditorSource.includes("tome-coverage-strip"), "MapEditor no muestra cobertura real de tomos");

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

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log("OK: editor alimentado por catalogos completos de TOMO 01-10.");
