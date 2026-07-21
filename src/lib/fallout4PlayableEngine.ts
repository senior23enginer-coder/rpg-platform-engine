import type { PlayerSave } from "../types/profile";

export type Fallout4SurvivalState = NonNullable<NonNullable<PlayerSave["campaignState"]>["survival"]>;
export type Fallout4RuleState = NonNullable<NonNullable<PlayerSave["campaignState"]>["ruleState"]>;
export type Fallout4PerkState = NonNullable<NonNullable<PlayerSave["campaignState"]>["perkState"]>;

export type Fallout4CatalogRef = {
  id?: string;
  name?: string;
  hp?: number;
  threat?: number;
};

export type Fallout4Roll = {
  dice: [number, number];
  successes: number;
  passed: boolean;
  criticalSuccesses: number;
  criticalFailures: number;
};

export type Fallout4CombatResolution = {
  roll: Fallout4Roll;
  difficulty: number;
  ammoType: string;
  ammoBefore: number;
  ammoAfter: number;
  weaponDamage: number;
  damageDie: number;
  damageDealt: number;
  defense: number;
  incomingDamage: number;
  enemyHpBefore: number;
  enemyHpAfter: number;
  defeated: boolean;
  momentumGenerated: number;
  noiseDelta: number;
};

export type Fallout4NodeActionKind = "move" | "search" | "social" | "combat" | "loot" | "technical" | "survival" | "mission";

export type Fallout4NodeActionResolution = {
  roll: Fallout4Roll;
  actionCost: number;
  difficulty: number;
  passed: boolean;
  apAfter: number;
  capsDelta: number;
  noiseDelta: number;
  survival: Fallout4SurvivalState;
  ruleState: Fallout4RuleState;
  complication?: string;
};

export type Fallout4TradeResolution = {
  basePrice: number;
  finalPrice: number;
  discountPercent: number;
  capsAfter: number;
  ruleState: Fallout4RuleState;
  allowed: boolean;
};

export function defaultFallout4RuleState(): Fallout4RuleState {
  return {
    actionPointsSpent: 0,
    testsRolled: 0,
    combatRounds: 0,
    socialChecks: 0,
    technicalChecks: 0,
    travelActions: 0,
    failures: 0,
    complications: [],
    criticalSuccesses: 0,
    criticalFailures: 0,
    damageDealt: 0,
    damageTaken: 0,
    defenseApplied: 0,
    capsEarned: 0,
    capsSpent: 0,
  };
}

export function mergeFallout4RuleState(current: Fallout4RuleState | undefined, patch: Partial<Fallout4RuleState>): Fallout4RuleState {
  return {
    ...defaultFallout4RuleState(),
    ...(current ?? {}),
    ...patch,
    complications: patch.complications ?? current?.complications ?? [],
  };
}

export function defaultFallout4PerkState(): Fallout4PerkState {
  return {
    active: [],
    pendingPerkChoices: 0,
    damageBonus: 0,
    defenseBonus: 0,
    difficultyReduction: 0,
  };
}

export function fallout4RiskDifficulty(risk?: string | number) {
  if (typeof risk === "number") return Math.max(0, Math.min(5, Math.round(risk)));
  const value = (risk ?? "").toLowerCase();
  if (value.includes("extremo")) return 4;
  if (value.includes("alto")) return 3;
  if (value.includes("medio")) return 2;
  return 1;
}

export function fallout4CoverageModifier(coverage?: string | number) {
  if (typeof coverage === "number") return Math.max(0, Math.min(3, Math.round(coverage)));
  const value = (coverage ?? "").toLowerCase();
  if (value.includes("bloque") || value.includes("blocked") || value.includes("muro")) return 3;
  if (value.includes("pesad") || value.includes("heavy") || value.includes("alta")) return 2;
  if (value.includes("liger") || value.includes("light") || value.includes("baja")) return 1;
  return 0;
}

export function fallout4MovementCost({
  base = 1,
  terrain,
  weather,
  carryingLoad = 0,
}: {
  base?: number;
  terrain?: string;
  weather?: { movementModifier?: number; damage?: string; name?: string };
  carryingLoad?: number;
}) {
  const terrainText = (terrain ?? "").toLowerCase();
  const terrainPenalty =
    /agua|water|monta|mountain|pantano|swamp|ruina|interior|vault|subterraneo/.test(terrainText) ? 1 : 0;
  const loadPenalty = carryingLoad >= 90 ? 2 : carryingLoad >= 70 ? 1 : 0;
  return Math.max(0, base + terrainPenalty + (weather?.movementModifier ?? 0) + loadPenalty);
}

