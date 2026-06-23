import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const coreBookDir = path.join(root, "core-book");
const templatesPath = path.join(root, "public", "games", "fallout4", "templates", "templates.json");
const outputDir = path.join(root, "public", "games", "fallout4", "coverage");
const outputPath = path.join(outputDir, "core-book-coverage.json");

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

const templates = readJson(templatesPath);
const coreBookFiles = readdirSync(coreBookDir)
  .filter((entry) => entry.endsWith(".txt"))
  .sort((a, b) => a.localeCompare(b));

const catalogByTome = {};
for (const [catalogName, entries] of Object.entries(templates.catalogs ?? {})) {
  if (!Array.isArray(entries)) continue;
  for (const entry of entries) {
    const tome = entry.sourceTome ?? "SIN_TOMO";
    catalogByTome[tome] ??= {};
    catalogByTome[tome][catalogName] ??= 0;
    catalogByTome[tome][catalogName] += 1;
  }
}

const runtimeSystemsByTome = {
  "TOMO 01": [
    "turn_based_ap",
    "2d20_tests",
    "momentum",
    "noise_complications",
    "special_character_seed",
    "companions",
    "free_mode",
    "survival_flags",
  ],
  "TOMO 02": [
    "mission_catalog",
    "active_mission_tracker",
    "out_of_time_objectives",
    "mission_unlocks",
    "mission_prerequisites",
  ],
  "TOMO 03": [
    "bestiary_catalog",
    "encounter_threats",
    "enemy_hp_templates",
    "location_enemy_matching",
  ],
  "TOMO 04": [
    "weapon_catalog",
    "weapon_rewards",
    "ammo_and_mod_hooks",
  ],
  "TOMO 05": [
    "equipment_catalog",
    "armor_and_outfit_hooks",
    "carry_and_defense_hooks",
  ],
  "TOMO 06": [
    "world_atlas_locations",
    "internal_location_maps",
    "subzone_navigation",
    "world_route_connections",
    "biome_risk_enemy_loot_context",
  ],
  "TOMO 07": [
    "settlement_catalog",
    "settlement_resource_loop",
    "population_food_water_beds_defense",
  ],
  "TOMO 08": [
    "faction_catalog",
    "reputation_hooks",
    "hostility_and_contract_hooks",
  ],
  "TOMO 09": [
    "collectibles_catalog",
    "terminal_note_holotape_keys",
    "location_subzone_collectible_matching",
  ],
  "TOMO 10": [
    "survival_optional_layer",
    "weather_hunger_thirst_sleep_disease_radiation_fatigue",
  ],
};

const catalogRequirements = {
  missions: ["id", "name", "sourceTome", "playableStatus", "useInPlay"],
  locations: ["id", "name", "sourceTome", "playableStatus", "subzones", "useInPlay"],
  bestiary: ["id", "name", "sourceTome", "playableStatus", "useInPlay"],
  weapons: ["id", "name", "sourceTome", "playableStatus", "useInPlay"],
  equipment: ["id", "name", "sourceTome", "playableStatus", "useInPlay"],
  settlements: ["id", "name", "sourceTome", "playableStatus", "useInPlay"],
  factions: ["id", "name", "sourceTome", "playableStatus", "useInPlay"],
  collectibles: ["id", "name", "sourceTome", "playableStatus", "useInPlay"],
};

const coverageFindings = [];
for (const [catalogName, requiredFields] of Object.entries(catalogRequirements)) {
  const entries = templates.catalogs?.[catalogName] ?? [];
  for (const entry of entries) {
    const missing = requiredFields.filter((field) => {
      const value = entry[field];
      return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
    });
    if (missing.length) {
      coverageFindings.push({
        catalog: catalogName,
        id: entry.id,
        name: entry.name,
        missing,
      });
    }
  }
}

const tomes = coreBookFiles.map((fileName) => {
  const content = readFileSync(path.join(coreBookDir, fileName), "utf8");
  const id = fileName.slice(0, 7);
  const role = templates.tomeRoles?.find((item) => item.id === id);
  return {
    id,
    fileName,
    bytes: Buffer.byteLength(content, "utf8"),
    characters: content.length,
    sha256: sha256(content),
    role: role?.role ?? "",
    playableStatus: role?.playableStatus ?? "template-ready",
    runtimeSystems: runtimeSystemsByTome[id] ?? [],
    catalogCounts: catalogByTome[id] ?? {},
  };
});

const nonCanonicalAdditions = [
  {
    id: "platform-ui-shell",
    type: "technical",
    description: "Interfaz RPG Platform Engine, login, perfiles, biblioteca, carga/guardado y paneles administrativos.",
    reason: "Necesario para operar la plataforma; no es contenido narrativo de los tomos.",
  },
  {
    id: "save-game-schema",
    type: "technical",
    description: "Campos de persistencia: atlasLocationStates, completedMissionSteps, momentum, noise, inventory y session timing.",
    reason: "Estructura tecnica para guardar el progreso de lo definido en los tomos.",
  },
  {
    id: "out-of-time-objective-ids",
    type: "derived-structure",
    description: "IDs internos como wake-cryo, take-pipboy y arrive-concord.",
    reason: "Son etiquetas tecnicas derivadas de la mision Out of Time y ubicaciones del Tomo 2/6; no son texto literal de los tomos.",
  },
  {
    id: "fallback-loot-labels",
    type: "fallback",
    description: "Etiquetas de reserva como Recurso comun y Alijo menor de ubicacion.",
    reason: "Se usan cuando un nodo no tiene coleccionable especifico del Tomo 9 asociado.",
  },
  {
    id: "generated-assets-and-demo-users",
    type: "technical",
    description: "Imagenes generadas/locales, noticias demo y usuarios operador/admin.",
    reason: "Soporte de plataforma y pruebas; no altera reglas ni canon de Fallout 4.",
  },
];

const manifest = {
  schemaVersion: 1,
  gameId: "fallout4",
  generatedAt: new Date().toISOString(),
  source: {
    coreBookDir: "core-book",
    templates: "public/games/fallout4/templates/templates.json",
  },
  coveragePolicy: {
    requirement: "Todos los tomos deben estar trazados a reglas, catalogos o sistemas jugables.",
    exceptionsAllowed: false,
    exceptions: [],
  },
  summary: {
    tomes: tomes.length,
    catalogCounts: templates.counts,
    catalogs: Object.fromEntries(
      Object.entries(templates.catalogs ?? {}).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0])
    ),
    coverageFindings: coverageFindings.length,
    nonCanonicalAdditions: nonCanonicalAdditions.length,
  },
  tomes,
  gameplayTemplates: templates.gameplayTemplates ?? [],
  routeTemplates: templates.routeTemplates ?? [],
  catalogRequirements,
  coverageFindings,
  nonCanonicalAdditions,
};

if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${path.relative(root, outputPath)}`);
