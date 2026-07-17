import { ArrowLeft, CalendarDays, CloudRain, Crosshair, Database, Globe2, ListChecks, Radiation, ShieldPlus, Skull, Utensils, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { GameConfig } from "../types/game";
import { resolveGameAsset } from "../lib/gameLibrary";

type Props = {
  game: GameConfig;
  onBack: () => void;
};

type TomeEntry = {
  id: string;
  number: number;
  title: string;
  category: string;
  summary: string;
  path: string;
};

type TomeManifest = {
  id: string;
  title: string;
  version?: string;
  usage?: string;
  sharedMechanics?: string[];
  books: TomeEntry[];
};

type BusinessRules = {
  purpose: string;
  generatedAt: string;
  playableCounts: Record<string, unknown>;
  inheritanceContract?: {
    description: string;
    inheritedByDefault: string[];
    overridePerGame: string[];
  };
  domains: Array<{
    id: string;
    tomeId: string;
    title: string;
    description: string;
    runtime: Array<{ path: string; count: unknown }>;
    metrics: { characters: number; headings: number; tables: number };
    businessObjects: Array<{ id: string; title: string; sourceLine: number; status: string }>;
  }>;
};

const initialRules = [
  { name: "Eventos por turnos", description: "Eventos menores, de zona y mundiales.", enabled: true, icon: CalendarDays },
  { name: "Clima", description: "Lluvia, niebla, tormentas y ambiente.", enabled: true, icon: CloudRain },
  { name: "Dia y noche", description: "Bloques horarios y vision.", enabled: true, icon: Zap },
  { name: "Supervivencia", description: "Sed, hambre, sueno y recursos.", enabled: false, icon: Utensils },
  { name: "Radiacion", description: "Zonas contaminadas y tormentas.", enabled: true, icon: Radiation },
  { name: "Municion", description: "Control real de municion.", enabled: true, icon: Database },
  { name: "Loot", description: "Busqueda de objetos.", enabled: true, icon: ListChecks },
  { name: "IA enemiga", description: "Comportamientos automaticos.", enabled: true, icon: Skull },
  { name: "Ataque de oportunidad", description: "Salir de melee puede provocar golpe.", enabled: true, icon: Crosshair },
  { name: "Cobertura", description: "Cobertura ligera, media y pesada.", enabled: true, icon: ShieldPlus },
  { name: "Dano hardcore", description: "Mas letalidad.", enabled: false, icon: Skull },
  { name: "Eventos mundiales", description: "Eventos regionales.", enabled: true, icon: Globe2 },
];

const presets = [
  { id: "classic", label: "Clasico", description: "Experiencia estandar equilibrada.", icon: Zap },
  { id: "survival", label: "Supervivencia", description: "Mas desafio, menos recursos.", icon: Radiation },
  { id: "narrative", label: "Narrativo", description: "Mas historia, menos dificultad.", icon: ListChecks },
  { id: "tactical", label: "Tactico", description: "Combate estrategico y realista.", icon: Crosshair },
];

export function RulesScreen({ game, onBack }: Props) {
  const [selectedPreset, setSelectedPreset] = useState("classic");
  const [rules, setRules] = useState(initialRules);
  const [manifest, setManifest] = useState<TomeManifest | null>(null);
  const [selectedTomeId, setSelectedTomeId] = useState("");
  const [tomeText, setTomeText] = useState("");
  const [search, setSearch] = useState("");
  const [loadingTome, setLoadingTome] = useState(false);
  const [businessRules, setBusinessRules] = useState<BusinessRules | null>(null);

  const selectedTome = manifest?.books.find((book) => book.id === selectedTomeId) ?? manifest?.books[0];
  const manifestPath = resolveGameAsset(game, game.rulesLibrary);
  const businessRulesPath = resolveGameAsset(game, game.businessRules);
  const manifestBasePath = manifestPath?.replace(/\/[^/]*$/, "");
  const textPreview = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tomeText.slice(0, 7000);
    const index = tomeText.toLowerCase().indexOf(query);
    if (index < 0) return tomeText.slice(0, 2500);
    return tomeText.slice(Math.max(0, index - 1200), Math.min(tomeText.length, index + 5800));
  }, [search, tomeText]);

  useEffect(() => {
    let active = true;
    setManifest(null);
    setSelectedTomeId("");
    setTomeText("");
    if (!manifestPath) return;
    fetch(manifestPath)
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload: TomeManifest | undefined) => {
        if (!active || !payload) return;
        setManifest(payload);
        setSelectedTomeId(payload.books[0]?.id ?? "");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [manifestPath]);

  useEffect(() => {
    let active = true;
    setBusinessRules(null);
    if (!businessRulesPath) return;
    fetch(businessRulesPath)
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload: BusinessRules | undefined) => {
        if (active && payload) setBusinessRules(payload);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [businessRulesPath]);

  useEffect(() => {
    let active = true;
    setTomeText("");
    if (!selectedTome || !manifestBasePath) return;
    setLoadingTome(true);
    fetch(`${manifestBasePath}/${selectedTome.path}`)
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        if (active) setTomeText(text);
      })
      .catch(() => {
        if (active) setTomeText("");
      })
      .finally(() => {
        if (active) setLoadingTome(false);
      });
    return () => {
      active = false;
    };
  }, [manifestBasePath, selectedTome]);

  function toggleRule(name: string) {
    setRules((current) =>
      current.map((rule) => rule.name === name ? { ...rule, enabled: !rule.enabled } : rule)
    );
  }

  return (
    <section className="rules-layout">
      <aside className="preset-panel">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>
        <h3>Presets</h3>
        {presets.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              className={`preset-card ${selectedPreset === preset.id ? "selected" : ""}`}
              key={preset.id}
              onClick={() => setSelectedPreset(preset.id)}
            >
              <span><Icon size={34} /></span>
              <strong>{preset.label}</strong>
              <small>{preset.description}</small>
            </button>
          );
        })}
        <div className="apply-preset-box">
          <strong>Aplicar preset</strong>
          <p>Aplica la configuracion seleccionada.</p>
          <button className="apply-preset">Aplicar preset</button>
        </div>
      </aside>

      <main className="rules-panel">
        <h2>Reglas globales</h2>
        <p>Configura las reglas que afectan a toda tu partida. Juego activo: {game.name}.</p>

        {businessRules && (
          <section className="rules-business-engine">
            <div className="rules-tome-heading">
              <div>
                <strong>Motor Fallout 4 integrado</strong>
                <p>{businessRules.purpose}</p>
              </div>
              <span>{new Date(businessRules.generatedAt).toLocaleDateString()}</span>
            </div>
            <div className="rules-runtime-counts">
              {Object.entries(businessRules.playableCounts).slice(0, 6).map(([key, value]) => (
                <span key={key}><strong>{typeof value === "object" ? Object.keys(value as Record<string, unknown>).length : String(value)}</strong><small>{key}</small></span>
              ))}
            </div>
            <div className="rules-business-domain-grid">
              {businessRules.domains.map((domain) => (
                <article key={domain.id}>
                  <header>
                    <strong>{domain.id}</strong>
                    <small>{domain.tomeId}</small>
                  </header>
                  <h3>{domain.title}</h3>
                  <p>{domain.description}</p>
                  <footer>
                    <span>{domain.businessObjects.length} objetos indexados</span>
                    <span>{domain.runtime.length} modulos runtime</span>
                  </footer>
                </article>
              ))}
            </div>
            {businessRules.inheritanceContract && (
              <div className="rules-inheritance-card">
                <strong>Base para otros juegos</strong>
                <p>{businessRules.inheritanceContract.description}</p>
                <div>
                  {businessRules.inheritanceContract.inheritedByDefault.map((item) => <span key={item}>{item}</span>)}
                </div>
              </div>
            )}
          </section>
        )}

        {manifest && (
          <section className="rules-tome-library">
            <div className="rules-tome-heading">
              <div>
                <strong>Fuentes trazables de tomos</strong>
                <p>Consulta puntual del texto original para auditar de donde sale cada regla de negocio.</p>
              </div>
              <span>{manifest.version}</span>
            </div>
            <div className="rules-mechanics-tags">
              {(manifest.sharedMechanics ?? []).slice(0, 12).map((mechanic) => <span key={mechanic}>{mechanic}</span>)}
            </div>
            <div className="rules-tome-workbench">
              <aside className="rules-tome-list">
                {manifest.books.map((book) => (
                  <button key={book.id} className={book.id === selectedTome?.id ? "selected" : ""} onClick={() => setSelectedTomeId(book.id)}>
                    <strong>Tomo {String(book.number).padStart(2, "0")}</strong>
                    <span>{book.title}</span>
                    <small>{book.category}</small>
                  </button>
                ))}
              </aside>
              <article className="rules-tome-reader">
                <header>
                  <div>
                    <strong>{selectedTome ? `Tomo ${String(selectedTome.number).padStart(2, "0")} - ${selectedTome.title}` : "Selecciona un tomo"}</strong>
                    <p>{selectedTome?.summary}</p>
                  </div>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en el tomo..." />
                </header>
                <pre>{loadingTome ? "Cargando tomo..." : textPreview || "Sin contenido cargado."}</pre>
                {tomeText.length > textPreview.length && <small>Vista parcial optimizada. Usa buscar para saltar a un tema dentro del tomo.</small>}
              </article>
            </div>
          </section>
        )}

        <div className="rules-grid">
          {rules.map((rule) => {
            const Icon = rule.icon;
            return (
              <article className="rule-card" key={rule.name}>
                <div className="rule-icon"><Icon size={34} /></div>
                <div>
                  <h3>{rule.name}</h3>
                  <p>{rule.description}</p>
                  <strong>{rule.enabled ? "Activada" : "Desactivada"}</strong>
                </div>
                <button className={`toggle-switch ${rule.enabled ? "on" : ""}`} onClick={() => toggleRule(rule.name)} aria-label={`Alternar ${rule.name}`}>
                  <i />
                </button>
              </article>
            );
          })}
        </div>

        <div className="rules-footer">
          <div>
            <strong>Modifica las reglas globales</strong>
            <p>Los cambios se aplicaran a la partida actual y futuras partidas nuevas.</p>
          </div>
          <button onClick={() => setRules(initialRules)}>Restaurar</button>
          <button className="green-button">Guardar reglas</button>
        </div>
      </main>
    </section>
  );
}
