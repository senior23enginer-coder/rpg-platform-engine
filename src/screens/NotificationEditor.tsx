import { useMemo, useState } from "react";
import { Bell, CalendarClock, CheckCircle2, Clock3, Filter, Plus, Search, Send, Smartphone, Trash2, Zap } from "lucide-react";
import type { AppNotificationEntry } from "../lib/appMetadataStorage";
import type { GameConfig } from "../types/game";

type Props = {
  notifications: AppNotificationEntry[];
  games: GameConfig[];
  onChange: (notifications: AppNotificationEntry[]) => void;
};

type NotificationStatus = AppNotificationEntry["status"];

function createNotification(gameId?: string): AppNotificationEntry {
  const now = new Date().toISOString();
  return {
    id: `notification_${Date.now()}`,
    title: "Nueva notificacion",
    message: "Mensaje corto para Android y iPhone.",
    platform: "both",
    channel: "system",
    priority: "normal",
    status: "draft",
    target: "all",
    gameId,
    actionLabel: "Abrir",
    actionUrl: "",
    scheduledAt: now,
    createdAt: now,
    updatedAt: now,
  };
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

function isActive(entry: AppNotificationEntry) {
  if (entry.status === "sent") return true;
  if (entry.status !== "scheduled" || !entry.scheduledAt) return false;
  return new Date(entry.scheduledAt).getTime() <= Date.now();
}

export function NotificationEditor({ notifications, games, onChange }: Props) {
  const [selectedId, setSelectedId] = useState(notifications[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<AppNotificationEntry["platform"] | "all">("all");
  const selected = notifications.find((entry) => entry.id === selectedId) ?? notifications[0];

  const sorted = useMemo(
    () =>
      [...notifications].sort(
        (left, right) =>
          new Date(right.sentAt ?? right.scheduledAt ?? right.createdAt).getTime() -
          new Date(left.sentAt ?? left.scheduledAt ?? left.createdAt).getTime()
      ),
    [notifications]
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sorted.filter((entry) => {
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
      const matchesPlatform = platformFilter === "all" || entry.platform === platformFilter;
      const matchesQuery =
        !query ||
        [entry.title, entry.message, entry.channel, entry.target, entry.gameId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return matchesStatus && matchesPlatform && matchesQuery;
    });
  }, [platformFilter, search, sorted, statusFilter]);

  const stats = useMemo(
    () =>
      notifications.reduce(
        (current, entry) => {
          current[entry.status] += 1;
          if (isActive(entry)) current.active += 1;
          return current;
        },
        { draft: 0, scheduled: 0, sent: 0, archived: 0, active: 0 } as Record<NotificationStatus | "active", number>
      ),
    [notifications]
  );

  function updateNotification(id: string, patch: Partial<AppNotificationEntry>) {
    onChange(
      notifications.map((entry) =>
        entry.id === id ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry
      )
    );
  }

  function addNotification() {
    const next = createNotification(games[0]?.id);
    onChange([next, ...notifications]);
    setSelectedId(next.id);
  }

  function deleteNotification(id: string) {
    const next = notifications.filter((entry) => entry.id !== id);
    onChange(next);
    setSelectedId(next[0]?.id ?? "");
  }

  function setStatus(status: NotificationStatus) {
    if (!selected) return;
    const now = new Date().toISOString();
    updateNotification(selected.id, {
      status,
      sentAt: status === "sent" ? now : selected.sentAt,
      scheduledAt: status === "scheduled" ? selected.scheduledAt || now : selected.scheduledAt,
    });
  }

  return (
    <article className="admin-card notification-editor">
      <div className="admin-panel-title notification-heading">
        <div>
          <strong><Bell size={18} /> Notificaciones Android/iPhone</strong>
          <p>Programa avisos, segmenta destinatarios y revisa la vista previa movil antes de enviar.</p>
        </div>
        <button className="green-button" onClick={addNotification}><Plus size={15} /> Notificacion</button>
      </div>

      <div className="notification-stats">
        <span><Zap size={18} /><strong>{stats.active}</strong><small>Activas</small></span>
        <span><CalendarClock size={18} /><strong>{stats.scheduled}</strong><small>Programadas</small></span>
        <span><Clock3 size={18} /><strong>{stats.draft}</strong><small>Borradores</small></span>
        <span><CheckCircle2 size={18} /><strong>{stats.archived}</strong><small>Archivadas</small></span>
      </div>

      <div className="notification-toolbar">
        <label>
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar titulo, mensaje, canal o juego" />
        </label>
        <label>
          <Filter size={17} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as NotificationStatus | "all")}>
            <option value="all">Todos los estados</option>
            <option value="draft">Borradores</option>
            <option value="scheduled">Programadas</option>
            <option value="sent">Enviadas</option>
            <option value="archived">Archivadas</option>
          </select>
        </label>
        <label>
          <Smartphone size={17} />
          <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value as AppNotificationEntry["platform"] | "all")}>
            <option value="all">Todas las plataformas</option>
            <option value="both">Android + iPhone</option>
            <option value="android">Android</option>
            <option value="ios">iPhone</option>
          </select>
        </label>
      </div>

      <div className="notification-layout">
        <aside className="notification-list">
          <small>{filtered.length} resultados</small>
          {filtered.map((entry) => (
            <button key={entry.id} className={entry.id === selected?.id ? "selected" : ""} onClick={() => setSelectedId(entry.id)}>
              <Bell size={16} />
              <span><strong>{entry.title}</strong><small>{entry.platform} - {entry.status} - {entry.target}</small></span>
            </button>
          ))}
          {filtered.length === 0 && <div className="notification-empty-mini">Sin resultados</div>}
        </aside>

        {selected ? (
          <>
            <div className="notification-form">
              <div className="notification-selected-summary">
                <span><strong>{selected.status}</strong><small>Estado</small></span>
                <span><strong>{selected.priority}</strong><small>Prioridad</small></span>
                <span><strong>{selected.platform}</strong><small>Plataforma</small></span>
              </div>

              <div className="notification-action-row">
                <button className={selected.status === "draft" ? "selected" : ""} onClick={() => setStatus("draft")}>Borrador</button>
                <button className={selected.status === "scheduled" ? "selected" : ""} onClick={() => setStatus("scheduled")}><CalendarClock size={15} /> Programar</button>
                <button className={selected.status === "sent" ? "selected" : ""} onClick={() => setStatus("sent")}><Send size={15} /> Enviar</button>
                <button className={selected.status === "archived" ? "selected" : ""} onClick={() => setStatus("archived")}>Archivar</button>
                <button className="danger-button" onClick={() => deleteNotification(selected.id)}><Trash2 size={15} /> Eliminar</button>
              </div>

              <div className="notification-grid">
                <label><span>Plataforma</span>
                  <select value={selected.platform} onChange={(event) => updateNotification(selected.id, { platform: event.target.value as AppNotificationEntry["platform"] })}>
                    <option value="both">Android + iPhone</option>
                    <option value="android">Android</option>
                    <option value="ios">iPhone</option>
                  </select>
                </label>
                <label><span>Canal</span>
                  <select value={selected.channel} onChange={(event) => updateNotification(selected.id, { channel: event.target.value as AppNotificationEntry["channel"] })}>
                    <option value="system">Sistema</option>
                    <option value="news">Noticias</option>
                    <option value="game">Juego</option>
                    <option value="security">Seguridad</option>
                    <option value="event">Evento</option>
                  </select>
                </label>
                <label><span>Prioridad</span>
                  <select value={selected.priority} onChange={(event) => updateNotification(selected.id, { priority: event.target.value as AppNotificationEntry["priority"] })}>
                    <option value="low">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                  </select>
                </label>
                <label><span>Destino</span>
                  <select value={selected.target} onChange={(event) => updateNotification(selected.id, { target: event.target.value as AppNotificationEntry["target"] })}>
                    <option value="all">Todos</option>
                    <option value="users">Usuarios</option>
                    <option value="admins">Admins</option>
                  </select>
                </label>
              </div>

              <label><span>Titulo</span><input value={selected.title} onChange={(event) => updateNotification(selected.id, { title: event.target.value })} /></label>
              <label><span>Mensaje</span><textarea value={selected.message} onChange={(event) => updateNotification(selected.id, { message: event.target.value })} /></label>

              <div className="notification-grid">
                <label><span>Juego</span>
                  <select value={selected.gameId ?? ""} onChange={(event) => updateNotification(selected.id, { gameId: event.target.value || undefined })}>
                    <option value="">Plataforma</option>
                    {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
                  </select>
                </label>
                <label><span>Programada</span><input type="datetime-local" value={toDateTimeInput(selected.scheduledAt)} onChange={(event) => updateNotification(selected.id, { scheduledAt: fromDateTimeInput(event.target.value), status: "scheduled" })} /></label>
                <label><span>Boton</span><input value={selected.actionLabel ?? ""} onChange={(event) => updateNotification(selected.id, { actionLabel: event.target.value })} /></label>
                <label><span>URL/accion</span><input value={selected.actionUrl ?? ""} onChange={(event) => updateNotification(selected.id, { actionUrl: event.target.value })} /></label>
              </div>
            </div>

            <aside className="notification-preview-stack">
              <strong><Smartphone size={16} /> Vista previa</strong>
              <div className="phone-preview android-preview">
                <small>Android</small>
                <section className={`mobile-notification priority-${selected.priority}`}>
                  <span className="mobile-icon"><Bell size={16} /></span>
                  <div><strong>{selected.title}</strong><p>{selected.message}</p><small>{selected.channel} - {selected.target}</small></div>
                </section>
              </div>
              <div className="phone-preview ios-preview">
                <small>iPhone</small>
                <section className={`mobile-notification priority-${selected.priority}`}>
                  <span className="mobile-icon"><Bell size={16} /></span>
                  <div><strong>{selected.title}</strong><p>{selected.message}</p><small>{selected.actionLabel || "Abrir"}</small></div>
                </section>
              </div>
            </aside>
          </>
        ) : (
          <div className="news-empty">
            <Bell size={34} />
            <strong>No hay notificaciones creadas.</strong>
            <button className="green-button" onClick={addNotification}><Plus size={15} /> Crear notificacion</button>
          </div>
        )}
      </div>
    </article>
  );
}
