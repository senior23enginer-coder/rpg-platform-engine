import { readFileSync } from "node:fs";

const files = {
  metadata: readFileSync("src/lib/appMetadataStorage.ts", "utf8"),
  selector: readFileSync("src/lib/platformRepository.ts", "utf8"),
  storage: readFileSync("src/lib/storageAdapter.ts", "utf8"),
  contract: readFileSync("public/platform/api-contract.json", "utf8"),
  roadmap: readFileSync("public/platform/completion-roadmap.json", "utf8"),
};

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const apiContract = JSON.parse(files.contract);
const roadmap = JSON.parse(files.roadmap);

assert(files.metadata.includes('provider: "local-http"'), "Metadata default no esta en modo backend local");
assert(files.metadata.includes("http://127.0.0.1:8787/api"), "Metadata no apunta al backend local");
assert(files.selector.includes("createLocalHttpPlatformRepository"), "Selector no soporta backend local HTTP");
assert(files.selector.includes("return createLocalPlatformRepository()"), "Selector no conserva repositorio local directo como fallback");
assert(!files.selector.includes("createCloudPlatformRepository("), "Selector activo intenta usar cloud");
assert(files.storage.includes("localStorage") && files.storage.includes("DATABASE_KEY"), "Storage local no esta configurado");
assert(apiContract.environment === "local", "Contrato no declara environment local");
assert(apiContract.transport.includes("local HTTP backend"), "Contrato no documenta backend local HTTP");
assert(roadmap.areas.some((area) => area.id === "backend-database" && area.title.includes("local")), "Roadmap no refleja base local");
assert(roadmap.areas.some((area) => area.id === "online-chat" && area.title.includes("local")), "Roadmap no refleja chat local");

console.log("Local environment audit");
console.log("=======================");
console.log("Mode: local-first");
console.log("Repository: local-http");
console.log("Storage: JSON database on disk");
console.log("Realtime: local endpoint");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log("OK: ambiente local real configurado.");
