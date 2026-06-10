import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Filter, Plus, Search, Settings, Star } from "lucide-react";
import type { GameConfig } from "../types/game";

type Props = {
  games: GameConfig[];
  activeId: string;
  onSelect: (gameId: string) => void;
  onConfigure: (gameId: string) => void;
  onCreateGame: () => void;
  onBack: () => void;
};

type SortMode = "name" | "active" | "content";

export function LibraryScreen({ games, activeId, onSelect, onConfigure, onCreateGame, onBack }: Props) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [installedOnly, setInstalledOnly] = useState(false);

  const activeContentCount = games
    .flatMap((game) => Object.values(game.content).flat())
    .filter((item) => item.enabled).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = games.filter((game) => {
      if (installedOnly && game.templateFuture) return false;
      if (!q) return true;

      const contentIndex = Object.values(game.content)
        .flat()
        .map((item) => `${item.id} ${item.name} ${item.description ?? ""}`)
        .join(" ");
      const searchIndex = [game.id, game.name, game.short, game.description, ...(game.tags ?? []), contentIndex].join(" ");
      return searchIndex.toLowerCase().includes(q);
    });

    return visible.sort((a, b) => {
      if (sortMode === "active") return Number(b.id === activeId) - Number(a.id === activeId);
      if (sortMode === "content") {
        return Object.values(b.content).flat().length - Object.values(a.content).flat().length;
      }
      return a.name.localeCompare(b.name);
    });
  }, [activeId, games, installedOnly, query, sortMode]);

  return (
    <section className="screen-panel library-screen-ref">
      <div className="library-ref-head">
        <div className="library-title-block">
          <h2>Biblioteca de juegos <span><Settings size={44} /></span></h2>
          <p>Gestiona tus juegos, instalaciones y configuraciones personalizadas.</p>
        </div>

        <aside className="library-state-panel">
          <div className="library-state-top">
            <strong>Estado de tu biblioteca</strong>
            <button onClick={onBack}><ArrowLeft size={18} /> Volver</button>
          </div>
          <div className="library-state-grid">
            <span><strong>{games.filter((game) => !game.templateFuture).length}</strong><small>Instalados</small></span>
            <span><strong>{games.length}</strong><small>Disponibles</small></span>
            <span><strong>{activeContentCount}</strong><small>Contenido activo</small></span>
            <span><strong>1.2 TB</strong><small>Espacio usado</small></span>
          </div>
        </aside>
      </div>

      <div className="library-ref-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar juego instalado o disponible... Ej: fallout, skyrim, stalker"
          />
        </label>

        <button className={`filter-button ${installedOnly ? "selected" : ""}`} onClick={() => setInstalledOnly((value) => !value)}>
          <Filter size={16} /> Filtros
        </button>

        <button className="green-button create-game-button" onClick={onCreateGame}>
          <Plus size={16} /> Nuevo juego
        </button>

        <label className="sort-field">
          <span>Ordenar por:</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="name">Nombre (A-Z)</option>
            <option value="active">Seleccionado</option>
            <option value="content">Contenido</option>
          </select>
        </label>
      </div>

      <div className="library-ref-grid">
        {filtered.map((game) => {
          const active = game.id === activeId;
          const contentCount = Object.values(game.content).flat().length;
          const installed = !game.templateFuture;

          return (
            <article key={game.id} className={`library-ref-card game-${game.id} ${active ? "active" : ""}`}>
              <div className="library-card-art" />
              <span className={`library-install-badge ${installed ? "installed" : ""}`}>
                {installed ? "Instalado" : "No instalado"}
              </span>
              <button className="library-star" aria-label={`Marcar ${game.name} como favorito`}><Star size={18} /></button>

              <div className="library-card-copy">
                <h3>{game.name}</h3>
                <p>{game.description}</p>
              </div>

              <div className="library-card-tags">
                <span>{contentCount} contenidos activos</span>
                <span>{installed ? "Config personalizado" : "Config disponible"}</span>
              </div>

              <small className="config-path">games/{game.id}/game.config.json</small>

              <div className="library-card-actions">
                <button onClick={() => onConfigure(game.id)}>{installed ? "Configurar" : "Instalar"}</button>
                <button className={active ? "selected-action" : "green-button"} onClick={() => onSelect(game.id)}>
                  {active ? <><CheckCircle size={15} /> Seleccionado</> : "Seleccionar"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <p className="library-ref-footer">Selecciona un juego para ver detalles, configuraciones y contenidos.</p>
    </section>
  );
}
