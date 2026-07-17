import { useMemo, useState } from "react";
import { Archive, Bell, CalendarClock, CheckCircle2, Clock3, Eye, Filter, Plus, Search, Send, Smartphone, Trash2, Zap } from "lucide-react";
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
    target: "platform",
    targetGroup: "",
    targetUserId: "",
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
  const activeGames = games.filter((game) => game.enabled !== false);
  const [selectedId, setSelectedId] = useState(notifications[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<AppNotificationEntry["platform"] | "all">("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const selected = notifications.find((entry) => entry.id === selectedId) ?? notifications[0];
  const locked = selected ? selected.status === "sent" || selected.status === "archived" : false;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...notifications]
      .sort(
        (left, right) =>
          new Date(right.sentAt ?? right.scheduledAt ?? right.createdAt).getTime() -
          new Date(left.sentAt ?? left.scheduledAt ?? left.createdAt).getTime()
      )
      .filter((entry) => {
        const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
        const matchesPlatform = platformFilter === "all" || entry.platform === platformFilter;
        const matchesQuery =
          !query ||
          [entry.title, entry.message, entry.channel, entry.target, entry.gameId]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
        return matchesStatus && matchesPlatform && matchesQuery;
      });
  }, [notifications, platformFilter, search, statusFilter]);

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
    if (locked) return;
    onChange(notifications.map((entry) => (entry.id === id ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry)));
  }

  function addNotification() {
    const next = createNotification(activeGames[0]?.id);
    onChange([next, ...notifications]);
    setSelectedId(next.id);
    setDetailOpen(true);
  }

  function deleteNotification(id: string) {
    const next = notifications.filter((entry) => entry.id !== id);
    onChange(next);
    setSelectedId(next[0]?.id ?? "");
    setDetailOpen(false);
  }

  function setStatus(status: NotificationStatus) {
    if (!selected) return;
    const now = new Date().toISOString();
    onChange(notifications.map((entry) =>
      entry.id === selected.id
        ? {
            ...entry,
            status,
            sentAt: status === "sent" ? now : entry.sentAt,
            scheduledAt: status === "scheduled" ? entry.scheduledAt || now : entry.scheduledAt,
            updatedAt: now,
          }
        : entry
    ));
  }

  return (
    <article className="admin-card admin-data-manager notification-editor">
      <div className="admin-panel-title notification-heading">
        <div>
          <strong><Bell size={18} /> Notificaciones Android/iPhone</strong>
          <p>Gestiona avisos, filtros, programacion, envio, borrador, archivo y eliminacion.</p>
        </div>
        <button className="green-button" onClick={addNotification}><Plus size={15} /> Crear notificacion</button>
      </div>

      <div className="notification-stats">
        <span><Zap size={18} /><strong>{stats.active}</strong><small>Activas</small></span>
        <span><CalendarClock size={18} /><strong>{stats.scheduled}</strong><small>Programadas</small></span>
        <span><Clock3 size={18} /><strong>{stats.draft}</strong><small>Borradores</small></span>
        <span><CheckCircle2 size={18} /><strong>{stats.archived}</strong><small>Archivadas</small></span>
      </div>

      <div className="admin-data-toolbar">
        <label><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar titulo, mensaje, canal o juego" /></label>
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

      <div className={`admin-data-layout ${detailOpen ? "detail-open" : ""}`}>
        <section className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Plataforma</th>
                <th>Destino</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className={entry.id === selected?.id ? "selected" : ""}>
                  <td><strong>{entry.title}</strong><small>{entry.message}</small></td>
                  <td>{entry.platform}</td>
                  <td>{entry.target === "group" ? entry.targetGroup || "grupo" : entry.target === "user" ? entry.targetUserId || "usuario" : entry.target}</td>
                  <td><span className={`admin-status-pill status-${entry.status}`}>{entry.status}</span></td>
                  <td><button onClick={() => { setSelectedId(entry.id); setDetailOpen(true); }}><Eye size={15} /> Ver</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="admin-empty-state"><Search size={20} /><strong>Sin notificaciones</strong><span>Cambia los filtros o crea una notificacion.</span></div>}
        </section>

        {selected && detailOpen ? (
          <aside className="admin-detail-panel notification-detail-grid">
            <div className="notification-action-row">
              <button className={selected.status === "draft" ? "selected" : ""} onClick={() => setStatus("draft")}>Borrador</button>
              <button className={selected.status === "scheduled" ? "selected" : ""} onClick={() => setStatus("scheduled")}><CalendarClock size={15} /> Programar</button>
              <button className={selected.status === "sent" ? "selected" : ""} onClick={() => setStatus("sent")}><Send size={15} /> Enviar</button>
              <button className={selected.status === "archived" ? "selected" : ""} onClick={() => setStatus("archived")}><Archive size={15} /> Archivar</button>
              <button className="danger-button" onClick={() => deleteNotification(selected.id)}><Trash2 size={15} /> Eliminar</button>
            </div>
            {locked && <span className="admin-lock-note">Esta notificacion ya fue enviada o archivada. Solo puedes cambiar estado o eliminarla.</span>}

            <div className="notification-grid">
              <label><span>Plataforma</span>
                <select disabled={locked} value={selected.platform} onChange={(event) => updateNotification(selected.id, { platform: event.target.value as AppNotificationEntry["platform"] })}>
                  <option value="both">Android + iPhone</option>
                  <option value="android">Android</option>
                  <option value="ios">iPhone</option>
                </select>
              </label>
              <label><span>Canal</span>
                <select disabled={locked} value={selected.channel} onChange={(event) => updateNotification(selected.id, { channel: event.target.value as AppNotificationEntry["channel"] })}>
                  <option value="system">Sistema</option>
                  <option value="news">Noticias</option>
                  <option value="game">Juego</option>
                  <option value="security">Seguridad</option>
                  <option value="event">Evento</option>
                </select>
              </label>
              <label><span>Prioridad</span>
                <select disabled={locked} value={selected.priority} onChange={(event) => updateNotification(selected.id, { priority: event.target.value as AppNotificationEntry["priority"] })}>
                  <option value="low">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                </select>
              </label>
              <label><span>Destino</span>
                <select disabled={locked} value={selected.target} onChange={(event) => updateNotification(selected.id, { target: event.target.value as AppNotificationEntry["target"] })}>
                  <option value="platform">Toda la plataforma</option>
                  <option value="all">Todos los usuarios</option>
                  <option value="users">Tipo usuario normal</option>
                  <option value="admins">Tipo administrador</option>
                  <option value="group">Grupo especifico</option>
                  <option value="user">Usuario especifico</option>
                </select>
              </label>
            </div>
            {(selected.target === "group" || selected.target === "user") && (
              <div className="notification-grid">
                <label><span>Grupo</span><input disabled={locked || selected.target !== "group"} value={selected.targetGroup ?? ""} onChange={(event) => updateNotification(selected.id, { targetGroup: event.target.value })} placeholder="operadores, beta, moderadores" /></label>
                <label><span>ID usuario</span><input disabled={locked || selected.target !== "user"} value={selected.targetUserId ?? ""} onChange={(event) => updateNotification(selected.id, { targetUserId: event.target.value })} placeholder="admin-local" /></label>
              </div>
            )}

            <label><span>Titulo</span><input disabled={locked} value={selected.title} onChange={(event) => updateNotification(selected.id, { title: event.target.value })} /></label>
            <label><span>Mensaje</span><textarea disabled={locked} value={selected.message} onChange={(event) => updateNotification(selected.id, { message: event.target.value })} /></label>

            <div className="notification-grid">
              <label><span>Juego activo</span>
                <select disabled={locked} value={selected.gameId ?? ""} onChange={(event) => updateNotification(selected.id, { gameId: event.target.value || undefined })}>
                  <option value="">Plataforma</option>
                  {activeGames.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
                </select>
              </label>
              <label><span>Programada</span><input disabled={locked} type="datetime-local" value={toDateTimeInput(selected.scheduledAt)} onChange={(event) => updateNotification(selected.id, { scheduledAt: fromDateTimeInput(event.target.value), status: "scheduled" })} /></label>
              <label><span>Boton</span><input disabled={locked} value={selected.actionLabel ?? ""} onChange={(event) => updateNotification(selected.id, { actionLabel: event.target.value })} /></label>
              <label><span>URL/accion</span><input disabled={locked} value={selected.actionUrl ?? ""} onChange={(event) => updateNotification(selected.id, { actionUrl: event.target.value })} /></label>
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
          </aside>
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