export function applyFallout4Difficulty(base: number, kind: string, perkState: Fallout4PerkState, survival: Fallout4SurvivalState) {
  const survivalPenalty = survival.hunger >= 7 || survival.thirst >= 7 || survival.fatigue >= 7 || survival.radiation >= 8 ? 1 : 0;
  const perkReduction = kind === "combat" ? 0 : perkState.difficultyReduction;
  return Math.max(0, base + survivalPenalty - perkReduction);
}

export function rollFallout4Test(difficulty: number, dice?: [number, number]): Fallout4Roll {
  const rolled: [number, number] = dice ?? [Math.ceil(Math.random() * 20), Math.ceil(Math.random() * 20)];
  const successes = rolled.filter((die) => die <= 12).length;
  const criticalSuccesses = rolled.filter((die) => die === 1).length;
  const criticalFailures = rolled.filter((die) => die === 20).length;
  return { dice: rolled, successes, passed: successes >= difficulty, criticalSuccesses, criticalFailures };
}

export function fallout4Defense(armor?: Fallout4CatalogRef, perkState?: Fallout4PerkState, cover = false) {
  const armorBase = armor?.name ? Math.max(1, Math.min(4, Math.ceil(armor.name.length / 18))) : 0;
  return Math.min(6, armorBase + (perkState?.defenseBonus ?? 0) + (cover ? 1 : 0));
}

export function fallout4WeaponDamage(weapon?: Fallout4CatalogRef, perkState?: Fallout4PerkState, criticalSuccesses = 0) {
  const weaponBase = weapon?.name ? Math.max(2, Math.min(8, Math.ceil(weapon.name.length / 8))) : 2;
  return weaponBase + (perkState?.damageBonus ?? 0) + criticalSuccesses;
}

export function fallout4AmmoTypeForWeapon(weapon?: Fallout4CatalogRef) {
  const value = `${weapon?.id ?? ""} ${weapon?.name ?? ""}`.toLowerCase();
  if (value.includes("10mm") || value.includes("pistola")) return "10mm";
  if (value.includes("laser") || value.includes("plasma") || value.includes("energia")) return "fusion_cell";
  if (value.includes("rifle") || value.includes("pipe") || value.includes("combat")) return ".38";
  if (value.includes("escopeta") || value.includes("shotgun")) return "shell";
  if (value.includes("melee") || value.includes("cuchillo") || value.includes("bate")) return "melee";
  return ".38";
}

export function resolveFallout4Combat({
  difficulty,
  weapon,
  armor,
  enemy,
  enemyHp,
  ammo,
  perkState,
  cover = true,
  dice,
  damageDie,
}: {
  difficulty: number;
  weapon?: Fallout4CatalogRef;
  armor?: Fallout4CatalogRef;
  enemy?: Fallout4CatalogRef;
  enemyHp?: number;
  ammo: Record<string, number>;
  perkState: Fallout4PerkState;
  cover?: boolean;
  dice?: [number, number];
  damageDie?: number;
}): Fallout4CombatResolution {
  const roll = rollFallout4Test(difficulty, dice);
  const ammoType = fallout4AmmoTypeForWeapon(weapon);
  const ammoBefore = ammoType === "melee" ? Number.POSITIVE_INFINITY : ammo[ammoType] ?? 0;
  const hasAmmo = ammoType === "melee" || ammoBefore > 0;
  const maxHp = Math.max(4, Math.min(40, Math.round((enemy?.hp ?? 10) / 10)));
  const enemyHpBefore = enemyHp ?? maxHp;
  const die = damageDie ?? Math.ceil(Math.random() * 6);
  const weaponDamage = fallout4WeaponDamage(weapon, perkState, roll.criticalSuccesses);
  const momentumGenerated = roll.passed ? Math.max(0, roll.successes - difficulty) : 0;
  const damageDealt = roll.passed && hasAmmo ? Math.max(1, die + weaponDamage + momentumGenerated) : 0;
  const enemyHpAfter = Math.max(0, enemyHpBefore - damageDealt);
  const defense = fallout4Defense(armor, perkState, cover);
  const incomingDamage = roll.passed ? 0 : Math.max(0, Math.ceil(maxHp / 4) + roll.criticalFailures - defense);
  return {
    roll,
    difficulty,
    ammoType,
    ammoBefore,
    ammoAfter: ammoType === "melee" ? ammoBefore : Math.max(0, ammoBefore - (hasAmmo ? 1 : 0)),
    weaponDamage,
    damageDie: die,
    damageDealt,
    defense,
    incomingDamage,
    enemyHpBefore,
    enemyHpAfter,
    defeated: enemyHpAfter <= 0,
    momentumGenerated,
    noiseDelta: roll.passed ? 0 : 1,
  };
}

