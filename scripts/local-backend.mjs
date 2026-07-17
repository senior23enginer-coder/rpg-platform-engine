import { createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(rootDir, "data", "local-backend");
const databasePath = path.join(dataDir, "database.json");
const port = Number(process.env.RPG_LOCAL_BACKEND_PORT ?? process.argv.find((arg) => arg.startsWith("--port="))?.split("=")[1] ?? 8787);
const hashPrefix = "pbkdf2-sha256";
const iterations = 120000;

function nowIso() {
  return new Date().toISOString();
}

function jsonResponse(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  });
  response.end(JSON.stringify(body));
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeDatabase(database) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(databasePath, JSON.stringify({ ...database, updatedAt: nowIso() }, null, 2));
}

function createPasswordHash(password) {
  if (!password) return "";
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return `${hashPrefix}:${iterations}:${salt.toString("base64")}:${hash.toString("base64")}`;
}

function verifyPassword(password, storedHash, legacyPassword) {
  if (!storedHash) return Boolean(legacyPassword) && password === legacyPassword;
  const [prefix, iterationValue, saltValue, expectedValue] = storedHash.split(":");
  if (prefix !== hashPrefix || !saltValue || !expectedValue) return false;
  const hash = pbkdf2Sync(password, Buffer.from(saltValue, "base64"), Number(iterationValue) || iterations, 32, "sha256");
  return hash.toString("base64") === expectedValue;
}

function stableId(prefix, value) {
  return `${prefix}_${createHash("sha1").update(value).digest("hex").slice(0, 12)}`;
}

function normalizeUser(profile) {
  const passwordHash = profile.passwordHash || createPasswordHash(profile.password || "");
  return {
    ...profile,
    password: "",
    passwordHash,
    passwordUpdatedAt: passwordHash ? profile.passwordUpdatedAt || nowIso() : profile.passwordUpdatedAt,
    blocked: profile.blocked ?? false,
    permissions: profile.permissions ?? {},
    signedIn: false,
  };
}

function seedUsers() {
  const usersDir = path.join(rootDir, "public", "users");
  try {
    return readdirSync(usersDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => readJson(path.join(usersDir, entry.name, "profile.json"), undefined))
      .filter(Boolean)
      .map(normalizeUser);
  } catch {
    return [];
  }
}

function seedGames() {
  const gamesDir = path.join(rootDir, "public", "games");
  try {
    return readdirSync(gamesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => readJson(path.join(gamesDir, entry.name, "game.config.json"), undefined))
      .filter(Boolean)
      .map((game) => ({
        ...game,
        enabled: game.enabled ?? true,
        basePath: game.basePath ?? `/games/${game.id}`,
        configPath: game.configPath ?? `/games/${game.id}/game.config.json`,
      }))
      .sort((left, right) => String(left.name).localeCompare(String(right.name)));
  } catch {
    return [];
  }
}

function defaultMetadata() {
  return {
    version: "0.10-1625",
    platformName: "RPG Platform Engine",
    releaseChannel: "Pre-release",
    languagesEnabled: ["es", "en"],
    localizedText: {
      es: { platformTitle: "RPG Platform Engine", tagline: "Tu universo. Tu historia. Tu aventura.", loginSubtitle: "Accede a tu cuenta para continuar." },
      en: { platformTitle: "RPG Platform Engine", tagline: "Your universe. Your story. Your adventure.", loginSubtitle: "Sign in to continue." },
    },
    platformIcons: {},
    platformAudio: {},
    cloud: { provider: "local", endpoint: "http://127.0.0.1:8787/api", realtimeEndpoint: "http://127.0.0.1:8787/realtime", region: "local" },
    chatRelayUrl: "http://127.0.0.1:8787/realtime",
    chatRoom: "mesa-rpg",
    recentActivity: [],
    news: [],
    notifications: [],
    supportTickets: [],
    auditLog: [],
  };
}

