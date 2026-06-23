import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const templates = JSON.parse(readFileSync(path.join(root, "public/games/fallout4/templates/templates.json"), "utf8"));
const missionDetails = JSON.parse(readFileSync(path.join(root, "public/games/fallout4/missions/mission-details.json"), "utf8"));
const catalogs = templates.catalogs ?? {};

function normalizeName(value = "") {
  return String(value)
    .replace(/\bCall a Arms\b/g, "Call to Arms")
    .replace(/\bOut en Left Field\b/g, "Out in Left Field")
    .replace(/\bRun a the Hills\b/g, "Run to the Hills")
    .replace(/\bRoad a Freedom\b/g, "Road to Freedom")
    .replace(/\bTo the Mattresses\b/g, "To the Mattresses")
    .replace(/\bde la Fuego\b/g, "of the Fire")
    .replace(/\s+/g, " ")
    .trim();
}

function kindFromText(text = "") {
  const value = text.toLowerCase();
  if (/terminal|hack|unlock|reparar|generador|bomba|antena|seguridad/.test(value)) return "technical";
  if (/hablar|informar|convencer|negociar|report|preston|desdemona|dador/.test(value)) return "social";
  if (/eliminar|limpiar|defender|hostiles|raider|ghoul|deathclaw|combat/.test(value)) return "combat";
  if (/obtener|recuperar|registrar|nota|holocinta|schematics|loot|objeto/.test(value)) return "loot";
  return "exploration";
}

let renamedLabels = 0;
const polishedMissions = missionDetails.missions.map((mission) => {
  const displayName = normalizeName(mission.spanishName || mission.originalName || mission.id);
  const originalLabel = mission.spanishName || mission.originalName || mission.id;
  if (displayName !== originalLabel) renamedLabels += 1;
  return {
    id: mission.id,
    displayName,
    originalName: normalizeName(mission.originalName),
    type: mission.type,
    stageCount: mission.stages.length,
    npcCount: mission.npcs.length,
    enemyCount: mission.enemies.length,
    requiredItemCount: mission.requiredItems.length,
    stages: mission.stages.map((stage) => ({
      ...stage,
      task: normalizeName(stage.task),
      kind: kindFromText(`${stage.task} ${stage.condition}`),
    })),
  };
});

const missionPolish = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "TOMO 02 + mission-details.json",
  counts: {
    missions: missionDetails.missions.length,
    stages: missionDetails.counts.stages,
    renamedLabels,
  },
  missions: polishedMissions,
};

const advancedRules = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceTome: "TOMO 01",
  rules: {
    tests: {
      dice: "2d20",
      targetNumber: "atributo + habilidad o valor operativo 12 por defecto",
      criticalSuccess: "cada 1 suma exito critico y mejora dano/efecto",
      criticalFailure: "cada 20 genera complicacion, dano recibido o coste",
      difficultyFloor: 0,
      difficultyModifiers: ["perk", "equipo", "supervivencia", "riesgo de ubicacion", "cobertura"],
    },
    combat: {
      damageDie: "d6",
      damageFormula: "d6 + dano base de arma + bono perk + momentum + criticos",
      defenseFormula: "armadura + perk + cobertura, recomendado maximo 6 en niveles bajos",
      injuryHook: "si dano recibido supera defensa y falla la escena, registrar complicacion/herida",
      ammo: "municion por arma en save.game.json",
    },
    perks: {
      conversion: [
        { source: "+20% dano", tableEffect: "+1 dano" },
        { source: "+40% dano", tableEffect: "+2 dano" },
        { source: "+60% dano", tableEffect: "+3 dano" },
        { source: "mejor precision", tableEffect: "-1 dificultad o +1 dado situacional" },
        { source: "mejor resistencia", tableEffect: "+1 defensa o reduce 1 dano una vez por turno" },
        { source: "mejor comercio", tableEffect: "10-25% mejor precio o reduce dificultad de Comercio" },
      ],
      runtimeState: ["active", "pendingPerkChoices", "damageBonus", "defenseBonus", "difficultyReduction"],
    },
    economy: {
      capsEarned: "registrado en ruleState.capsEarned",
      capsSpent: "registrado en ruleState.capsSpent",
      tradeHook: "usar Carisma/Comercio + perks para modificar coste 10-25%",
    },
    loadout: {
      weapons: catalogs.weapons?.length ?? 0,
      equipment: catalogs.equipment?.length ?? 0,
      modsHook: "Tomo 04/05 proveen mods; runtime aplica bono abstracto hasta ficha fina",
    },
  },
};

