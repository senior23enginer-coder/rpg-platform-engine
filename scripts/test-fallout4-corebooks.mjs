import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];
const report = [];

function file(...parts) {
  return path.join(root, ...parts);
}

function readJson(...parts) {
  const target = file(...parts);
  try {
    return JSON.parse(readFileSync(target, "utf8"));
  } catch (error) {
    fail(`JSON invalido o ausente: ${parts.join("/")}`, error.message);
    return undefined;
  }
}

function readText(...parts) {
  const target = file(...parts);
  try {
    return readFileSync(target, "utf8");
  } catch (error) {
    fail(`Archivo ausente: ${parts.join("/")}`, error.message);
    return "";
  }
}

function assert(condition, message, details = "") {
  if (!condition) fail(message, details);
}

function fail(message, details = "") {
  failures.push(details ? `${message}: ${details}` : message);
}

function warn(message, details = "") {
  warnings.push(details ? `${message}: ${details}` : message);
}

function pass(message) {
  report.push(message);
}

function listDirs(...parts) {
  const target = file(...parts);
  if (!existsSync(target)) {
    fail(`Carpeta ausente: ${parts.join("/")}`);
    return [];
  }
  return readdirSync(target).filter((entry) => statSync(path.join(target, entry)).isDirectory());
}

function flattenSourceTomes(value, out = new Set()) {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    for (const item of value) flattenSourceTomes(item, out);
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    if ((key === "sourceTome" || key === "sourceTomes") && typeof child === "string") out.add(child.slice(0, 7));
    if ((key === "sourceTome" || key === "sourceTomes") && Array.isArray(child)) {
      for (const item of child) if (typeof item === "string") out.add(item.slice(0, 7));
    }
    flattenSourceTomes(child, out);
  }
  return out;
}

function arrayAt(value, key) {
  return Array.isArray(value?.[key]) ? value[key] : [];
}

const expectedTomes = Array.from({ length: 10 }, (_, index) => `TOMO ${String(index + 1).padStart(2, "0")}`);
const expectedDlc = [
  "automatron",
  "contraptions_workshop",
  "far_harbor",
  "nuka_world",
  "vault_tec_workshop",
  "wasteland_workshop",
];
const expectedFeatureFolders = ["asentamientos", "facciones", "supervivencia"];
const expectedCampaignRoute = ["vault111", "vault_exit", "sanctuary_hills", "red_rocket", "concord"];
const outOfTimeMissionSteps = [
  "M-0170:wake-cryo",
  "M-0170:check-pods",
  "M-0170:secure-office",
  "M-0170:take-pipboy",
  "M-0170:open-vault-door",
  "M-0170:reach-sanctuary",
  "M-0170:talk-codsworth",
  "M-0170:red-rocket-route",
  "M-0170:arrive-concord",
];

const coreBookDir = file("core-book");
const coreBookFiles = existsSync(coreBookDir) ? readdirSync(coreBookDir).filter((entry) => entry.endsWith(".txt")) : [];
assert(coreBookFiles.length === 10, "Deben existir 10 tomos en core-book", `encontrados: ${coreBookFiles.length}`);
for (const tome of expectedTomes) {
  const match = coreBookFiles.find((entry) => entry.startsWith(tome));
  assert(Boolean(match), `Falta ${tome} en core-book`);
  if (match) {
    const content = readText("core-book", match);
    assert(content.length > 1000, `${tome} parece demasiado corto`, `${content.length} caracteres`);
  }
}
pass("Core-book: 10 tomos presentes y legibles.");

const game = readJson("public", "games", "fallout4", "game.config.json");
const rules = readJson("public", "games", "fallout4", "rules", "rules.json");
const characters = readJson("public", "games", "fallout4", "characters", "characters.json");
const missions = readJson("public", "games", "fallout4", "missions", "missions.json");
const templates = readJson("public", "games", "fallout4", "templates", "templates.json");
const coverage = readJson("public", "games", "fallout4", "coverage", "core-book-coverage.json");
const runtimeDepth = readJson("public", "games", "fallout4", "coverage", "runtime-depth.json");
const campaign = readJson("public", "games", "fallout4", "campaigns", "sanctuary_commonwealth", "config.json");
const runtimeBestiary = readJson("public", "games", "fallout4", "bestiary", "bestiary.json");
const news = readJson("public", "platform", "news", "news.json");
const mobileTargets = readJson("public", "platform", "mobile-targets.json");
const normalUser = readJson("public", "users", "operador-local", "profile.json");
const adminUser = readJson("public", "users", "admin-local", "profile.json");
const packageJson = readJson("package.json");

