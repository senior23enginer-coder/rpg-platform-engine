import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleDot,
  Footprints,
  HeartPulse,
  Package,
  Search,
  Shield,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { gameHeroVars, resolveGameAsset } from "../lib/gameLibrary";
import type { GameConfig } from "../types/game";
import type { PlayerSave } from "../types/profile";

type Props = {
  game: GameConfig;
  save?: PlayerSave;
  onBack: () => void;
  onDice: () => void;
  onProgress?: (patch: Partial<PlayerSave>) => void;
};

type SceneId = "vault111" | "vaultExit" | "sanctuary" | "redRocket" | "concord";
type NodeKind = "start" | "move" | "search" | "social" | "combat" | "loot" | "exit";

type RouteNode = {
  id: string;
  title: string;
  kind: NodeKind;
  ap: number;
  difficulty: number;
  threat: string;
  rule: string;
  text: string;
  success: string;
  failure: string;
  reward?: string;
  enemyHp?: number;
  connects: string[];
};

type Scene = {
  id: SceneId;
  title: string;
  tomeId: string;
  missionStep: string;
  biome: string;
  objective: string;
  summary: string;
  source: string;
  nodes: RouteNode[];
  nextScene?: SceneId;
  previousScene?: SceneId;
};

const AP_MAX = 11;

type TomeLocation = {
  id: string;
  name: string;
  category?: string;
  biome?: string;
  risk?: string;
  enemies?: string[];
  subzones?: Array<{ name: string; role?: string }>;
  settlement?: boolean;
  summary?: string;
  sourceTome?: string;
  playableStatus?: string;
  useInPlay?: string;
};

type TomeMission = {
  id: string;
  name: string;
  type?: string;
  sourceTome?: string;
  playableStatus?: string;
  activation?: string;
  execution?: string;
  completion?: string;
  useInPlay?: string;
};

type TomeBestiary = {
  id: string;
  name: string;
  hp?: number;
  threat?: number;
  sourceTome?: string;
  playableStatus?: string;
};

type TomeCatalogItem = {
  id: string;
  name: string;
  sourceTome?: string;
  playableStatus?: string;
  useInPlay?: string;
};

type TemplateCatalog = {
  routeTemplates?: Array<{
    id: string;
    name: string;
    nodes?: string[];
    missionIds?: string[];
    playableStatus?: string;
  }>;
  catalogs?: {
    locations?: TomeLocation[];
    missions?: TomeMission[];
    bestiary?: TomeBestiary[];
    weapons?: TomeCatalogItem[];
    equipment?: TomeCatalogItem[];
    settlements?: TomeCatalogItem[];
    factions?: TomeCatalogItem[];
    collectibles?: Array<{ id: string; name: string; locationId?: string; subzone?: string; collectibleType?: string }>;
  };
};

type MissionObjectiveStep = {
  id: string;
  locationId: string;
  title: string;
  objective: string;
  nodeHints: string[];
  requiredItem?: string;
  grantsItem?: string;
  reward?: string;
  unlocksMissionId?: string;
};

type SurvivalState = { hunger: number; thirst: number; sleep: number; disease: number; radiation: number; fatigue: number };

const outOfTimeSteps: MissionObjectiveStep[] = [
  {
    id: "wake-cryo",
    locationId: "U-0001",
    title: "Despertar en Vault 111",
    objective: "Entra al mapa interno de Vault 111 y resuelve Camara criogenica.",
    nodeHints: ["camara criogenica", "criogen"],
  },
  {
    id: "check-pods",
    locationId: "U-0001",
    title: "Revisar criopods",
    objective: "Resuelve Pasillo de criopods para confirmar el rastro inicial de Shaun.",
    nodeHints: ["criopods", "capsula"],
  },
  {
    id: "secure-office",
    locationId: "U-0001",
    title: "Asegurar oficina",
    objective: "Llega a Oficina de seguridad y supera el nodo interno.",
    nodeHints: ["oficina de seguridad", "seguridad"],
  },
  {
    id: "take-pipboy",
    locationId: "U-0001",
    title: "Conseguir Pip-Boy",
    objective: "Resuelve Sala del Pip-Boy para obtener el Pip-Boy antes de abrir la salida.",
    nodeHints: ["pip-boy", "pip boy"],
    grantsItem: "Pip-Boy 3000 Mark IV",
  },
  {
    id: "open-vault-door",
    locationId: "U-0001",
    title: "Abrir puerta del Vault",
    objective: "Resuelve Puerta del Vault / salida. Requiere Pip-Boy.",
    nodeHints: ["puerta del vault", "salida"],
    requiredItem: "Pip-Boy 3000 Mark IV",
  },
  {
    id: "reach-sanctuary",
    locationId: "U-0002",
    title: "Llegar a Sanctuary Hills",
    objective: "Viaja a Sanctuary Hills y resuelve Casa del protagonista o Calle circular central.",
    nodeHints: ["casa del protagonista", "calle circular"],
  },
  {
    id: "talk-codsworth",
    locationId: "U-0002",
    title: "Hablar con Codsworth",
    objective: "Explora Sanctuary y completa un nodo interno de casa/calle/taller para avanzar la busqueda.",
    nodeHints: ["casa", "calle", "taller", "workshop"],
    grantsItem: "Pista de Concord",
  },
  {
    id: "red-rocket-route",
    locationId: "U-0003",
    title: "Asegurar Red Rocket",
    objective: "Viaja a Red Rocket y resuelve Garaje principal, Oficina o Taller.",
    nodeHints: ["garaje", "oficina", "taller", "red rocket"],
    reward: "Ruta a Concord confirmada",
  },
  {
    id: "arrive-concord",
    locationId: "U-0011",
    title: "Llegar a Concord",
    objective: "Viaja a Concord y resuelve Entrada norte, Calle principal o Museo exterior.",
    nodeHints: ["entrada norte", "calle principal", "museo"],
    reward: "Out of Time completada",
    unlocksMissionId: "M-0171",
  },
];