export function applyFallout4SurvivalTurn(survival: Fallout4SurvivalState, weather?: { damage?: string; movementModifier?: number }) {
  const damage = (weather?.damage ?? "").toLowerCase();
  return {
    hunger: Math.min(10, survival.hunger + 1),
    thirst: Math.min(10, survival.thirst + (damage.includes("calor") || damage.includes("radiacion") ? 2 : 1)),
    sleep: Math.min(10, survival.sleep + 1),
    disease: Math.min(10, survival.disease + (damage.includes("enfermedad") ? 1 : 0)),
    radiation: Math.min(10, survival.radiation + (damage.includes("radiacion") ? 1 : 0)),
    fatigue: Math.min(10, survival.fatigue + (weather?.movementModifier ? 1 : 0)),
  };
}

export function awardFallout4Caps(currentCaps: number, amount: number, ruleState: Fallout4RuleState) {
  const earned = Math.max(0, amount);
  return {
    caps: currentCaps + earned,
    ruleState: mergeFallout4RuleState(ruleState, { capsEarned: (ruleState.capsEarned ?? 0) + earned }),
  };
}

export function resolveFallout4WeatherTick({
  survival,
  weather,
  dayPhase = "day",
}: {
  survival: Fallout4SurvivalState;
  weather?: { id?: string; name?: string; damage?: string; movementModifier?: number; survival?: string[] };
  dayPhase?: "day" | "night";
}) {
  const text = `${weather?.id ?? ""} ${weather?.name ?? ""} ${weather?.damage ?? ""} ${(weather?.survival ?? []).join(" ")}`.toLowerCase();
  const stormPenalty = /rad|radiacion|tormenta/.test(text) ? 1 : 0;
  const acidPenalty = /acida|acid|lluvia/.test(text) ? 1 : 0;
  const nightPenalty = dayPhase === "night" || /noche|night/.test(text) ? 1 : 0;
  return {
    hunger: Math.min(10, survival.hunger + 1),
    thirst: Math.min(10, survival.thirst + 1 + acidPenalty),
    sleep: Math.min(10, survival.sleep + nightPenalty),
    disease: Math.min(10, survival.disease + acidPenalty),
    radiation: Math.min(10, survival.radiation + stormPenalty),
    fatigue: Math.min(10, survival.fatigue + (weather?.movementModifier ?? 0) + nightPenalty),
  };
}

export function resolveFallout4Trade({
  caps,
  basePrice,
  charisma = 5,
  perkState,
  mode = "buy",
  ruleState,
}: {
  caps: number;
  basePrice: number;
  charisma?: number;
  perkState: Fallout4PerkState;
  mode?: "buy" | "sell";
  ruleState: Fallout4RuleState;
}): Fallout4TradeResolution {
  const charismaDiscount = Math.max(0, Math.min(15, (charisma - 5) * 3));
  const perkDiscount = (perkState.difficultyReduction ?? 0) * 5;
  const discountPercent = Math.max(0, Math.min(25, charismaDiscount + perkDiscount));
  const adjusted = mode === "sell"
    ? Math.max(1, Math.round(basePrice * (0.45 + discountPercent / 100)))
    : Math.max(1, Math.round(basePrice * (1 - discountPercent / 100)));
  const capsAfter = mode === "sell" ? caps + adjusted : caps - adjusted;
  const allowed = mode === "sell" || capsAfter >= 0;
  return {
    basePrice,
    finalPrice: adjusted,
    discountPercent,
    capsAfter: allowed ? capsAfter : caps,
    allowed,
    ruleState: mergeFallout4RuleState(ruleState, {
      capsEarned: (ruleState.capsEarned ?? 0) + (mode === "sell" && allowed ? adjusted : 0),
      capsSpent: (ruleState.capsSpent ?? 0) + (mode === "buy" && allowed ? adjusted : 0),
    }),
  };
}

export function resolveFallout4SettlementBuild({
  settlement,
  caps,
  ruleState,
  focus = "defense",
}: {
  settlement?: { id?: string; name?: string; defense?: number; resources?: number };
  caps: number;
  ruleState: Fallout4RuleState;
  focus?: "food" | "water" | "beds" | "defense" | "route";
}) {
  const costByFocus = { food: 15, water: 20, beds: 12, defense: 25, route: 35 };
  const cost = costByFocus[focus];
  const allowed = caps >= cost;
  return {
    settlementId: settlement?.id,
    focus,
    cost,
    allowed,
    capsAfter: allowed ? caps - cost : caps,
    improvement: allowed ? 1 : 0,
    ruleState: mergeFallout4RuleState(ruleState, {
      actionPointsSpent: ruleState.actionPointsSpent + 2,
      capsSpent: (ruleState.capsSpent ?? 0) + (allowed ? cost : 0),
      complications: allowed ? ruleState.complications : [`${settlement?.name ?? "Asentamiento"}: faltan chapas para ${focus}`, ...ruleState.complications].slice(0, 8),
    }),
  };
}

