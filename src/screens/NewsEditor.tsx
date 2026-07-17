import { useMemo, useState } from "react";
import { Archive, CalendarClock, Eye, FilePenLine, Newspaper, Plus, Search, Send, Trash2 } from "lucide-react";
import type { AppNewsEntry } from "../lib/appMetadataStorage";
import type { GameConfig } from "../types/game";

type Props = {
  news: AppNewsEntry[];
  games: GameConfig[];
  onChange: (news: AppNewsEntry[]) => void;
};

type NewsStatus = NonNullable<AppNewsEntry["status"]>;

function toDateTimeInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromDateTimeInput(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function createNewsEntry(gameId?: string): AppNewsEntry {
  const now = new Date().toISOString();
  return {
    id: `news_${Date.now()}`,
    title: "Nueva noticia",
    summary: "Resumen corto para portada y login.",
    body: "Detalle completo de la noticia o actualizacion.",
    gameId: gameId ?? "platform",
    image: "/platform/wasteland-hero.png",
    gallery: [],
    status: "draft",
    scheduledAt: now,
    publishedAt: now,
    updatedAt: now,
  };
}

function visibleDate(entry: AppNewsEntry) {
  return entry.scheduledAt ?? entry.publishedAt;
}

function isVisible(entry: AppNewsEntry) {
  if ((entry.status ?? "published") !== "published") return false;
  return new Date(entry.publishedAt).getTime() <= Date.now();
}

export function NewsEditor({ news, games, onChange }: Props) {
  const activeGames = games.filter((game) => game.enabled !== false);
  const [selectedId, setSelectedId] = useState(news[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<NewsStatus | "all">("all");
  const [gameFilter, setGameFilter] = useState("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const selected = news.find((entry) => entry.id === selectedId) ?? news[0];
  const locked = selected ? (selected.status ?? "published") === "published" || selected.status === "archived" : false;

  const filteredNews = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...news]
      .sort((left, right) => new Date(visibleDate(right)).getTime() - new Date(visibleDate(left)).getTime())
      .filter((entry) => {
        const status = entry.status ?? "published";
        const matchesStatus = statusFilter === "all" || status === statusFilter;
        const matchesGame = gameFilter === "all" || (entry.gameId ?? "platform") === gameFilter;
        const matchesQuery =
          !query ||
          [entry.title, entry.summary, entry.body, entry.gameId]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
        return matchesStatus && matchesGame && matchesQuery;
      });
  }, [gameFilter, news, search, statusFilter]);

  const counts = useMemo(() => {
    return news.reduce(
      (summary, entry) => {
        const status = entry.status ?? "published";
        summary[status] += 1;
        if (isVisible(entry)) summary.visible += 1;
        return summary;
      },
      { draft: 0, scheduled: 0, published: 0, archived: 0, visible: 0 } as Record<NewsStatus | "visible", number>
    );
  }, [news]);

  function emit(nextNews: AppNewsEntry[]) {
    onChange(nextNews);
  }

  function addNews() {
    const next = createNewsEntry(activeGames[0]?.id);
    emit([next, ...news]);
    setSelectedId(next.id);
    setDetailOpen(true);
  }

  function updateNews(id: string, patch: Partial<AppNewsEntry>) {
    if (locked) return;
    emit(news.map((entry) => (entry.id === id ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry)));
  }

  function deleteNews(id: string) {
    const nextNews = news.filter((entry) => entry.id !== id);
    emit(nextNews);
    setSelectedId(nextNews[0]?.id ?? "");
    setDetailOpen(false);
  }

  function setStatus(status: NewsStatus) {
    if (!selected) return;
    const now = new Date().toISOString();
    emit(news.map((entry) =>
      entry.id === selected.id
        ? {
            ...entry,
            status,
            publishedAt: status === "published" ? now : entry.publishedAt,
            scheduledAt: status === "scheduled" ? entry.scheduledAt || now : entry.scheduledAt,
            updatedAt: now,
          }
        : entry
    ));
  }

  return (
    <article className="admin-card admin-data-manager">
      <div className="admin-panel-title">
        <div>
          <strong><Newspaper size={18} /> Noticias y programacion</strong>
          <p>Busca, selecciona, programa y publica noticias asociadas a juegos activos.</p>
        </div>
        <button className="green-button" onClick={addNews}><Plus size={15} /> Crear noticia</button>
      </div>

      <div className="news-editor-stats">
        <span><strong>{counts.visible}</strong><small>Visibles</small></span>
        <span><strong>{counts.scheduled}</strong><small>Programadas</small></span>
        <span><strong>{counts.draft}</strong><small>Borradores</small></span>
        <span><strong>{counts.archived}</strong><small>Archivadas</small></span>
      </div>

      <div className="admin-data-toolbar">
        <label><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar titulo, resumen, cuerpo o juego" /></label>
        <label>
          <FilePenLine size={17} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as NewsStatus | "all")}>
            <option value="all">Todos los estados</option>
            <option value="draft">Borradores</option>
            <option value="scheduled">Programadas</option>
            <option value="published">Publicadas</option>
            <option value="archived">Archivadas</option>
          </select>
        </label>
        <label>
          <Newspaper size={17} />
          <select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)}>
            <option value="all">Todos los juegos</option>
            <option value="platform">Plataforma</option>
            {activeGames.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
          </select>
        </label>
      </div>

      <div className={`admin-data-layout ${detailOpen ? "detail-open" : ""}`}>
        <section className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Juego</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {filteredNews.map((entry) => (
                <tr key={entry.id} className={entry.id === selected?.id ? "selected" : ""}>
                  <td><strong>{entry.title}</strong><small>{entry.summary}</small></td>
                  <td>{activeGames.find((game) => game.id === entry.gameId)?.name ?? "Plataforma"}</td>
                  <td><span className={`admin-status-pill status-${entry.status ?? "published"}`}>{entry.status ?? "published"}</span></td>
                  <td>{new Date(visibleDate(entry)).toLocaleString()}</td>
                  <td><button onClick={() => { setSelectedId(entry.id); setDetailOpen(true); }}><Eye size={15} /> Ver</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredNews.length === 0 && <div className="admin-empty-state"><Search size={20} /><strong>Sin noticias</strong><span>Cambia los filtros o crea una noticia.</span></div>}
        </section>

        {selected && detailOpen ? (
          <aside className="admin-detail-panel">
            <div className="news-action-row">
              <button className={selected.status === "draft" ? "selected" : ""} onClick={() => setStatus("draft")}>Borrador</button>
              <button className={selected.status === "scheduled" ? "selected" : ""} onClick={() => setStatus("scheduled")}><CalendarClock size={15} /> Programar</button>
              <button className={selected.status === "published" ? "selected" : ""} onClick={() => setStatus("published")}><Send size={15} /> Publicar</button>
              <button className={selected.status === "archived" ? "selected" : ""} onClick={() => setStatus("archived")}><Archive size={15} /> Archivar</button>
              <button className="danger-button" onClick={() => deleteNews(selected.id)}><Trash2 size={15} /> Eliminar</button>
            </div>
            {locked && <span className="admin-lock-note">Esta noticia ya fue creada/publicada o archivada. Solo puedes cambiar estado o eliminarla.</span>}

            <div className="news-form-grid">
              <label><span>ID</span><input value={selected.id} disabled /></label>
              <label><span>Juego activo</span>
                <select disabled={locked} value={selected.gameId ?? "platform"} onChange={(event) => updateNews(selected.id, { gameId: event.target.value })}>
                  <option value="platform">Plataforma</option>
                  {activeGames.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
                </select>
              </label>
              <label><span>Publicacion</span><input disabled={locked} type="datetime-local" value={toDateTimeInput(selected.publishedAt)} onChange={(event) => updateNews(selected.id, { publishedAt: fromDateTimeInput(event.target.value) })} /></label>
              <label><span>Programada</span><input disabled={locked} type="datetime-local" value={toDateTimeInput(selected.scheduledAt)} onChange={(event) => updateNews(selected.id, { scheduledAt: fromDateTimeInput(event.target.value), status: "scheduled" })} /></label>
            </div>

            <label><span>Titulo</span><input disabled={locked} value={selected.title} onChange={(event) => updateNews(selected.id, { title: event.target.value })} /></label>
            <label><span>Resumen</span><textarea disabled={locked} value={selected.summary ?? ""} onChange={(event) => updateNews(selected.id, { summary: event.target.value })} /></label>
            <label><span>Cuerpo</span><textarea disabled={locked} value={selected.body ?? ""} onChange={(event) => updateNews(selected.id, { body: event.target.value })} /></label>
            <section className="news-media-fields">
              <strong><Eye size={16} /> Multimedia de noticia</strong>
              <label><span>Imagen principal</span><input disabled={locked} value={selected.image ?? ""} onChange={(event) => updateNews(selected.id, { image: event.target.value })} /></label>
              <label><span>Galeria del post, una imagen por linea</span><textarea disabled={locked} value={(selected.gallery ?? []).join("\n")} onChange={(event) => updateNews(selected.id, { gallery: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label>
            </section>

            <section className="news-preview">
              <strong><Eye size={16} /> Vista previa</strong>
              {selected.image && <img src={selected.image} alt="" />}
              <div>
                <small>{selected.gameId ?? "platform"} - {selected.status ?? "published"}</small>
                <h3>{selected.title}</h3>
                <p>{selected.summary}</p>
              </div>
              {!!selected.gallery?.length && (
                <div className="news-gallery-preview">
                  {selected.gallery.map((image) => <i key={image} style={{ backgroundImage: `url("${image}")` }} />)}
                </div>
              )}
            </section>
          </aside>
        ) : (
          <div className="news-empty">
            <Newspaper size={34} />
            <strong>No hay noticias creadas.</strong>
            <button className="green-button" onClick={addNews}><Plus size={15} /> Crear noticia</button>
          </div>
        )}
      </div>
    </article>
  );
}