function createDatabase() {
  const users = seedUsers();
  return {
    schemaVersion: 1,
    environment: "local",
    updatedAt: nowIso(),
    currentUserId: users[0]?.id,
    users,
    games: seedGames(),
    maps: [],
    sessions: [],
    metadata: defaultMetadata(),
    chatMessages: [],
    saveIndex: [],
    auditLog: [],
  };
}

function loadDatabase() {
  const database = readJson(databasePath, undefined) ?? createDatabase();
  database.users ??= [];
  database.games ??= [];
  database.maps ??= [];
  database.sessions ??= [];
  database.metadata ??= defaultMetadata();
  database.chatMessages ??= [];
  database.saveIndex ??= [];
  database.auditLog ??= [];
  return database;
}

function appendAudit(database, entry) {
  const audit = {
    id: entry.id ?? `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: entry.createdAt ?? nowIso(),
    ...entry,
  };
  database.auditLog = [audit, ...database.auditLog.filter((item) => item.id !== audit.id)].slice(0, 500);
  database.metadata.auditLog = [audit, ...(database.metadata.auditLog ?? []).filter((item) => item.id !== audit.id)].slice(0, 500);
  return audit;
}

function findUser(database, usernameOrEmail) {
  const normalized = String(usernameOrEmail ?? "").trim().toLowerCase();
  return database.users.find((user) =>
    [user.id, user.username, user.email, user.name]
      .filter(Boolean)
      .some((value) => String(value).trim().toLowerCase() === normalized)
  );
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function createSession(profile, remember) {
  const issued = Date.now();
  return {
    id: `session_${profile.id}_${issued}`,
    userId: profile.id,
    role: profile.role,
    remember: Boolean(remember),
    issuedAt: new Date(issued).toISOString(),
    expiresAt: new Date(issued + (remember ? 72 : 8) * 60 * 60 * 1000).toISOString(),
    lastActivityAt: new Date(issued).toISOString(),
  };
}

function upsertById(items, item) {
  return [item, ...items.filter((entry) => entry.id !== item.id)];
}

function routeKey(method, pathname) {
  return `${method} ${pathname}`;
}

function getBearerToken(request) {
  const authorization = request.headers.authorization ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return request.headers["x-session-id"] ?? "";
}

function getActor(database, request) {
  const token = getBearerToken(request);
  if (!token) return undefined;
  const session = database.sessions.find((item) => item.id === token && !item.revokedAt && new Date(item.expiresAt).getTime() > Date.now());
  if (!session) return undefined;
  const user = database.users.find((item) => item.id === session.userId);
  if (!user || user.blocked) return undefined;
  return { session, user };
}

function requireAuth(response, actor) {
  if (actor) return false;
  jsonResponse(response, 401, { error: "AUTH_REQUIRED" });
  return true;
}

function requireAdmin(response, actor) {
  if (actor?.user?.role === "admin") return false;
  jsonResponse(response, actor ? 403 : 401, { error: actor ? "ADMIN_REQUIRED" : "AUTH_REQUIRED" });
  return true;
}

function requireSelfOrAdmin(response, actor, userId) {
  if (actor?.user?.role === "admin" || actor?.user?.id === userId) return false;
  jsonResponse(response, actor ? 403 : 401, { error: actor ? "OWNER_OR_ADMIN_REQUIRED" : "AUTH_REQUIRED" });
  return true;
}

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname.replace(/^\/api/, "") || "/";
  const database = loadDatabase();
  const method = request.method ?? "GET";
  const actor = getActor(database, request);

  if (method === "OPTIONS") return jsonResponse(response, 204, {});
  if (routeKey(method, pathname) === "GET /health") return jsonResponse(response, 200, { ok: true, environment: "local", updatedAt: database.updatedAt });

  try {
    if (routeKey(method, pathname) === "POST /auth/login") {
      const credentials = await readBody(request);
      const user = findUser(database, credentials.usernameOrEmail);
      if (!user || user.blocked || !verifyPassword(credentials.password, user.passwordHash, user.password)) {
        return jsonResponse(response, 401, { error: "AUTH_INVALID" });
      }
      const profile = { ...user, password: "", signedIn: true, lastLoginAt: nowIso(), lastActivityAt: nowIso() };
      const session = createSession(profile, credentials.remember);
      database.users = upsertById(database.users, profile);
      database.sessions = upsertById(database.sessions, session);
      database.currentUserId = profile.id;
      appendAudit(database, { action: "auth.login", module: "auth", actorId: profile.id, targetId: profile.id });
      writeDatabase(database);
      return jsonResponse(response, 200, { profile, session });
    }

    const logoutMatch = pathname.match(/^\/auth\/sessions\/([^/]+)\/logout$/);
    if (method === "POST" && logoutMatch) {
      database.sessions = database.sessions.map((session) => session.id === decodeURIComponent(logoutMatch[1]) ? { ...session, revokedAt: nowIso() } : session);
      writeDatabase(database);
      return jsonResponse(response, 204, {});
    }

    const refreshMatch = pathname.match(/^\/auth\/sessions\/([^/]+)\/refresh$/);
    if (method === "POST" && refreshMatch) {
      const session = database.sessions.find((item) => item.id === decodeURIComponent(refreshMatch[1]) && !item.revokedAt);
      if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return jsonResponse(response, 401, { error: "SESSION_EXPIRED" });
      const refreshed = { ...session, lastActivityAt: nowIso() };
      database.sessions = upsertById(database.sessions, refreshed);
      writeDatabase(database);
      return jsonResponse(response, 200, refreshed);
    }

    if (routeKey(method, pathname) === "POST /auth/password-reset") {
      const body = await readBody(request);
      const user = findUser(database, body.usernameOrEmail);
      if (user) appendAudit(database, { action: "auth.password_reset", module: "auth", actorId: user.id, targetId: user.id });
      writeDatabase(database);
      return jsonResponse(response, 204, {});
    }

    if (routeKey(method, pathname) === "GET /users") return jsonResponse(response, 200, database.users);
    const userMatch = pathname.match(/^\/users\/([^/]+)$/);
    if (method === "PATCH" && userMatch) {
      if (requireSelfOrAdmin(response, actor, decodeURIComponent(userMatch[1]))) return;
      const body = await readBody(request);
      const user = normalizeUser({ ...body, id: decodeURIComponent(userMatch[1]) });
      database.users = upsertById(database.users, user);
      appendAudit(database, { action: "admin.user.update", module: "users", actorId: actor?.user.id ?? database.currentUserId ?? "system", targetId: user.id });
      writeDatabase(database);
      return jsonResponse(response, 200, user);
    }

    const blockMatch = pathname.match(/^\/users\/([^/]+)\/block$/);
    if (method === "POST" && blockMatch) {
      if (requireAdmin(response, actor)) return;
      const body = await readBody(request);
      database.users = database.users.map((user) => user.id === decodeURIComponent(blockMatch[1]) ? { ...user, blocked: Boolean(body.blocked) } : user);
      appendAudit(database, { action: "admin.user.update", module: "users", actorId: actor?.user.id ?? "system", targetId: decodeURIComponent(blockMatch[1]), metadata: { blocked: Boolean(body.blocked) } });
      writeDatabase(database);
      return jsonResponse(response, 204, {});
    }

    if (routeKey(method, pathname) === "GET /games") return jsonResponse(response, 200, database.games);
    const gameMatch = pathname.match(/^\/games\/([^/]+)$/);
    if (method === "PATCH" && gameMatch) {
      if (requireAdmin(response, actor)) return;
      const game = { ...(await readBody(request)), id: decodeURIComponent(gameMatch[1]) };
      database.games = upsertById(database.games, game);
      appendAudit(database, { action: "admin.game.update", module: "games", actorId: actor?.user.id ?? "system", targetId: game.id });
      writeDatabase(database);
      return jsonResponse(response, 200, game);
    }

    if (routeKey(method, pathname) === "GET /maps") {
      const gameId = url.searchParams.get("gameId");
      return jsonResponse(response, 200, gameId ? database.maps.filter((map) => map.gameId === gameId) : database.maps);
    }
    const mapMatch = pathname.match(/^\/maps\/([^/]+)$/);
    if (method === "PATCH" && mapMatch) {
      if (requireAdmin(response, actor)) return;
      const map = { ...(await readBody(request)), id: decodeURIComponent(mapMatch[1]), updatedAt: nowIso() };
      database.maps = upsertById(database.maps, map);
      appendAudit(database, { action: "admin.map.update", module: "maps", actorId: actor?.user.id ?? "system", targetId: map.id });
      writeDatabase(database);
      return jsonResponse(response, 200, map);
    }

    if (routeKey(method, pathname) === "GET /metadata") return jsonResponse(response, 200, database.metadata);
    if (routeKey(method, pathname) === "PATCH /metadata") {
      if (requireAdmin(response, actor)) return;
      database.metadata = { ...database.metadata, ...(await readBody(request)) };
      appendAudit(database, { action: "admin.settings.update", module: "settings", actorId: actor?.user.id ?? "system", targetId: "platform" });
      writeDatabase(database);
      return jsonResponse(response, 200, database.metadata);
    }
    if (routeKey(method, pathname) === "POST /news") {
      if (requireAdmin(response, actor)) return;
      database.metadata.news = (await readBody(request)).news ?? [];
      appendAudit(database, { action: "admin.news.update", module: "news", actorId: actor?.user.id ?? "system", targetId: "news" });
      writeDatabase(database);
      return jsonResponse(response, 200, database.metadata.news);
    }
    if (routeKey(method, pathname) === "GET /news") return jsonResponse(response, 200, database.metadata.news ?? []);
    const newsMatch = pathname.match(/^\/news\/([^/]+)$/);
    if (method === "PATCH" && newsMatch) {
      if (requireAdmin(response, actor)) return;
      const newsId = decodeURIComponent(newsMatch[1]);
      const existing = (database.metadata.news ?? []).find((entry) => entry.id === newsId);
      const patch = await readBody(request);
      if (existing?.status === "published" && patch.status !== "archived" && patch.status !== "published-copy") {
        return jsonResponse(response, 409, { error: "NEWS_PUBLISHED_LOCKED" });
      }
      const news = { ...existing, ...patch, id: newsId, updatedAt: nowIso() };
      database.metadata.news = upsertById(database.metadata.news ?? [], news);
      appendAudit(database, { action: "admin.news.update", module: "news", actorId: actor?.user.id ?? "system", targetId: news.id });
      writeDatabase(database);
      return jsonResponse(response, 200, news);
    }
    if (method === "DELETE" && newsMatch) {
      if (requireAdmin(response, actor)) return;
      const newsId = decodeURIComponent(newsMatch[1]);
      database.metadata.news = (database.metadata.news ?? []).filter((entry) => entry.id !== newsId);
      appendAudit(database, { action: "admin.news.update", module: "news", actorId: actor?.user.id ?? "system", targetId: newsId });
      writeDatabase(database);
      return jsonResponse(response, 204, {});
    }
    if (routeKey(method, pathname) === "POST /notifications") {
      if (requireAdmin(response, actor)) return;
      database.metadata.notifications = (await readBody(request)).notifications ?? [];
      appendAudit(database, { action: "admin.notification.update", module: "notifications", actorId: actor?.user.id ?? "system", targetId: "notifications" });
      writeDatabase(database);
      return jsonResponse(response, 200, database.metadata.notifications);
    }
    if (routeKey(method, pathname) === "GET /notifications") return jsonResponse(response, 200, database.metadata.notifications ?? []);
    const notificationMatch = pathname.match(/^\/notifications\/([^/]+)$/);
    if (method === "PATCH" && notificationMatch) {
      if (requireAdmin(response, actor)) return;
      const notificationId = decodeURIComponent(notificationMatch[1]);
      const notification = { ...(database.metadata.notifications ?? []).find((entry) => entry.id === notificationId), ...(await readBody(request)), id: notificationId, updatedAt: nowIso() };
      database.metadata.notifications = upsertById(database.metadata.notifications ?? [], notification);
      appendAudit(database, { action: "admin.notification.update", module: "notifications", actorId: actor?.user.id ?? "system", targetId: notification.id });
      writeDatabase(database);
      return jsonResponse(response, 200, notification);
    }
    if (method === "DELETE" && notificationMatch) {
      if (requireAdmin(response, actor)) return;
      const notificationId = decodeURIComponent(notificationMatch[1]);
      database.metadata.notifications = (database.metadata.notifications ?? []).filter((entry) => entry.id !== notificationId);
      appendAudit(database, { action: "admin.notification.update", module: "notifications", actorId: actor?.user.id ?? "system", targetId: notificationId });
      writeDatabase(database);
      return jsonResponse(response, 204, {});
    }

    if (routeKey(method, pathname) === "GET /support/tickets") return jsonResponse(response, 200, database.metadata.supportTickets ?? []);
    if (routeKey(method, pathname) === "POST /support/public") {
      const body = await readBody(request);
      const ticket = {
        id: body.id ?? `ticket_public_${Date.now()}`,
        requesterId: body.requesterId ?? "public_guest",
        requesterName: body.requesterName ?? "Invitado",
        title: body.title ?? "Solicitud desde login",
        description: body.description ?? "",
        status: body.status ?? "open",
        priority: body.priority ?? "medium",
        category: body.category ?? "login",
        messages: body.messages ?? [],
        createdAt: body.createdAt ?? nowIso(),
        updatedAt: nowIso(),
      };
      database.metadata.supportTickets = upsertById(database.metadata.supportTickets ?? [], ticket);
      appendAudit(database, { action: "support.ticket.update", module: "support", actorId: ticket.requesterId, targetId: ticket.id });
      writeDatabase(database);
      return jsonResponse(response, 200, ticket);
    }
    const ticketMatch = pathname.match(/^\/support\/tickets\/([^/]+)$/);
    if (method === "PATCH" && ticketMatch) {
      const existingTicket = (database.metadata.supportTickets ?? []).find((item) => item.id === decodeURIComponent(ticketMatch[1]));
      if (requireSelfOrAdmin(response, actor, existingTicket?.requesterId ?? "")) return;
      const ticket = { ...(await readBody(request)), id: decodeURIComponent(ticketMatch[1]), updatedAt: nowIso() };
      database.metadata.supportTickets = upsertById(database.metadata.supportTickets ?? [], ticket);
      appendAudit(database, { action: "support.ticket.update", module: "support", actorId: actor?.user.id ?? database.currentUserId ?? "system", targetId: ticket.id });
      writeDatabase(database);
      return jsonResponse(response, 200, ticket);
    }

    const chatMatch = pathname.match(/^\/chat\/rooms\/([^/]+)\/channels\/([^/]+)\/messages$/);
    if (chatMatch && method === "GET") {
      const roomId = decodeURIComponent(chatMatch[1]);
      const channelId = decodeURIComponent(chatMatch[2]);
      return jsonResponse(response, 200, database.chatMessages.filter((message) => message.roomId === roomId && message.channelId === channelId));
    }
    if (chatMatch && method === "POST") {
      const message = { ...(await readBody(request)), roomId: decodeURIComponent(chatMatch[1]), channelId: decodeURIComponent(chatMatch[2]), createdAt: nowIso() };
      message.id ??= stableId("msg", `${message.roomId}:${message.channelId}:${message.authorId}:${message.createdAt}:${message.body}`);
      database.chatMessages = upsertById(database.chatMessages, message).slice(0, 500);
      appendAudit(database, { action: "chat.message.send", module: "chat", actorId: message.authorId ?? "system", targetId: message.channelId });
      writeDatabase(database);
      return jsonResponse(response, 200, message);
    }

    const savesMatch = pathname.match(/^\/users\/([^/]+)\/saves(?:\/([^/]+))?$/);
    if (savesMatch && method === "GET") {
      if (requireSelfOrAdmin(response, actor, decodeURIComponent(savesMatch[1]))) return;
      const user = database.users.find((item) => item.id === decodeURIComponent(savesMatch[1]));
      const gameId = url.searchParams.get("gameId");
      const saves = user?.saves ?? [];
      return jsonResponse(response, 200, gameId ? saves.filter((save) => save.gameId === gameId) : saves);
    }
    if (savesMatch && method === "PATCH") {
      const userId = decodeURIComponent(savesMatch[1]);
      if (requireSelfOrAdmin(response, actor, userId)) return;
      const save = { ...(await readBody(request)), userId, saveId: decodeURIComponent(savesMatch[2] ?? "") };
      database.users = database.users.map((user) => user.id === userId ? { ...user, saves: upsertById(user.saves ?? [], save) } : user);
      database.saveIndex = upsertById(database.saveIndex, { saveId: save.saveId, gameId: save.gameId, userId, campaignId: save.campaignId, name: save.name, updatedAt: save.updatedAt ?? nowIso() });
      appendAudit(database, { action: "savegame.update", module: "saves", actorId: actor?.user.id ?? userId, targetId: save.saveId });
      writeDatabase(database);
      return jsonResponse(response, 200, save);
    }

    if (routeKey(method, pathname) === "GET /audit") {
      if (requireAdmin(response, actor)) return;
      return jsonResponse(response, 200, database.auditLog.slice(0, Number(url.searchParams.get("limit") ?? 100)));
    }
    if (routeKey(method, pathname) === "POST /audit") {
      if (requireAuth(response, actor)) return;
      const audit = appendAudit(database, await readBody(request));
      writeDatabase(database);
      return jsonResponse(response, 200, audit);
    }

    if (routeKey(method, pathname) === "GET /backup/export") {
      if (requireAdmin(response, actor)) return;
      appendAudit(database, { action: "admin.settings.update", module: "settings", actorId: actor?.user.id ?? "system", targetId: "backup-export" });
      writeDatabase(database);
      return jsonResponse(response, 200, { exportedAt: nowIso(), schemaVersion: database.schemaVersion, database });
    }

    if (routeKey(method, pathname) === "POST /backup/import") {
      if (requireAdmin(response, actor)) return;
      const body = await readBody(request);
      const imported = body.database ?? body;
      if (!imported || typeof imported !== "object" || !Array.isArray(imported.users) || !Array.isArray(imported.games)) {
        return jsonResponse(response, 400, { error: "INVALID_BACKUP" });
      }
      const nextDatabase = {
        ...createDatabase(),
        ...imported,
        environment: "local",
        updatedAt: nowIso(),
      };
      appendAudit(nextDatabase, { action: "admin.settings.update", module: "settings", actorId: actor?.user.id ?? "system", targetId: "backup-import" });
      writeDatabase(nextDatabase);
      return jsonResponse(response, 200, { ok: true, importedAt: nextDatabase.updatedAt });
    }

    return jsonResponse(response, 404, { error: "NOT_FOUND", path: pathname });
  } catch (error) {
    return jsonResponse(response, 500, { error: "LOCAL_BACKEND_ERROR", message: error instanceof Error ? error.message : String(error) });
  }
}

export function startLocalBackend({ requestedPort = port, silent = false } = {}) {
  mkdirSync(dataDir, { recursive: true });
  if (!readJson(databasePath, undefined)) writeDatabase(createDatabase());
  const server = createServer((request, response) => {
    if (request.url?.startsWith("/api/")) return void handleApi(request, response);
    if (request.url?.startsWith("/realtime")) return void jsonResponse(response, 200, { ok: true, mode: "local" });
    jsonResponse(response, 404, { error: "NOT_FOUND" });
  });
  server.listen(requestedPort, "127.0.0.1", () => {
    if (!silent) console.log(`RPG local backend running at http://127.0.0.1:${requestedPort}/api`);
  });
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startLocalBackend();
}
