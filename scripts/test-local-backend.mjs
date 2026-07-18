import { spawn } from "node:child_process";

const port = 8897;
const endpoint = `http://127.0.0.1:${port}/api`;
const child = spawn(process.execPath, ["scripts/local-backend.mjs", `--port=${port}`], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
});

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function waitForHealth() {
  const started = Date.now();
  while (Date.now() - started < 8000) {
    try {
      const response = await fetch(`${endpoint}/health`);
      if (response.ok) return response.json();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error("Backend local no inicio a tiempo");
}

async function request(path, options = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}

async function requestStatus(path, options = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return response.status;
}

try {
  const health = await waitForHealth();
  assert(health.environment === "local", "Health no reporta ambiente local");

  const auth = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ usernameOrEmail: "admin", password: "admin123", remember: true }),
  });
  assert(auth.profile?.role === "admin", "Login admin no devuelve rol admin");
  assert(auth.session?.remember === true, "Sesion no respeta remember");
  const adminHeaders = { Authorization: `Bearer ${auth.session.id}` };

  const refreshed = await request(`/auth/sessions/${encodeURIComponent(auth.session.id)}/refresh`, { method: "POST", headers: adminHeaders });
  assert(refreshed.id === auth.session.id, "Refresh de sesion no conserva la sesion activa");

  const userAuth = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ usernameOrEmail: "operador", password: "operador123", remember: false }),
  });
  const forbiddenGamePatch = await requestStatus("/games/fallout4", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${userAuth.session.id}` },
    body: JSON.stringify({ id: "fallout4", name: "No autorizado" }),
  });
  assert(forbiddenGamePatch === 403, "Usuario normal no debe editar juegos");

  const games = await request("/games");
  assert(Array.isArray(games) && games.some((game) => game.id === "fallout4"), "Backend no lista Fallout 4");
  assert(games.some((game) => game.id === "dungeons_dragons"), "Backend no lista Dungeons & Dragons");
  assert(games.some((game) => game.id === "warhammer_40k"), "Backend no lista Warhammer 40K");

  const playableSummary = await request("/games/fallout4/playable/summary");
  assert(playableSummary.counts?.locationMaps >= 558, "Backend no expone resumen de mapas jugables Fallout 4");
  assert(playableSummary.rules?.nodeTypes >= 9, "Backend no expone nodos/cobertura/movimiento de tomos");

  const playableMaps = await request("/games/fallout4/playable/locationMaps?limit=3");
  assert(playableMaps.total >= 558 && playableMaps.items.length === 3, "Backend no pagina mapas jugables bajo demanda");
  const playableMapId = playableMaps.items[0]?.id;
  assert(Boolean(playableMapId), "Mapa jugable paginado no trae ID");

  const playableMapDetail = await request(`/games/fallout4/playable/locationMaps/${encodeURIComponent(playableMapId)}`);
  assert((playableMapDetail.events?.length ?? playableMapDetail.eventCount ?? 0) > 0, "Detalle de mapa jugable no trae eventos/subzonas reales");

  const playableEnemies = await request("/games/fallout4/playable/bestiary?limit=5");
  assert(playableEnemies.total >= 200, "Backend no expone bestiario de tomos como fichas CRUD");

  const forbiddenPlayablePatch = await requestStatus(`/games/fallout4/playable/locationMaps/${encodeURIComponent(playableMapId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${userAuth.session.id}` },
    body: JSON.stringify({ adminNote: "no autorizado" }),
  });
  assert(forbiddenPlayablePatch === 403, "Usuario normal no debe editar fichas jugables");

  const patchedPlayableMap = await request(`/games/fallout4/playable/locationMaps/${encodeURIComponent(playableMapId)}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ adminNote: "parche local backend", coverageReview: "ok" }),
  });
  assert(patchedPlayableMap.adminNote === "parche local backend", "Backend no guarda parches de ficha jugable");

  const playableAssets = await request(`/games/fallout4/playable/locationMaps/${encodeURIComponent(playableMapId)}/assets`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ assets: [{ id: "asset_backend_test", path: "/games/fallout4/assets/maps/test.webp", role: "base-image" }] }),
  });
  assert(playableAssets.some((asset) => asset.id === "asset_backend_test"), "Backend no guarda assets por ubicacion/mapa");

  const playableExport = await request("/games/fallout4/playable/export?type=locationMaps", { headers: adminHeaders });
  assert(playableExport.scope === "playable" && playableExport.patches?.length >= 1, "Backend no exporta contenido jugable con patches");

  const playableImport = await request("/games/fallout4/playable/import", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ patches: playableExport.patches, assets: playableExport.assets }),
  });
  assert(playableImport.gameId === "fallout4", "Backend no importa contenido jugable por juego");

  const patchedGame = await request("/games/fallout4", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ ...games.find((game) => game.id === "fallout4"), adminTestedAt: new Date().toISOString() }),
  });
  assert(patchedGame.id === "fallout4", "Patch de juego no responde con el juego editado");

  const map = await request("/maps/map_backend_test", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({
      id: "map_backend_test",
      gameId: "fallout4",
      name: "Mapa backend test",
      width: 8,
      height: 6,
      tileSize: 48,
      layers: [{ id: "terrain", name: "Terreno", visible: true, opacity: 1, tiles: [] }],
    }),
  });
  assert(map.gameId === "fallout4", "Backend no guarda mapas por juego");

  const maps = await request("/maps?gameId=fallout4");
  assert(maps.some((item) => item.id === "map_backend_test"), "Backend no lista mapas filtrados por juego");

  const mapDetail = await request("/maps/map_backend_test");
  assert(mapDetail.id === "map_backend_test" && mapDetail.layers?.length, "Backend no carga detalle de mapa guardado");

  const mapExport = await request("/maps/map_backend_test/export", { headers: adminHeaders });
  assert(mapExport.scope === "map" && mapExport.map?.id === "map_backend_test", "Backend no exporta mapa especifico");

  const importedMap = await request("/maps/import", {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ ...mapExport, map: { ...mapExport.map, id: "map_backend_import_test", name: "Mapa importado backend test" } }),
  });
  assert(importedMap.id === "map_backend_import_test", "Backend no importa mapa especifico");

  const news = await request("/news/news_backend_test", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({
      title: "Noticia backend test",
      summary: "Prueba de noticia local",
      body: "Detalle",
      status: "draft",
      gameId: "fallout4",
      publishedAt: new Date().toISOString(),
      scheduledAt: new Date().toISOString(),
      image: "/platform/wasteland-hero.png",
      gallery: ["/platform/wasteland-hero.png"],
    }),
  });
  assert(news.id === "news_backend_test", "Backend no guarda noticia individual");

  const newsList = await request("/news");
  assert(newsList.some((item) => item.id === "news_backend_test"), "Backend no lista noticias");

  const notification = await request("/notifications/notification_backend_test", {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({
      title: "Notificacion backend test",
      message: "Mensaje de prueba",
      platform: "both",
      target: "all",
      status: "draft",
      priority: "normal",
      gameId: "fallout4",
      scheduledAt: new Date().toISOString(),
    }),
  });
  assert(notification.id === "notification_backend_test", "Backend no guarda notificacion individual");

  const notificationList = await request("/notifications");
  assert(notificationList.some((item) => item.id === "notification_backend_test"), "Backend no lista notificaciones");

  const publicTicket = await request("/support/public", {
    method: "POST",
    body: JSON.stringify({
      title: "No puedo iniciar sesion",
      description: "Ticket publico desde login",
      requesterName: "Invitado QA",
    }),
  });
  assert(publicTicket.requesterId === "public_guest", "Soporte publico no crea ticket invitado");

  await request(`/users/${encodeURIComponent(auth.profile.id)}/block`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ blocked: false }),
  });

  const message = await request("/chat/rooms/mesa-rpg/channels/general/messages", {
    method: "POST",
    body: JSON.stringify({ authorId: auth.profile.id, body: "ping local backend", type: "message" }),
  });
  assert(message.body === "ping local backend", "Chat local no guarda mensaje");

  const messages = await request("/chat/rooms/mesa-rpg/channels/general/messages");
  assert(messages.some((item) => item.id === message.id), "Chat local no lista mensaje guardado");

  const save = await request(`/users/${encodeURIComponent(auth.profile.id)}/saves/save_backend_test`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({
      saveId: "save_backend_test",
      userId: auth.profile.id,
      gameId: "fallout4",
      campaignId: "sanctuary_commonwealth",
      name: "Guardado backend test",
      updatedAt: new Date().toISOString(),
    }),
  });
  assert(save.saveId === "save_backend_test", "Backend no guarda partidas por usuario");

  const saves = await request(`/users/${encodeURIComponent(auth.profile.id)}/saves?gameId=fallout4`, { headers: adminHeaders });
  assert(saves.some((item) => item.saveId === "save_backend_test"), "Backend no lista guardados por juego");

  const backup = await request("/backup/export", { headers: adminHeaders });
  assert(backup.database?.games?.length >= games.length, "Backup export no incluye juegos");

  const audit = await request("/audit?limit=40", { headers: adminHeaders });
  assert(audit.some((entry) => entry.action === "auth.login"), "Auditoria no registra login");
  assert(audit.some((entry) => entry.action === "chat.message.send"), "Auditoria no registra chat");
  assert(audit.some((entry) => entry.action === "support.ticket.update"), "Auditoria no registra soporte");
  assert(audit.some((entry) => entry.action === "admin.playable.update"), "Auditoria no registra cambios de fichas jugables");

  await request(`/auth/sessions/${encodeURIComponent(auth.session.id)}/logout`, { method: "POST" });

  console.log("Local backend audit");
  console.log("===================");
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Games: ${games.length}`);
  console.log("OK: backend local responde y persiste datos.");
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  child.kill();
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