export function resolveFallout4FactionReputation({
  current = 0,
  delta,
}: {
  current?: number;
  delta: number;
}) {
  const reputation = Math.max(-100, Math.min(100, current + delta));
  const status = reputation <= -40 ? "hostile" : reputation >= 40 ? "allied" : "neutral";
  return { reputation, status };
}

export function resolveFallout4MissionStep({
  currentStep = 0,
  totalSteps = 1,
  passed,
  rewardCaps = 0,
  caps,
  ruleState,
}: {
  currentStep?: number;
  totalSteps?: number;
  passed: boolean;
  rewardCaps?: number;
  caps: number;
  ruleState: Fallout4RuleState;
}) {
  const nextStep = passed ? Math.min(totalSteps, currentStep + 1) : currentStep;
  const completed = nextStep >= totalSteps;
  const capsAward = completed ? rewardCaps : 0;
  const awarded = awardFallout4Caps(caps, capsAward, ruleState);
  return {
    currentStep: nextStep,
    completed,
    caps: awarded.caps,
    ruleState: mergeFallout4RuleState(awarded.ruleState, {
      failures: ruleState.failures + (passed ? 0 : 1),
    }),
  };
}

export function resolveFallout4LockOrTerminal({
  difficulty,
  perkState,
  survival,
  dice,
}: {
  difficulty: number;
  perkState: Fallout4PerkState;
  survival: Fallout4SurvivalState;
  dice?: [number, number];
}) {
  const finalDifficulty = applyFallout4Difficulty(difficulty, "technical", perkState, survival);
  const roll = rollFallout4Test(finalDifficulty, dice);
  return {
    roll,
    difficulty: finalDifficulty,
    unlocked: roll.passed,
    complication: roll.criticalFailures > 0 ? "terminal bloqueado, alarma o cerradura danada" : undefined,
  };
}

export function resolveFallout4NodeAction({
  kind,
  ap,
  difficulty,
  terrain,
  coverage,
  weather,
  carryingLoad,
  survival,
  perkState,
  ruleState,
  caps = 0,
  rewardCaps = 0,
  dice,
}: {
  kind: Fallout4NodeActionKind;
  ap: number;
  difficulty: number;
  terrain?: string;
  coverage?: string | number;
  weather?: { movementModifier?: number; damage?: string; name?: string; survival?: string[] };
  carryingLoad?: number;
  survival: Fallout4SurvivalState;
  perkState: Fallout4PerkState;
  ruleState: Fallout4RuleState;
  caps?: number;
  rewardCaps?: number;
  dice?: [number, number];
}): Fallout4NodeActionResolution {
  const actionCost = kind === "move"
    ? fallout4MovementCost({ base: ap, terrain, weather, carryingLoad })
    : Math.max(0, ap + (kind === "combat" ? 0 : Math.max(0, fallout4CoverageModifier(coverage) - 1)));
  const finalDifficulty = applyFallout4Difficulty(Math.max(0, difficulty + (kind === "combat" ? 0 : Math.max(0, fallout4CoverageModifier(coverage) - 2))), kind, perkState, survival);
  const roll = rollFallout4Test(finalDifficulty, dice);
  const nextSurvival = kind === "move" || kind === "survival" ? resolveFallout4WeatherTick({ survival, weather }) : survival;
  const capsDelta = roll.passed ? Math.max(0, rewardCaps) : 0;
  return {
    roll,
    actionCost,
    difficulty: finalDifficulty,
    passed: roll.passed,
    apAfter: Math.max(0, AP_MAX_SAFE - actionCost),
    capsDelta,
    noiseDelta: roll.passed ? 0 : kind === "combat" ? 2 : 1,
    survival: nextSurvival,
    complication: roll.passed ? undefined : `${kind}: fallo operativo en nodo`,
    ruleState: mergeFallout4RuleState(ruleState, {
      actionPointsSpent: ruleState.actionPointsSpent + actionCost,
      testsRolled: ruleState.testsRolled + 1,
      combatRounds: ruleState.combatRounds + (kind === "combat" ? 1 : 0),
      socialChecks: ruleState.socialChecks + (kind === "social" ? 1 : 0),
      technicalChecks: ruleState.technicalChecks + (kind === "technical" || kind === "loot" ? 1 : 0),
      travelActions: ruleState.travelActions + (kind === "move" ? 1 : 0),
      failures: ruleState.failures + (roll.passed ? 0 : 1),
      criticalSuccesses: (ruleState.criticalSuccesses ?? 0) + roll.criticalSuccesses,
      criticalFailures: (ruleState.criticalFailures ?? 0) + roll.criticalFailures,
      capsEarned: (ruleState.capsEarned ?? 0) + capsDelta,
      complications: roll.passed ? ruleState.complications : [`${kind}: fallo operativo en nodo`, ...ruleState.complications].slice(0, 8),
    }),
  };
}

const AP_MAX_SAFE = 11;