const scenes: Scene[] = [
  {
    id: "vault111",
    title: "Vault 111",
    tomeId: "V-01 / Tomo 06",
    missionStep: "M-0170 paso 1",
    biome: "Subterraneo",
    objective: "Despertar, explorar el refugio, conseguir el Pip-Boy y abrir salida.",
    summary: "La partida empieza en criogenia. El mapa se juega como pasillos conectados: moverse consume AP, registrar consume AP y las amenazas se resuelven con 2d20.",
    source: "Tomo 1: AP, turnos, 2d20 y combate. Tomo 2: Out of Time. Tomo 6: Vault 111, subzonas, radroaches, loot y salida.",
    nextScene: "vaultExit",
    nodes: [
      {
        id: "cryo",
        title: "Camara criogenica",
        kind: "start",
        ap: 0,
        difficulty: 1,
        threat: "Evento inicial",
        rule: "Inicio de escena; sin gasto de AP.",
        text: "El personaje despierta en una camara fria. Los criopods alrededor explican el inicio de Out of Time.",
        success: "Orientacion recuperada. Puedes revisar pasillos o terminales cercanos.",
        failure: "Desorientacion: el siguiente registro suma ruido.",
        connects: ["cryo-hall", "pod-row"],
      },
      {
        id: "pod-row",
        title: "Pasillo de criopods",
        kind: "search",
        ap: 1,
        difficulty: 1,
        threat: "Sin enemigo fijo",
        rule: "Registrar una subzona consume 1 AP.",
        text: "Capsulas abiertas, hielo y rastros del secuestro. Este nodo confirma el objetivo narrativo.",
        success: "Encuentras la pista emocional de Shaun y aseguras la subzona.",
        failure: "Pierdes tiempo; avanza el turno si quedas sin AP.",
        connects: ["cryo", "security"],
      },
      {
        id: "cryo-hall",
        title: "Pasillo central",
        kind: "move",
        ap: 1,
        difficulty: 1,
        threat: "Puertas y escombros",
        rule: "Moverse a un nodo conectado cuesta 1 AP.",
        text: "Pasillo metalico que conecta criogenia, seguridad y salida tecnica.",
        success: "Avanzas con ruta clara.",
        failure: "Una puerta trabada consume tiempo.",
        connects: ["cryo", "security", "admin", "maintenance"],
      },
      {
        id: "security",
        title: "Oficina de seguridad",
        kind: "combat",
        ap: 1,
        difficulty: 2,
        threat: "Radroaches 1-2",
        rule: "Combate normal: 2d20, dificultad 1-2. Cobertura o apuntar puede modificar dificultad.",
        text: "La oficina contiene terminal, cobertura y el primer combate tutorial.",
        success: "Impactas o contienes la amenaza. Al caer a 0, la oficina queda asegurada.",
        failure: "El radroach mantiene posicion; ruido y presion aumentan.",
        reward: "Security baton / contenedor menor.",
        enemyHp: 2,
        connects: ["pod-row", "cryo-hall", "admin"],
      },
      {
        id: "admin",
        title: "Administracion",
        kind: "search",
        ap: 1,
        difficulty: 1,
        threat: "Terminal y contenedor",
        rule: "Interactuar con terminal o contenedor cuesta 1 AP.",
        text: "Oficina con datos del Vault y alijo posible. Sirve para entender la instalacion.",
        success: "Registro completado; obtienes informacion y posible recurso.",
        failure: "Terminal lento: gastas AP sin cerrar la busqueda.",
        reward: "Municion o suministro menor.",
        connects: ["cryo-hall", "security", "pipboy-room"],
      },
      {
        id: "maintenance",
        title: "Mantenimiento",
        kind: "loot",
        ap: 1,
        difficulty: 1,
        threat: "Maquinaria y ruido",
        rule: "Loot o chatarra: 1 AP, con complicacion si hay presion.",
        text: "Herramientas, piezas y maquinaria. Es una rama opcional antes de salir.",
        success: "Recurso asegurado sin activar refuerzos.",
        failure: "Ruido: puede activar amenaza si sigues registrando.",
        reward: "Chatarra comun / herramienta.",
        connects: ["cryo-hall", "reactor"],
      },
      {
        id: "reactor",
        title: "Reactor",
        kind: "combat",
        ap: 2,
        difficulty: 2,
        threat: "Peligro ambiental",
        rule: "Accion peligrosa o tactica: dificultad 2; puede costar 2 AP.",
        text: "Zona de riesgo. No bloquea la salida, pero permite loot y tension de exploracion.",
        success: "Controlas el riesgo y aseguras el area.",
        failure: "Chispa ambiental: pierdes posicion o recurso.",
        reward: "Recurso tecnico.",
        enemyHp: 1,
        connects: ["maintenance", "south-hall"],
      },
      {
        id: "south-hall",
        title: "Pasillo sur",
        kind: "move",
        ap: 1,
        difficulty: 1,
        threat: "Ruta larga",
        rule: "Caminar 1 zona: 1 AP.",
        text: "Tramo inferior que reconecta ramas y conduce hacia dormitorios, almacen y salida tecnica.",
        success: "Ruta abierta.",
        failure: "Demora por escombros.",
        connects: ["reactor", "pipboy-room", "storage"],
      },
      {
        id: "pipboy-room",
        title: "Sala del Pip-Boy",
        kind: "search",
        ap: 1,
        difficulty: 1,
        threat: "Objetivo requerido",
        rule: "Objeto requerido de mision: registrar y marcar como obtenido.",
        text: "El Pip-Boy permite activar la salida. Sin este nodo, abandonar el Vault no deberia cerrar la escena.",
        success: "Pip-Boy obtenido. Se desbloquea la salida tecnica.",
        failure: "No logras activar el sistema; reintenta o busca administracion.",
        reward: "Pip-Boy 3000 Mark IV.",
        connects: ["admin", "south-hall", "dorms", "exit-door"],
      },
      {
        id: "dorms",
        title: "Dormitorios",
        kind: "combat",
        ap: 1,
        difficulty: 2,
        threat: "Radroach posible",
        rule: "Registrar con amenaza activa puede iniciar combate.",
        text: "Literas y suministros abandonados. Hay cobertura, pero tambien movimiento hostil.",
        success: "Amenaza neutralizada y camas/alijos revisados.",
        failure: "El enemigo sigue activo; tomar cobertura ayuda al siguiente intento.",
        reward: "Agua purificada / suministro menor.",
        enemyHp: 1,
        connects: ["pipboy-room", "storage"],
      },
      {
        id: "storage",
        title: "Almacen",
        kind: "loot",
        ap: 1,
        difficulty: 1,
        threat: "Sin enemigo fijo",
        rule: "Loot basico: 1 AP.",
        text: "Contenedores, suministros menores y preparacion antes de salir.",
        success: "Botin menor recuperado.",
        failure: "Contenedor atorado; consume AP sin recompensa.",
        reward: "Agua / municion / recurso.",
        connects: ["south-hall", "dorms", "exit-door"],
      },
      {
        id: "exit-door",
        title: "Puerta del Vault",
        kind: "exit",
        ap: 2,
        difficulty: 1,
        threat: "Cierre de escena",
        rule: "Abandonar subzona: 1-2 AP; requiere objetivo clave si aplica.",
        text: "La salida tecnica cierra Vault 111 y prepara la transicion al exterior.",
        success: "Vault 111 queda cerrado como escena y puedes viajar al exterior.",
        failure: "La puerta no responde; revisa el Pip-Boy o administracion.",
        connects: ["pipboy-room", "storage"],
      },
    ],
  },
  {
    id: "vaultExit",
    title: "Exterior de Vault 111",
    tomeId: "V-01 / Tomo 06",
    missionStep: "M-0170 paso 10",
    biome: "Exterior cercano",
    objective: "Salir a la superficie y tomar la ruta corta hacia Sanctuary Hills.",
    summary: "La Commonwealth destruida se presenta como transicion breve: ascensor, mirador y sendero.",
    source: "Tomo 2: volver a casa. Tomo 6: mirador exterior y sendero a Sanctuary.",
    previousScene: "vault111",
    nextScene: "sanctuary",
    nodes: [
      {
        id: "lift",
        title: "Ascensor exterior",
        kind: "start",
        ap: 0,
        difficulty: 1,
        threat: "Cambio de bioma",
        rule: "Transicion inicial sin AP.",
        text: "La plataforma sube. El mundo abierto aparece destruido.",
        success: "Puedes observar o bajar por el sendero.",
        failure: "El impacto retrasa el avance.",
        connects: ["overlook"],
      },
      {
        id: "overlook",
        title: "Mirador",
        kind: "search",
        ap: 1,
        difficulty: 1,
        threat: "Sin enemigo fijo",
        rule: "Observar o registrar: 1 AP.",
        text: "Punto alto para leer la ruta hacia Sanctuary.",
        success: "Ruta confirmada.",
        failure: "Pierdes tiempo buscando orientacion.",
        connects: ["lift", "trail"],
      },
      {
        id: "trail",
        title: "Sendero a Sanctuary",
        kind: "exit",
        ap: 1,
        difficulty: 1,
        threat: "Ruta abierta",
        rule: "Viaje corto entre nodos.",
        text: "Camino breve hacia el vecindario del protagonista.",
        success: "Llegas a Sanctuary Hills.",
        failure: "La ruta consume un turno adicional.",
        connects: ["overlook"],
      },
    ],
  },
  {
    id: "sanctuary",
    title: "Sanctuary Hills",
    tomeId: "A-022 / Tomo 06",
    missionStep: "M-0170 pasos 20-34",
    biome: "Rural",
    objective: "Hablar con Codsworth, registrar el vecindario y neutralizar insectos.",
    summary: "Sanctuary se juega como recorrido textual por casa, calle circular, patios, garajes y salida a Red Rocket.",
    source: "Tomo 2: Codsworth y registro del vecindario. Tomo 6: casas, calle circular, patios, workshop y rutas.",
    previousScene: "vaultExit",
    nextScene: "redRocket",
    nodes: [
      {
        id: "home",
        title: "Casa del protagonista",
        kind: "start",
        ap: 0,
        difficulty: 1,
        threat: "Contexto narrativo",
        rule: "Nodo de llegada.",
        text: "La casa confirma el paso del tiempo y abre el encuentro con Codsworth.",
        success: "Contexto obtenido.",
        failure: "La busqueda queda incompleta.",
        connects: ["codsworth", "street"],
      },
      {
        id: "codsworth",
        title: "Codsworth",
        kind: "social",
        ap: 1,
        difficulty: 1,
        threat: "Contacto principal",
        rule: "Conversacion importante: 1 AP y avance de mision.",
        text: "Codsworth orienta hacia el registro del vecindario y la pista de Concord.",
        success: "Codsworth acompana el registro.",
        failure: "Puedes avanzar por exploracion directa, pero pierdes contexto.",
        connects: ["home", "street", "yards"],
      },
      {
        id: "street",
        title: "Calle circular",
        kind: "move",
        ap: 1,
        difficulty: 1,
        threat: "Cobertura y autos",
        rule: "Movimiento entre subzonas: 1 AP.",
        text: "Calle central con lineas de vision, autos y cobertura.",
        success: "Ruta central abierta.",
        failure: "Escombros retrasan el movimiento.",
        connects: ["home", "codsworth", "yards", "garage"],
      },
      {
        id: "yards",
        title: "Patios y casas vecinas",
        kind: "combat",
        ap: 1,
        difficulty: 2,
        threat: "Insectos menores / bloatflies 3-6",
        rule: "Mision M-0170 activa enemigos durante el registro.",
        text: "El registro con Codsworth activa el combate tutorial de Sanctuary.",
        success: "Insectos eliminados o ahuyentados.",
        failure: "El combate se prolonga; puede aparecer insecto adicional.",
        reward: "Comida / medicina domestica.",
        enemyHp: 3,
        connects: ["codsworth", "street", "garage"],
      },
      {
        id: "garage",
        title: "Garajes y workshop",
        kind: "loot",
        ap: 1,
        difficulty: 1,
        threat: "Chatarra y contenedores",
        rule: "Loot/crafting basico: 1 AP.",
        text: "Recursos de asentamiento y objetos utiles.",
        success: "Recursos recuperados.",
        failure: "No encuentras material util.",
        reward: "Chatarra / contenedor.",
        connects: ["street", "yards", "redrocket-road"],
      },
      {
        id: "redrocket-road",
        title: "Salida a Red Rocket",
        kind: "exit",
        ap: 2,
        difficulty: 1,
        threat: "Transicion",
        rule: "Abandonar subzona: 1-2 AP.",
        text: "Ruta que permite visitar Red Rocket antes de Concord sin romper Out of Time.",
        success: "Viaje desbloqueado.",
        failure: "Ruta lenta; inicia nuevo turno.",
        connects: ["garage"],
      },
    ],
  },
  {
    id: "redRocket",
    title: "Red Rocket Truck Stop",
    tomeId: "U-0003 / Tomo 06",
    missionStep: "Ruta opcional antes de Concord",
    biome: "Urbano / ruta",
    objective: "Asegurar la parada, registrar garaje y abrir ruta a Concord.",
    summary: "Nodo opcional compatible con M-0170: garaje, oficina, taller, cueva y carretera.",
    source: "Tomo 2: Dogmeat opcional. Tomo 6: Red Rocket, molerats, oficina, taller y rutas.",
    previousScene: "sanctuary",
    nextScene: "concord",
    nodes: [
      {
        id: "road",
        title: "Carretera",
        kind: "start",
        ap: 0,
        difficulty: 1,
        threat: "Llegada",
        rule: "Entrada sin AP.",
        text: "La estacion aparece entre Sanctuary y Concord.",
        success: "Puedes entrar al garaje o cruzar directo.",
        failure: "Sin efecto.",
        connects: ["pumps", "concord-road"],
      },
      {
        id: "pumps",
        title: "Surtidores",
        kind: "move",
        ap: 1,
        difficulty: 1,
        threat: "Cobertura exterior",
        rule: "Movimiento tactico 1 AP.",
        text: "Explanada con cobertura y lineas de vision.",
        success: "Posicion asegurada.",
        failure: "Ruido de chatarra.",
        connects: ["road", "garage"],
      },
      {
        id: "garage",
        title: "Garaje principal",
        kind: "combat",
        ap: 1,
        difficulty: 2,
        threat: "Mole rats 2-6",
        rule: "Combate con amenaza normal de ubicacion.",
        text: "Molerats pueden surgir al registrar el garaje.",
        success: "Garaje asegurado.",
        failure: "La amenaza se mantiene.",
        reward: "Alijo / chatarra.",
        enemyHp: 3,
        connects: ["pumps", "office", "workshop"],
      },
      {
        id: "office",
        title: "Oficina",
        kind: "search",
        ap: 1,
        difficulty: 1,
        threat: "Terminal posible",
        rule: "Terminal/contenedor: 1 AP.",
        text: "Mostrador y terminal menor.",
        success: "Informacion o recurso obtenido.",
        failure: "Terminal bloqueado.",
        reward: "Contenedor menor.",
        connects: ["garage"],
      },
      {
        id: "workshop",
        title: "Taller",
        kind: "loot",
        ap: 1,
        difficulty: 1,
        threat: "Materiales",
        rule: "Recurso/crafting: 1 AP.",
        text: "Estaciones, piezas y materiales.",
        success: "Materiales recuperados.",
        failure: "Nada util.",
        reward: "Chatarra / componentes.",
        connects: ["garage", "concord-road"],
      },
      {
        id: "concord-road",
        title: "Ruta a Concord",
        kind: "exit",
        ap: 2,
        difficulty: 1,
        threat: "Patrulla posible",
        rule: "Viaje entre ubicaciones: 1-2 AP.",
        text: "Camino hacia el cierre de Out of Time.",
        success: "Concord queda desbloqueado.",
        failure: "Demora o encuentro de ruta.",
        connects: ["road", "workshop"],
      },
    ],
  },
  {
    id: "concord",
    title: "Concord",
    tomeId: "U-0011 / Tomo 06",
    missionStep: "M-0170 pasos 55-65",
    biome: "Urbano",
    objective: "Llegar a Concord y registrar la pista sin activar aun When Freedom Calls completo.",
    summary: "Concord cierra Out of Time como llegada y gancho: entrada, calle, casas, plaza y museo exterior.",
    source: "Tomo 2: Concord es transicion; Deathclaw, minigun, Preston y servoarmadura son de When Freedom Calls.",
    previousScene: "redRocket",
    nodes: [
      {
        id: "north-entry",
        title: "Entrada norte",
        kind: "start",
        ap: 0,
        difficulty: 1,
        threat: "Llegada",
        rule: "Entrada de ubicacion.",
        text: "El grupo entra a Concord desde la ruta norte.",
        success: "Puedes revisar calle principal.",
        failure: "Sin efecto.",
        connects: ["main-street"],
      },
      {
        id: "main-street",
        title: "Calle principal",
        kind: "combat",
        ap: 1,
        difficulty: 2,
        threat: "Jared's gang 1-4 posible",
        rule: "Amenaza normal de ubicacion; no mezclar con When Freedom Calls.",
        text: "Calles con barricadas, autos y lineas de tiro.",
        success: "Ruta central controlada.",
        failure: "La amenaza mantiene presion.",
        enemyHp: 2,
        connects: ["north-entry", "ruined-houses", "museum"],
      },
      {
        id: "ruined-houses",
        title: "Casas arruinadas",
        kind: "search",
        ap: 1,
        difficulty: 1,
        threat: "Contenedores y ruido",
        rule: "Registro de casas: 1 AP.",
        text: "Ruinas con alijos, pistas y cobertura.",
        success: "Encuentras pista o recurso.",
        failure: "Ruido atrae atencion.",
        reward: "Contenedor posible.",
        connects: ["main-street", "plaza"],
      },
      {
        id: "plaza",
        title: "Plaza",
        kind: "move",
        ap: 1,
        difficulty: 1,
        threat: "Espacio abierto",
        rule: "Movimiento tactico 1 AP.",
        text: "Cruce abierto antes del Museo.",
        success: "Ruta de aproximacion lista.",
        failure: "Exposicion tactica.",
        connects: ["ruined-houses", "museum"],
      },
      {
        id: "museum",
        title: "Museo exterior",
        kind: "exit",
        ap: 2,
        difficulty: 1,
        threat: "Gancho a When Freedom Calls",
        rule: "Cierre de M-0170; no activar Deathclaw ni servoarmadura aqui.",
        text: "Se registra la llegada y la pista hacia la siguiente mision.",
        success: "Out of Time queda lista para cerrar.",
        failure: "La pista queda incompleta.",
        connects: ["main-street", "plaza"],
      },
    ],
  },
];

