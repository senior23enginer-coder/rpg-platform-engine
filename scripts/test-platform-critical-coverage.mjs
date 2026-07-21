import { readFileSync } from "node:fs";

const files = {
  contracts: readFileSync("src/lib/platformContracts.ts", "utf8"),
  repository: readFileSync("src/lib/localPlatformRepository.ts", "utf8"),
  cloudRepository: readFileSync("src/lib/cloudPlatformRepository.ts", "utf8"),
  repositorySelector: readFileSync("src/lib/platformRepository.ts", "utf8"),
  storage: readFileSync("src/lib/storageAdapter.ts", "utf8"),
  metadata: readFileSync("src/lib/appMetadataStorage.ts", "utf8"),
  profile: readFileSync("src/types/profile.ts", "utf8"),
  game: readFileSync("src/types/game.ts", "utf8"),
  mapEditor: readFileSync("src/screens/MapEditor.tsx", "utf8"),
  support: readFileSync("src/screens/SupportScreen.tsx", "utf8"),
  chat: readFileSync("src/screens/ChatScreen.tsx", "utf8"),
  sidebar: readFileSync("src/components/Sidebar.tsx", "utf8"),
  css: readFileSync("src/styles/app.css", "utf8"),
  roadmap: readFileSync("public/platform/completion-roadmap.json", "utf8"),
  apiContract: readFileSync("public/platform/api-contract.json", "utf8"),
  dnd: readFileSync("public/games/dungeons_dragons/game.config.json", "utf8"),
  wh40k: readFileSync("public/games/warhammer_40k/game.config.json", "utf8"),
};

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

for (const key of ["auth", "users", "games", "maps", "content", "support", "chat", "saves", "audit"]) {
  assert(files.contracts.includes(`${key}: {`), `Contrato sin modulo ${key}`);
}

for (const granularMethod of [
  "listNews",
  "saveNewsEntry",
  "deleteNewsEntry",
  "listNotifications",
  "saveNotificationEntry",
  "deleteNotificationEntry",
  "createPublicTicket",
  "backup: {",
]) {
  assert(files.contracts.includes(granularMethod), `Contrato sin metodo granular ${granularMethod}`);
}

for (const method of [
  "login(credentials",
  "refreshSession",
  "requestPasswordReset",
  "savePersistentGames",
  "savePersistentMaps",
  "savePersistentSession",
  "appendPersistentChatMessage",
  "appendPersistentAudit",
]) {
  assert(files.repository.includes(method) || files.storage.includes(method), `Persistencia/repositorio sin ${method}`);
}

for (const cloudFeature of ["createCloudPlatformRepository", "/auth/login", "/games", "/maps", "/support/tickets", "/audit"]) {
  assert(files.cloudRepository.includes(cloudFeature), `Contrato futuro cloud sin ${cloudFeature}`);
}

assert(files.repositorySelector.includes("createPlatformRepository"), "Falta selector de repositorio");
assert(files.repositorySelector.includes("createLocalHttpPlatformRepository"), "Falta repositorio HTTP local");
assert(files.repositorySelector.includes("return createLocalPlatformRepository()"), "El ambiente actual debe usar repositorio local");
assert(!files.repositorySelector.includes("createCloudPlatformRepository("), "No se debe activar cloud en ambiente local actual");

for (const entity of ["games: GameConfig[]", "maps: PlatformMapDocument[]", "sessions: PlatformSession[]", "chatMessages: PlatformChatMessage[]", "auditLog: PlatformAuditEntry[]"]) {
  assert(files.storage.includes(entity), `Base local sin entidad ${entity}`);
}

for (const field of ["passwordHash?: string", "blocked?: boolean", "permissions?: Record"]) {
  assert(files.profile.includes(field), `Perfil sin campo critico ${field}`);
}

for (const feature of ["gallery?: string[]", "targetGroup?: string", "supportTickets", "localizedText", "platformIcons", "platformAudio", "cloud:"]) {
  assert(files.metadata.includes(feature), `Metadata sin ${feature}`);
}

for (const mapFeature of ["backgroundMode", "gridOpacity", "terrainOpacity", "markerScale", "MapEditorView", "Cargar imagen", "Descomponer"]) {
  assert(files.mapEditor.includes(mapFeature) || files.game.includes(mapFeature), `Editor de mapas sin ${mapFeature}`);
}

for (const mapUiFeature of ["WASTELAND CREATOR", "wasteland-editor-header", "wasteland-left-library", "wasteland-context-strip", "cad-status-bar"]) {
  assert(files.mapEditor.includes(mapUiFeature) || files.css.includes(mapUiFeature), `Editor de mapas sin UI profesional ${mapUiFeature}`);
}

for (const supportFeature of ["support-ticket-table", "statusFilter", "priority", "assignedTo", "messages"]) {
  assert(files.support.includes(supportFeature), `Soporte sin ${supportFeature}`);
}

for (const chatFeature of ["discord-chat-shell", "channels", "friends", "getUserMedia", "EventSource", "cloudStatus"]) {
  assert(files.chat.includes(chatFeature), `Chat sin ${chatFeature}`);
}

assert(!files.sidebar.includes('{ id: "rules", labelKey: "nav.rules"') || files.sidebar.includes("adminItems"), "Reglas debe estar controlado por rol/admin");

for (const breakpoint of ["max-width: 1180px", "max-width: 900px", "max-width: 720px", "max-width: 620px"]) {
  assert(files.css.includes(breakpoint), `Responsive sin ${breakpoint}`);
}

const roadmap = JSON.parse(files.roadmap);
const critical = roadmap.areas.filter((area) => area.priority === "critical");
const blockedStatuses = roadmap.areas.filter((area) => ["pending", "initial", "prototype"].includes(area.status));
assert(critical.length >= 4, "Roadmap sin suficientes areas criticas");
assert(critical.every((area) => ["partial", "in_progress", "done"].includes(area.status)), "Hay area critica sin avance inicial");
assert(blockedStatuses.length === 0, `Hay areas sin avance real: ${blockedStatuses.map((area) => area.id).join(", ")}`);

const apiContract = JSON.parse(files.apiContract);
assert(apiContract.environment === "local", "API contract debe declarar ambiente local");
assert(String(apiContract.basePath).startsWith("http://127.0.0.1"), "API contract debe usar backend local");
for (const moduleId of ["auth", "users", "games", "maps", "content", "support", "chat", "saves", "audit", "backup"]) {
  assert(apiContract.modules[moduleId], `API contract sin modulo ${moduleId}`);
}

for (const mapEndpoint of ["detail", "export", "import"]) {
  assert(apiContract.modules.maps[mapEndpoint], `API contract de mapas sin ${mapEndpoint}`);
}

const dnd = JSON.parse(files.dnd);
const wh40k = JSON.parse(files.wh40k);
for (const game of [dnd, wh40k]) {
  assert(game.enabled === true, `${game.id}: juego no activo`);
  assert(Array.isArray(game.campaigns) && game.campaigns.length > 0, `${game.id}: sin campanas`);
  assert(Array.isArray(game.maps) && game.maps.length > 0, `${game.id}: sin mapas`);
  assert(game.businessRules && game.sourceMap && game.baseMechanics, `${game.id}: sin base mecanica Fallout 4`);
}

console.log("Platform critical coverage");
console.log("==========================");
console.log(`Critical areas tracked: ${critical.length}`);
console.log("Repository: local-http first");
console.log("Local API contract: ready");
console.log("Persistence: users/games/maps/sessions/chat/audit");
console.log("UI contracts: maps/support/chat/responsive");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log("OK: puntos criticos y parciales cubiertos por contrato verificable.");