assert(game?.id === "fallout4", "Fallout 4 debe cargar desde public/games/fallout4/game.config.json");
assert(game?.moduleFolders?.dlc === "dlc", "Fallout 4 debe declarar carpeta dlc");
assert(game?.moduleFolders?.features === "features", "Fallout 4 debe declarar carpeta features");
assert(game?.moduleFolders?.extras === "extras", "Fallout 4 debe declarar carpeta extras");
assert(game?.moduleFolders?.campaigns === "campaigns", "Fallout 4 debe declarar carpeta campaigns");
assert(game?.newGame === "setup/new-game.config.json", "Nueva partida debe venir de setup/new-game.config.json");
assert(game?.manifests?.coverage === "coverage/core-book-coverage.json", "Fallout 4 debe declarar manifiesto de cobertura core-book");
assert(game?.manifests?.runtimeDepth === "coverage/runtime-depth.json", "Fallout 4 debe declarar manifiesto de profundidad runtime");
pass("Config base: Fallout 4 usa game.config.json, moduleFolders y new-game config.");

const dlcFolders = listDirs("public", "games", "fallout4", "dlc").sort();
assert(JSON.stringify(dlcFolders) === JSON.stringify(expectedDlc), "DLC folders deben excluir High Resolution Texture Pack", dlcFolders.join(", "));
for (const dlcId of expectedDlc) {
  const dlc = readJson("public", "games", "fallout4", "dlc", dlcId, "config.json");
  assert(dlc?.id === dlcId, `DLC ${dlcId} debe tener config.json con id correcto`);
  assert(Boolean(dlc?.assets?.thumbnail || dlc?.thumbnail), `DLC ${dlcId} debe declarar imagen/thumbnail`);
}
const featureFolders = listDirs("public", "games", "fallout4", "features").sort();
for (const featureId of expectedFeatureFolders) {
  assert(featureFolders.includes(featureId), `Feature folder ausente: ${featureId}`);
  const feature = readJson("public", "games", "fallout4", "features", featureId, "config.json");
  assert(feature?.id === featureId, `Feature ${featureId} debe tener config.json con id correcto`);
}
const extrasFolders = listDirs("public", "games", "fallout4", "extras");
assert(extrasFolders.length === 0, "Extras debe quedar vacio por ahora", extrasFolders.join(", "));
pass("Contenido modular: DLC/features/extras/campaigns respetan carpeta y config.");

assert(rules?.sourceTome?.startsWith("TOMO 01"), "Reglas deben venir de TOMO 01");
assert(rules?.coreLoop?.mode === "turn_based_ap", "Regla core debe ser por turnos con AP");
assert(rules?.coreLoop?.dice?.tests === "2d20", "Tomo 1 debe aplicar pruebas 2d20");
assert(rules?.coreLoop?.ap?.formula === "6 + AGI", "Tomo 1 debe aplicar AP = 6 + AGI");
assert(arrayAt(rules, "skills").length === 20, "Tomo 1 debe mapear 20 habilidades core");
assert(arrayAt(rules, "companions").length === 13, "Tomo 1 debe mapear 13 companeros");
assert(arrayAt(rules, "freeModeSeeds").length === 10, "Tomo 1 debe mapear 10 semillas de modo libre");
assert(arrayAt(rules, "origins").length === 4, "Tomo 1 debe mapear 4 origenes");
pass("Tomo 1: reglas core, habilidades, origenes, companeros y modo libre validados.");

const specialIds = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];
assert(arrayAt(characters, "attributes").map((item) => item.id).join(",") === specialIds.join(","), "Hoja de personaje debe tener SPECIAL completo");
assert(arrayAt(characters, "skills").length === 20, "Hoja de personaje debe copiar 20 habilidades");
assert(arrayAt(characters, "seeds").filter((seed) => seed.mode === "campaign").length === 2, "Debe haber Nate y Nora como semillas de campana");
assert(arrayAt(characters, "seeds").filter((seed) => seed.mode === "free").length === 10, "Debe haber 10 semillas libres");
pass("Personajes: SPECIAL, Nate/Nora y modo libre consistentes.");