function getScene(id: SceneId) {
  return scenes.find((scene) => scene.id === id) ?? scenes[0];
}

function isSceneId(value?: string): value is SceneId {
  return Boolean(value && scenes.some((scene) => scene.id === value));
}

function roll2d20(difficulty: number) {
  const dice: [number, number] = [Math.ceil(Math.random() * 20), Math.ceil(Math.random() * 20)];
  const successes = dice.filter((die) => die <= 12).length;
  return { dice, successes, passed: successes >= difficulty };
}

function nodeIcon(kind: NodeKind) {
  if (kind === "combat") return <Swords size={17} />;
  if (kind === "loot") return <Package size={17} />;
  if (kind === "search" || kind === "social") return <Search size={17} />;
  if (kind === "exit") return <Footprints size={17} />;
  return <CircleDot size={17} />;
}

function riskDifficulty(risk?: string) {
  const value = (risk ?? "").toLowerCase();
  if (value.includes("alto")) return 3;
  if (value.includes("medio")) return 2;
  return 1;
}

function readableThreat(enemy?: TomeBestiary) {
  if (!enemy) return "Amenaza local menor";
  const threat = enemy.threat ? `amenaza ${enemy.threat}` : "amenaza variable";
  const hp = enemy.hp ? `${enemy.hp} PV` : "PV segun mesa";
  return `${enemy.name} / ${threat} / ${hp}`;
}

