import type { AudioManifest, CharacterSheetConfig, ContentItem, GameConfig } from "../types/game";

function item(name: string, enabled = false, description?: string): ContentItem {
  return {
    id: name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, ""),
    name,
    description,
    enabled,
  };
}

function game(config: Omit<GameConfig, "configPath">): GameConfig {
  return {
    ...config,
    configPath: `public/games/${config.id}/game.config.json`,
  };
}

export const seedGames: GameConfig[] = [
  game({
    id: "fallout3",
    name: "Fallout 3",
    short: "FO3",
    description: "Capital Wasteland, Vault 101, Megaton, karma y exploracion clasica.",
    tags: ["fallout", "yermo", "capital wasteland", "vault", "karma"],
    campaigns: [
      {
        id: "vault101_megaton",
        title: "Vault 101 -> Megaton",
        implemented: true,
        description: "Comienzas tu viaje saliendo del Refugio 101 con destino a Megaton.",
      },
    ],
    content: {
      dlc: [
        item("Operation Anchorage", false, "Simulacion militar prebelica."),
        item("The Pitt", false, "Viaje a Pittsburgh industrial."),
        item("Broken Steel", false, "Continuacion tras el final principal."),
        item("Point Lookout", false, "Pantano contaminado y horror rural."),
        item("Mothership Zeta", false, "Abduccion alienigena."),
      ],
      features: [
        item("Karma", true, "Sistema de reputacion moral."),
        item("Condicion de equipo", true, "Armas y armaduras se degradan."),
        item("Reparacion clasica", true, "Mecanica de reparacion FO3/NV."),
        item("VATS clasico", true, "Apuntar a partes del cuerpo."),
        item("Radioseñales", true, "Señales y emisoras explorables."),
        item("Mapa del Yermo Capital", true, "Zonas del mundo abierto."),
      ],
      extras: [
        item("Encuentros de supermutantes", false, "Eventos hostiles dinamicos."),
        item("Enclave avanzado", false, "Patrullas y respuesta militar."),
        item("Exploracion de metro", false, "Subzonas subterraneas."),
        item("Saqueadores del yermo", false, "Campamentos y emboscadas."),
        item("Eventos de karma", false, "Consecuencias morales emergentes."),
      ],
    },
  }),
  game({
    id: "fallout4",
    name: "Fallout 4",
    short: "FO4",
    description: "Commonwealth, asentamientos, servoarmadura modular y crafting avanzado.",
    tags: ["fallout", "commonwealth", "settlements", "crafting", "power armor"],
    campaigns: [
      {
        id: "sanctuary_commonwealth",
        title: "Sanctuary -> Commonwealth",
        implemented: true,
        description: "Campaña base para salir del Vault 111 y reconstruir Sanctuary.",
      },
    ],
    content: {
      dlc: [
        item("Automatron", false),
        item("Wasteland Workshop", false),
        item("Far Harbor", false),
        item("Contraptions Workshop", false),
        item("Vault-Tec Workshop", false),
        item("Nuka-World", false),
        item("High Resolution Texture Pack", false),
      ],
      features: [
        item("Asentamientos", true),
        item("Servoarmadura", true),
        item("Crafting avanzado", true),
        item("Compañeros", true),
        item("VATS tactico", true),
        item("Radiacion avanzada", true),
        item("Mods de armas y armaduras", true),
      ],
      extras: [
        item("Modo supervivencia", false),
        item("Enemigos legendarios", false),
        item("Misiones radiantes", false),
        item("Ataques a asentamientos", false),
        item("Clima radiactivo", false),
      ],
    },
  }),
  game({
    id: "newvegas",
    name: "Fallout New Vegas",
    short: "FNV",
    description: "Mojave, facciones, reputacion, casinos y rutas narrativas ramificadas.",
    tags: ["fallout", "mojave", "ncr", "legion", "mr house", "yes man"],
    templateFuture: true,
    campaigns: [
      {
        id: "goodsprings_mojave",
        title: "Goodsprings -> Mojave",
        implemented: false,
        description: "Plantilla futura para campañas de facciones del Mojave.",
      },
    ],
    content: {
      dlc: [
        item("Dead Money", false),
        item("Honest Hearts", false),
        item("Old World Blues", false),
        item("Lonesome Road", false),
        item("Gun Runners Arsenal", false),
        item("Courier's Stash", false),
      ],
      features: [
        item("Facciones", true),
        item("Reputacion", true),
        item("Hardcore mode", true),
        item("Municion especial", true),
        item("Disfraces de faccion", true),
        item("Casinos", true),
        item("Compañeros", true),
      ],
      extras: [
        item("Ruta NCR", false),
        item("Ruta Legion", false),
        item("Ruta Mr. House", false),
        item("Ruta Yes Man", false),
        item("Encuentros del Mojave", false),
      ],
    },
  }),
  game({
    id: "fallout76",
    name: "Fallout 76",
    short: "FO76",
    description: "Appalachia online adaptada a eventos publicos, C.A.M.P. y expediciones.",
    tags: ["fallout", "appalachia", "camp", "daily ops", "expeditions"],
    templateFuture: true,
    campaigns: [
      {
        id: "appalachia_events",
        title: "Appalachia modular",
        implemented: false,
        description: "Plantilla futura para eventos y temporadas de Appalachia.",
      },
    ],
    content: {
      dlc: [
        item("Wild Appalachia", false),
        item("Nuclear Winter", false),
        item("Wastelanders", false),
        item("The Legendary Run", false),
        item("One Wasteland For All", false),
        item("Steel Dawn", false),
        item("Locked & Loaded", false),
        item("Steel Reign", false),
        item("Fallout Worlds", false),
        item("Night of the Moth", false),
        item("Invaders from Beyond", false),
        item("Test Your Metal", false),
        item("The Pitt", false),
        item("Nuka-World on Tour", false),
        item("Mutation Invasion", false),
        item("Once in a Blue Moon", false),
        item("Atlantic City: Boardwalk Paradise", false),
        item("Atlantic City: America's Playground", false),
        item("Skyline Valley", false),
      ],
      features: [
        item("Eventos publicos", true),
        item("C.A.M.P.", true),
        item("Mutaciones", true),
        item("Equipos publicos", true),
        item("Daily Ops", true),
        item("Expediciones", true),
        item("Legendarios", true),
        item("Cartas perk", true),
      ],
      extras: [],
    },
  }),
  game({
    id: "fallout1_2",
    name: "Fallout 1 & 2",
    short: "FO1/2",
    description: "Yermo clasico por turnos con AP, dialogos ramificados y reputacion local.",
    tags: ["fallout", "classic", "turn based", "ap", "isometric"],
    templateFuture: true,
    campaigns: [
      {
        id: "classic_wasteland",
        title: "Yermo clasico",
        implemented: false,
        description: "Plantilla futura para campañas de Fallout clasico y Fallout 2.",
      },
    ],
    content: {
      dlc: [
        item("Fallout clasico", false),
        item("Fallout 2 clasico", false),
        item("Contenido restaurado", false),
        item("Encuentros clasicos", false),
        item("Campañas del yermo clasico", false),
      ],
      features: [
        item("Mapa mundial", true),
        item("AP clasico", true),
        item("Disparos localizados", true),
        item("Habilidades clasicas", true),
        item("Dialogos ramificados", true),
        item("Karma clasico", true),
        item("Reputacion por ciudad", true),
      ],
      extras: [],
    },
  }),
  game({
    id: "metro",
    name: "Metro",
    short: "METRO",
    description: "Tuneles, estaciones, superficie toxica, municion-moneda y horror de supervivencia.",
    tags: ["metro", "ranger", "surface", "stealth", "survival horror"],
    templateFuture: true,
    campaigns: [
      {
        id: "moscow_metro",
        title: "Metro de Moscu",
        implemented: false,
        description: "Plantilla futura para rutas de estaciones y superficie.",
      },
    ],
    content: {
      dlc: [
        item("Ranger Mode", false),
        item("Faction Pack", false),
        item("Tower Pack", false),
        item("Developer Pack", false),
        item("Chronicles Pack", false),
        item("The Two Colonels", false),
        item("Sam's Story", false),
      ],
      features: [
        item("Mascara y filtros", true),
        item("Municion como moneda", true),
        item("Oscuridad y miedo", true),
        item("Estaciones", true),
        item("Anomalias", true),
        item("Superficie", true),
        item("Sigilo", true),
        item("Recursos escasos", true),
      ],
      extras: [],
    },
  }),
  game({
    id: "daysgone",
    name: "Days Gone",
    short: "DG",
    description: "Oregon postapocaliptico con moto, gasolina, hordas e infestaciones.",
    tags: ["days gone", "bike", "hordes", "survival", "camps"],
    templateFuture: true,
    campaigns: [
      {
        id: "farewell_wilderness",
        title: "Farewell Wilderness",
        implemented: false,
        description: "Plantilla futura para campamentos, rutas y hordas.",
      },
    ],
    content: {
      dlc: [
        item("Challenge Mode", false),
        item("Survival Mode", false),
        item("Bike Skins Pack", false),
        item("Horde Challenges", false),
      ],
      features: [
        item("Moto", true),
        item("Gasolina", true),
        item("Reparacion", true),
        item("Hordas", true),
        item("Infestaciones", true),
        item("Confianza de campamentos", true),
        item("Ruido y persecucion", true),
      ],
      extras: [],
    },
  }),
  game({
    id: "thelastofus",
    name: "The Last of Us",
    short: "TLOU",
    description: "Drama de supervivencia con sigilo, infectados, escucha y recursos escasos.",
    tags: ["the last of us", "infected", "stealth", "crafting", "listen mode"],
    templateFuture: true,
    campaigns: [
      {
        id: "quarantine_route",
        title: "Ruta de cuarentena",
        implemented: false,
        description: "Plantilla futura para encuentros dramaticos y supervivencia.",
      },
    ],
    content: {
      dlc: [
        item("Left Behind", false),
        item("Factions Mode Rules", false),
        item("No Return Inspired Encounters", false),
      ],
      features: [
        item("Escucha", true),
        item("Infectados", true),
        item("Corredores", true),
        item("Acechadores", true),
        item("Chasqueadores", true),
        item("Gordinflones", true),
        item("Crafting rapido", true),
        item("Sigilo dramatico", true),
        item("Recursos escasos", true),
      ],
      extras: [],
    },
  }),
  game({
    id: "stalker",
    name: "S.T.A.L.K.E.R.",
    short: "STALKER",
    description: "La Zona con anomalías, artefactos, emisiones, facciones y supervivencia dura.",
    tags: ["stalker", "zone", "anomalies", "artifacts", "factions", "gamma"],
    templateFuture: true,
    campaigns: [
      {
        id: "the_zone",
        title: "La Zona",
        implemented: false,
        description: "Plantilla futura para guerra de facciones y economia de supervivencia.",
      },
    ],
    content: {
      dlc: [
        item("Clear Sky Rules", false),
        item("Call of Pripyat Rules", false),
        item("Anomaly Module", false),
        item("Gamma Style Survival", false),
        item("Faction War Pack", false),
      ],
      features: [
        item("Anomalias", true),
        item("Artefactos", true),
        item("Detectores", true),
        item("Emisiones", true),
        item("Facciones", true),
        item("Condicion de armas", true),
        item("Radiacion", true),
        item("Mutantes", true),
        item("Economia de supervivencia", true),
      ],
      extras: [],
    },
  }),
  game({
    id: "skyrim",
    name: "The Elder Scrolls V: Skyrim",
    short: "TESV",
    description: "Fantasia nordica con razas, magia, gritos, dragones, gremios y artesania.",
    tags: ["skyrim", "tes", "dragons", "magic", "guilds", "survival"],
    templateFuture: true,
    campaigns: [
      {
        id: "helgen_whiterun",
        title: "Helgen -> Carrera Blanca",
        implemented: false,
        description: "Plantilla futura para campañas de Dragonborn y gremios.",
      },
    ],
    content: {
      dlc: [
        item("Dawnguard", false),
        item("Hearthfire", false),
        item("Dragonborn", false),
        item("Survival Mode", false),
        item("Fishing", false),
        item("Saints & Seducers", false),
        item("Rare Curios", false),
        item("Alternative Armors", false),
        item("Camping", false),
      ],
      features: [
        item("Razas", true),
        item("Magia", true),
        item("Gritos", true),
        item("Dragones", true),
        item("Gremios", true),
        item("Mazmorras", true),
        item("Forja", true),
        item("Alquimia", true),
        item("Encantamiento", true),
        item("Crimenes", true),
        item("Casas", true),
        item("Seguidores", true),
      ],
      extras: [],
    },
  }),
];

