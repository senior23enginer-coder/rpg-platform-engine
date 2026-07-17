import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const gameRoot = path.join(root, "public", "games", "fallout4");
const tomeRoot = path.join(gameRoot, "rules", "tomes");
const outputRoot = path.join(gameRoot, "rules", "integrated");

const tomes = [
  { id: "tomo-01", number: 1, file: "tomo-01-reglas-core.txt", domain: "core", runtime: ["rules/rules.json", "characters/characters.json", "setup/new-game.config.json"] },
  { id: "tomo-02", number: 2, file: "tomo-02-misiones.txt", domain: "missions", runtime: ["missions/missions.json", "missions/mission-details.json", "missions/mission-polish.json"] },
  { id: "tomo-03", number: 3, file: "tomo-03-bestiario-npcs-ia.txt", domain: "actors", runtime: ["bestiary/bestiary.json"] },
  { id: "tomo-04", number: 4, file: "tomo-04-armas-municion-mods.txt", domain: "weapons", runtime: ["templates/templates.json"] },
  { id: "tomo-05", number: 5, file: "tomo-05-armaduras-equipo-servoarmadura.txt", domain: "equipment", runtime: ["templates/templates.json"] },
  { id: "tomo-06", number: 6, file: "tomo-06-atlas-ubicaciones-clima.txt", domain: "atlas", runtime: ["locations/location-events.json"] },
  { id: "tomo-07", number: 7, file: "tomo-07-asentamientos-economia.txt", domain: "settlements", runtime: ["features/asentamientos/config.json"] },
  { id: "tomo-08", number: 8, file: "tomo-08-facciones-reputacion.txt", domain: "factions", runtime: ["features/facciones/config.json"] },
  { id: "tomo-09", number: 9, file: "tomo-09-coleccionables-objetos-unicos.txt", domain: "collectibles", runtime: ["locations/location-events.json", "templates/templates.json"] },
  { id: "tomo-10", number: 10, file: "tomo-10-supervivencia-clima-ciclos.txt", domain: "survival", runtime: ["features/supervivencia/config.json", "rules/rules.json"] },
];

const domainDescriptions = {
  core: "Motor base 2d20: SPECIAL, AP, turnos, acciones, combate, inventario, progreso y condiciones.",
  missions: "Misiones principales, secundarias, contratos, objetivos, recompensas, consecuencias y pasos.",
  actors: "Enemigos, criaturas, NPCs, companeros, IA, amenaza, comportamiento y escalado.",
  weapons: "Armas, municion, mods, dano, alcance, cualidades y economia de combate.",
  equipment: "Armaduras, ropa, servoarmaduras, proteccion, desgaste, piezas y equipo util.",
  atlas: "Ubicaciones, mapas, subzonas, biomas, rutas, clima, cobertura, loot y encuentros.",
  settlements: "Asentamientos, recursos, poblacion, defensa, produccion, ataques y rutas.",
  factions: "Facciones, reputacion, politica, rangos, hostilidad, alianzas y territorio.",
  collectibles: "Notas, holocintas, terminales, llaves, revistas, pistas, objetos unicos y recompensas.",
  survival: "Hambre, sed, sueno, fatiga, enfermedad, radiacion, clima severo, campamento y desgaste.",
};

function normalizeText(text) {
  return text.replace(/\r\n/g, "\n").replace(/\u0000/g, "");
}

function extractTitle(text, fallback) {
  return text.split("\n").find((line) => line.trim())?.trim() || fallback;
}

function extractHeadings(text) {
  const lines = text.split("\n");
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index].trim();
    if (!raw || raw.length > 150) continue;
    const isChapter = /^(CAP[IÍ]TULO|CAPITULO|TOMO|AJUSTE|CIERRE|REGLA|SECCI[OÓ]N|MISI[OÓ]N|UBICACI[OÓ]N|FASE|TABLA)\b/i.test(raw);
    const isUpper = raw.length > 8 && raw === raw.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(raw);
    const nextIsRule = /^[-=]{5,}$/.test(lines[index + 1]?.trim() ?? "");
    if (isChapter || isUpper || nextIsRule) {
      headings.push({ line: index + 1, title: raw });
    }
  }
  return headings;
}

function extractTables(text) {
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith("|") && trimmed.endsWith("|");
    }).length;
}

