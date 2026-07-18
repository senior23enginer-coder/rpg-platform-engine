import { ArrowLeft, Headphones, LifeBuoy, MessageCircle, Plus, Search, Send, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { AppSupportTicket } from "../lib/appMetadataStorage";
import type { PlayerProfile } from "../types/profile";

type Props = {
  profile: PlayerProfile;
  tickets: AppSupportTicket[];
  isAdmin?: boolean;
  onChange: (tickets: AppSupportTicket[]) => void;
  onBack: () => void;
};

type TicketStatus = AppSupportTicket["status"];
type TicketPriority = AppSupportTicket["priority"];
type TicketCategory = AppSupportTicket["category"];

const statusLabels: Record<TicketStatus, string> = {
  open: "Abierto",
  in_progress: "En revision",
  waiting_user: "Esperando usuario",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const priorityLabels: Record<TicketPriority, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  critical: "Critica",
};

const categoryLabels: Record<TicketCategory, string> = {
  technical: "Tecnico",
  account: "Cuenta",
  game: "Juego",
  billing: "Pagos",
  other: "Otro",
};

export function SupportScreen({ profile, tickets, isAdmin = false, onChange, onBack }: Props) {
  const visibleTickets = isAdmin ? tickets : tickets.filter((ticket) => ticket.requesterId === profile.id);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [selectedId, setSelectedId] = useState(visibleTickets[0]?.id ?? "");
  const [detailMode, setDetailMode] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", category: "technical" as TicketCategory, priority: "normal" as TicketPriority });
  const [reply, setReply] = useState("");

  const filteredTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return visibleTickets.filter((ticket) => {
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [ticket.title, ticket.description, ticket.requesterName, ticket.id]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, visibleTickets]);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedId) ?? filteredTickets[0];
  const openTickets = visibleTickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length;
  const urgentTickets = visibleTickets.filter((ticket) => ticket.priority === "high" || ticket.priority === "critical").length;
  const resolvedTickets = visibleTickets.filter((ticket) => ticket.status === "resolved" || ticket.status === "closed").length;

  function createTicket() {
    const title = draft.title.trim();
    const description = draft.description.trim();
    if (!title || !description) return;
    const now = new Date().toISOString();
    const ticket: AppSupportTicket = {
      id: `ticket_${Date.now()}`,
      title,
      description,
      requesterId: profile.id,
      requesterName: profile.username || profile.name || profile.id,
      status: "open",
      priority: draft.priority,
      category: draft.category,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg_${Date.now()}`,
          authorId: profile.id,
          authorName: profile.username || profile.name || profile.id,
          body: description,
          createdAt: now,
        },
      ],
    };
    onChange([ticket, ...tickets]);
    setSelectedId(ticket.id);
    setDetailMode(true);
    setDraft({ title: "", description: "", category: "technical", priority: "normal" });
  }

  function updateTicket(ticketId: string, patch: Partial<AppSupportTicket>) {
    onChange(tickets.map((ticket) => (ticket.id === ticketId ? { ...ticket, ...patch, updatedAt: new Date().toISOString() } : ticket)));
  }

  function sendReply() {
    if (!selectedTicket || !reply.trim()) return;
    const now = new Date().toISOString();
    updateTicket(selectedTicket.id, {
      status: isAdmin ? "waiting_user" : "open",
      messages: [
        ...selectedTicket.messages,
        {
          id: `msg_${Date.now()}`,
          authorId: profile.id,
          authorName: profile.username || profile.name || profile.id,
          body: reply.trim(),
          createdAt: now,
        },
      ],
    });
    setReply("");
  }

  if (detailMode && selectedTicket) {
    return (
      <section className="screen-panel support-screen support-detail-screen">
        <div className="screen-heading support-heading">
          <div>
            <h2><MessageCircle size={34} /> Ticket de soporte</h2>
            <p>{selectedTicket.id} - {selectedTicket.requesterName}</p>
          </div>
          <button onClick={() => setDetailMode(false)}><ArrowLeft size={18} /> Lista de tickets</button>
        </div>

        <div className="support-detail-grid">
          <article className="support-card support-ticket-detail support-ticket-detail-expanded">
            <div className="admin-panel-title">
              <div>
                <strong>{selectedTicket.title}</strong>
                <p>{selectedTicket.description}</p>
              </div>
              <span className="admin-status-pill">{statusLabels[selectedTicket.status]}</span>
            </div>

            <div className="support-ticket-meta">
              <span>{categoryLabels[selectedTicket.category]}</span>
              <span>{priorityLabels[selectedTicket.priority]}</span>
              <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
              <span>{selectedTicket.assignedTo ? `Asignado: ${selectedTicket.assignedTo}` : "Sin asignar"}</span>
            </div>

            <div className="support-message-list expanded">
              {selectedTicket.messages.map((message) => (
                <section key={message.id} className={message.authorId === profile.id ? "own" : ""}>
                  <strong>{message.authorName}</strong>
                  <p>{message.body}</p>
                  <small>{new Date(message.createdAt).toLocaleString()}</small>
                </section>
              ))}
            </div>

            <div className="support-reply">
              <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Escribe una respuesta o actualizacion..." />
              <button className="green-button" disabled={!reply.trim()} onClick={sendReply}><Send size={16} /> Enviar</button>
            </div>
          </article>

          <aside className="support-card support-ticket-control-room">
            <strong>{isAdmin ? "Control del ticket" : "Estado de tu solicitud"}</strong>
            {isAdmin ? (
              <div className="support-admin-controls stacked">
                <label><span>Estado</span><select value={selectedTicket.status} onChange={(event) => updateTicket(selectedTicket.id, { status: event.target.value as TicketStatus })}>
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
                <label><span>Prioridad</span><select value={selectedTicket.priority} onChange={(event) => updateTicket(selectedTicket.id, { priority: event.target.value as TicketPriority })}>
                  {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
                <label><span>Asignado a</span><input value={selectedTicket.assignedTo ?? ""} onChange={(event) => updateTicket(selectedTicket.id, { assignedTo: event.target.value })} placeholder="admin, mesa soporte..." /></label>
              </div>
            ) : (
              <p>Soporte revisara tu solicitud. Puedes agregar mensajes sin crear tickets duplicados.</p>
            )}
            <button onClick={() => setDetailMode(false)}><ArrowLeft size={15} /> Volver a tabla</button>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="screen-panel support-screen">
      <div className="screen-heading support-heading">
        <div>
          <h2>{isAdmin ? <ShieldCheck size={34} /> : <LifeBuoy size={34} />} Soporte tecnico</h2>
          <p>{isAdmin ? "Gestiona tickets, prioridades, estados y asistencia por chat." : "Solicita ayuda, crea tickets y conversa con soporte."}</p>
        </div>
        <button onClick={onBack}><ArrowLeft size={18} /> Volver</button>
      </div>

      <div className="support-stats">
        <span><Headphones size={18} /><strong>{visibleTickets.length}</strong><small>Tickets totales</small></span>
        <span><MessageCircle size={18} /><strong>{openTickets}</strong><small>Abiertos</small></span>
        <span><SlidersHorizontal size={18} /><strong>{urgentTickets}</strong><small>Urgentes</small></span>
        <span><ShieldCheck size={18} /><strong>{resolvedTickets}</strong><small>Resueltos</small></span>
      </div>

      <div className="support-layout">
        <article className="support-card support-list-panel">
          <div className="admin-panel-title">
            <strong><Headphones size={18} /> Tickets</strong>
            {!isAdmin && <button className="green-button" onClick={createTicket}><Plus size={15} /> Crear</button>}
          </div>
          <div className="support-toolbar">
            <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ticket, usuario o detalle" /></label>
            <label><SlidersHorizontal size={16} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TicketStatus | "all")}>
              <option value="all">Todos</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
          </div>
          <div className="support-ticket-table-wrap">
            <table className="support-ticket-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Usuario</th>
                  <th>Categoria</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className={ticket.id === selectedTicket?.id ? "selected" : ""}>
                    <td><strong>{ticket.title}</strong><small>{ticket.id}</small></td>
                    <td>{ticket.requesterName}</td>
                    <td>{categoryLabels[ticket.category]}</td>
                    <td><span className={`support-priority-label priority-${ticket.priority}`}>{priorityLabels[ticket.priority]}</span></td>
                    <td><span className="admin-status-pill">{statusLabels[ticket.status]}</span></td>
                    <td><button onClick={() => { setSelectedId(ticket.id); setDetailMode(true); }}><MessageCircle size={15} /> Ver</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTickets.length === 0 && <div className="admin-empty-state"><Headphones size={22} /><strong>Sin tickets</strong><span>No hay solicitudes con esos filtros.</span></div>}
          </div>
        </article>

        <article className="support-card support-ticket-detail">
          {selectedTicket ? (
            <>
              <div className="admin-panel-title">
                <div>
                  <strong>{selectedTicket.title}</strong>
                  <p>{selectedTicket.id} - {selectedTicket.requesterName}</p>
                </div>
                <span className="admin-status-pill">{statusLabels[selectedTicket.status]}</span>
              </div>
              {isAdmin && (
                <div className="support-admin-controls">
                  <label><span>Estado</span><select value={selectedTicket.status} onChange={(event) => updateTicket(selectedTicket.id, { status: event.target.value as TicketStatus })}>
                    {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select></label>
                  <label><span>Prioridad</span><select value={selectedTicket.priority} onChange={(event) => updateTicket(selectedTicket.id, { priority: event.target.value as TicketPriority })}>
                    {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select></label>
                  <label><span>Asignado a</span><input value={selectedTicket.assignedTo ?? ""} onChange={(event) => updateTicket(selectedTicket.id, { assignedTo: event.target.value })} placeholder="admin, mesa soporte..." /></label>
                </div>
              )}
              <div className="support-ticket-meta">
                <span>{categoryLabels[selectedTicket.category]}</span>
                <span>{priorityLabels[selectedTicket.priority]}</span>
                <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
              </div>
              <div className="support-message-list">
                {selectedTicket.messages.map((message) => (
                  <section key={message.id} className={message.authorId === profile.id ? "own" : ""}>
                    <strong>{message.authorName}</strong>
                    <p>{message.body}</p>
                    <small>{new Date(message.createdAt).toLocaleString()}</small>
                  </section>
                ))}
              </div>
              <div className="support-reply">
                <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Escribe una respuesta o actualizacion..." />
                <button className="green-button" disabled={!reply.trim()} onClick={sendReply}><Send size={16} /> Enviar</button>
              </div>
            </>
          ) : (
            <div className="admin-empty-state"><LifeBuoy size={26} /><strong>Selecciona un ticket</strong><span>O crea una nueva solicitud de soporte.</span></div>
          )}
        </article>

        {!isAdmin && (
          <article className="support-card support-create-panel">
            <div className="admin-panel-title compact">
              <strong><Plus size={18} /> Nuevo ticket</strong>
            </div>
            <label><span>Titulo</span><input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="No puedo iniciar partida..." /></label>
            <label><span>Categoria</span><select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as TicketCategory }))}>
              {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label><span>Prioridad</span><select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TicketPriority }))}>
              {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label><span>Descripcion</span><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Cuenta que pasa y en que pantalla ocurre." /></label>
            <button className="green-button" onClick={createTicket}><Plus size={16} /> Solicitar asistencia</button>
          </article>
        )}
      </div>
    </section>
  );
}