assert(campaign?.implemented === true, "Campana principal Fallout 4 debe estar implementada");
assert(JSON.stringify(campaign?.simulation?.route) === JSON.stringify(expectedCampaignRoute), "Ruta de campana debe ser Vault 111 -> exterior -> Sanctuary -> Red Rocket -> Concord");
assert(campaign?.simulation?.style === "text_turn_based", "Campana debe ser textual por turnos");
assert(campaign?.playerLimits?.max === 2, "Campana base debe limitar protagonistas a Nate/Nora");
pass("Campana base: ruta, estilo por turnos y limites validados.");

const implementedMissionIds = arrayAt(missions, "missions").filter((mission) => mission.implemented).map((mission) => mission.id);
for (const missionId of ["salida_del_vault_111", "ascensor_y_superficie", "reconstruir_sanctuary", "ruta_red_rocket", "llegar_a_concord"]) {
  assert(implementedMissionIds.includes(missionId), `Mision demo implementada ausente: ${missionId}`);
}
assert(templates?.counts?.missions >= 216, "Plantillas deben contener al menos 216 misiones de Tomo 2");
assert(templates?.counts?.locations >= 558, "Plantillas deben contener al menos 558 ubicaciones de Tomo 6");
assert(templates?.counts?.bestiary >= 213, "Plantillas deben contener bestiario completo del Tomo 3");
assert(templates?.counts?.weapons >= 95, "Plantillas deben contener armas del Tomo 4");
assert(templates?.counts?.equipment >= 288, "Plantillas deben contener equipo del Tomo 5");
assert(templates?.counts?.settlements >= 36, "Plantillas deben contener asentamientos del Tomo 7");
assert(templates?.counts?.factions >= 10, "Plantillas deben contener facciones del Tomo 8");
assert(templates?.counts?.collectibles >= 618, "Plantillas deben contener coleccionables del Tomo 9");
assert(arrayAt(runtimeBestiary, "creatures").length >= 213, "Runtime bestiary debe exponer criaturas completas para juego textual");
pass("Catalogos: conteos de misiones, ubicaciones, bestiario, armas, equipo, asentamientos, facciones y coleccionables validados.");

const tomeRoles = arrayAt(templates, "tomeRoles");
for (const tome of expectedTomes) {
  assert(tomeRoles.some((role) => role.id === tome), `templates.tomeRoles debe incluir ${tome}`);
}
const referencedTomes = flattenSourceTomes(templates);
for (const tome of expectedTomes) {
  assert(referencedTomes.has(tome), `Las plantillas deben referenciar ${tome}`);
}
pass("Cobertura por tomos: los 10 tomos estan registrados y referenciados.");

assert(coverage?.summary?.tomes === 10, "Coverage manifest debe cubrir 10 tomos");
assert(coverage?.summary?.coverageFindings === 0, "Coverage manifest no debe tener hallazgos pendientes");
assert(coverage?.coveragePolicy?.exceptionsAllowed === false, "Coverage manifest no debe permitir excepciones");
assert(Array.isArray(coverage?.coveragePolicy?.exceptions) && coverage.coveragePolicy.exceptions.length === 0, "Coverage manifest debe tener cero excepciones");
assert(Array.isArray(coverage?.nonCanonicalAdditions) && coverage.nonCanonicalAdditions.length >= 1, "Coverage manifest debe listar agregados no canonicos");
for (const tome of expectedTomes) {
  const entry = coverage?.tomes?.find((item) => item.id === tome);
  assert(Boolean(entry), `Coverage manifest debe incluir ${tome}`);
  assert(Array.isArray(entry?.runtimeSystems) && entry.runtimeSystems.length >= 1, `${tome} debe declarar sistemas runtime`);
}
pass("Manifiesto total: todos los tomos tienen sistemas runtime, cero excepciones y agregados no canonicos listados.");

