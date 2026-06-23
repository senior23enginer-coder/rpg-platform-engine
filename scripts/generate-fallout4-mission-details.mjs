import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const tome = readFileSync(path.join(root, "core-book/TOMO 02 - Iteracion 5.1 Libro Publicable Refinado.txt"), "utf8");

function clean(value = "") {
  return value.replace(/\s+/g, " ").replace(/\.$/, "").trim();
}

function parseRows(tableText) {
  return tableText
    .split(/\r?\n/)
    .filter((line) => /^\|/.test(line) && !/^\|\s*-+/.test(line))
    .map((line) => line.split("|").slice(1, -1).map(clean));
}

const blocks = tome.split(/\n(?=M-\d{4}\s+—|ID:\s*M-\d{4})/g);
const missions = [];

for (const block of blocks) {
  const id = block.match(/(?:ID:\s*)?(M-\d{4})/)?.[1];
  if (!id) continue;
  const originalName = block.match(/Nombre original:\s*(.+)/)?.[1]?.trim()
    ?? block.match(/M-\d{4}\s+—\s*([^/\n]+?)(?:\s*\/|\n)/)?.[1]?.trim()
    ?? "";
  const spanishName = block.match(/Nombre en español:\s*(.+)/)?.[1]?.trim()
    ?? block.match(/M-\d{4}\s+—\s*[^/\n]+\/\s*([^\n]+)/)?.[1]?.trim()
    ?? "";
  const type = block.match(/Tipo:\s*(.+)/)?.[1]?.trim() ?? "";
  const dataRows = parseRows(block.match(/### 2\. Datos de misión([\s\S]*?)(?=### 5\.|### 3\.|### 4\.|$)/)?.[1] ?? "");
  const data = Object.fromEntries(dataRows.filter((row) => row.length >= 2).map(([key, value]) => [key, value]));
  const stageRows = parseRows(block.match(/### 10\. Etapas de misión([\s\S]*?)(?=### 11\.|### 12\.|### 13\.|$)/)?.[1] ?? "");
  const stages = stageRows
    .filter((row) => /^\d+$/.test(row[0] ?? ""))
    .map(([step, task, location, condition]) => ({
      step: Number(step),
      task,
      location,
      locationId: location?.match(/\b(?:U|A|V)-\d{2,4}\b/)?.[0]?.replace(/^V-01$/, "U-0001") ?? "",
      condition,
    }));
  const npcRows = parseRows(block.match(/### 6\. NPC y contactos de misión([\s\S]*?)(?=### 7\.|### 8\.|$)/)?.[1] ?? "");
  const npcs = npcRows
    .filter((row) => row.length >= 5 && row[0] !== "Rol")
    .map(([role, name, location, condition, use]) => ({ role, name, location, condition, use }));
  const enemyRows = parseRows(block.match(/### 8\. Enemigos de misión([\s\S]*?)(?=### 9\.|### 10\.|$)/)?.[1] ?? "");
  const enemies = enemyRows
    .filter((row) => row.length >= 5 && row[0] !== "Enemigo")
    .map(([name, quantity, location, zone, condition]) => ({ name, quantity, location, zone, condition }));
  const requiredRows = parseRows(block.match(/### 9\. Objetos requeridos[\s\S]*?(?=### 10\.|$)/)?.[0] ?? "");
  const requiredItems = requiredRows
    .filter((row) => row.length >= 3 && row[0] !== "Objeto requerido")
    .map(([name, location, use]) => ({ name, location, use }));
  const rewardLines = (block.match(/### 12\. Recompensas y cierre([\s\S]*?)(?=### 13\.|### 14\.|### 15\.|$)/)?.[1] ?? "")
    .split(/\r?\n/)
    .map((line) => clean(line.replace(/^-+\s*/, "")))
    .filter(Boolean);

  missions.push({
    id,
    originalName,
    spanishName,
    type,
    data,
    stages,
    npcs,
    enemies,
    requiredItems,
    rewards: rewardLines,
    playableStatus: stages.length ? "specific-runtime" : "generic-runtime",
  });
}

const unique = Array.from(new Map(missions.map((mission) => [mission.id, mission])).values())
  .sort((a, b) => a.id.localeCompare(b.id));

const output = {
  schemaVersion: 1,
  generatedFrom: "core-book/TOMO 02 - Iteracion 5.1 Libro Publicable Refinado.txt",
  generatedAt: new Date().toISOString(),
  counts: {
    missions: unique.length,
    specificRuntime: unique.filter((mission) => mission.stages.length).length,
    genericRuntime: unique.filter((mission) => !mission.stages.length).length,
    stages: unique.reduce((sum, mission) => sum + mission.stages.length, 0),
    npcs: unique.reduce((sum, mission) => sum + mission.npcs.length, 0),
    enemies: unique.reduce((sum, mission) => sum + mission.enemies.length, 0),
    requiredItems: unique.reduce((sum, mission) => sum + mission.requiredItems.length, 0),
  },
  missions: unique,
};

writeFileSync(path.join(root, "public/games/fallout4/missions/mission-details.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Mission details generated: ${output.counts.missions} missions, ${output.counts.stages} stages.`);
