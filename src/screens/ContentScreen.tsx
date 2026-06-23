import { ArrowLeft, CheckCircle2, Download, FolderOpen, Save, XCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { ContentItem, GameConfig } from "../types/game";
import { contentThumbnail, gameHeroVars, resolveGameAsset } from "../lib/gameLibrary";

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
  onBack: () => void;
  onToggle: (category: "dlc" | "features" | "extras", itemId: string) => void;
  onSetAll: (enabled: boolean) => void;
  onEditJson: () => void;
};

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

export function ContentScreen({ game, onBack, onToggle, onSetAll, onEditJson }: Props) {
  const [templates, setTemplates] = useState<TemplateManifest | undefined>();
  const [coverage, setCoverage] = useState<CoverageManifest | undefined>();
  const [runtimeDepth, setRuntimeDepth] = useState<RuntimeDepthManifest | undefined>();
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
            </p>
          </div>
          <div className="template-count-grid">
            <span><strong>{runtimeDepth.summary.locationsWithInternalMaps ?? 0}</strong><small>mapas internos</small></span>
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
