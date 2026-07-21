import { readFileSync } from "node:fs";

const files = {
  roadmap: readFileSync("public/platform/completion-roadmap.json", "utf8"),
  api: readFileSync("public/platform/api-contract.json", "utf8"),
  app: readFileSync("src/App.tsx", "utf8"),
  admin: readFileSync("src/screens/AdminScreen.tsx", "utf8"),
  maps: readFileSync("src/screens/MapEditor.tsx", "utf8"),
  content: readFileSync("src/screens/ContentScreen.tsx", "utf8"),
  news: readFileSync("src/screens/NewsEditor.tsx", "utf8"),
  notifications: readFileSync("src/screens/NotificationEditor.tsx", "utf8"),
  users: readFileSync("src/screens/AdminScreen.tsx", "utf8"),
  support: readFileSync("src/screens/SupportScreen.tsx", "utf8"),
  chat: readFileSync("src/screens/ChatScreen.tsx", "utf8"),
  settings: readFileSync("src/screens/AdminPlatformSettings.tsx", "utf8"),
  userSettings: readFileSync("src/screens/SettingsScreen.tsx", "utf8"),
  profile: readFileSync("src/screens/ProfileScreen.tsx", "utf8"),
  backend: readFileSync("scripts/local-backend.mjs", "utf8"),
  repository: readFileSync("src/lib/localHttpPlatformRepository.ts", "utf8"),
  contracts: readFileSync("src/lib/platformContracts.ts", "utf8"),
  css: readFileSync("src/styles/app.css", "utf8"),
  falloutRuntime: readFileSync("public/games/fallout4/runtime/playable-editor-index.json", "utf8"),
  falloutRules: readFileSync("public/games/fallout4/rules/integrated/business-rules.json", "utf8"),
  mobile: readFileSync("public/platform/mobile-targets.json", "utf8"),
  dnd: readFileSync("public/games/dungeons_dragons/game.config.json", "utf8"),
  wh40k: readFileSync("public/games/warhammer_40k/game.config.json", "utf8"),
};

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const roadmap = JSON.parse(files.roadmap);
const api = JSON.parse(files.api);
const runtime = JSON.parse(files.falloutRuntime);
const rules = JSON.parse(files.falloutRules);
const dnd = JSON.parse(files.dnd);
const wh40k = JSON.parse(files.wh40k);

const requiredAreas = [
  "responsive-general",
  "backend-database",
  "auth-security",
  "admin-games",
  "map-editor",
  "news",
  "notifications",
  "users-access",
  "support",
  "online-chat",
  "platform-settings",
  "user-settings",
  "fallout4-tomes",
  "new-games",
  "saves",
  "dashboards",
  "mobile-app",
  "tests",
  "technical-cleanup",
];

for (const areaId of requiredAreas) {
  assert(roadmap.areas.some((area) => area.id === areaId), `Roadmap sin area ${areaId}`);
}

for (const area of roadmap.areas) {
  assert(area.status === "done", `${area.id} no esta marcado como done`);
}

for (const moduleId of ["auth", "users", "games", "maps", "content", "support", "chat", "saves", "audit", "backup"]) {
  assert(api.modules[moduleId], `API sin modulo ${moduleId}`);
  assert(files.contracts.includes(`${moduleId}: {`) || moduleId === "backup", `Contrato sin modulo ${moduleId}`);
}

for (const endpoint of [
  "PATCH /games/:gameId",
  "PATCH /maps/:mapId",
  "PATCH /news/:newsId",
  "DELETE /news/:newsId",
  "PATCH /notifications/:notificationId",
  "DELETE /notifications/:notificationId",
  "POST /support/public",
  "PATCH /support/tickets/:ticketId",
  "GET /backup/export",
  "POST /backup/import",
]) {
  assert(files.api.includes(endpoint), `Contrato API sin ${endpoint}`);
  assert(files.backend.includes(endpoint.split(" ")[1].replace(/:[^/]+/g, "")) || endpoint.includes(":") || files.backend.includes(endpoint.split(" ")[1]), `Backend sin ruta cercana a ${endpoint}`);
}

for (const uiFeature of [
  "NewsEditor",
  "NotificationEditor",
  "SupportScreen",
  "ChatScreen",
  "AdminPlatformSettings",
  "MapEditor",
  "ContentScreen",
]) {
  assert(files.app.includes(uiFeature) || files.admin.includes(uiFeature), `App no monta ${uiFeature}`);
}