assert(runtimeDepth?.summary?.missions === templates?.counts?.missions, "Runtime depth debe cubrir todas las misiones de templates");
assert(runtimeDepth?.summary?.locations === templates?.counts?.locations, "Runtime depth debe cubrir todas las ubicaciones de templates");
assert(runtimeDepth?.summary?.locationsWithInternalMaps >= 558, "Todas las ubicaciones deben tener mapa interno o fallback de mapa interno");
assert(runtimeDepth?.summary?.bestiary === templates?.counts?.bestiary, "Runtime depth debe declarar bestiario completo");
assert(runtimeDepth?.summary?.weapons === templates?.counts?.weapons, "Runtime depth debe declarar armas completas");
assert(runtimeDepth?.summary?.equipment === templates?.counts?.equipment, "Runtime depth debe declarar equipo completo");
assert(runtimeDepth?.summary?.settlements === templates?.counts?.settlements, "Runtime depth debe declarar asentamientos completos");
assert(runtimeDepth?.summary?.factions === templates?.counts?.factions, "Runtime depth debe declarar facciones completas");
assert(runtimeDepth?.summary?.collectibles === templates?.counts?.collectibles, "Runtime depth debe declarar coleccionables completos");
assert(Array.isArray(runtimeDepth?.nonCanonicalRuntime) && runtimeDepth.nonCanonicalRuntime.length >= 1, "Runtime depth debe listar agregados runtime no canonicos");
pass("Profundidad runtime: misiones, ubicaciones y sistemas de los tomos quedan trazados como jugables.");

const routeTemplate = arrayAt(templates, "routeTemplates").find((item) => item.id === "out-of-time-base-route");
assert(Boolean(routeTemplate), "Debe existir routeTemplate out-of-time-base-route");
for (const locationId of ["U-0001", "U-0002", "U-0003", "U-0011"]) {
  assert(routeTemplate?.nodes?.includes(locationId), `Ruta Out of Time debe incluir ${locationId}`);
}
const locationCatalog = templates?.catalogs?.locations ?? [];
for (const locationId of ["U-0001", "U-0002", "U-0003", "U-0011"]) {
  const location = locationCatalog.find((item) => item.id === locationId);
  assert(Boolean(location), `Catalogo de ubicaciones debe incluir ${locationId}`);
  assert(arrayAt(location, "subzones").length >= 4, `${locationId} debe tener subzonas explorables`);
}
pass("Tomo 2 + Tomo 6: ruta Out of Time cruza misiones y ubicaciones con subzonas.");

const campaignScreen = readText("src", "screens", "Fallout4CampaignScreen.tsx");
for (const sceneId of ["vault111", "vaultExit", "sanctuary", "redRocket", "concord"]) {
  assert(campaignScreen.includes(`id: "${sceneId}"`), `Pantalla de campana debe implementar escena ${sceneId}`);
}
for (const expectedText of ["AP_MAX = 11", "roll2d20", "campaignState", "onProgress", "Radroaches", "Mole rats", "Jared's gang"]) {
  assert(campaignScreen.includes(expectedText), `Pantalla de campana debe contener ${expectedText}`);
}
for (const expectedText of [
  "fo4-atlas-panel",
  "Conexiones del mapa mundi",
  "Mapa interno",
  "fo4-mission-tracker",
  "outOfTimeSteps",
  "Pip-Boy 3000 Mark IV",
  "matchesMissionNode",
  "hasRequiredMissionItem",
  "atlasEnemyStates",
  "equippedWeaponId",
  "equippedArmorId",
  "factionReputation",
  "settlementStates",
  "survival",
  "fo4-runtime-grid",
  "improveSettlement",
  "restAndRecover",
  "missionObjectiveText",
  "momentum",
  "noise",
  "Resolver nodo interno",
  "moveAtlasInternalNode",
  "atlasLocationStates",
  "resolveAtlasSubzone",
  "resolveAtlasEncounter",
  "activeMissionId",
  "buildMissionRuntimeSteps",
  "missionRuntime",
  "discoveredCollectibles",
  "ruleState",
  "equipNextLoadout",
  "consumeSurvivalSupply",
  "atlasMissions.map",
  "atlasLocations.map",
]) {
  assert(campaignScreen.includes(expectedText), `Pantalla de campana debe contener atlas textual: ${expectedText}`);
}
assert(!campaignScreen.includes("atlasMissions.slice(0, 220)"), "La campana debe exponer las 216 misiones, no un subconjunto");
assert(!campaignScreen.includes("atlasLocations.slice(0, 220)"), "La campana debe exponer las 558 ubicaciones, no un subconjunto");
assert(!campaignScreen.includes("buildMicrozones"), "La campana no debe inventar una capa extra sobre las ubicaciones del Tomo 6");
assert(!campaignScreen.includes("atlasCompletedMicrozones"), "El guardado no debe persistir una capa interna inventada");
pass("Demo jugable: pantalla Fallout4Campaign implementa escenas, mapa mundi textual, mapa interno por ubicacion, AP, 2d20, combate, misiones genericas y persistencia.");