function extractClimateList(text) {
  const match = text.match(/Climas completos[^:\n]*:\s*([^\n]+)/i);
  if (!match) return [];
  return match[1]
    .split(";")
    .map((item) => item.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

function extractBulletRules(text, keywords) {
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .filter((line) => normalizedKeywords.some((keyword) => line.toLowerCase().includes(keyword)))
    .slice(0, 80)
    .map((line) => line.replace(/^[-*]\s+/, ""));
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function readJson(relativePath, fallback = {}) {
  try {
    return safeJsonParse(await readFile(path.join(gameRoot, relativePath), "utf8"), fallback);
  } catch {
    return fallback;
  }
}

function countFromRuntime(relativePath, payload) {
  if (relativePath.includes("rules/rules.json")) return Object.keys(payload.rules ?? {}).length;
  if (relativePath.includes("missions")) return payload.missions?.length ?? payload.details?.length ?? payload.steps?.length ?? 0;
  if (relativePath.includes("bestiary")) return payload.creatures?.length ?? 0;
  if (relativePath.includes("locations")) return payload.counts?.locations ?? payload.locations?.length ?? 0;
  if (relativePath.includes("templates")) return payload.counts ?? {};
  return 1;
}

const sourceMap = [];
const domains = [];
const runtimeIndexes = {};

for (const tome of tomes) {
  const text = normalizeText(await readFile(path.join(tomeRoot, tome.file), "utf8"));
  const headings = extractHeadings(text);
  const runtime = [];
  for (const runtimePath of tome.runtime) {
    const payload = await readJson(runtimePath, {});
    runtime.push({
      path: runtimePath,
      count: countFromRuntime(runtimePath, payload),
    });
    runtimeIndexes[runtimePath] = runtimeIndexes[runtimePath] ?? countFromRuntime(runtimePath, payload);
  }

  const domain = {
    id: tome.domain,
    tomeId: tome.id,
    tomeNumber: tome.number,
    title: extractTitle(text, `Tomo ${tome.number}`),
    description: domainDescriptions[tome.domain],
    sourcePath: `rules/tomes/${tome.file}`,
    runtime,
    metrics: {
      characters: text.length,
      headings: headings.length,
      tables: extractTables(text),
    },
    businessObjects: headings.slice(0, 120).map((heading) => ({
      id: `${tome.domain}-${String(heading.line).padStart(5, "0")}`,
      title: heading.title,
      sourceLine: heading.line,
      sourceTome: tome.id,
      status: "indexed",
    })),
  };

  if (tome.domain === "survival" || tome.domain === "atlas") {
    domain.climates = extractClimateList(text);
    domain.climateRules = extractBulletRules(text, ["clima", "lluvia", "radiacion", "tormenta", "noche", "ciclo"]);
  }

  if (tome.domain === "core") {
    domain.coreRules = extractBulletRules(text, ["2d20", "ap", "momentum", "accion", "combate", "nodo", "inventario", "especial", "special"]);
  }

  domains.push(domain);
  sourceMap.push({
    tomeId: tome.id,
    number: tome.number,
    domain: tome.domain,
    sourcePath: `rules/tomes/${tome.file}`,
    indexedHeadings: headings.length,
    indexedTables: extractTables(text),
    runtimeTargets: tome.runtime,
  });
}

const existingRules = await readJson("rules/rules.json", {});
const locations = await readJson("locations/location-events.json", {});
const bestiary = await readJson("bestiary/bestiary.json", {});
const missions = await readJson("missions/missions.json", {});
const templates = await readJson("templates/templates.json", {});

const businessRules = {
  schemaVersion: 1,
  gameId: "fallout4",
  generatedAt: new Date().toISOString(),
  purpose: "Integracion jugable de tomos Fallout 4: los TXT son fuente; este JSON conecta reglas de negocio, runtime y dominios de juego.",
  sourceLibrary: "rules/tomes/tomes.manifest.json",
  runtimeModules: {
    coreRules: "rules/rules.json",
    missions: "missions/missions.json",
    missionDetails: "missions/mission-details.json",
    locations: "locations/location-events.json",
    bestiary: "bestiary/bestiary.json",
    templates: "templates/templates.json",
    settlements: "features/asentamientos/config.json",
    factions: "features/facciones/config.json",
    survival: "features/supervivencia/config.json",
  },
  playableCounts: {
    rules: Object.keys(existingRules.rules ?? {}).length,
    missions: missions.missions?.length ?? 0,
    locations: locations.counts?.locations ?? locations.locations?.length ?? 0,
    events: locations.counts?.events ?? 0,
    creatures: bestiary.creatures?.length ?? 0,
    templates: templates.counts ?? {},
  },
  inheritanceContract: {
    description: "Otros juegos pueden heredar el motor 2d20 y reemplazar dominios especificos sin duplicar tomos.",
    inheritedByDefault: ["core", "turns", "ap", "2d20", "momentum", "nodes", "missionStructure", "inventory", "conditions"],
    overridePerGame: ["setting", "bestiary", "weapons", "equipment", "locations", "factions", "survivalFlavor"],
  },
  domains,
};

await mkdir(outputRoot, { recursive: true });
await writeFile(path.join(outputRoot, "business-rules.json"), `${JSON.stringify(businessRules, null, 2)}\n`, "utf8");
await writeFile(path.join(outputRoot, "source-map.json"), `${JSON.stringify({ generatedAt: businessRules.generatedAt, sourceMap }, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  generated: [
    "public/games/fallout4/rules/integrated/business-rules.json",
    "public/games/fallout4/rules/integrated/source-map.json",
  ],
  domains: domains.length,
  playableCounts: businessRules.playableCounts,
}, null, 2));