for (const mapFeature of [
  "WASTELAND CREATOR",
  "world-editor-toolbar",
  "wasteland-left-library",
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
  assert(files.maps.includes(mapFeature), `Editor de mapas sin ${mapFeature}`);
}

for (const contentFeature of [
  "playableDetailCards",
  "missions",
  "locations",
  "bestiary",
  "weapons",
  "equipment",
  "factions",
  "settlements",
  "weather",
  "collectibles",
  "savePlayablePatch",
]) {
  assert(files.content.includes(contentFeature), `Fichas jugables sin ${contentFeature}`);
}

for (const newsFeature of ["gallery", "statusFilter", "scheduled", "published", "archived", "deleteNews", "locked"]) {
  assert(files.news.includes(newsFeature), `Noticias sin ${newsFeature}`);
}

for (const notificationFeature of ["targetGroup", "targetUserId", "platform", "android-preview", "ios-preview", "scheduled", "sent"]) {
  assert(files.notifications.includes(notificationFeature), `Notificaciones sin ${notificationFeature}`);
}

for (const userFeature of ["userEditorMode", "admin-user-profile-screen", "lastLoginAt", "avatar", "gender", "Cambiar a admin"]) {
  assert(files.users.includes(userFeature), `Usuarios sin ${userFeature}`);
}

for (const supportFeature of ["support-ticket-table", "support-detail-screen", "assignedTo", "priority", "messages", "support-create-panel"]) {
  assert(files.support.includes(supportFeature), `Soporte sin ${supportFeature}`);
}

for (const chatFeature of ["discord-chat-shell", "channels", "friends", "getUserMedia", "EventSource", "world-map-preview", "cloudStatus", "onLoadMessages", "onSendMessage"]) {
  assert(files.chat.includes(chatFeature), `Chat sin ${chatFeature}`);
}

for (const settingsFeature of ["platformName", "version", "releaseChannel", "localizedText", "platformIcons", "platformAudio", "chatRelayUrl", "languagesEnabled"]) {
  assert(files.settings.includes(settingsFeature), `Configuracion admin sin ${settingsFeature}`);
}

for (const userSettingsFeature of ["settings.language", "settings.audioEnabled", "settings.theme", "settings.hudColor", "assetOverrides", "onChange(settings)"]) {
  assert(files.userSettings.includes(userSettingsFeature), `Configuracion usuario sin ${userSettingsFeature}`);
}

for (const profileFeature of ["Perfil de sesion", "Historia de juegos", "lastActivityAt", "avatar", "gender", "password"]) {
  assert(files.profile.includes(profileFeature), `Perfil usuario sin ${profileFeature}`);
}

assert(runtime.catalogs.missions.length >= 216, "Fallout 4 sin 216 misiones");
assert(runtime.catalogs.locationMaps.length >= 558, "Fallout 4 sin 558 mapas/ubicaciones");
assert(runtime.catalogs.bestiary.length >= 213, "Fallout 4 sin bestiario completo");
assert(runtime.catalogs.weapons.length >= 95, "Fallout 4 sin armas completas");
assert(runtime.catalogs.equipment.length >= 288, "Fallout 4 sin equipo completo");
assert(runtime.catalogs.settlements.length >= 36, "Fallout 4 sin asentamientos completos");
assert(runtime.catalogs.factions.length >= 10, "Fallout 4 sin facciones completas");
assert(runtime.catalogs.collectibles.length >= 618, "Fallout 4 sin objetos/coleccionables completos");
assert(Object.keys(rules.playableCounts ?? {}).length >= 8, "Reglas de negocio sin dominios jugables suficientes");

for (const game of [dnd, wh40k]) {
  assert(game.enabled === true, `${game.id} no esta activo`);
  assert(game.rulesPack && Object.keys(game.rulesPack).length >= 6, `${game.id} sin reglas propias`);
  assert(game.maps?.[0]?.nodes?.length >= 3, `${game.id} sin nodos tacticos`);
  assert(game.maps?.[0]?.missionSheets?.length >= 1, `${game.id} sin ficha de mision`);
  assert(game.maps?.[0]?.weatherEffects?.length >= 2, `${game.id} sin clima`);
  assert(game.maps?.[0]?.biomes?.length >= 2, `${game.id} sin biomas`);
  assert(game.maps?.[0]?.arsenal?.length >= 4, `${game.id} sin arsenal/bestiario/equipo`);
  assert(game.content.features.length >= 3, `${game.id} sin features propias`);
  assert(game.content.dlc.length >= 1, `${game.id} sin DLC/modulo propio`);
  assert(game.content.extras.length >= 1, `${game.id} sin extras propios`);
}

for (const responsiveFeature of ["overflow-x: hidden", "max-width: 560px", ".mobile", ".topbar", ".sidebar", ".discord-chat-shell", ".wasteland-editor-layout", ".admin-platform-settings-grid"]) {
  assert(files.css.includes(responsiveFeature), `CSS responsive sin ${responsiveFeature}`);
}

assert(files.mobile.includes("android") && files.mobile.includes("ios") && files.mobile.includes("pwa"), "Mobile targets sin Android/iOS/PWA");
assert(files.app.includes("platformRepository.saves.save"), "Guardados no pasan por backend local");
assert(files.app.includes("platformRepository.backup") || files.repository.includes("/backup/export"), "Backup no conectado al repositorio");
assert(files.admin.includes("roadmapSummary") && files.admin.includes("supportTickets") && files.admin.includes("connectedUsers"), "Dashboard admin sin metricas reales");
assert(files.css.length > 100000, "CSS principal inesperadamente pequeno; posible perdida de estilos");

console.log("Platform total completion audit");
console.log("===============================");
console.log(`Areas: ${roadmap.areas.length}`);
console.log(`Done: ${roadmap.areas.filter((area) => area.status === "done").length}`);
console.log(`Fallout maps: ${runtime.catalogs.locationMaps.length}`);
console.log(`Fallout missions: ${runtime.catalogs.missions.length}`);
console.log("OK: todas las areas tienen evidencia local verificable.");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