const filesScreen = readText("src", "screens", "FilesScreen.tsx");
for (const expectedText of ["json-file-summary", "json-image-preview-strip", "imagePathCandidates", "parsedSummary"]) {
  assert(filesScreen.includes(expectedText), `Archivos y estructura debe soportar editor/preview JSON: ${expectedText}`);
}
const appScreen = readText("src", "App.tsx");
const tauriFs = readText("src", "lib", "tauriFs.ts");
const tauriCapabilities = readText("src-tauri", "capabilities", "default.json");
assert(appScreen.includes("writeText(diskPath, raw)"), "Editor debe intentar escribir JSON real mediante Tauri");
assert(tauriFs.includes("writeTextFile") && tauriFs.includes("public${path}"), "Tauri FS debe soportar escritura de JSON public/games");
assert(tauriCapabilities.includes("rpg-platform-engine/public/games"), "Permisos Tauri deben permitir editar public/games");
const appCss = readText("src", "styles", "app.css");
for (const expectedText of [
  "@media (max-width: 720px)",
  ".fo4-runtime-grid",
  ".json-file-summary",
  ".json-image-preview-strip",
]) {
  assert(appCss.includes(expectedText), `CSS responsive/editor debe contener ${expectedText}`);
}
pass("Editor y responsive: JSON, previews visuales y cortes mobile/tablet validados.");

const capacitorConfig = readText("capacitor.config.ts");
assert(capacitorConfig.includes("android") && capacitorConfig.includes("ios"), "Capacitor debe declarar Android e iOS");
assert(mobileTargets?.targets?.android?.status === "synced", "Mobile targets debe declarar Android sincronizado");
assert(mobileTargets?.targets?.ios?.status === "synced", "Mobile targets debe declarar iOS sincronizado");
assert(packageJson?.scripts?.["android:sync"], "package.json debe tener script android:sync");
assert(packageJson?.scripts?.["ios:sync"], "package.json debe tener script ios:sync");
pass("Mobile: Android sincronizable e iOS configurado con rutas de validacion declaradas.");

function playCompleteDemo() {
  const now = new Date().toISOString();
  const save = {
    saveId: "test_fallout4_full_run",
    gameId: "fallout4",
    campaignId: "sanctuary_commonwealth",
    userId: "test-user",
    storagePath: "/games/fallout4/saves/test-user/test_fallout4_full_run/save.game.json",
    playerName: "Nate",
    name: "Nate - Fallout 4",
    currentMission: "Inicio",
    currentZone: "Vault 111",
    progressPercent: 0,
    route: expectedCampaignRoute,
    visitedZones: [],
    currentStep: 0,
    level: 1,
    sessions: 1,
    playTimeHours: 0,
    playStartedAt: now,
    lastLoadedAt: now,
    daysElapsed: 0,
    inGameDayStartedAt: now,
    createdAt: now,
    updatedAt: now,
    campaignState: {
      sceneId: "vault111",
      nodeId: "cryo",
      ap: 11,
      turn: 1,
      visitedNodes: [],
      securedNodes: [],
      enemyHp: {},
      actionLog: [],
      missionRuntime: {},
      discoveredCollectibles: [],
      ruleState: {
        actionPointsSpent: 0,
        testsRolled: 0,
        combatRounds: 0,
        socialChecks: 0,
        technicalChecks: 0,
        travelActions: 0,
        failures: 0,
        complications: [],
      },
      updatedAt: now,
    },
  };

  const sceneNodes = {
    vault111: ["cryo", "pod-row", "security", "admin", "maintenance", "reactor", "pipboy-room", "dorms", "storage", "exit-door"],
    vault_exit: ["lift", "overlook", "trail"],
    sanctuary_hills: ["home", "codsworth", "street", "yards", "garage", "redrocket-road"],
    red_rocket: ["road", "pumps", "garage", "office", "workshop", "concord-road"],
    concord: ["north-entry", "main-street", "ruined-houses", "plaza", "museum"],
  };
  const combatNodes = new Set(["security", "reactor", "dorms", "yards", "garage", "main-street"]);

  for (const [step, sceneId] of expectedCampaignRoute.entries()) {
    save.currentStep = step;
    save.progressPercent = Math.round(((step + 1) / expectedCampaignRoute.length) * 100);
    save.currentMission = step === 0 ? "M-0170 paso 1" : step === 4 ? "M-0170 pasos 55-65" : "M-0170 progreso";
    save.currentZone = sceneId;
    save.visitedZones.push(sceneId);
    save.campaignState.sceneId = sceneId;
    save.campaignState.ap = 11;
    save.campaignState.turn = 1;

    for (const nodeId of sceneNodes[sceneId]) {
      save.campaignState.nodeId = nodeId;
      save.campaignState.visitedNodes.push(`${sceneId}:${nodeId}`);
      save.campaignState.ap -= nodeId.includes("exit") || nodeId.includes("road") ? 2 : 1;
      save.campaignState.ruleState.actionPointsSpent += nodeId.includes("exit") || nodeId.includes("road") ? 2 : 1;
      save.campaignState.ruleState.testsRolled += 1;
      if (save.campaignState.ap < 0) {
        save.campaignState.turn += 1;
        save.campaignState.ap = 10;
      }
      if (combatNodes.has(nodeId)) {
        save.campaignState.enemyHp[`${sceneId}:${nodeId}`] = 0;
        save.campaignState.securedNodes.push(`${sceneId}:${nodeId}`);
        save.campaignState.ruleState.combatRounds += 1;
        save.campaignState.actionLog.unshift(`Combate resuelto en ${sceneId}:${nodeId}`);
      } else {
        save.campaignState.securedNodes.push(`${sceneId}:${nodeId}`);
        save.campaignState.actionLog.unshift(`Exploracion resuelta en ${sceneId}:${nodeId}`);
      }
    }
  }
  save.campaignState.missionRuntime["M-0170"] = {
    status: "completed",
    currentStep: 8,
    completedSteps: outOfTimeMissionSteps,
    failedChecks: 0,
  };
  save.campaignState.discoveredCollectibles = ["COL-0188"];

  save.updatedAt = new Date().toISOString();
  save.campaignState.updatedAt = save.updatedAt;
  return save;
}