const locations = catalogs.locations ?? [];
const collectibles = catalogs.collectibles ?? [];
const eventCounts = {
  locations: locations.length,
  events: 0,
  terminals: 0,
  locks: 0,
  enemies: 0,
  loot: 0,
};
const polishedLocations = locations.map((location) => {
  const localCollectibles = collectibles.filter((item) => item.locationId === location.id);
  const subzones = location.subzones?.length ? location.subzones : [
    { name: "Acceso principal", role: "Entrada" },
    { name: "Zona de busqueda", role: "Exploracion" },
    { name: "Salida conectada", role: "Transicion" },
  ];
  const events = subzones.flatMap((subzone, index) => {
    const text = `${subzone.name} ${subzone.role ?? ""}`.toLowerCase();
    const eventList = [
      {
        id: `${location.id}:move:${index}`,
        subzone: subzone.name,
        type: "movement",
        apCost: 1,
        rule: "Mover a subzona conectada consume AP.",
      },
    ];
    if (/terminal|oficina|seguridad|administracion|control/.test(text)) {
      eventList.push({ id: `${location.id}:terminal:${index}`, subzone: subzone.name, type: "terminal", apCost: 1, rule: "Prueba tecnica 2d20; fallo genera alarma/ruido." });
      eventCounts.terminals += 1;
    }
    if (/puerta|entrada|salida|ascensor|gate|acceso/.test(text)) {
      eventList.push({ id: `${location.id}:lock:${index}`, subzone: subzone.name, type: "lock", apCost: 1, rule: "Acceso bloqueado, ganzua, terminal o ruta alternativa." });
      eventCounts.locks += 1;
    }
    if (location.enemies?.length && /calle|exterior|pasillo|sala|zona|plaza|museo|garaje|taller/.test(text)) {
      eventList.push({ id: `${location.id}:enemy:${index}`, subzone: subzone.name, type: "enemy", apCost: 1, rule: `Encuentro con ${location.enemies.join(", ")}; usar Tomo 03.` });
      eventCounts.enemies += 1;
    }
    const collectible = localCollectibles.find((item) => item.subzone && subzone.name.toLowerCase().includes(String(item.subzone).toLowerCase())) ?? localCollectibles[index % Math.max(1, localCollectibles.length)];
    if (collectible) {
      eventList.push({ id: `${location.id}:loot:${index}`, subzone: subzone.name, type: "loot", apCost: 1, rule: `Registrar ${collectible.name}; usar Tomo 09.` });
      eventCounts.loot += 1;
    }
    return eventList;
  });
  eventCounts.events += events.length;
  return {
    id: location.id,
    name: location.name,
    risk: location.risk,
    settlement: Boolean(location.settlement),
    events,
  };
});

const locationEvents = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "TOMO 06 + TOMO 09 + TOMO 03",
  counts: eventCounts,
  locations: polishedLocations,
};

mkdirSync(path.join(root, "public/games/fallout4/runtime"), { recursive: true });
mkdirSync(path.join(root, "public/games/fallout4/locations"), { recursive: true });
writeFileSync(path.join(root, "public/games/fallout4/missions/mission-polish.json"), `${JSON.stringify(missionPolish, null, 2)}\n`);
writeFileSync(path.join(root, "public/games/fallout4/rules/advanced-rules.json"), `${JSON.stringify(advancedRules, null, 2)}\n`);
writeFileSync(path.join(root, "public/games/fallout4/locations/location-events.json"), `${JSON.stringify(locationEvents, null, 2)}\n`);

console.log(`Final runtime generated: ${missionPolish.counts.missions} missions, ${missionPolish.counts.stages} stages, ${locationEvents.counts.events} location events.`);