export const seedGame: GameConfig = seedGames[0];

export const seedCharacters: CharacterSheetConfig = {
  creationMode: "custom_or_seed",
  attributes: [
    { id: "STR", name: "Fuerza", default: 5, min: 1, max: 10 },
    { id: "PER", name: "Percepcion", default: 7, min: 1, max: 10 },
    { id: "END", name: "Resistencia", default: 5, min: 1, max: 10 },
    { id: "CHA", name: "Carisma", default: 4, min: 1, max: 10 },
    { id: "INT", name: "Inteligencia", default: 6, min: 1, max: 10 },
    { id: "AGI", name: "Agilidad", default: 6, min: 1, max: 10 },
    { id: "LCK", name: "Suerte", default: 5, min: 1, max: 10 },
  ],
  seeds: [
    { id: "survivor", name: "Superviviente equilibrado", attributes: { STR: 5, PER: 7, END: 5, CHA: 4, INT: 6, AGI: 6, LCK: 5 } },
    { id: "scout", name: "Explorador sigiloso", attributes: { STR: 4, PER: 8, END: 5, CHA: 4, INT: 5, AGI: 8, LCK: 4 } },
  ],
};

export const seedAudioManifest: AudioManifest = {
  tracks: {
    background: [{ id: "generated_wasteland", name: "Yermo melancolico", mode: "generated" }],
    combat: [{ id: "generated_tension", name: "Tension tactica", mode: "generated" }],
    exploration: [{ id: "generated_day", name: "Exploracion de dia", mode: "generated" }],
    vault: [{ id: "generated_vault", name: "Zumbido de Vault", mode: "generated" }],
    day: [{ id: "generated_daywind", name: "Viento de dia", mode: "generated" }],
    night: [{ id: "generated_night", name: "Ambiente nocturno", mode: "generated" }],
  },
};