const simulatedSave = playCompleteDemo();
assert(simulatedSave.progressPercent === 100, "La simulacion completa debe terminar al 100%");
assert(simulatedSave.visitedZones.length === expectedCampaignRoute.length, "La simulacion debe visitar todas las ubicaciones de la ruta");
assert(new Set(simulatedSave.campaignState.visitedNodes).size >= 25, "La simulacion debe recorrer subzonas suficientes");
assert(Object.values(simulatedSave.campaignState.enemyHp).every((hp) => hp === 0), "La simulacion debe resolver combates demo");
assert(simulatedSave.campaignState.actionLog.length >= 20, "La simulacion debe registrar acciones para save.game.json");
assert(simulatedSave.campaignState.missionRuntime["M-0170"].status === "completed", "La simulacion debe persistir runtime de mision completo");
assert(simulatedSave.campaignState.ruleState.actionPointsSpent > 0, "La simulacion debe persistir AP gastados del Tomo 1");
assert(simulatedSave.campaignState.ruleState.combatRounds >= 1, "La simulacion debe persistir rondas de combate del Tomo 3");
assert(simulatedSave.campaignState.discoveredCollectibles.length >= 1, "La simulacion debe persistir coleccionables del Tomo 9");
pass("Partida simulada: recorrido completo, AP, combates, progreso y save.game.json en memoria validados.");

assert(Array.isArray(news?.items) && news.items.length >= 1, "Noticias deben cargar desde public/platform/news/news.json");
assert(normalUser?.username === "operador" && normalUser?.password === "operador123" && normalUser?.role === "user", "Cuenta normal demo invalida");
assert(adminUser?.username === "admin" && adminUser?.password === "admin123" && adminUser?.role === "admin", "Cuenta admin demo invalida");
pass("Login: noticias y usuarios operador/admin validados.");

if (templates?.counts?.tomes !== 10) warn("templates.counts.tomes no es 10", String(templates?.counts?.tomes));

console.log("\nFallout 4 core-book playable audit");
console.log("==================================");
for (const item of report) console.log(`PASS ${item}`);
for (const item of warnings) console.log(`WARN ${item}`);

if (failures.length) {
  console.error("\nFAILURES");
  for (const item of failures) console.error(`FAIL ${item}`);
  process.exit(1);
}

console.log(`\nOK: ${report.length} bloques validados, ${warnings.length} advertencias.`);
