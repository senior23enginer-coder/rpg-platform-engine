import { readFileSync } from "node:fs";

const roadmap = JSON.parse(readFileSync("public/platform/completion-roadmap.json", "utf8"));
const failures = [];

const requiredIds = [
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

function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(roadmap.schemaVersion === 1, "Roadmap sin schemaVersion 1");
assert(Array.isArray(roadmap.areas), "Roadmap sin areas");

const byId = new Map((roadmap.areas ?? []).map((area) => [area.id, area]));

for (const id of requiredIds) {
  const area = byId.get(id);
  assert(area, `Falta area ${id}`);
  if (!area) continue;
  assert(area.title && typeof area.title === "string", `${id}: falta titulo`);
  assert(["pending", "initial", "prototype", "partial", "in_progress", "done"].includes(area.status), `${id}: estado invalido`);
  assert(["critical", "high", "medium", "low"].includes(area.priority), `${id}: prioridad invalida`);
  assert(area.owner && typeof area.owner === "string", `${id}: falta owner`);
  assert(Array.isArray(area.acceptance) && area.acceptance.length >= 3, `${id}: faltan criterios de aceptacion`);
}

const finished = roadmap.areas.filter((area) => area.status === "done").length;
const total = roadmap.areas.length;
const criticalOpen = roadmap.areas.filter((area) => area.priority === "critical" && area.status !== "done");
const noProgress = roadmap.areas.filter((area) => ["pending", "initial", "prototype"].includes(area.status));

assert(noProgress.length === 0, `Areas sin avance verificable: ${noProgress.map((area) => area.id).join(", ")}`);

console.log("Platform completion roadmap audit");
console.log("==================================");
console.log(`Areas: ${total}`);
console.log(`Completadas: ${finished}`);
console.log(`Criticas abiertas: ${criticalOpen.length}`);

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log("OK: roadmap completo y verificable.");
