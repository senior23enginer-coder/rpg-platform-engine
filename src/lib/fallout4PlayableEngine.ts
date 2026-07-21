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