function deterministicIndex(seed: string, size: number) {
  if (size <= 0) return 0;
  return [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % size;
}

function normalizeName(value?: string) {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function pickCatalogItem<T extends TomeCatalogItem>(items: T[], seed: string) {
  return items[deterministicIndex(seed, items.length)];
}

function patchLocationState(
  states: NonNullable<PlayerSave["campaignState"]>["atlasLocationStates"] | undefined,
  locationId: string,
  patch: Partial<{ visitedNodes: string[]; completedNodes: string[]; loot: string[] }>
) {
  const current = states?.[locationId] ?? { visitedNodes: [], completedNodes: [], loot: [] };
  return {
    ...(states ?? {}),
    [locationId]: {
      visitedNodes: patch.visitedNodes ?? current.visitedNodes,
      completedNodes: patch.completedNodes ?? current.completedNodes,
      loot: patch.loot ?? current.loot,
    },
  };
}

export function Fallout4CampaignScreen({ game, save, onBack, onDice, onProgress }: Props) {
  const artStyle = gameHeroVars(game) as CSSProperties;
  const initialSceneId = isSceneId(save?.campaignState?.sceneId) ? save.campaignState.sceneId : "vault111";
  const initialScene = getScene(initialSceneId);
  const initialNodeId = initialScene.nodes.some((node) => node.id === save?.campaignState?.nodeId)
    ? String(save?.campaignState?.nodeId)
    : initialScene.nodes[0].id;
  const [sceneId, setSceneId] = useState<SceneId>(initialSceneId);
  const [nodeId, setNodeId] = useState(initialNodeId);
  const [ap, setAp] = useState(save?.campaignState?.ap ?? AP_MAX);
  const [turn, setTurn] = useState(save?.campaignState?.turn ?? 1);
  const [hp] = useState(35);
  const [rad] = useState(0);
  const [caps] = useState(18);
  const [visited, setVisited] = useState<Set<string>>(() => new Set(save?.campaignState?.visitedNodes ?? [`${initialSceneId}:${initialNodeId}`]));
  const [secured, setSecured] = useState<Set<string>>(() => new Set(save?.campaignState?.securedNodes ?? []));
  const [enemyHp, setEnemyHp] = useState<Record<string, number>>(() => {
    const entries = scenes.flatMap((scene) =>
      scene.nodes
        .filter((node) => node.enemyHp)
        .map((node) => [`${scene.id}:${node.id}`, node.enemyHp ?? 0] as const)
    );
    return { ...Object.fromEntries(entries), ...(save?.campaignState?.enemyHp ?? {}) };
  });
  const [roll, setRoll] = useState<{ dice: [number, number]; successes: number; passed: boolean }>();
  const [log, setLog] = useState<string[]>(
    save?.campaignState?.actionLog ?? [
      "Tomo 1 activo: inicio de turno, AP, accion, 2d20, dificultad, combate y contador.",
      "Tomo 2 M-0170: Vault 111 -> Sanctuary Hills -> Red Rocket opcional -> Concord.",
    ]
  );
  const [templateCatalog, setTemplateCatalog] = useState<TemplateCatalog>();
  const [atlasLocationId, setAtlasLocationId] = useState(save?.campaignState?.atlasLocationId ?? "U-0001");
  const [atlasSubzoneIndex, setAtlasSubzoneIndex] = useState(save?.campaignState?.atlasSubzoneIndex ?? 0);
  const [activeMissionId, setActiveMissionId] = useState(save?.campaignState?.activeMissionId ?? "M-0170");
  const [atlasVisited, setAtlasVisited] = useState<Set<string>>(
    () => new Set(save?.campaignState?.atlasVisitedLocations ?? ["U-0001"])
  );
  const [atlasVisitedInternalNodes, setAtlasVisitedInternalNodes] = useState<Set<string>>(
    () => new Set(save?.campaignState?.atlasVisitedInternalNodes ?? [])
  );
  const [atlasCompleted, setAtlasCompleted] = useState<Set<string>>(
    () => new Set(save?.campaignState?.atlasCompletedSubzones ?? [])
  );
  const [atlasLocationStates, setAtlasLocationStates] = useState<
    NonNullable<PlayerSave["campaignState"]>["atlasLocationStates"]
  >(save?.campaignState?.atlasLocationStates ?? {});
  const [atlasEnemyStates, setAtlasEnemyStates] = useState<
    NonNullable<PlayerSave["campaignState"]>["atlasEnemyStates"]
  >(save?.campaignState?.atlasEnemyStates ?? {});
  const [activeMissionStep, setActiveMissionStep] = useState(save?.campaignState?.activeMissionStep ?? 0);
  const [completedMissionSteps, setCompletedMissionSteps] = useState<Set<string>>(
    () => new Set(save?.campaignState?.completedMissionSteps ?? [])
  );
  const [unlockedMissionIds, setUnlockedMissionIds] = useState<Set<string>>(
    () => new Set(save?.campaignState?.unlockedMissionIds ?? ["M-0170"])
  );
  const [momentum, setMomentum] = useState(save?.campaignState?.momentum ?? 0);
  const [noise, setNoise] = useState(save?.campaignState?.noise ?? 0);
  const [equippedWeaponId, setEquippedWeaponId] = useState(save?.campaignState?.equippedWeaponId ?? "W-0003");
  const [equippedArmorId, setEquippedArmorId] = useState(save?.campaignState?.equippedArmorId ?? "EQ-0001");
  const [ammo, setAmmo] = useState<Record<string, number>>(save?.campaignState?.ammo ?? { ".38": 24, "10mm": 12 });
  const [factionReputation, setFactionReputation] = useState<Record<string, number>>(
    save?.campaignState?.factionReputation ?? { "F-001": 0 }
  );
  const [settlementStates, setSettlementStates] = useState<NonNullable<PlayerSave["campaignState"]>["settlementStates"]>(
    save?.campaignState?.settlementStates ?? {}
  );
  const [survival, setSurvival] = useState<SurvivalState>(
    save?.campaignState?.survival ?? { hunger: 0, thirst: 0, sleep: 0, disease: 0, radiation: 0, fatigue: 0 }
  );
  const [xp, setXp] = useState(save?.campaignState?.xp ?? 0);
  const [inventory, setInventory] = useState<string[]>(save?.campaignState?.inventory ?? []);

  useEffect(() => {
    let cancelled = false;
    const templatePath = resolveGameAsset(game, game.templates);
    if (!templatePath) return;
    fetch(templatePath)
      .then((response) => (response.ok ? response.json() : undefined))
      .then((data: TemplateCatalog | undefined) => {
        if (!cancelled) setTemplateCatalog(data);
      })
      .catch(() => {
        if (!cancelled) setTemplateCatalog(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [game]);

  const scene = getScene(sceneId);
  const node = scene.nodes.find((item) => item.id === nodeId) ?? scene.nodes[0];
  const nodeKey = `${scene.id}:${node.id}`;
  const currentEnemyHp = enemyHp[nodeKey] ?? 0;
  const isCombat = node.kind === "combat" && currentEnemyHp > 0;
  const isSecured = secured.has(nodeKey);
  const availableNodes = useMemo(
    () => scene.nodes.filter((item) => item.id === node.id || node.connects.includes(item.id)),
    [node, scene.nodes]
  );
  const sceneIndex = scenes.findIndex((item) => item.id === scene.id);
  const progress = Math.round(((sceneIndex + 1) / scenes.length) * 100);
  const atlasLocations = useMemo(() => templateCatalog?.catalogs?.locations ?? [], [templateCatalog]);
  const atlasMissions = useMemo(() => templateCatalog?.catalogs?.missions ?? [], [templateCatalog]);
  const atlasBestiary = useMemo(() => templateCatalog?.catalogs?.bestiary ?? [], [templateCatalog]);
  const atlasWeapons = useMemo(() => templateCatalog?.catalogs?.weapons ?? [], [templateCatalog]);
  const atlasEquipment = useMemo(() => templateCatalog?.catalogs?.equipment ?? [], [templateCatalog]);
  const atlasSettlements = useMemo(() => templateCatalog?.catalogs?.settlements ?? [], [templateCatalog]);
  const atlasFactions = useMemo(() => templateCatalog?.catalogs?.factions ?? [], [templateCatalog]);
  const atlasCollectibles = useMemo(() => templateCatalog?.catalogs?.collectibles ?? [], [templateCatalog]);
  const atlasWorldRoute = useMemo(() => {
    const route = templateCatalog?.routeTemplates?.find((item) => item.id === "out-of-time-base-route");
    return route?.nodes?.length ? route.nodes : ["U-0001", "U-0002", "U-0003", "U-0011"];
  }, [templateCatalog]);
  const atlasLocation = atlasLocations.find((item) => item.id === atlasLocationId) ?? atlasLocations[0];
  const atlasMission = atlasMissions.find((item) => item.id === activeMissionId) ?? atlasMissions.find((item) => item.id === "M-0170") ?? atlasMissions[0];
  const atlasSubzones = atlasLocation?.subzones?.length
    ? atlasLocation.subzones
    : [
        { name: "Acceso principal", role: "Entrada / orientacion" },
        { name: "Zona de busqueda", role: "Exploracion / loot" },
        { name: "Salida conectada", role: "Viaje / enlace" },
      ];
  const atlasSubzone = atlasSubzones[Math.min(atlasSubzoneIndex, atlasSubzones.length - 1)];
  const atlasKey = atlasLocation ? `${atlasLocation.id}:${atlasSubzone?.name ?? "subzona"}` : "atlas:pendiente";
  const atlasInternalKey = atlasLocation ? `${atlasLocation.id}:${atlasSubzoneIndex}:${atlasSubzone?.name ?? "nodo"}` : "atlas:pendiente";
  const atlasRouteIndex = atlasWorldRoute.indexOf(atlasLocation?.id ?? atlasLocationId);
  const atlasConnectedLocationIds = [
    atlasRouteIndex > 0 ? atlasWorldRoute[atlasRouteIndex - 1] : undefined,
    atlasRouteIndex >= 0 && atlasRouteIndex < atlasWorldRoute.length - 1 ? atlasWorldRoute[atlasRouteIndex + 1] : undefined,
  ].filter((id): id is string => Boolean(id));
  const atlasConnectedLocations = atlasConnectedLocationIds
    .map((id) => atlasLocations.find((location) => location.id === id))
    .filter((location): location is TomeLocation => Boolean(location));
  const currentLocationState = atlasLocationStates?.[atlasLocation?.id ?? ""] ?? { visitedNodes: [], completedNodes: [], loot: [] };
  const connectedInternalIndexes = [atlasSubzoneIndex - 1, atlasSubzoneIndex, atlasSubzoneIndex + 1].filter(
    (index) => index >= 0 && index < atlasSubzones.length
  );
  const missionSteps: MissionObjectiveStep[] = activeMissionId === "M-0170" ? outOfTimeSteps : atlasWorldRoute.map((locationId, index) => ({
    id: `${activeMissionId}:route:${index}`,
    locationId,
    title: `Objetivo ${index + 1}`,
    objective: `Explora ${atlasLocations.find((location) => location.id === locationId)?.name ?? locationId}.`,
    nodeHints: [],
  } satisfies MissionObjectiveStep));
  const activeObjectiveStep = missionSteps[Math.min(activeMissionStep, missionSteps.length - 1)] ?? missionSteps[0];
  const missionStepLocationId = activeObjectiveStep?.locationId ?? atlasWorldRoute[Math.min(activeMissionStep, atlasWorldRoute.length - 1)] ?? atlasWorldRoute[0];
  const missionStepLocation = atlasLocations.find((location) => location.id === missionStepLocationId);
  const currentMissionStepKey = `${activeMissionId}:${activeObjectiveStep?.id ?? missionStepLocationId}`;
  const isAtMissionLocation = atlasLocation?.id === missionStepLocationId;
  const missionRouteProgress = Math.round((completedMissionSteps.size / Math.max(1, missionSteps.length)) * 100);
  const normalizedAtlasNodeName = atlasSubzone?.name.toLowerCase() ?? "";
  const matchesMissionNode = !activeObjectiveStep?.nodeHints?.length
    || activeObjectiveStep.nodeHints.some((hint) => normalizedAtlasNodeName.includes(hint.toLowerCase()));
  const hasRequiredMissionItem = !activeObjectiveStep?.requiredItem || inventory.includes(activeObjectiveStep.requiredItem);
  const missionObjectiveText = isAtMissionLocation
    ? activeObjectiveStep?.objective ?? `Resuelve el nodo interno requerido de ${atlasLocation?.name ?? "la ubicacion"}.`
    : `Viaja por el mapa mundi hacia ${missionStepLocation?.name ?? missionStepLocationId}: ${activeObjectiveStep?.title ?? "objetivo activo"}.`;
  const atlasEnemy = useMemo(() => {
    const enemyNames = atlasLocation?.enemies ?? [];
    const match = atlasBestiary.find((creature) =>
      enemyNames.some((name) => creature.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(creature.name.toLowerCase()))
    );
    return match ?? atlasBestiary[(atlasLocationId.length + atlasSubzoneIndex) % Math.max(1, atlasBestiary.length)];
  }, [atlasBestiary, atlasLocation, atlasLocationId, atlasSubzoneIndex]);
  const atlasLoot = useMemo(() => {
    const direct = atlasCollectibles.find((item) =>
      item.locationId === atlasLocation?.id
      && (!item.subzone || normalizeName(atlasSubzone?.name).includes(normalizeName(item.subzone)) || normalizeName(item.subzone).includes(normalizeName(atlasSubzone?.name)))
    ) ?? atlasCollectibles.find((item) => item.locationId === atlasLocation?.id);
    if (direct) return direct.name;
    const role = normalizeName(atlasSubzone?.role);
    if (role.includes("loot") || role.includes("cobertura") || role.includes("obstaculo")) {
      return pickCatalogItem(atlasWeapons, atlasInternalKey)?.name
        ?? pickCatalogItem(atlasEquipment, atlasInternalKey)?.name
        ?? "Alijo menor de ubicacion";
    }
    if (role.includes("interior") || role.includes("sala")) {
      return pickCatalogItem(atlasEquipment, atlasInternalKey)?.name ?? "Recurso comun";
    }
    return pickCatalogItem(atlasCollectibles, atlasInternalKey)?.name ?? "Recurso comun";
  }, [atlasCollectibles, atlasEquipment, atlasInternalKey, atlasLocation?.id, atlasSubzone?.name, atlasSubzone?.role, atlasWeapons]);
  const equippedWeapon = atlasWeapons.find((item) => item.id === equippedWeaponId) ?? atlasWeapons[0];
  const equippedArmor = atlasEquipment.find((item) => item.id === equippedArmorId) ?? atlasEquipment[0];
  const activeFaction = atlasFactions[0];
  const activeSettlement = atlasSettlements.find((item) => normalizeName(item.name).includes(normalizeName(atlasLocation?.name)))
    ?? (atlasLocation?.settlement ? atlasSettlements.find((item) => normalizeName(atlasLocation.name).includes(normalizeName(item.name))) : undefined);
  const activeSettlementState = activeSettlement ? settlementStates?.[activeSettlement.id] : undefined;

  function progressPatch({
    sceneValue = scene,
    nodeValue = node,
    apValue = ap,
    turnValue = turn,
    visitedValue = visited,
    securedValue = secured,
    enemyHpValue = enemyHp,
    logValue = log,
    lastAction,
  }: {
    sceneValue?: Scene;
    nodeValue?: RouteNode;
    apValue?: number;
    turnValue?: number;
    visitedValue?: Set<string>;
    securedValue?: Set<string>;
    enemyHpValue?: Record<string, number>;
    logValue?: string[];
    lastAction?: string;
  }) {
    const route = scenes.map((item) => item.title);
    const currentSceneIndex = scenes.findIndex((item) => item.id === sceneValue.id);
    const visitedSceneTitles = [...visitedValue]
      .map((key) => getScene(key.split(":")[0] as SceneId).title)
      .filter((value, index, array) => array.indexOf(value) === index);

    onProgress?.({
      currentMission: sceneValue.missionStep,
      currentZone: `${sceneValue.title} / ${nodeValue.title}`,
      progressPercent: Math.round(((currentSceneIndex + 1) / scenes.length) * 100),
      route,
      visitedZones: visitedSceneTitles,
      currentStep: Math.max(0, currentSceneIndex),
      campaignState: {
        sceneId: sceneValue.id,
        nodeId: nodeValue.id,
        ap: apValue,
        turn: turnValue,
        visitedNodes: [...visitedValue],
        securedNodes: [...securedValue],
        enemyHp: enemyHpValue,
        actionLog: logValue,
        lastAction,
        atlasLocationId,
        atlasSubzoneIndex,
        atlasWorldRoute,
        atlasVisitedLocations: [...atlasVisited],
        atlasVisitedInternalNodes: [...atlasVisitedInternalNodes],
        atlasCompletedSubzones: [...atlasCompleted],
        atlasLocationStates,
        atlasEnemyStates,
        activeMissionId,
        activeMissionStep,
        completedMissionSteps: [...completedMissionSteps],
        unlockedMissionIds: [...unlockedMissionIds],
        momentum,
        noise,
        equippedWeaponId,
        equippedArmorId,
        ammo,
        factionReputation,
        settlementStates,
        survival,
        xp,
        caps,
        inventory,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  function progressAtlasPatch({
    locationId = atlasLocationId,
    subzoneIndex = atlasSubzoneIndex,
    visitedAtlas = atlasVisited,
    visitedInternalNodes = atlasVisitedInternalNodes,
    completedAtlas = atlasCompleted,
    locationStates = atlasLocationStates,
    enemyStates = atlasEnemyStates,
    missionId = activeMissionId,
    missionStep = activeMissionStep,
    completedSteps = completedMissionSteps,
    unlockedMissions = unlockedMissionIds,
    momentumValue = momentum,
    noiseValue = noise,
    equippedWeaponValue = equippedWeaponId,
    equippedArmorValue = equippedArmorId,
    ammoValue = ammo,
    factionReputationValue = factionReputation,
    settlementStatesValue = settlementStates,
    survivalValue = survival,
    xpValue = xp,
    inventoryValue = inventory,
    logValue = log,
    apValue = ap,
    turnValue = turn,
    lastAction,
  }: {
    locationId?: string;
    subzoneIndex?: number;
    visitedAtlas?: Set<string>;
    visitedInternalNodes?: Set<string>;
    completedAtlas?: Set<string>;
    locationStates?: NonNullable<PlayerSave["campaignState"]>["atlasLocationStates"];
    enemyStates?: NonNullable<PlayerSave["campaignState"]>["atlasEnemyStates"];
    missionId?: string;
    missionStep?: number;
    completedSteps?: Set<string>;
    unlockedMissions?: Set<string>;
    momentumValue?: number;
    noiseValue?: number;
    equippedWeaponValue?: string;
    equippedArmorValue?: string;
    ammoValue?: Record<string, number>;
    factionReputationValue?: Record<string, number>;
    settlementStatesValue?: NonNullable<PlayerSave["campaignState"]>["settlementStates"];
    survivalValue?: NonNullable<PlayerSave["campaignState"]>["survival"];
    xpValue?: number;
    inventoryValue?: string[];
    logValue?: string[];
    apValue?: number;
    turnValue?: number;
    lastAction?: string;
  }) {
    onProgress?.({
      currentMission: atlasMission?.name ?? scene.missionStep,
      currentZone: atlasLocation ? `${atlasLocation.name} / ${atlasSubzones[subzoneIndex]?.name ?? "Nodo interno"}` : scene.title,
      progressPercent: Math.max(progress, Math.min(100, Math.round((completedAtlas.size / Math.max(1, atlasLocations.length * 3)) * 100))),
      route: scenes.map((item) => item.title),
      visitedZones: [...new Set([...visited, ...[...visitedAtlas].map((id) => atlasLocations.find((item) => item.id === id)?.name ?? id)])],
      currentStep: Math.max(0, sceneIndex),
      campaignState: {
        sceneId,
        nodeId,
        ap: apValue,
        turn: turnValue,
        visitedNodes: [...visited],
        securedNodes: [...secured],
        enemyHp,
        actionLog: logValue,
        lastAction,
        atlasLocationId: locationId,
        atlasSubzoneIndex: subzoneIndex,
        atlasWorldRoute,
        atlasVisitedLocations: [...visitedAtlas],
        atlasVisitedInternalNodes: [...visitedInternalNodes],
        atlasCompletedSubzones: [...completedAtlas],
        atlasLocationStates: locationStates,
        atlasEnemyStates: enemyStates,
        activeMissionId: missionId,
        activeMissionStep: missionStep,
        completedMissionSteps: [...completedSteps],
        unlockedMissionIds: [...unlockedMissions],
        momentum: momentumValue,
        noise: noiseValue,
        equippedWeaponId: equippedWeaponValue,
        equippedArmorId: equippedArmorValue,
        ammo: ammoValue,
        factionReputation: factionReputationValue,
        settlementStates: settlementStatesValue,
        survival: survivalValue,
        xp: xpValue,
        caps,
        inventory: inventoryValue,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  function writeLog(...entries: string[]) {
    const nextLog = [...entries, ...log].slice(0, 8);
    setLog(nextLog);
    return nextLog;
  }

  function startTurn() {
    const nextTurn = turn + 1;
    setTurn(nextTurn);
    setAp(AP_MAX);
    const nextLog = writeLog(`Turno ${nextTurn}: AP recuperado a ${AP_MAX}. Cada 3 turnos puede entrar evento menor segun Tomo 1.`);
    progressPatch({ apValue: AP_MAX, turnValue: nextTurn, logValue: nextLog, lastAction: "nuevo_turno" });
  }

  function spend(cost: number) {
    if (cost > ap) {
      writeLog(`AP insuficiente: necesitas ${cost}, tienes ${ap}. Usa Nuevo turno.`);
      return false;
    }
    setAp((current) => current - cost);
    return true;
  }

  function moveTo(targetId: string) {
    const target = scene.nodes.find((item) => item.id === targetId);
    if (!target) return;
    if (target.id !== node.id && !node.connects.includes(target.id)) {
      writeLog(`Ruta bloqueada: ${target.title} no conecta directamente con ${node.title}.`);
      return;
    }
    if (target.id !== node.id && !spend(target.ap)) return;
    const nextAp = target.id !== node.id ? ap - target.ap : ap;
    const nextVisited = new Set(visited).add(`${scene.id}:${target.id}`);
    setNodeId(target.id);
    setVisited(nextVisited);
    const nextLog = writeLog(
      `Movimiento: ${node.title} -> ${target.title}. Coste ${target.ap} AP.`,
      `${target.threat}. ${target.rule}`
    );
    progressPatch({ nodeValue: target, apValue: nextAp, visitedValue: nextVisited, logValue: nextLog, lastAction: `mover:${target.id}` });
  }

  function resolveNode() {
    const actionCost = isCombat ? 1 : Math.max(1, node.ap);
    if (!spend(actionCost)) return;

    const difficulty = isCombat ? Math.max(2, node.difficulty) : node.difficulty;
    const result = roll2d20(difficulty);
    setRoll(result);

    if (isCombat && result.passed) {
      const damage = Math.max(1, result.successes - difficulty + 1);
      const nextHp = Math.max(0, currentEnemyHp - damage);
      const nextEnemyHp = { ...enemyHp, [nodeKey]: nextHp };
      const nextSecured = nextHp <= 0 ? new Set(secured).add(nodeKey) : secured;
      setEnemyHp(nextEnemyHp);
      if (nextHp <= 0) setSecured(nextSecured);
      const nextLog = writeLog(
        `Combate: ${result.dice.join(" / ")} contra D${difficulty}. ${result.passed ? node.success : node.failure}`,
        `Dano/control: ${damage}. Resistencia restante: ${nextHp}.`
      );
      progressPatch({
        apValue: ap - actionCost,
        securedValue: nextSecured,
        enemyHpValue: nextEnemyHp,
        logValue: nextLog,
        lastAction: `combate:${node.id}`,
      });
      return;
    }

    const nextSecured = !isCombat && result.passed ? new Set(secured).add(nodeKey) : secured;
    if (!isCombat && result.passed) {
      setSecured(nextSecured);
    }

    const nextLog = writeLog(
      `Accion: ${result.dice.join(" / ")} contra D${difficulty}. ${result.passed ? node.success : node.failure}`,
      node.reward && result.passed ? `Recompensa: ${node.reward}` : `Coste aplicado: ${actionCost} AP.`
    );
    progressPatch({
      apValue: ap - actionCost,
      securedValue: nextSecured,
      logValue: nextLog,
      lastAction: `resolver:${node.id}`,
    });
  }

  function travel(targetId?: SceneId) {
    if (!targetId) return;
    const target = getScene(targetId);
    const targetNode = target.nodes[0];
    const nextVisited = new Set(visited).add(`${target.id}:${targetNode.id}`);
    setSceneId(target.id);
    setNodeId(targetNode.id);
    setAp(AP_MAX);
    setTurn(1);
    setVisited(nextVisited);
    const nextLog = writeLog(`Viaje: ${scene.title} -> ${target.title}. AP restaurado a ${AP_MAX}.`, target.objective);
    progressPatch({
      sceneValue: target,
      nodeValue: targetNode,
      apValue: AP_MAX,
      turnValue: 1,
      visitedValue: nextVisited,
      logValue: nextLog,
      lastAction: `viajar:${target.id}`,
    });
  }

  function selectAtlasLocation(locationId: string) {
    const target = atlasLocations.find((item) => item.id === locationId);
    const nextVisited = new Set(atlasVisited).add(locationId);
    const nextInternalVisited = new Set(atlasVisitedInternalNodes).add(`${locationId}:0:${target?.subzones?.[0]?.name ?? "inicio"}`);
    const nextLocationStates = patchLocationState(atlasLocationStates, locationId, {
      visitedNodes: [...new Set([...(atlasLocationStates?.[locationId]?.visitedNodes ?? []), `${locationId}:0:${target?.subzones?.[0]?.name ?? "inicio"}`])],
    });
    setAtlasLocationId(locationId);
    setAtlasSubzoneIndex(0);
    setAtlasVisited(nextVisited);
    setAtlasVisitedInternalNodes(nextInternalVisited);
    setAtlasLocationStates(nextLocationStates);
    const nextLog = writeLog(
      `Mapa mundi: viaje textual a ${target?.name ?? locationId}. Entras al mapa interno de esa ubicacion.`,
      `Tomo 6: ${target?.category ?? "ubicacion"} / riesgo ${target?.risk ?? "variable"}.`
    );
    progressAtlasPatch({
      locationId,
      subzoneIndex: 0,
      visitedAtlas: nextVisited,
      visitedInternalNodes: nextInternalVisited,
      locationStates: nextLocationStates,
      logValue: nextLog,
      lastAction: `atlas:viajar:${locationId}`,
    });
  }

  function moveAtlasInternalNode(index: number) {
    if (!atlasLocation || index === atlasSubzoneIndex || !connectedInternalIndexes.includes(index)) return;
    if (!spend(1)) return;
    const target = atlasSubzones[index];
    const targetKey = `${atlasLocation.id}:${index}:${target.name}`;
    const nextVisitedInternal = new Set(atlasVisitedInternalNodes).add(targetKey);
    const nextState = patchLocationState(atlasLocationStates, atlasLocation.id, {
      visitedNodes: [...new Set([...currentLocationState.visitedNodes, targetKey])],
    });
    setAtlasSubzoneIndex(index);
    setAtlasVisitedInternalNodes(nextVisitedInternal);
    setAtlasLocationStates(nextState);
    const nextLog = writeLog(
      `Mapa interno: movimiento a ${target.name}. Coste 1 AP.`,
      target.role ?? "Nodo interno de la ubicacion definida por Tomo 6."
    );
    progressAtlasPatch({
      subzoneIndex: index,
      visitedInternalNodes: nextVisitedInternal,
      locationStates: nextState,
      apValue: ap - 1,
      logValue: nextLog,
      lastAction: `atlas:mover-nodo:${index}`,
    });
  }

  function selectAtlasMission(missionId: string) {
    const mission = atlasMissions.find((item) => item.id === missionId);
    setActiveMissionId(missionId);
    const nextLog = writeLog(
      `Mision activa: ${mission?.name ?? missionId}.`,
      mission?.activation ?? "Activacion textual segun Tomo 2."
    );
    progressAtlasPatch({ missionId, logValue: nextLog, lastAction: `atlas:mision:${missionId}` });
  }

  function resolveAtlasSubzone() {
    if (!atlasLocation) {
      writeLog("Atlas no cargado todavia: espera a que templates.json este disponible.");
      return;
    }
    const actionCost = 1;
    if (!spend(actionCost)) return;
    const role = atlasSubzone.role ?? "";
    const isInternalCombat = Boolean(atlasLocation.enemies?.length) || /combate|amenaza|enemigo|peligro/i.test(role);
    const isInternalLoot = /loot|alijo|recurso|contenedor|registro|busqueda|exploracion/i.test(role);
    const difficulty = isInternalCombat ? Math.max(2, riskDifficulty(atlasLocation.risk)) : riskDifficulty(atlasLocation.risk);
    const result = roll2d20(difficulty);
    setRoll(result);
    const nextAp = ap - actionCost;
    const completed = new Set(atlasCompleted);
    const nextInventory = [...inventory];
    let nextLocationStates = atlasLocationStates;
    const nextXp = result.passed ? xp + 25 : xp + 5;
    const generatedMomentum = result.passed ? Math.max(0, result.successes - difficulty) : 0;
    const nextMomentum = momentum + generatedMomentum;
    const nextNoise = result.passed ? noise : noise + 1;
    let nextMissionStep = activeMissionStep;
    const nextCompletedMissionSteps = new Set(completedMissionSteps);
    const nextUnlockedMissionIds = new Set(unlockedMissionIds);
    if (result.passed) {
      completed.add(atlasKey);
      if (isInternalLoot && atlasLoot && !nextInventory.includes(atlasLoot)) {
        nextInventory.push(atlasLoot);
      }
      if (isAtMissionLocation && matchesMissionNode && hasRequiredMissionItem) {
        nextCompletedMissionSteps.add(currentMissionStepKey);
        nextMissionStep = Math.min(activeMissionStep + 1, missionSteps.length - 1);
        if (activeObjectiveStep?.grantsItem && !nextInventory.includes(activeObjectiveStep.grantsItem)) {
          nextInventory.push(activeObjectiveStep.grantsItem);
        }
        if (activeObjectiveStep?.reward && !nextInventory.includes(activeObjectiveStep.reward)) {
          nextInventory.push(activeObjectiveStep.reward);
        }
        if (activeObjectiveStep?.unlocksMissionId) {
          nextUnlockedMissionIds.add(activeObjectiveStep.unlocksMissionId);
        }
      }
      nextLocationStates = patchLocationState(atlasLocationStates, atlasLocation.id, {
        visitedNodes: [...new Set([...currentLocationState.visitedNodes, atlasInternalKey])],
        completedNodes: [...new Set([...currentLocationState.completedNodes, atlasInternalKey])],
        loot: atlasLoot ? [...new Set([...currentLocationState.loot, atlasLoot])] : currentLocationState.loot,
      });
    }
    setAtlasCompleted(completed);
    setAtlasLocationStates(nextLocationStates);
    setActiveMissionStep(nextMissionStep);
    setCompletedMissionSteps(nextCompletedMissionSteps);
    setUnlockedMissionIds(nextUnlockedMissionIds);
    setMomentum(nextMomentum);
    setNoise(nextNoise);
    setXp(nextXp);
    setInventory(nextInventory);
    const nextLog = writeLog(
      `Mapa interno: ${atlasLocation.name} / ${atlasSubzone.name}. Tirada ${result.dice.join(" / ")} contra D${difficulty}. ${result.passed ? "Nodo interno completado." : "Complicacion sin cerrar este nodo."}`,
      result.passed
        ? `${role || "Exploracion del nodo interno"} ${isAtMissionLocation && matchesMissionNode && hasRequiredMissionItem ? "Objetivo de mision actualizado." : "Exploracion registrada."} XP total: ${nextXp}. Momentum +${generatedMomentum}.`
        : `Riesgo activo: ${readableThreat(atlasEnemy)}. Ruido ${nextNoise}. XP total: ${nextXp}.`
    );
    progressAtlasPatch({
      completedAtlas: completed,
      missionStep: nextMissionStep,
      completedSteps: nextCompletedMissionSteps,
      unlockedMissions: nextUnlockedMissionIds,
      momentumValue: nextMomentum,
      noiseValue: nextNoise,
      xpValue: nextXp,
      inventoryValue: nextInventory,
      locationStates: nextLocationStates,
      logValue: nextLog,
      apValue: nextAp,
      lastAction: `atlas:resolver:${atlasKey}`,
    });
  }

  function resolveAtlasEncounter() {
    if (!atlasLocation) return;
    if (!spend(1)) return;
    const difficulty = Math.max(2, riskDifficulty(atlasLocation.risk));
    const result = roll2d20(difficulty);
    setRoll(result);
    const nextAp = ap - 1;
    const nextXp = result.passed ? xp + 35 : xp + 10;
    const generatedMomentum = result.passed ? Math.max(0, result.successes - difficulty) : 0;
    const nextMomentum = momentum + generatedMomentum;
    const nextNoise = result.passed ? noise : noise + 1;
    const maxHp = Math.max(4, Math.min(40, Math.round((atlasEnemy?.hp ?? 10) / 10)));
    const existingEnemy = atlasEnemyStates?.[atlasInternalKey] ?? {
      enemyId: atlasEnemy?.id ?? "enemy-local",
      name: atlasEnemy?.name ?? "Amenaza local",
      hp: maxHp,
      maxHp,
      defeated: false,
    };
    const damageDie = Math.ceil(Math.random() * 6);
    const damage = result.passed ? Math.max(1, damageDie + generatedMomentum) : 0;
    const nextEnemyHp = result.passed ? Math.max(0, existingEnemy.hp - damage) : existingEnemy.hp;
    const nextEnemyState = {
      ...existingEnemy,
      hp: nextEnemyHp,
      defeated: nextEnemyHp <= 0,
    };
    const nextEnemyStates = { ...(atlasEnemyStates ?? {}), [atlasInternalKey]: nextEnemyState };
    const nextInventory = [...inventory];
    if (nextEnemyState.defeated && atlasLoot && !nextInventory.includes(atlasLoot)) {
      nextInventory.push(atlasLoot);
    }
    setXp(nextXp);
    setMomentum(nextMomentum);
    setNoise(nextNoise);
    setAtlasEnemyStates(nextEnemyStates);
    setInventory(nextInventory);
    const nextLog = writeLog(
      `Encuentro: ${nextEnemyState.name}. Tirada ${result.dice.join(" / ")} contra D${difficulty}. Dano d6=${damageDie}, aplicado=${damage}.`,
      result.passed
        ? `${nextEnemyState.defeated ? "Amenaza derrotada" : `PV enemigo ${nextEnemyHp}/${nextEnemyState.maxHp}`}. Momentum +${generatedMomentum}.`
        : `La amenaza queda activa: ruido ${nextNoise}; conviene gastar AP en cobertura o nuevo turno.`
    );
    progressAtlasPatch({
      xpValue: nextXp,
      inventoryValue: nextInventory,
      enemyStates: nextEnemyStates,
      momentumValue: nextMomentum,
      noiseValue: nextNoise,
      logValue: nextLog,
      apValue: nextAp,
      lastAction: `atlas:encuentro:${atlasLocation.id}`,
    });
  }

  function nextAtlasSubzone() {
    if (!atlasLocation) return;
    const nextIndex = Math.min(atlasSubzoneIndex + 1, atlasSubzones.length - 1);
    moveAtlasInternalNode(nextIndex);
  }

  function improveSettlement() {
    if (!atlasLocation?.settlement) {
      writeLog("Esta ubicacion no esta marcada como asentamiento en Tomo 6/7.");
      return;
    }
    if (!spend(2)) return;
    const settlementId = activeSettlement?.id ?? `settlement:${atlasLocation.id}`;
    const current = settlementStates?.[settlementId] ?? { population: 1, food: 0, water: 0, beds: 0, defense: 0, linked: false };
    const nextSettlementStates = {
      ...(settlementStates ?? {}),
      [settlementId]: {
        population: current.population,
        food: current.food + 1,
        water: current.water + 1,
        beds: current.beds + 1,
        defense: current.defense + 1,
        linked: true,
      },
    };
    const factionId = activeFaction?.id ?? "F-001";
    const nextFactionReputation = {
      ...factionReputation,
      [factionId]: (factionReputation[factionId] ?? 0) + 1,
    };
    setSettlementStates(nextSettlementStates);
    setFactionReputation(nextFactionReputation);
    const nextLog = writeLog(
      `Asentamiento: ${activeSettlement?.name ?? atlasLocation.name} mejorado. +comida, +agua, +camas, +defensa.`,
      `Faccion: ${activeFaction?.name ?? "Minutemen"} reputacion +1.`
    );
    progressAtlasPatch({
      settlementStatesValue: nextSettlementStates,
      factionReputationValue: nextFactionReputation,
      apValue: ap - 2,
      logValue: nextLog,
      lastAction: `settlement:improve:${settlementId}`,
    });
  }

  function restAndRecover() {
    if (!spend(1)) return;
    const nextSurvival = {
      hunger: Math.min(10, survival.hunger + 1),
      thirst: Math.min(10, survival.thirst + 1),
      sleep: Math.max(0, survival.sleep - 2),
      disease: survival.disease,
      radiation: survival.radiation,
      fatigue: Math.max(0, survival.fatigue - 2),
    };
    setSurvival(nextSurvival);
    const nextLog = writeLog(
      "Supervivencia: descanso corto aplicado.",
      `Hambre ${nextSurvival.hunger}, sed ${nextSurvival.thirst}, sueno ${nextSurvival.sleep}, fatiga ${nextSurvival.fatigue}.`
    );
    progressAtlasPatch({
      survivalValue: nextSurvival,
      apValue: ap - 1,
      logValue: nextLog,
      lastAction: "survival:rest",
    });
  }

  return (
    <section className="fallout4-campaign-screen fo4-text-campaign" style={artStyle}>
      <header className="fo4-campaign-header">
        <button onClick={onBack}><ArrowLeft size={18} /> Volver</button>
        <div>
          <span>Fallout 4 base game</span>
          <h2>Campana textual por turnos</h2>
          <p>{save?.playerName ?? "Superviviente"} - {scene.title} - {progress}% ruta base</p>
        </div>
        <button className="green-button" onClick={onDice}><Sparkles size={18} /> Dados</button>
      </header>

      <div className="fo4-text-layout">
        <section className="fo4-text-main">
          <article className="fo4-brief-card">
            <div>
              <small>{scene.tomeId} / {scene.missionStep}</small>
              <h3>{scene.title}</h3>
              <p>{scene.summary}</p>
            </div>
            <div className="fo4-source-pill"><BookOpen size={16} /> {scene.source}</div>
          </article>

          <article className="fo4-current-card">
            <div className={`fo4-node-badge node-${node.kind}`}>{nodeIcon(node.kind)} {node.kind}</div>
            <h3>{node.title}</h3>
            <p>{node.text}</p>
            <div className="fo4-node-meta">
              <span><b>AP</b>{node.ap}</span>
              <span><b>Dificultad</b>D{isCombat ? Math.max(2, node.difficulty) : node.difficulty}</span>
              <span><b>Amenaza</b>{node.threat}</span>
              <span><b>Estado</b>{isSecured ? "Asegurado" : isCombat ? `${currentEnemyHp} resistencia` : "Pendiente"}</span>
            </div>
          </article>

          <div className="fo4-choice-grid">
            {availableNodes.map((item) => {
              const key = `${scene.id}:${item.id}`;
              const active = item.id === node.id;
              const seen = visited.has(key);
              const cleared = secured.has(key);
              return (
                <button
                  key={item.id}
                  className={`fo4-choice-card ${active ? "active" : ""} ${seen ? "seen" : ""}`}
                  onClick={() => moveTo(item.id)}
                  disabled={active}
                >
                  <span>{nodeIcon(item.kind)} {item.title}</span>
                  <small>{active ? "actual" : `${item.ap} AP`} / {cleared ? "asegurado" : item.threat}</small>
                </button>
              );
            })}
          </div>

          <article className="fo4-route-list">
            <strong>Ruta de exploracion</strong>
            {scene.nodes.map((item) => {
              const key = `${scene.id}:${item.id}`;
              return (
                <button
                  key={item.id}
                  className={`${item.id === node.id ? "active" : ""} ${visited.has(key) ? "seen" : ""}`}
                  onClick={() => moveTo(item.id)}
                  disabled={item.id !== node.id && !node.connects.includes(item.id)}
                >
                  <span>{nodeIcon(item.kind)} {item.title}</span>
                  <i>{item.ap} AP / D{item.difficulty}</i>
                  {secured.has(key) && <CheckCircle2 size={16} />}
                </button>
              );
            })}
          </article>

          <article className="fo4-atlas-panel">
            <header>
              <span>
                <BookOpen size={18} />
                <strong>Atlas textual Fallout 4</strong>
              </span>
              <small>
                {atlasLocations.length} ubicaciones / {atlasMissions.length} misiones / {atlasBestiary.length} criaturas
              </small>
            </header>

            <div className="fo4-atlas-controls">
              <label>
                <span>Ubicacion del Tomo 6</span>
                <select value={atlasLocation?.id ?? ""} onChange={(event) => selectAtlasLocation(event.target.value)}>
                  {atlasLocations.slice(0, 220).map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.id} - {location.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Mision del Tomo 2</span>
                <select value={atlasMission?.id ?? ""} onChange={(event) => selectAtlasMission(event.target.value)}>
                  {atlasMissions.slice(0, 220).map((mission) => (
                    <option key={mission.id} value={mission.id}>
                      {mission.id} - {mission.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {atlasLocation ? (
              <>
                <div className="fo4-mission-tracker">
                  <span>
                    <small>Mision activa</small>
                    <strong>{activeObjectiveStep?.title ?? atlasMission?.name ?? activeMissionId}</strong>
                    <i>{missionObjectiveText}</i>
                  </span>
                  <span>
                    <small>Ruta de mision</small>
                    <strong>{missionRouteProgress}%</strong>
                    <i>Paso {Math.min(activeMissionStep + 1, missionSteps.length)} de {missionSteps.length}</i>
                  </span>
                  <span>
                    <small>Condicion</small>
                    <strong>{isAtMissionLocation && matchesMissionNode && hasRequiredMissionItem ? "Lista" : "Pendiente"}</strong>
                    <i>
                      {!isAtMissionLocation
                        ? `Ubicacion requerida: ${missionStepLocation?.name ?? missionStepLocationId}.`
                        : !matchesMissionNode
                          ? `Nodo requerido: ${activeObjectiveStep?.nodeHints.join(", ") || "cualquiera"}.`
                          : !hasRequiredMissionItem
                            ? `Requiere: ${activeObjectiveStep?.requiredItem}.`
                            : `Momentum ${momentum} / Ruido ${noise}.`}
                    </i>
                  </span>
                </div>

                <div className="fo4-atlas-brief">
                  <strong>{atlasLocation.name}</strong>
                  <p>{atlasLocation.summary ?? atlasLocation.useInPlay ?? "Ubicacion jugable cargada desde las plantillas del Tomo 6."}</p>
                  <div>
                    <span>Riesgo: {atlasLocation.risk ?? "variable"}</span>
                    <span>Bioma: {atlasLocation.biome ?? atlasLocation.category ?? "Commonwealth"}</span>
                    <span>Visitada: {atlasVisited.has(atlasLocation.id) ? "si" : "no"}</span>
                  </div>
                </div>

                <div className="fo4-world-links">
                  <strong>Conexiones del mapa mundi</strong>
                  <div>
                    {atlasConnectedLocations.length ? atlasConnectedLocations.map((location) => (
                      <button key={location.id} onClick={() => selectAtlasLocation(location.id)}>
                        <Footprints size={16} />
                        <span>{location.name}</span>
                        <small>{location.id}</small>
                      </button>
                    )) : <small>Sin conexiones directas registradas en la ruta activa.</small>}
                  </div>
                </div>

                <div className="fo4-atlas-subzones">
                  {atlasSubzones.map((subzone, index) => {
                    const key = `${atlasLocation.id}:${subzone.name}`;
                    const internalKey = `${atlasLocation.id}:${index}:${subzone.name}`;
                    const canMove = connectedInternalIndexes.includes(index);
                    return (
                      <button
                        key={key}
                        className={`${index === atlasSubzoneIndex ? "active" : ""} ${atlasCompleted.has(key) ? "seen" : ""}`}
                        onClick={() => moveAtlasInternalNode(index)}
                        disabled={!canMove}
                      >
                        <span>{index + 1}. {subzone.name}</span>
                        <small>
                          {atlasCompleted.has(key)
                            ? "nodo resuelto"
                            : atlasVisitedInternalNodes.has(internalKey)
                              ? subzone.role ?? "visitado"
                              : canMove ? subzone.role ?? "explorar" : "fuera de ruta directa"}
                        </small>
                      </button>
                    );
                  })}
                </div>

                <div className="fo4-atlas-active">
                  <span>
                    <small>Ubicacion mundial</small>
                    <strong>{atlasLocation.name}</strong>
                    <i>{atlasLocation.category ?? "Mapa mundi"} / {atlasLocation.sourceTome ?? "Tomo 6"}</i>
                  </span>
                  <span>
                    <small>Nodo del mapa interno</small>
                    <strong>{atlasSubzone.name}</strong>
                    <i>{atlasSubzone.role ?? "Exploracion textual por turnos"}</i>
                  </span>
                  <span>
                    <small>Encuentro sugerido</small>
                    <strong>{readableThreat(atlasEnemy)}</strong>
                    <i>
                      {atlasEnemyStates?.[atlasInternalKey]
                        ? `${atlasEnemyStates[atlasInternalKey].hp}/${atlasEnemyStates[atlasInternalKey].maxHp} PV ${atlasEnemyStates[atlasInternalKey].defeated ? "derrotado" : "activo"}`
                        : atlasLocation.enemies?.join(", ") || "segun riesgo local"}
                    </i>
                  </span>
                  <span>
                    <small>Progreso atlas</small>
                    <strong>{atlasCompleted.size} nodos internos</strong>
                    <i>{xp} XP / {inventory.length} objetos / {currentLocationState.completedNodes.length} aqui</i>
                  </span>
                </div>

                <div className="fo4-runtime-grid">
                  <span>
                    <small>Tomo 4 / Arma</small>
                    <strong>{equippedWeapon?.name ?? equippedWeaponId}</strong>
                    <i>Municion .38: {ammo[".38"] ?? 0} / 10mm: {ammo["10mm"] ?? 0}</i>
                  </span>
                  <span>
                    <small>Tomo 5 / Equipo</small>
                    <strong>{equippedArmor?.name ?? equippedArmorId}</strong>
                    <i>Defensa/carga se persiste desde hoja core.</i>
                  </span>
                  <span>
                    <small>Tomo 8 / Faccion</small>
                    <strong>{activeFaction?.name ?? "Faccion local"}</strong>
                    <i>Reputacion: {factionReputation[activeFaction?.id ?? "F-001"] ?? 0}</i>
                  </span>
                  <span>
                    <small>Tomo 7 / Asentamiento</small>
                    <strong>{atlasLocation.settlement ? activeSettlement?.name ?? atlasLocation.name : "No asentamiento"}</strong>
                    <i>
                      {activeSettlementState
                        ? `Pob ${activeSettlementState.population} / Com ${activeSettlementState.food} / Agua ${activeSettlementState.water} / Def ${activeSettlementState.defense}`
                        : atlasLocation.settlement ? "Listo para mejorar" : "Sin ciclo activo"}
                    </i>
                  </span>
                  <span>
                    <small>Tomo 10 / Supervivencia</small>
                    <strong>H{survival.hunger} S{survival.thirst} RAD{survival.radiation}</strong>
                    <i>Sueno {survival.sleep} / fatiga {survival.fatigue} / enfermedad {survival.disease}</i>
                  </span>
                  <span>
                    <small>Tomo 9 / Loot</small>
                    <strong>{atlasLoot}</strong>
                    <i>{currentLocationState.loot.length} objetos registrados aqui</i>
                  </span>
                </div>

                <div className="fo4-atlas-actions">
                  <button className="green-button" onClick={resolveAtlasSubzone}>
                    <Search size={18} /> Resolver nodo interno
                  </button>
                  <button onClick={resolveAtlasEncounter}>
                    <Swords size={18} /> Encuentro
                  </button>
                  <button onClick={nextAtlasSubzone} disabled={atlasSubzoneIndex >= atlasSubzones.length - 1}>
                    <Footprints size={18} /> Siguiente nodo
                  </button>
                  <button onClick={improveSettlement} disabled={!atlasLocation.settlement}>
                    <Package size={18} /> Asentamiento
                  </button>
                  <button onClick={restAndRecover}>
                    <HeartPulse size={18} /> Descanso
                  </button>
                </div>
              </>
            ) : (
              <p className="fo4-atlas-empty">Cargando plantillas jugables desde templates.json.</p>
            )}
          </article>
        </section>

        <aside className="fo4-text-side">
          <div className="fo4-turn-card">
            <span><small>Turno</small><strong>{turn}</strong></span>
            <span><small>AP</small><strong>{ap}/{AP_MAX}</strong></span>
            <span><small>Bioma</small><strong>{scene.biome}</strong></span>
          </div>

          <div className="fo4-objective-card">
            <Shield size={22} />
            <span>
              <small>Objetivo</small>
              <strong>{scene.objective}</strong>
            </span>
          </div>

          {isCombat && (
            <div className="fo4-combat-card">
              <small>Combate activo</small>
              <strong>{node.threat}</strong>
              <span>{node.rule}</span>
              <div>
                <b>Turno jugador</b>
                <i>Mover 1 AP</i>
                <i>Cobertura</i>
                <i>Atacar 1 AP</i>
              </div>
            </div>
          )}

          <div className="fo4-stat-row">
            <span><small>PV</small><strong>{hp}</strong></span>
            <span><small>RAD</small><strong>{rad}</strong></span>
            <span><small>AP</small><strong>{ap}</strong></span>
            <span><small>CAPS</small><strong>{caps}</strong></span>
          </div>

          <div className="fo4-action-row">
            <button className="green-button" onClick={resolveNode} disabled={isSecured && !isCombat}>
              <Zap size={18} /> {isCombat ? "Atacar" : "Resolver"}
            </button>
            <button onClick={startTurn}>
              <HeartPulse size={18} /> Nuevo turno
            </button>
            <button onClick={() => travel(scene.nextScene)} disabled={!scene.nextScene}>
              <Footprints size={18} /> Viajar
            </button>
          </div>

          <div className="fo4-travel-row">
            <button onClick={() => travel(scene.previousScene)} disabled={!scene.previousScene}>
              <ArrowLeft size={16} /> {scene.previousScene ? getScene(scene.previousScene).title : "Inicio"}
            </button>
            <button onClick={() => travel(scene.nextScene)} disabled={!scene.nextScene}>
              {scene.nextScene ? getScene(scene.nextScene).title : "Fin"} <Footprints size={16} />
            </button>
          </div>

          {roll && (
            <div className="fo4-roll-result">
              <HeartPulse size={18} />
              <strong>Ultima tirada: {roll.dice.join(" / ")} - {roll.successes} exitos</strong>
            </div>
          )}
        </aside>
      </div>

      <section className="fo4-log-panel">
        <strong>Registro de campana</strong>
        {log.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}
      </section>
    </section>
  );
}
