import { ArrowLeft, CheckCircle2, Download, Eye, FolderOpen, Save, Search, XCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { ContentItem, GameConfig } from "../types/game";
import { contentThumbnail, gameHeroVars, resolveGameAsset } from "../lib/gameLibrary";
import type { PlatformPlayableType, PlatformRepository } from "../lib/platformContracts";

type TemplateManifest = {
  scope?: string;
  counts?: Record<string, number>;
  tomeRoles?: Array<{ id: string; name: string; role: string; playableStatus?: string }>;
  gameplayTemplates?: Array<{ id: string; name: string; rule: string; sourceTomes?: string[] }>;
  contentTemplates?: Record<"dlc" | "features" | "extras", Array<{
    id: string;
    name: string;
    status?: string;
    sourceTomes?: string[];
    adds?: string[];
    rule?: string;
  }>>;
};

type CoverageManifest = {
  coveragePolicy?: {
    exceptionsAllowed?: boolean;
    exceptions?: string[];
  };
  summary?: {
    tomes?: number;
    coverageFindings?: number;
    nonCanonicalAdditions?: number;
  };
  tomes?: Array<{
    id: string;
    fileName?: string;
    runtimeSystems?: string[];
    catalogCounts?: Record<string, number>;
  }>;
  nonCanonicalAdditions?: Array<{
    id: string;
    type: string;
    description: string;
    reason: string;
  }>;
};

type RuntimeDepthManifest = {
  summary?: {
    missions?: number;
    missionsSpecificRuntime?: number;
    missionsGenericRuntime?: number;
    missionStages?: number;
    missionNpcs?: number;
    missionRequiredItems?: number;
    locations?: number;
    locationsWithInternalMaps?: number;
    locationsWithEnemies?: number;
    bestiary?: number;
    weapons?: number;
    equipment?: number;
    settlements?: number;
    factions?: number;
    collectibles?: number;
  };
  nonCanonicalRuntime?: Array<{ id: string; reason: string }>;
};

type Props = {
  game: GameConfig;
  platformRepository?: PlatformRepository;
  canEditPlayable?: boolean;
  onBack: () => void;
  onToggle: (category: "dlc" | "features" | "extras", itemId: string) => void;
  onSetAll: (enabled: boolean) => void;
  onEditJson: () => void;
};

const playableTypes: Array<{ type: PlatformPlayableType; label: string }> = [
  { type: "missions", label: "Misiones" },
  { type: "locations", label: "Ubicaciones" },
  { type: "bestiary", label: "Bestiario" },
  { type: "weapons", label: "Armas" },
  { type: "equipment", label: "Equipo" },
  { type: "factions", label: "Facciones" },
  { type: "settlements", label: "Asentamientos" },
  { type: "weather", label: "Clima" },
  { type: "collectibles", label: "Objetos" },
];

function playableId(item: Record<string, unknown>) {
  return String(item.id ?? item.locationId ?? item.name ?? "sin_id");
}

function playableTitle(item: Record<string, unknown>) {
  return String(item.name ?? item.title ?? item.originalName ?? item.id ?? "Ficha jugable");
}

function playableDescription(item: Record<string, unknown>) {
  return String(
    item.summary ??
      item.objective ??
      item.useInPlay ??
      item.description ??
      item.rule ??
      item.activation ??
      item.location ??
      "Ficha extraida de los tomos y disponible para el runtime."
  );
}

function valueText(value: unknown, fallback = "--") {
  if (value === undefined || value === null || value === "") return fallback;
  if (Array.isArray(value)) return value.length ? value.map((item) => typeof item === "object" ? playableTitle(item as Record<string, unknown>) : String(item)).slice(0, 4).join(", ") : fallback;
  if (typeof value === "object") return JSON.stringify(value).slice(0, 120);
  return String(value);
}

function playableDetailCards(type: PlatformPlayableType, item: Record<string, unknown>) {
  const common: Array<[string, unknown]> = [
    ["ID", playableId(item)],
    ["Fuente", item.sourceTome ?? item.type ?? item.category ?? "runtime"],
  ];
  const cardsByType: Partial<Record<PlatformPlayableType, Array<[string, unknown]>>> = {
    missions: [
      ["Objetivo", item.objective ?? item.summary],
      ["Ubicacion", item.locationId ?? item.location],
      ["Nivel", item.recommendedLevel ?? item.level],
      ["Recompensa", item.reward ?? item.rewards],
      ["Etapas", item.stages],
      ["NPCs", item.npcs],
    ],
    locations: [
      ["Bioma", item.biome ?? item.category],
      ["Peligro", item.danger ?? item.risk ?? item.threat],
      ["Faccion", item.faction],
      ["Recursos", item.resources ?? item.collectibles],
      ["Encuentros", item.enemies ?? item.encounters],
      ["Mapa", item.mapId ?? item.locationMapId],
    ],
    locationMaps: [
      ["Tamanio", `${item.width ?? "--"} x ${item.height ?? "--"}`],
      ["Subzonas", item.subzones ?? item.subzoneCount],
      ["Eventos", item.events ?? item.eventCount],
      ["Amenazas", item.enemies ?? item.enemyCount],
      ["Misiones", item.missions ?? item.missionCount],
      ["Objetos", item.collectibles ?? item.collectibleCount],
    ],
    bestiary: [
      ["Tipo", item.type ?? item.category],
      ["PV", item.hp ?? item.health ?? item.pv],
      ["Defensa", item.defense ?? item.resistance],
      ["Ataques", item.attacks ?? item.attack],
      ["Botin", item.loot],
      ["Comportamiento", item.behavior ?? item.tactics],
    ],
    weapons: [
      ["Dano", item.damage ?? item.dano],
      ["Alcance", item.range ?? item.alcance],
      ["Municion", item.ammo ?? item.municion],
      ["Cadencia", item.fireRate ?? item.cadence],
      ["Rareza", item.rarity ?? item.rareza],
      ["Mods", item.mods ?? item.modifications],
    ],
    equipment: [
      ["Tipo", item.type ?? item.category],
      ["Defensa", item.defense ?? item.armor],
      ["Peso", item.weight ?? item.peso],
      ["Efectos", item.effects],
      ["Piezas", item.parts],
      ["Valor", item.value ?? item.valor],
    ],
    factions: [
      ["Rol", item.role],
      ["Reputacion", item.reputation],
      ["Aliados", item.allies],
      ["Rivales", item.enemies ?? item.rivals],
      ["Base", item.base ?? item.headquarters],
      ["Recursos", item.resources],
    ],
    settlements: [
      ["Poblacion", item.population],
      ["Felicidad", item.happiness],
      ["Comida", item.food],
      ["Agua", item.water],
      ["Defensa", item.defense],
      ["Rutas", item.routes],
    ],
    weather: [
      ["Visibilidad", item.visibility],
      ["Movimiento", item.movementModifier ?? item.movement],
      ["Dano", item.damage],
      ["Duracion", item.duration],
      ["Biomas", item.biomes],
      ["Regla", item.rule],
    ],
    collectibles: [
      ["Tipo", item.type ?? item.category],
      ["Valor", item.value ?? item.valor],
      ["Rareza", item.rarity ?? item.rareza],
      ["Uso", item.use ?? item.useInPlay],
      ["Ubicacion", item.location ?? item.locationId],
      ["Etiquetas", item.tags],
    ],
  };
  return [...common, ...(cardsByType[type] ?? [])].filter(([, value]) => value !== undefined && value !== null);
}

function ContentCard({
  item,
  category,
  game,
  onToggle,
  onSelect,
  selected,
}: {
  item: ContentItem;
  category: "dlc" | "features" | "extras";
  game: GameConfig;
  onToggle: () => void;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <article className={`content-card content-${category} ${selected ? "selected" : ""}`} onClick={onSelect}>
      <div
        className="content-icon content-image"
        style={{
          "--content-card-thumb": `url("${contentThumbnail(game, category, item.id, item.thumbnail)}")`,
          "--content-card-art": `url("${resolveGameAsset(game, game.assets?.generatedHero ?? "assets/hero/generated.png")}")`,
          "--content-card-net-art": `url("${resolveGameAsset(game, game.assets?.hero ?? "assets/hero/internet.jpg")}")`,
        } as CSSProperties}
      />
      <div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <small>ID: {item.id}</small>
        <strong>{item.enabled ? "Activado" : "Desactivado"}</strong>
      </div>
      <button
        className={`toggle-switch ${item.enabled ? "on" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        aria-label={`Alternar ${item.name}`}
      >
        <i />
      </button>
    </article>
  );
}

export function ContentScreen({ game, platformRepository, canEditPlayable = false, onBack, onToggle, onSetAll, onEditJson }: Props) {
  const [templates, setTemplates] = useState<TemplateManifest | undefined>();
  const [coverage, setCoverage] = useState<CoverageManifest | undefined>();
  const [runtimeDepth, setRuntimeDepth] = useState<RuntimeDepthManifest | undefined>();
  const [playableType, setPlayableType] = useState<PlatformPlayableType>("missions");
  const [playableQuery, setPlayableQuery] = useState("");
  const [playableItems, setPlayableItems] = useState<Record<string, unknown>[]>([]);
  const [playableTotal, setPlayableTotal] = useState(0);
  const [playableDetail, setPlayableDetail] = useState<Record<string, unknown> | undefined>();
  const [playableDetailMode, setPlayableDetailMode] = useState(false);
  const [playableStatus, setPlayableStatus] = useState("Listo");
  const [playablePatchText, setPlayablePatchText] = useState("");
  const allItems = useMemo(
    () =>
      (["dlc", "features", "extras"] as const).flatMap((category) =>
        game.content[category].map((item) => ({ item, category }))
      ),
    [game]
  );
  const [selectedKey, setSelectedKey] = useState(() => allItems[0] ? `${allItems[0].category}:${allItems[0].item.id}` : "");
  const selected = allItems.find((entry) => `${entry.category}:${entry.item.id}` === selectedKey) ?? allItems[0];
  const selectedTemplate = selected
    ? templates?.contentTemplates?.[selected.category]?.find((item) => item.id === selected.item.id)
    : undefined;

  useEffect(() => {
    setSelectedKey(allItems[0] ? `${allItems[0].category}:${allItems[0].item.id}` : "");
  }, [game.id]);

  useEffect(() => {
    let cancelled = false;
    const templatePath = resolveGameAsset(game, game.templates);
    if (!templatePath) {
      setTemplates(undefined);
      return;
    }

    fetch(templatePath)
      .then((response) => response.ok ? response.json() : undefined)
      .then((data) => {
        if (!cancelled) setTemplates(data);
      })
      .catch(() => {
        if (!cancelled) setTemplates(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [game]);

  useEffect(() => {
    let cancelled = false;
    setPlayableStatus("Cargando fichas...");
    setPlayableDetail(undefined);

    const load = platformRepository
      ? platformRepository.playable.list<Record<string, unknown>>(game.id, playableType, { q: playableQuery, limit: 50 })
      : fetch(`/games/${game.id}/runtime/playable-editor-index.json`)
          .then((response) => (response.ok ? response.json() : undefined))
          .then((runtime) => {
            const catalogs = runtime?.catalogs ?? {};
            const rules = runtime?.rules ?? {};
            const items =
              playableType === "weather"
                ? rules.weatherEffects ?? []
                : playableType === "biomes"
                  ? rules.biomes ?? []
                  : catalogs[playableType] ?? [];
            const q = playableQuery.trim().toLowerCase();
            const filtered = q ? items.filter((item: unknown) => JSON.stringify(item).toLowerCase().includes(q)) : items;
            return { gameId: game.id, type: playableType, total: filtered.length, offset: 0, limit: 50, items: filtered.slice(0, 50) };
          });

    load
      .then((result) => {
        if (cancelled) return;
        setPlayableItems(result.items ?? []);
        setPlayableTotal(result.total ?? result.items?.length ?? 0);
        setPlayableStatus("Listo");
      })
      .catch(() => {
        if (cancelled) return;
        setPlayableItems([]);
        setPlayableTotal(0);
        setPlayableStatus("No se pudo cargar desde backend/local runtime");
      });

    return () => {
      cancelled = true;
    };
  }, [game.id, platformRepository, playableQuery, playableType]);

  function openPlayableDetail(item: Record<string, unknown>) {
    const id = playableId(item);
    setPlayableStatus("Cargando detalle...");
    setPlayableDetail(item);
    setPlayableDetailMode(true);
    setPlayablePatchText(JSON.stringify({ adminNotes: String(item.adminNotes ?? "") }, null, 2));

    platformRepository?.playable
      .detail<Record<string, unknown>>(game.id, playableType, id)
      .then((detail) => {
        setPlayableDetail(detail);
        setPlayablePatchText(JSON.stringify({ adminNotes: String(detail.adminNotes ?? "") }, null, 2));
        setPlayableStatus("Detalle cargado desde backend local");
      })
      .catch(() => setPlayableStatus("Detalle cargado desde indice local"));
  }

  function savePlayablePatch() {
    if (!platformRepository || !playableDetail) return;
    let patch: Record<string, unknown>;
    try {
      patch = JSON.parse(playablePatchText || "{}");
    } catch {
      setPlayableStatus("JSON de cambios invalido");
      return;
    }

    const id = playableId(playableDetail);
    setPlayableStatus("Guardando ficha...");
    platformRepository.playable
      .save<Record<string, unknown>>(game.id, playableType, id, patch)
      .then((saved) => {
        setPlayableDetail({ ...playableDetail, ...saved });
        setPlayableStatus("Ficha guardada en backend local");
      })
      .catch(() => setPlayableStatus("Error guardando ficha en backend local"));
  }

  useEffect(() => {
    let cancelled = false;
    const runtimePath = resolveGameAsset(game, game.manifests?.runtimeDepth);
    if (!runtimePath) {
      setRuntimeDepth(undefined);
      return;
    }

    fetch(runtimePath)
      .then((response) => response.ok ? response.json() : undefined)
      .then((data) => {
        if (!cancelled) setRuntimeDepth(data);
      })
      .catch(() => {
        if (!cancelled) setRuntimeDepth(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [game]);

  useEffect(() => {
    let cancelled = false;
    const coveragePath = resolveGameAsset(game, game.manifests?.coverage);
    if (!coveragePath) {
      setCoverage(undefined);
      return;
    }

    fetch(coveragePath)
      .then((response) => response.ok ? response.json() : undefined)
      .then((data) => {
        if (!cancelled) setCoverage(data);
      })
      .catch(() => {
        if (!cancelled) setCoverage(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [game]);

  function exportConfig() {
    const blob = new Blob([JSON.stringify(game, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${game.id}.game.config.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (playableDetailMode && playableDetail) {
    return (
      <section className="screen-panel content-screen playable-detail-screen">
        <div className="screen-heading">
          <div>
            <h2><Eye size={34} /> {playableTitle(playableDetail)}</h2>
            <p>{String(playableDetail.sourceTome ?? playableType)} - {playableId(playableDetail)}</p>
          </div>
          <button onClick={() => setPlayableDetailMode(false)}><ArrowLeft size={18} /> Volver a fichas</button>
        </div>

        <article className="content-section playable-detail-expanded">
          <div className="content-section-head">
            <div>
              <h3>Ficha jugable</h3>
              <p>{playableDescription(playableDetail)}</p>
            </div>
            <span>{playableStatus}</span>
          </div>
          <div className="playable-detail-grid">
            <section className="playable-operational-sheet">
              {playableDetailCards(playableType, playableDetail).map(([label, value]) => (
                <span key={label}>
                  <strong>{label}</strong>
                  <small>{valueText(value)}</small>
                </span>
              ))}
            </section>
            <section className="playable-facts expanded">
              <h4>Datos completos de la ficha</h4>
              {Object.entries(playableDetail).map(([key, value]) => (
                <span key={key}>
                  <strong>{key}</strong>
                  <small>{typeof value === "object" ? JSON.stringify(value).slice(0, 240) : String(value)}</small>
                </span>
              ))}
            </section>
            <aside className="playable-patch-editor expanded">
              {canEditPlayable ? (
                <>
                  <label>
                    Cambios controlados por backend
                    <textarea value={playablePatchText} onChange={(event) => setPlayablePatchText(event.target.value)} />
                  </label>
                  <button className="green-button" onClick={savePlayablePatch}><Save size={16} /> Guardar ficha</button>
                </>
              ) : (
                <div className="admin-empty-state"><Eye size={22} /><strong>Solo lectura</strong><span>El detalle se consulta desde el backend local.</span></div>
              )}
            </aside>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section
      className="screen-panel content-screen"
      style={gameHeroVars(game) as CSSProperties}
    >
      <div className="screen-heading back-heading">
        <div>
          <h2>DLC, features y extras</h2>
          <p>Todo se lee desde el game.config.json del juego activo.</p>
        </div>
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>
      </div>

      <div className="content-top">
        <div className="content-select">
          <strong>Juego activo</strong>
          <span>{game.name}</span>
          <small>{game.description}</small>
        </div>

        <div className="content-select">
          <strong>Archivo</strong>
          <span><FolderOpen size={36} /> {game.configPath ?? `games/${game.id}/game.config.json`}</span>
          <div className="inline-actions">
            <button onClick={exportConfig}><Download size={16} /> Exportar config JSON</button>
            <button onClick={onEditJson}>Editar formulario</button>
          </div>
        </div>
      </div>

      {selected && (
        <article
          className="content-detail-panel"
          style={{
            "--content-card-thumb": `url("${contentThumbnail(game, selected.category, selected.item.id, selected.item.thumbnail)}")`,
            "--content-card-art": `url("${resolveGameAsset(game, game.assets?.generatedHero ?? "assets/hero/generated.png")}")`,
            "--content-card-net-art": `url("${resolveGameAsset(game, game.assets?.hero ?? "assets/hero/internet.jpg")}")`,
          } as CSSProperties}
        >
          <div className="content-detail-art" />
          <div>
            <small>
              {selected.category === "dlc"
                ? "Expansion / contenido"
                : selected.category === "features"
                  ? "Feature / regla"
                  : "Extra"}
            </small>
            <h3>{selected.item.name}</h3>
            <p>{selected.item.description || "Modulo listo para completar con reglas, escenas y recompensas propias."}</p>
            <div className="detail-facts">
              <span>ID: {selected.item.id}</span>
              <span>{selected.item.enabled ? "Activado" : "Desactivado"}</span>
              <span>Asset: {contentThumbnail(game, selected.category, selected.item.id, selected.item.thumbnail)}</span>
              {selectedTemplate?.sourceTomes?.length ? <span>Tomos: {selectedTemplate.sourceTomes.join(", ")}</span> : null}
            </div>
          </div>
          <div className="content-detail-adds">
            <strong>Agrega a la partida</strong>
            <p>
              {selectedTemplate?.adds?.length
                ? selectedTemplate.adds.join(", ")
                : selected.category === "dlc"
                ? "Nueva zona, escenas, enemigos, recompensas y reglas opcionales asociadas al contenido."
                : selected.category === "features"
                  ? "Mecanica activa para modificar tiradas, progresion, exploracion o combate."
                  : "Encuentros, eventos o variantes de ambientacion para enriquecer la campana."}
            </p>
            {selectedTemplate?.rule && <small>{selectedTemplate.rule}</small>}
            <button
              className={`fake-toggle label-toggle ${selected.item.enabled ? "on" : ""}`}
              onClick={() => onToggle(selected.category, selected.item.id)}
            >
              {selected.item.enabled ? "Activado" : "Desactivado"}
            </button>
          </div>
        </article>
      )}

      {templates && (
        <article className="template-coverage-panel">
          <div>
            <small>Plantillas jugables</small>
            <h3>Mapa core-book</h3>
            <p>{templates.scope}</p>
          </div>
          <div className="template-count-grid">
            {Object.entries(templates.counts ?? {}).map(([key, value]) => (
              <span key={key}>
                <strong>{value}</strong>
                <small>{key}</small>
              </span>
            ))}
          </div>
          <div className="template-source-grid">
            {(templates.tomeRoles ?? []).map((tome) => (
              <span key={tome.id}>
                <strong>{tome.id}</strong>
                <small>{tome.name}</small>
              </span>
            ))}
          </div>
        </article>
      )}

      {templates?.gameplayTemplates?.length ? (
        <div className="content-section template-content-section">
          <h3>Plantillas de juego base</h3>
          <div className="template-card-grid">
            {templates.gameplayTemplates.map((template) => (
              <article key={template.id}>
                <small>{template.sourceTomes?.join(" + ")}</small>
                <strong>{template.name}</strong>
                <p>{template.rule}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {coverage && (
        <article className="template-coverage-panel core-coverage-panel">
          <div>
            <small>Cobertura total</small>
            <h3>Tomos aplicados</h3>
            <p>
              {coverage.summary?.tomes ?? 0} tomos trazados. Hallazgos: {coverage.summary?.coverageFindings ?? 0}.
              Excepciones: {coverage.coveragePolicy?.exceptions?.length ?? 0}.
            </p>
          </div>
          <div className="template-source-grid">
            {(coverage.tomes ?? []).map((tome) => (
              <span key={tome.id}>
                <strong>{tome.id}</strong>
                <small>{tome.runtimeSystems?.length ?? 0} sistemas / {Object.values(tome.catalogCounts ?? {}).reduce((sum, value) => sum + value, 0)} datos</small>
              </span>
            ))}
          </div>
          <div className="template-card-grid">
            {(coverage.nonCanonicalAdditions ?? []).map((item) => (
              <article key={item.id}>
                <small>{item.type}</small>
                <strong>{item.id}</strong>
                <p>{item.description}</p>
                <p>{item.reason}</p>
              </article>
            ))}
          </div>
        </article>
      )}

      {runtimeDepth?.summary && (
        <article className="template-coverage-panel runtime-depth-panel">
          <div>
            <small>Profundidad jugable</small>
            <h3>Runtime Fallout 4</h3>
            <p>
              {runtimeDepth.summary.missions ?? 0} misiones y {runtimeDepth.summary.locations ?? 0} ubicaciones convertidas a flujo textual.
              Especificas: {runtimeDepth.summary.missionsSpecificRuntime ?? 0}. Genericas: {runtimeDepth.summary.missionsGenericRuntime ?? 0}.
              Etapas exactas: {runtimeDepth.summary.missionStages ?? 0}.
            </p>
          </div>
          <div className="template-count-grid">
            <span><strong>{runtimeDepth.summary.locationsWithInternalMaps ?? 0}</strong><small>mapas internos</small></span>
            <span><strong>{runtimeDepth.summary.missionStages ?? 0}</strong><small>etapas mision</small></span>
            <span><strong>{runtimeDepth.summary.missionNpcs ?? 0}</strong><small>npc mision</small></span>
            <span><strong>{runtimeDepth.summary.missionRequiredItems ?? 0}</strong><small>objetos mision</small></span>
            <span><strong>{runtimeDepth.summary.locationsWithEnemies ?? 0}</strong><small>con enemigos</small></span>
            <span><strong>{runtimeDepth.summary.bestiary ?? 0}</strong><small>bestiario</small></span>
            <span><strong>{runtimeDepth.summary.weapons ?? 0}</strong><small>armas</small></span>
            <span><strong>{runtimeDepth.summary.equipment ?? 0}</strong><small>equipo</small></span>
            <span><strong>{runtimeDepth.summary.settlements ?? 0}</strong><small>asentamientos</small></span>
            <span><strong>{runtimeDepth.summary.factions ?? 0}</strong><small>facciones</small></span>
            <span><strong>{runtimeDepth.summary.collectibles ?? 0}</strong><small>coleccionables</small></span>
          </div>
          <div className="template-card-grid">
            {(runtimeDepth.nonCanonicalRuntime ?? []).map((item) => (
              <article key={item.id}>
                <small>Agregado runtime</small>
                <strong>{item.id}</strong>
                <p>{item.reason}</p>
              </article>
            ))}
          </div>
        </article>
      )}

      <section className="content-section playable-content-manager">
        <div className="content-section-head">
          <div>
            <h3>Fichas jugables desde backend local</h3>
            <p>Misiones, ubicaciones, enemigos, armas, equipo, facciones, asentamientos, clima y objetos se cargan como detalle real por ficha.</p>
          </div>
          <span>{playableStatus}</span>
        </div>

        <div className="playable-toolbar">
          <label>
            <Search size={17} />
            <input value={playableQuery} onChange={(event) => setPlayableQuery(event.target.value)} placeholder="Buscar ficha, tomo, ubicacion o regla" />
          </label>
          <select value={playableType} onChange={(event) => setPlayableType(event.target.value as PlatformPlayableType)}>
            {playableTypes.map((entry) => <option key={entry.type} value={entry.type}>{entry.label}</option>)}
          </select>
          <strong>{playableTotal} fichas</strong>
        </div>

        <div className="playable-detail-layout">
          <div className="admin-table-wrap playable-table-wrap">
            <table className="admin-data-table playable-table">
              <thead>
                <tr>
                  <th>Ficha</th>
                  <th>Fuente</th>
                  <th>Uso jugable</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {playableItems.map((item) => (
                  <tr key={playableId(item)} className={playableDetail && playableId(playableDetail) === playableId(item) ? "selected" : ""}>
                    <td><strong>{playableTitle(item)}</strong><small>{playableId(item)}</small></td>
                    <td>{String(item.sourceTome ?? item.type ?? item.category ?? "runtime")}</td>
                    <td>{playableDescription(item).slice(0, 140)}</td>
                    <td><button onClick={() => openPlayableDetail(item)}><Eye size={15} /> Ver ficha</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="playable-detail-panel">
            {playableDetail ? (
              <>
                <small>{String(playableDetail.sourceTome ?? playableType)}</small>
                <h3>{playableTitle(playableDetail)}</h3>
                <p>{playableDescription(playableDetail)}</p>
                <div className="playable-operational-sheet compact">
                  {playableDetailCards(playableType, playableDetail).slice(0, 8).map(([label, value]) => (
                    <span key={label}>
                      <strong>{label}</strong>
                      <small>{valueText(value)}</small>
                    </span>
                  ))}
                </div>
                <div className="playable-facts">
                  {Object.entries(playableDetail).slice(0, 16).map(([key, value]) => (
                    <span key={key}>
                      <strong>{key}</strong>
                      <small>{typeof value === "object" ? `${Array.isArray(value) ? value.length : Object.keys(value ?? {}).length} elementos` : String(value)}</small>
                    </span>
                  ))}
                </div>
                {canEditPlayable && (
                  <div className="playable-patch-editor">
                    <label>
                      Cambios controlados
                      <textarea value={playablePatchText} onChange={(event) => setPlayablePatchText(event.target.value)} />
                    </label>
                    <button className="green-button" onClick={savePlayablePatch}><Save size={16} /> Guardar ficha</button>
                  </div>
                )}
              </>
            ) : (
              <div className="admin-empty-state">
                <Eye size={22} />
                <strong>Selecciona una ficha</strong>
                <span>El detalle se carga desde el endpoint local correspondiente.</span>
              </div>
            )}
          </aside>
        </div>
      </section>

      <div className="content-section campaign-content-section">
        <h3>Campañas</h3>
        <div className="content-grid">
          {game.campaigns.map((campaign) => (
            <article className="content-card content-campaign" key={campaign.id}>
              <div
                className="content-icon content-image"
                style={{
                  "--content-card-thumb": `url("${resolveGameAsset(game, campaign.image ?? game.assets?.campaignImage ?? game.assets?.hero ?? "assets/hero/internet.jpg")}")`,
                  "--content-card-art": `url("${resolveGameAsset(game, game.assets?.generatedHero ?? "assets/hero/generated.png")}")`,
                  "--content-card-net-art": `url("${resolveGameAsset(game, game.assets?.hero ?? "assets/hero/internet.jpg")}")`,
                } as CSSProperties}
              />
              <div>
                <h3>{campaign.title}</h3>
                <p>{campaign.description}</p>
                <small>ID: {campaign.id}</small>
                <strong>{campaign.implemented ? "Jugable" : "Plantilla futura"}</strong>
              </div>
            </article>
          ))}
        </div>
      </div>

      {(["dlc", "features", "extras"] as const).map((category) => (
        <div className="content-section" key={category}>
          <h3>{category === "dlc" ? "DLC / expansiones" : category === "features" ? "Features / reglas del juego" : "Extras"}</h3>
          <div className="content-grid">
            {game.content[category].map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                category={category}
                game={game}
                onToggle={() => onToggle(category, item.id)}
                onSelect={() => setSelectedKey(`${category}:${item.id}`)}
                selected={selectedKey === `${category}:${item.id}`}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="bottom-actions">
        <button onClick={() => onSetAll(true)}><CheckCircle2 size={18} /> Activar todo</button>
        <button onClick={() => onSetAll(false)}><XCircle size={18} /> Desactivar todo</button>
        <button className="green-button" onClick={exportConfig}><Save size={18} /> Guardar contenido</button>
      </div>
    </section>
  );
}
