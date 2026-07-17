import { useMemo, useState } from "react";
import { CalendarClock, Eye, Newspaper, Plus, Send, Trash2 } from "lucide-react";
import type { AppNewsEntry } from "../lib/appMetadataStorage";
import type { GameConfig } from "../types/game";

type Props = {
  news: AppNewsEntry[];
  games: GameConfig[];
  onChange: (news: AppNewsEntry[]) => void;
};

type NewsStatus = NonNullable<AppNewsEntry["status"]>;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

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
    status: "draft",
    scheduledAt: now,
    publishedAt: now,
    updatedAt: now,
  };
}

function isVisible(entry: AppNewsEntry) {
  if ((entry.status ?? "published") !== "published") return false;
  return new Date(entry.publishedAt).getTime() <= Date.now();
}

export function NewsEditor({ news, games, onChange }: Props) {
  const [selectedId, setSelectedId] = useState(news[0]?.id ?? "");
  const selected = news.find((entry) => entry.id === selectedId) ?? news[0];

  const sortedNews = useMemo(
    () => [...news].sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()),
    [news]
  );

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
    const next = createNewsEntry(games[0]?.id);
    emit([next, ...news]);
    setSelectedId(next.id);
  }

  function updateNews(id: string, patch: Partial<AppNewsEntry>) {
    const now = new Date().toISOString();
    emit(news.map((entry) => (entry.id === id ? { ...entry, ...patch, updatedAt: now } : entry)));
  }

  function deleteNews(id: string) {
    const nextNews = news.filter((entry) => entry.id !== id);
    emit(nextNews);
    setSelectedId(nextNews[0]?.id ?? "");
  }

  function setStatus(status: NewsStatus) {
    if (!selected) return;
    const now = new Date().toISOString();
    updateNews(selected.id, {
      status,
      publishedAt: status === "published" ? now : selected.publishedAt,
      scheduledAt: status === "scheduled" ? selected.scheduledAt || now : selected.scheduledAt,
    });
  }

  return (
    <article className="admin-card news-editor">
      <div className="admin-panel-title">
        <strong><Newspaper size={18} /> Noticias y programacion</strong>
        <button onClick={addNews}><Plus size={15} /> Noticia</button>
      </div>

      <div className="news-editor-stats">
        <span><strong>{counts.visible}</strong><small>Visibles</small></span>
        <span><strong>{counts.scheduled}</strong><small>Programadas</small></span>
        <span><strong>{counts.draft}</strong><small>Borradores</small></span>
        <span><strong>{counts.archived}</strong><small>Archivadas</small></span>
      </div>

      <div className="news-editor-layout">
        <aside className="news-list">
          {sortedNews.map((entry) => (
            <button
              key={entry.id}
              className={entry.id === selected?.id ? "selected" : ""}
              onClick={() => setSelectedId(entry.id)}
            >
              <span className={`news-status-dot status-${entry.status ?? "published"}`} />
              <strong>{entry.title}</strong>
              <small>{entry.status ?? "published"} - {new Date(entry.publishedAt).toLocaleString()}</small>
            </button>
          ))}
        </aside>

        {selected ? (
          <div className="news-form">
            <div className="news-action-row">
              <button className={selected.status === "draft" ? "selected" : ""} onClick={() => setStatus("draft")}>Borrador</button>
              <button className={selected.status === "scheduled" ? "selected" : ""} onClick={() => setStatus("scheduled")}><CalendarClock size={15} /> Programar</button>
              <button className={selected.status === "published" ? "selected" : ""} onClick={() => setStatus("published")}><Send size={15} /> Publicar</button>
              <button className={selected.status === "archived" ? "selected" : ""} onClick={() => setStatus("archived")}>Archivar</button>
              <button className="danger-button" onClick={() => deleteNews(selected.id)}><Trash2 size={15} /> Eliminar</button>
            </div>

            <div className="news-form-grid">
              <label><span>ID</span><input value={selected.id} onChange={(event) => updateNews(selected.id, { id: slugify(event.target.value) || selected.id })} /></label>
              <label><span>Juego</span>
                <select value={selected.gameId ?? "platform"} onChange={(event) => updateNews(selected.id, { gameId: event.target.value })}>
                  <option value="platform">Plataforma</option>
                  {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
                </select>
              </label>
              <label><span>Fecha de publicacion</span><input type="datetime-local" value={toDateTimeInput(selected.publishedAt)} onChange={(event) => updateNews(selected.id, { publishedAt: fromDateTimeInput(event.target.value) })} /></label>
              <label><span>Fecha programada</span><input type="datetime-local" value={toDateTimeInput(selected.scheduledAt)} onChange={(event) => updateNews(selected.id, { scheduledAt: fromDateTimeInput(event.target.value), status: "scheduled" })} /></label>
            </div>

            <label><span>Titulo</span><input value={selected.title} onChange={(event) => updateNews(selected.id, { title: event.target.value })} /></label>
            <label><span>Resumen</span><textarea value={selected.summary ?? ""} onChange={(event) => updateNews(selected.id, { summary: event.target.value })} /></label>
            <label><span>Cuerpo</span><textarea value={selected.body ?? ""} onChange={(event) => updateNews(selected.id, { body: event.target.value })} /></label>
            <label><span>Imagen</span><input value={selected.image ?? ""} onChange={(event) => updateNews(selected.id, { image: event.target.value })} /></label>

            <section className="news-preview">
              <strong><Eye size={16} /> Vista previa</strong>
              {selected.image && <img src={selected.image} alt="" />}
              <div>
                <small>{selected.gameId ?? "platform"} - {selected.status ?? "published"}</small>
                <h3>{selected.title}</h3>
                <p>{selected.summary}</p>
              </div>
            </section>
          </div>
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
