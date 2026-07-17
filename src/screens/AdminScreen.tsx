import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  FileText,
  FolderKanban,
  Gamepad2,
  Globe2,
  Headphones,
  Eye,
  Image,
  KeyRound,
  LockKeyhole,
  Mail,
  Map,
  Newspaper,
  Plus,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Type,
  ToggleLeft,
  ToggleRight,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import type { Campaign, ContentItem, GameConfig } from "../types/game";
import type { AppNewsEntry, AppNotificationEntry, AppSupportTicket } from "../lib/appMetadataStorage";
import type { PlayerProfile } from "../types/profile";
import { resolveUserAsset } from "../lib/userLibrary";
import { MapEditor } from "./MapEditor";
import { NewsEditor } from "./NewsEditor";
import { NotificationEditor } from "./NotificationEditor";

type Props = {
  module?: AdminModule;
  games: GameConfig[];
  users: PlayerProfile[];
  activeGameId: string;
  activeUserId: string;
  news: AppNewsEntry[];
  notifications: AppNotificationEntry[];
  supportTickets: AppSupportTicket[];
  onSelectGame: (gameId: string) => void;
  onUpdateGame: (game: GameConfig) => void;
  onUpdateGames: (games: GameConfig[]) => void;
  onAddGame: () => void;
  onUpdateUsers: (users: PlayerProfile[]) => void;
  onUpdateNews: (news: AppNewsEntry[]) => void;
  onUpdateNotifications: (notifications: AppNotificationEntry[]) => void;
  onBack: () => void;
};

type ContentCategory = "dlc" | "features" | "extras";
export type AdminModule = "overview" | "games" | "maps" | "users" | "notifications" | "news";

type GameAssetKey = "hero" | "generatedHero" | "homeHero" | "worldPreview" | "campaignImage" | "cover" | "diceCatalog";

const assetFields: Array<{ key: GameAssetKey; label: string; help: string }> = [
  { key: "hero", label: "Hero principal", help: "Imagen general de portada y login." },
  { key: "generatedHero", label: "Hero generado", help: "Arte alternativo o generado." },
  { key: "homeHero", label: "Hero de inicio", help: "Fondo destacado del dashboard." },
  { key: "worldPreview", label: "Preview de mundo", help: "Imagen para nueva partida/mapa." },
  { key: "campaignImage", label: "Imagen de campana", help: "Arte para campanas." },
  { key: "cover", label: "Cover", help: "Caratula de biblioteca." },
  { key: "diceCatalog", label: "Catalogo de dados", help: "Imagen del modulo de dados." },
];

const contentThumbFields: Array<{ key: ContentCategory; label: string }> = [
  { key: "dlc", label: "Thumb DLC" },
  { key: "features", label: "Thumb features" },
  { key: "extras", label: "Thumb extras" },
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveGameAssetPreview(game: GameConfig, path?: string) {
  if (!path) return "";
  if (/^(https?:|data:|blob:|\/)/.test(path)) return path;
  return `${game.basePath ?? `/games/${game.id}`}/${path}`.replace(/\/{2,}/g, "/");
}

function createContentItem(category: ContentCategory): ContentItem {
  const id = `${category}_${Date.now()}`;
  return {
    id,
    name: category === "dlc" ? "Nuevo DLC" : category === "features" ? "Nueva funcion" : "Nuevo extra",
    description: "Describe este contenido para que aparezca en la biblioteca.",
    enabled: true,
  };
}

function createCampaign(): Campaign {
  return {
    id: `campaign_${Date.now()}`,
    title: "Nueva campana",
    implemented: false,
    description: "Define objetivos, escenas y rutas de mapa.",
    simulation: {
      style: "guided",
      route: ["Inicio", "Zona central", "Final"],
      interface: "textual",
    },
  };
}

export function AdminScreen({
  module = "overview",
  games,
  users,
  activeGameId,
  activeUserId,
  news,
  notifications,
  supportTickets,
  onSelectGame,
  onUpdateGame,
  onUpdateGames,
  onAddGame,
  onUpdateUsers,
  onUpdateNews,
  onUpdateNotifications,
  onBack,
}: Props) {
  const activeGame = games.find((game) => game.id === activeGameId) ?? games[0];
  const [userDraft, setUserDraft] = useState({ username: "", email: "", password: "", role: "user" as "user" | "admin" });
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [selectedUserId, setSelectedUserId] = useState(activeUserId);
  const [userEditorMode, setUserEditorMode] = useState<"list" | "create" | "edit">("list");
  const [gameSearch, setGameSearch] = useState("");
  const [gameEditorOpen, setGameEditorOpen] = useState(false);
  const [mapEditorOpen, setMapEditorOpen] = useState(false);
  const totals = useMemo(() => {
    const campaigns = games.reduce((sum, game) => sum + game.campaigns.length, 0);
    const content = games.reduce((sum, game) => sum + Object.values(game.content).flat().length, 0);
    const enabledGames = games.filter((game) => game.enabled !== false).length;
    const routes = games.reduce(
      (sum, game) => sum + game.campaigns.reduce((routeSum, campaign) => routeSum + (campaign.simulation?.route?.length ?? 0), 0),
      0
    );
    const maps = games.reduce((sum, game) => sum + (game.maps?.length ?? 0), 0);
    const mapNodes = games.reduce(
      (sum, game) => sum + (game.maps ?? []).reduce((nodeSum, map) => nodeSum + map.nodes.length, 0),
      0
    );
    return { campaigns, content, routes, maps, mapNodes, enabledGames };
  }, [games]);
  const disabledGames = games.length - totals.enabledGames;
  const publishedNews = news.filter((entry) => (entry.status ?? "published") === "published").length;
  const scheduledNews = news.filter((entry) => entry.status === "scheduled").length;
  const scheduledNotifications = notifications.filter((entry) => entry.status === "scheduled").length;
  const gamesWithoutMaps = games.filter((game) => (game.maps?.length ?? 0) === 0).length;
  const gamesWithoutCampaigns = games.filter((game) => game.campaigns.length === 0).length;
  const adminUsers = users.filter((user) => user.role === "admin").length;
  const operatorUsers = users.length - adminUsers;
  const connectedUsers = users.filter((user) => user.signedIn || user.id === activeUserId).length;
  const usersInGame = users.filter((user) => user.saves.length > 0 || user.history.length > 0).length;
  const openSupportTickets = supportTickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length;
  const urgentSupportTickets = supportTickets.filter((ticket) => ticket.priority === "high" || ticket.priority === "critical").length;
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      const role = user.role ?? "user";
      const matchesRole = userRoleFilter === "all" || role === userRoleFilter;
      const matchesQuery =
        !query ||
        [user.name, user.username, user.email, user.id]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return matchesRole && matchesQuery;
    });
  }, [userRoleFilter, userSearch, users]);
  const filteredGames = useMemo(() => {
    const query = gameSearch.trim().toLowerCase();
    if (!query) return games;
    return games.filter((game) =>
      [game.name, game.short, game.id, game.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [gameSearch, games]);
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? users[0];
  const adminReadiness = Math.round(
    (((totals.enabledGames > 0 ? 1 : 0) +
      (totals.campaigns > 0 ? 1 : 0) +
      (totals.maps > 0 ? 1 : 0) +
      (users.length > 0 ? 1 : 0) +
      (publishedNews + notifications.length > 0 ? 1 : 0)) /
      5) *
      100
  );
  const adminAlerts = [
    disabledGames > 0 ? `${disabledGames} juegos desactivados` : "Biblioteca activa",
    gamesWithoutMaps > 0 ? `${gamesWithoutMaps} juegos sin mapa` : "Mapas base listos",
    scheduledNotifications > 0 ? `${scheduledNotifications} avisos programados` : "Sin avisos pendientes",
  ];
  const moduleCards = [
    {
      icon: <BookOpen size={26} />,
      label: "Gestor de juegos",
      description: "Activa, desactiva, crea juegos y ajusta textos, imagenes, campanas y contenido.",
      metric: `${totals.enabledGames}/${games.length}`,
      meta: "activos",
      status: disabledGames > 0 ? "Revisar biblioteca" : "Operativo",
    },
    {
      icon: <Map size={26} />,
      label: "Editor general de mapas",
      description: "Mantiene el formato comun 2D para nodos, biomas, peligro y conexiones tacticas.",
      metric: `${totals.maps || totals.routes}`,
      meta: `${totals.mapNodes} nodos`,
      status: gamesWithoutMaps > 0 ? "Faltan mapas" : "Mapeado",
    },
    {
      icon: <UserCog size={26} />,
      label: "Usuarios y accesos",
      description: "Administra cuentas locales, roles, correos, claves y niveles de acceso.",
      metric: `${users.length}`,
      meta: `${adminUsers} admin / ${operatorUsers} usuarios`,
      status: "Control local",
    },
    {
      icon: <Bell size={26} />,
      label: "Notificaciones",
      description: "Crea avisos tipo Android/iPhone, segmenta usuarios y programa envios.",
      metric: `${notifications.length}`,
      meta: `${scheduledNotifications} programadas`,
      status: scheduledNotifications > 0 ? "En cola" : "Disponible",
    },
    {
      icon: <Newspaper size={26} />,
      label: "Noticias y actualizaciones",
      description: "Publica novedades que alimentan el sistema de noticias de la plataforma.",
      metric: `${news.length}`,
      meta: `${publishedNews} publicadas / ${scheduledNews} agenda`,
      status: news.length > 0 ? "Contenido activo" : "Sin publicaciones",
    },
    {
      icon: <Headphones size={26} />,
      label: "Soporte tecnico",
      description: "Gestiona tickets, asistencia por chat, prioridades y seguimiento operativo.",
      metric: `${openSupportTickets}`,
      meta: `${urgentSupportTickets} urgentes`,
      status: openSupportTickets > 0 ? "Atencion requerida" : "Sin pendientes",
    },
  ];
  const showOverview = module === "overview";
  const showGames = module === "games";
  const showMaps = module === "maps";
  const showUsers = module === "users";
  const showNotifications = module === "notifications";
  const showNews = module === "news";
  const showGameSelector = false;
  const moduleHeader = {
    overview: {
      icon: <ShieldCheck size={34} />,
      title: "Panel administrador",
      subtitle: "Centro de mando para juegos, mapas, usuarios, noticias y notificaciones.",
    },
    games: {
      icon: <BookOpen size={34} />,
      title: "Editar juegos",
      subtitle: "Selecciona un juego y edita su configuracion, imagenes, campanas y contenido.",
    },
    maps: {
      icon: <Map size={34} />,
      title: "Editor de mapas",
      subtitle: "Carga imagenes, descompone grillas y ajusta mapas tacticos comunes.",
    },
    users: {
      icon: <Users size={34} />,
      title: "Usuarios y accesos",
      subtitle: "Administra cuentas, roles, correos y credenciales locales.",
    },
    notifications: {
      icon: <Bell size={34} />,
      title: "Notificaciones",
      subtitle: "Crea avisos Android/iPhone, programa envios y segmenta destinatarios.",
    },
    news: {
      icon: <Newspaper size={34} />,
      title: "Noticias y actualizaciones",
      subtitle: "Gestiona publicaciones que alimentan el sistema de noticias.",
    },
  }[module];

  if (!activeGame) {
    return (
      <section className="screen-panel admin-screen">
        <div className="screen-heading admin-heading">
          <h2>{moduleHeader.icon} {moduleHeader.title}</h2>
          <p>No hay juegos cargados para administrar.</p>
        </div>
        <button className="green-button" onClick={onAddGame}><Plus size={16} /> Crear primer juego</button>
      </section>
    );
  }

  function updateActiveGame(patch: Partial<GameConfig>) {
    onUpdateGame({ ...activeGame, ...patch });
  }

  function updateAsset(key: GameAssetKey, value: string) {
    updateActiveGame({
      assets: {
        ...activeGame.assets,
        [key]: value,
      },
    });
  }

  function updateContentThumb(category: ContentCategory, value: string) {
    updateActiveGame({
      assets: {
        ...activeGame.assets,
        contentThumbs: {
          ...activeGame.assets?.contentThumbs,
          [category]: value,
        },
      },
    });
  }

  function updateCampaign(campaignId: string, patch: Partial<Campaign>) {
    updateActiveGame({
      campaigns: activeGame.campaigns.map((campaign) =>
        campaign.id === campaignId ? { ...campaign, ...patch } : campaign
      ),
    });
  }

  function updateCampaignRoute(campaign: Campaign, value: string) {
    updateCampaign(campaign.id, {
      simulation: {
        ...campaign.simulation,
        route: value
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    });
  }

  function updateContent(category: ContentCategory, itemId: string, patch: Partial<ContentItem>) {
    updateActiveGame({
      content: {
        ...activeGame.content,
        [category]: activeGame.content[category].map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
      },
    });
  }

  function addContent(category: ContentCategory) {
    updateActiveGame({
      content: {
        ...activeGame.content,
        [category]: [createContentItem(category), ...activeGame.content[category]],
      },
    });
  }

  function addCampaign() {
    updateActiveGame({ campaigns: [createCampaign(), ...activeGame.campaigns] });
  }

  function updateUser(userId: string, patch: Partial<PlayerProfile>) {
    onUpdateUsers(users.map((user) => (user.id === userId ? { ...user, ...patch } : user)));
  }

  function createUser() {
    const username = userDraft.username.trim();
    if (!username) return;
    const id = `user_${slugify(username)}_${Date.now()}`;
    const baseUser = (users.find((user) => user.id === activeUserId) ?? users[0])!;
    const nextUser: PlayerProfile = {
      ...baseUser,
      id,
      name: username,
      username,
      email: userDraft.email.trim(),
      password: userDraft.password,
      role: userDraft.role,
      signedIn: false,
      activeGameId: activeGame.id,
      basePath: `/users/${id}`,
      profilePath: `/users/${id}/profile.json`,
      history: [],
      saves: [],
      level: userDraft.role === "admin" ? 99 : 1,
    };
    onUpdateUsers([nextUser, ...users]);
    setSelectedUserId(nextUser.id);
    setUserEditorMode("edit");
    setUserDraft({ username: "", email: "", password: "", role: "user" });
  }

  function formatDate(value?: string) {
    if (!value) return "Sin registro";
    return new Date(value).toLocaleString();
  }

  function resolveGameName(gameId?: string) {
    return games.find((game) => game.id === gameId)?.name ?? gameId ?? "Sin juego";
  }

  function toggleGameEnabled(gameId: string) {
    onUpdateGames(games.map((game) => (game.id === gameId ? { ...game, enabled: game.enabled === false } : game)));
  }

  return (
    <section className="screen-panel admin-screen">
      <div className="screen-heading admin-heading">
        <div>
          <h2>{moduleHeader.icon} {moduleHeader.title}</h2>
          <p>{moduleHeader.subtitle}</p>
        </div>
        <button onClick={onBack}>Volver</button>
      </div>

      {showOverview && (
        <div className="admin-dashboard">
          <article className="admin-command-card">
            <div>
              <small>Centro de mando</small>
              <strong>{adminReadiness}% listo</strong>
              <p>Resumen operativo de biblioteca, mapas, usuarios, tickets, noticias y avisos programados.</p>
            </div>
            <div className="admin-command-ring" aria-label={`${adminReadiness}% de preparacion`}>
              <span>{adminReadiness}</span>
              <small>%</small>
            </div>
          </article>

          <article className="admin-card admin-ops-card">
            <div className="admin-panel-title compact">
              <strong><Activity size={18} /> Estado operativo</strong>
              <span className="admin-status-pill">En linea</span>
            </div>
            <div className="admin-ops-list">
              {adminAlerts.map((alert) => (
                <span key={alert}><CheckCircle2 size={16} /> {alert}</span>
              ))}
            </div>
          </article>

          <article className="admin-card admin-ops-card">
            <div className="admin-panel-title compact">
              <strong><Users size={18} /> Usuarios y sesiones</strong>
              <span className="admin-status-pill">{connectedUsers} conectados</span>
            </div>
            <div className="admin-ops-list">
              <span><Activity size={16} /> {connectedUsers} usuarios conectados ahora</span>
              <span><Gamepad2 size={16} /> {usersInGame} usuarios en partida o sesion</span>
              <span><Headphones size={16} /> {openSupportTickets} tickets de soporte abiertos</span>
            </div>
          </article>

          <article className="admin-card admin-ops-card admin-support-ops-card">
            <div className="admin-panel-title compact">
              <strong><CalendarClock size={18} /> Cola operativa</strong>
              <span className="admin-status-pill amber">{scheduledNews + scheduledNotifications + openSupportTickets}</span>
            </div>
            <div className="admin-ops-list">
              <span><Newspaper size={16} /> {publishedNews} noticias publicadas</span>
              <span><Bell size={16} /> {scheduledNotifications} notificaciones programadas</span>
              <span><AlertTriangle size={16} /> {urgentSupportTickets} tickets urgentes</span>
            </div>
          </article>

          <div className="admin-module-grid">
            {moduleCards.map((card) => (
              <article className="admin-card admin-module-card" key={card.label}>
                <header>
                  <span>{card.icon}</span>
                  <small>{card.status}</small>
                </header>
                <strong>{card.label}</strong>
                <p>{card.description}</p>
                <footer>
                  <b>{card.metric}</b>
                  <small>{card.meta}</small>
                </footer>
              </article>
            ))}
          </div>

          <div className="admin-control-strip">
            <span><Gamepad2 size={18} /> {activeGame.name}</span>
            <span><FolderKanban size={18} /> {totals.campaigns} campanas</span>
            <span><Globe2 size={18} /> {totals.content} piezas de contenido</span>
            <span><KeyRound size={18} /> {adminUsers} administradores</span>
          </div>
        </div>
      )}

      <div className={`admin-layout ${showGameSelector ? "" : "admin-layout-single"}`}>
        {showGameSelector && <aside className="admin-game-list">
          <div className="admin-panel-title">
            <strong>Juegos disponibles</strong>
            <button className="green-button" onClick={onAddGame}><Plus size={15} /> Nuevo</button>
          </div>
          <label className="admin-game-search">
            <Search size={16} />
            <input value={gameSearch} onChange={(event) => setGameSearch(event.target.value)} placeholder="Buscar juego" />
          </label>
          <label className="admin-game-select">
            <span>Juego activo</span>
            <select value={activeGame.id} onChange={(event) => onSelectGame(event.target.value)}>
              {games.map((game) => (
                <option key={game.id} value={game.id}>{game.name}</option>
              ))}
            </select>
          </label>
          {filteredGames.map((game) => (
            <article
              key={game.id}
              className={`admin-game-manager-card ${game.id === activeGame.id ? "selected" : ""} ${game.enabled === false ? "disabled" : ""}`}
            >
              <button className="admin-game-pick" onClick={() => onSelectGame(game.id)}>
                <span>{game.short}</span>
                <strong>{game.name}</strong>
                <small>{game.campaigns.length} campanas - {game.enabled === false ? "Inactivo" : "Activo"}</small>
              </button>
              <button className={`admin-game-toggle ${game.enabled === false ? "" : "selected"}`} onClick={() => toggleGameEnabled(game.id)}>
                {game.enabled === false ? <ToggleLeft size={17} /> : <ToggleRight size={17} />}
                {game.enabled === false ? "Activar" : "Desactivar"}
              </button>
            </article>
          ))}
          {filteredGames.length === 0 && <div className="admin-empty-state"><Search size={18} /><strong>Sin juegos</strong><span>Cambia la busqueda.</span></div>}
        </aside>}

        <div className="admin-workbench">
          {showGames && <article className="admin-card admin-data-manager admin-game-table-manager">
            <div className="admin-panel-title">
              <div>
                <strong><BookOpen size={18} /> Juegos disponibles</strong>
                <p>Filtra, selecciona y carga el editor del juego que quieres configurar.</p>
              </div>
              <button className="green-button" onClick={() => { onAddGame(); setGameEditorOpen(true); }}><Plus size={15} /> Crear juego</button>
            </div>
            <div className="admin-data-toolbar">
              <label><Search size={17} /><input value={gameSearch} onChange={(event) => setGameSearch(event.target.value)} placeholder="Buscar juego, sigla, categoria o ID" /></label>
              <label>
                <SlidersHorizontal size={17} />
                <select value="all" onChange={() => undefined}>
                  <option value="all">Todos los juegos</option>
                </select>
              </label>
            </div>
            <section className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Juego</th>
                    <th>Categoria</th>
                    <th>Campanas</th>
                    <th>Estado</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGames.map((game) => (
                    <tr key={game.id} className={game.id === activeGame.id && gameEditorOpen ? "selected" : ""}>
                      <td><strong>{game.name}</strong><small>{game.short} - {game.id}</small></td>
                      <td>{game.category || "Sin categoria"}</td>
                      <td>{game.campaigns.length}</td>
                      <td><span className={game.enabled === false ? "admin-status-pill amber" : "admin-status-pill"}>{game.enabled === false ? "Inactivo" : "Activo"}</span></td>
                      <td className="admin-row-actions">
                        <button onClick={() => { onSelectGame(game.id); setGameEditorOpen(true); }}><Eye size={15} /> Ver</button>
                        <button onClick={() => toggleGameEnabled(game.id)}>{game.enabled === false ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}{game.enabled === false ? "Activar" : "Desactivar"}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredGames.length === 0 && <div className="admin-empty-state"><Search size={20} /><strong>Sin juegos</strong><span>Cambia los filtros o crea un juego.</span></div>}
            </section>
          </article>}

          {showGames && gameEditorOpen && <article className="admin-card admin-game-focus">
            <div>
              <small>Juego seleccionado</small>
              <h3>{activeGame.name}</h3>
              <p>{activeGame.description}</p>
            </div>
            <div className="admin-game-focus-actions">
              <span className={activeGame.enabled === false ? "admin-status-pill amber" : "admin-status-pill"}>
                {activeGame.enabled === false ? "Inactivo" : "Activo"}
              </span>
              <button className={activeGame.enabled === false ? "" : "selected"} onClick={() => toggleGameEnabled(activeGame.id)}>
                {activeGame.enabled === false ? <ToggleLeft size={17} /> : <ToggleRight size={17} />}
                {activeGame.enabled === false ? "Activar juego" : "Desactivar juego"}
              </button>
            </div>
          </article>}

          {showGames && gameEditorOpen && <article className="admin-card admin-game-manager-summary">
            <div className="admin-panel-title">
              <strong><BookOpen size={18} /> Estado de biblioteca</strong>
              <button className="green-button" onClick={onAddGame}><Plus size={15} /> Crear juego nuevo</button>
            </div>
            <div className="admin-game-status-grid">
              <span><strong>{totals.enabledGames}</strong><small>Juegos activos para usuarios</small></span>
              <span><strong>{games.length - totals.enabledGames}</strong><small>Juegos desactivados</small></span>
              <span><strong>{activeGame.name}</strong><small>Juego seleccionado para edicion</small></span>
            </div>
            <p>Los juegos desactivados quedan ocultos para usuarios normales. El administrador puede seguir viendolos y editandolos desde este panel.</p>
          </article>}

          {showGames && gameEditorOpen && <article className="admin-card admin-game-editor">
            <div className="admin-panel-title">
              <strong>Configuracion del juego</strong>
              <CheckCircle2 size={18} />
            </div>
            <div className="admin-form-grid">
              <label><span>ID</span><input value={activeGame.id} onChange={(event) => updateActiveGame({ id: slugify(event.target.value) || activeGame.id })} /></label>
              <label><span>Nombre</span><input value={activeGame.name} onChange={(event) => updateActiveGame({ name: event.target.value })} /></label>
              <label><span>Sigla</span><input value={activeGame.short} onChange={(event) => updateActiveGame({ short: event.target.value.toUpperCase().slice(0, 8) })} /></label>
              <label><span>Categoria</span><input value={activeGame.category ?? ""} onChange={(event) => updateActiveGame({ category: event.target.value })} /></label>
            </div>
            <label className="admin-wide-field">
              <span>Descripcion</span>
              <textarea value={activeGame.description} onChange={(event) => updateActiveGame({ description: event.target.value })} />
            </label>
          </article>}

          {showGames && gameEditorOpen && <article className="admin-card admin-game-media-editor">
            <div className="admin-panel-title">
              <strong><Image size={18} /> Editor visual de textos e imagenes</strong>
              <FileText size={18} />
            </div>

            <div className="admin-form-grid">
              <label><span><Type size={14} /> Descripcion cargada</span><input value={activeGame.loadedDescription ?? ""} onChange={(event) => updateActiveGame({ loadedDescription: event.target.value })} /></label>
              <label><span><Tags size={14} /> Tags</span><input value={(activeGame.tags ?? []).join(", ")} onChange={(event) => updateActiveGame({ tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
              <label><span>Max jugadores</span><input type="number" min={1} value={activeGame.maxPlayers ?? ""} onChange={(event) => updateActiveGame({ maxPlayers: Number(event.target.value) || undefined })} /></label>
              <label><span>Ruta config</span><input value={activeGame.configPath ?? ""} onChange={(event) => updateActiveGame({ configPath: event.target.value })} /></label>
            </div>

            <div className="admin-asset-grid">
              {assetFields.map((field) => {
                const value = activeGame.assets?.[field.key] ?? "";
                const preview = resolveGameAssetPreview(activeGame, value);
                return (
                  <section className="admin-asset-field" key={field.key}>
                    <div className="admin-asset-preview" style={{ backgroundImage: preview ? `url("${preview}")` : undefined }}>
                      {!preview && <span>Sin imagen</span>}
                    </div>
                    <label>
                      <span>{field.label}</span>
                      <input value={value} onChange={(event) => updateAsset(field.key, event.target.value)} placeholder="assets/hero/imagen.png" />
                    </label>
                    <small>{field.help}</small>
                  </section>
                );
              })}
            </div>

            <div className="admin-panel-title compact">
              <strong>Miniaturas por contenido</strong>
            </div>
            <div className="admin-content-thumb-grid">
              {contentThumbFields.map((field) => {
                const value = activeGame.assets?.contentThumbs?.[field.key] ?? "";
                const preview = resolveGameAssetPreview(activeGame, value);
                return (
                  <label className="admin-thumb-field" key={field.key}>
                    <i style={{ backgroundImage: preview ? `url("${preview}")` : undefined }} />
                    <span>{field.label}</span>
                    <input value={value} onChange={(event) => updateContentThumb(field.key, event.target.value)} placeholder="assets/content-thumbs/..." />
                  </label>
                );
              })}
            </div>
          </article>}

          {showGames && gameEditorOpen && <article className="admin-card">
            <div className="admin-panel-title">
              <strong>Campanas y mapas</strong>
              <button onClick={addCampaign}><Plus size={15} /> Campana</button>
            </div>
            <div className="admin-campaign-list">
              {activeGame.campaigns.map((campaign) => (
                <section key={campaign.id} className="admin-campaign-row">
                  <div className="admin-form-grid">
                    <label><span>ID</span><input value={campaign.id} onChange={(event) => updateCampaign(campaign.id, { id: slugify(event.target.value) || campaign.id })} /></label>
                    <label><span>Titulo</span><input value={campaign.title} onChange={(event) => updateCampaign(campaign.id, { title: event.target.value })} /></label>
                    <label className="admin-check-row">
                      <input type="checkbox" checked={campaign.implemented} onChange={(event) => updateCampaign(campaign.id, { implemented: event.target.checked })} />
                      <span>Implementada</span>
                    </label>
                  </div>
                  <label className="admin-wide-field">
                    <span>Descripcion</span>
                    <textarea value={campaign.description ?? ""} onChange={(event) => updateCampaign(campaign.id, { description: event.target.value })} />
                  </label>
                  <label className="admin-wide-field">
                    <span>Ruta del mapa, una zona por linea</span>
                    <textarea
                      value={(campaign.simulation?.route ?? []).join("\n")}
                      onChange={(event) => updateCampaignRoute(campaign, event.target.value)}
                    />
                  </label>
                </section>
              ))}
            </div>
          </article>}

          {showMaps && !mapEditorOpen && <article className="admin-card admin-data-manager admin-map-launcher">
            <div className="admin-panel-title">
              <div>
                <strong><Map size={18} /> Juegos activos con mapas</strong>
                <p>Selecciona un juego activo y carga su editor tactico 2D.</p>
              </div>
            </div>
            <section className="admin-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Juego</th>
                    <th>Campanas</th>
                    <th>Mapas</th>
                    <th>Estado</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {games.filter((game) => game.enabled !== false).map((game) => (
                    <tr key={game.id} className={game.id === activeGame.id ? "selected" : ""}>
                      <td><strong>{game.name}</strong><small>{game.id}</small></td>
                      <td>{game.campaigns.length}</td>
                      <td>{game.maps?.length ?? 0}</td>
                      <td><span className="admin-status-pill">Activo</span></td>
                      <td>
                        <button onClick={() => { onSelectGame(game.id); setMapEditorOpen(true); }}>
                          <Map size={15} /> Cargar editor de mapas
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </article>}

          {showMaps && mapEditorOpen && <MapEditor
            game={activeGame}
            onChange={(maps) => updateActiveGame({ maps })}
            onBack={() => setMapEditorOpen(false)}
          />}

          {showNews && <NewsEditor news={news} games={games} onChange={onUpdateNews} />}

          {showNotifications && <NotificationEditor notifications={notifications} games={games} onChange={onUpdateNotifications} />}

          {showGames && gameEditorOpen && <article className="admin-card">
            <div className="admin-panel-title">
              <strong>Contenido y DLC</strong>
              <Save size={18} />
            </div>
            {(["dlc", "features", "extras"] as ContentCategory[]).map((category) => (
              <section className="admin-content-block" key={category}>
                <div className="admin-panel-title compact">
                  <strong>{category.toUpperCase()}</strong>
                  <button onClick={() => addContent(category)}><Plus size={14} /> Agregar</button>
                </div>
                {activeGame.content[category].map((item) => (
                  <div className="admin-content-row" key={item.id}>
                    <input value={item.name} onChange={(event) => updateContent(category, item.id, { name: event.target.value })} />
                    <input value={item.description ?? ""} onChange={(event) => updateContent(category, item.id, { description: event.target.value })} />
                    <button className={item.enabled ? "selected" : ""} onClick={() => updateContent(category, item.id, { enabled: !item.enabled })}>
                      {item.enabled ? "Activo" : "Inactivo"}
                    </button>
                  </div>
                ))}
              </section>
            ))}
          </article>}

          {showUsers && userEditorMode === "list" && <article className="admin-card admin-data-manager">
            <div className="admin-panel-title admin-users-heading">
              <div>
                <strong><Users size={18} /> Usuarios y accesos</strong>
                <p>Gestiona cuentas locales con tabla, filtros y una pantalla dedicada por usuario.</p>
              </div>
              <button className="green-button" onClick={() => setUserEditorMode("create")}><Plus size={15} /> Crear usuario</button>
            </div>

            <div className="admin-user-stats">
              <span><Users size={18} /><strong>{users.length}</strong><small>Cuentas totales</small></span>
              <span><ShieldCheck size={18} /><strong>{adminUsers}</strong><small>Administradores</small></span>
              <span><UserCog size={18} /><strong>{operatorUsers}</strong><small>Usuarios normales</small></span>
              <span><KeyRound size={18} /><strong>{activeUserId}</strong><small>Sesion activa</small></span>
            </div>

            <div className="admin-data-toolbar admin-user-toolbar">
              <label>
                <Search size={18} />
                <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Buscar por usuario, correo o ID" />
              </label>
              <label>
                <SlidersHorizontal size={18} />
                <select value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value as "all" | "admin" | "user")}>
                  <option value="all">Todos los roles</option>
                  <option value="admin">Solo administradores</option>
                  <option value="user">Solo usuarios</option>
                </select>
              </label>
            </div>

            <section className="admin-table-wrap">
              <table className="admin-data-table admin-user-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Ultima sesion</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const role = user.role ?? "user";
                    return (
                      <tr key={user.id}>
                        <td><strong>{user.username || user.name || user.id}</strong><small>{user.id}</small></td>
                        <td>{user.email}</td>
                        <td><span className={`admin-status-pill ${role === "admin" ? "status-published" : ""}`}>{role === "admin" ? "Administrador" : "Usuario"}</span></td>
                        <td>{user.id === activeUserId ? "Sesion activa" : formatDate(user.lastLoginAt)}</td>
                        <td><button onClick={() => { setSelectedUserId(user.id); setUserEditorMode("edit"); }}><Eye size={15} /> Ver</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="admin-empty-state">
                  <Search size={20} />
                  <strong>Sin resultados</strong>
                  <span>Cambia el filtro o busca otro usuario.</span>
                </div>
              )}
            </section>
          </article>}

          {showUsers && userEditorMode === "create" && (
            <article className="admin-card admin-user-profile-screen">
              <div className="admin-panel-title">
                <div>
                  <strong><UserPlus size={18} /> Crear usuario</strong>
                  <p>Formulario completo para registrar un nuevo operador local.</p>
                </div>
                <button onClick={() => setUserEditorMode("list")}>Volver a usuarios</button>
              </div>
              <div className="admin-user-profile-layout">
                <section className="admin-user-profile-summary">
                  <div className="admin-user-avatar large">NU</div>
                  <strong>Nuevo usuario</strong>
                  <span className="admin-status-pill amber">Sin crear</span>
                </section>
                <section className="admin-user-profile-form">
                  <div className="admin-form-grid">
                    <label><span>Usuario</span><input placeholder="nuevo-operador" value={userDraft.username} onChange={(event) => setUserDraft((draft) => ({ ...draft, username: event.target.value }))} /></label>
                    <label><span>Correo</span><input placeholder="usuario@rpg.local" value={userDraft.email} onChange={(event) => setUserDraft((draft) => ({ ...draft, email: event.target.value }))} /></label>
                    <label><span>Contrasena</span><input placeholder="clave inicial" value={userDraft.password} onChange={(event) => setUserDraft((draft) => ({ ...draft, password: event.target.value }))} /></label>
                    <label><span>Rol</span><select value={userDraft.role} onChange={(event) => setUserDraft((draft) => ({ ...draft, role: event.target.value as "user" | "admin" }))}>
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select></label>
                  </div>
                  <button className="green-button" onClick={createUser}><Plus size={15} /> Crear usuario</button>
                </section>
              </div>
            </article>
          )}

          {showUsers && selectedUser && userEditorMode === "edit" && (
            <article className="admin-card admin-user-profile-screen">
              <div className="admin-panel-title">
                <div>
                  <strong><UserCog size={18} /> Usuario: {selectedUser.username || selectedUser.name || selectedUser.id}</strong>
                  <p>Perfil, acceso, ultima sesion, imagen y actividad de juegos.</p>
                </div>
                <button onClick={() => setUserEditorMode("list")}>Volver a usuarios</button>
              </div>
              <div className="admin-user-profile-layout">
                <section className="admin-user-profile-summary">
                  <div className="admin-user-avatar large">
                    {resolveUserAsset(selectedUser, selectedUser.avatar) ? (
                      <img
                        src={resolveUserAsset(selectedUser, selectedUser.avatar)}
                        alt=""
                        style={{
                          objectPosition: `${selectedUser.avatarFit?.x ?? 50}% ${selectedUser.avatarFit?.y ?? 50}%`,
                          transform: `scale(${selectedUser.avatarFit?.scale ?? 1})`,
                        }}
                      />
                    ) : (
                      (selectedUser.username || selectedUser.name || selectedUser.id).slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <strong>{selectedUser.name}</strong>
                  <span className="admin-status-pill">{selectedUser.id === activeUserId ? "Sesion activa" : selectedUser.id}</span>
                  <small>Ultima sesion: {formatDate(selectedUser.lastLoginAt)}</small>
                  <small>Actividad: {formatDate(selectedUser.lastActivityAt)}</small>
                  <small>Juegos iniciados: {selectedUser.gameProfilesStarted}</small>
                  <small>Campanas completadas: {selectedUser.completedCampaigns}</small>
                </section>

                <section className="admin-user-profile-form">
                  <div className="admin-form-grid">
                    <label><span>ID</span><input value={selectedUser.id} disabled /></label>
                    <label><span>Usuario</span><input value={selectedUser.username ?? ""} onChange={(event) => updateUser(selectedUser.id, { username: event.target.value, name: event.target.value || selectedUser.name })} /></label>
                    <label><span>Nombre visible</span><input value={selectedUser.name ?? ""} onChange={(event) => updateUser(selectedUser.id, { name: event.target.value })} /></label>
                    <label><span><Mail size={13} /> Correo</span><input value={selectedUser.email ?? ""} onChange={(event) => updateUser(selectedUser.id, { email: event.target.value })} /></label>
                    <label><span><LockKeyhole size={13} /> Contrasena</span><input value={selectedUser.password ?? ""} onChange={(event) => updateUser(selectedUser.id, { password: event.target.value })} /></label>
                    <label><span>Genero</span><input value={selectedUser.gender ?? ""} onChange={(event) => updateUser(selectedUser.id, { gender: event.target.value })} /></label>
                    <label><span>Nivel</span><input type="number" min={1} value={selectedUser.level} onChange={(event) => updateUser(selectedUser.id, { level: Number(event.target.value) || 1 })} /></label>
                    <label><span>Juego activo</span><select value={selectedUser.activeGameId} onChange={(event) => updateUser(selectedUser.id, { activeGameId: event.target.value })}>
                      {games.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}
                    </select></label>
                    <label><span>Rol</span><select value={selectedUser.role ?? "user"} disabled={selectedUser.id === activeUserId} onChange={(event) => updateUser(selectedUser.id, { role: event.target.value as "user" | "admin" })}>
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select></label>
                    <label><span>Imagen de perfil</span><input value={selectedUser.avatar ?? ""} onChange={(event) => updateUser(selectedUser.id, { avatar: event.target.value })} /></label>
                    <label><span>Base path</span><input value={selectedUser.basePath ?? ""} onChange={(event) => updateUser(selectedUser.id, { basePath: event.target.value })} /></label>
                    <label><span>Perfil JSON</span><input value={selectedUser.profilePath ?? ""} onChange={(event) => updateUser(selectedUser.id, { profilePath: event.target.value })} /></label>
                  </div>
                  <div className="admin-user-date-grid">
                    <span><CalendarClock size={16} /><strong>Ultima sesion</strong><small>{formatDate(selectedUser.lastLoginAt)}</small></span>
                    <span><CalendarClock size={16} /><strong>Sesion previa</strong><small>{formatDate(selectedUser.previousLastLoginAt)}</small></span>
                    <span><Activity size={16} /><strong>Actividad</strong><small>{formatDate(selectedUser.lastActivityAt)}</small></span>
                    <span><Gamepad2 size={16} /><strong>Guardados</strong><small>{selectedUser.saves.length}</small></span>
                  </div>
                  <button
                    disabled={selectedUser.id === activeUserId}
                    className={(selectedUser.role ?? "user") === "admin" ? "selected" : ""}
                    onClick={() => updateUser(selectedUser.id, { role: (selectedUser.role ?? "user") === "admin" ? "user" : "admin" })}
                  >
                    {(selectedUser.role ?? "user") === "admin" ? "Cambiar a usuario" : "Cambiar a admin"}
                  </button>
                </section>
              </div>

              <section className="admin-user-history-panel">
                <div className="admin-panel-title compact">
                  <strong><Gamepad2 size={18} /> Historia de juegos</strong>
                  <span>{selectedUser.history.length} registros</span>
                </div>
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Juego</th>
                      <th>Sesiones</th>
                      <th>Campana activa</th>
                      <th>Guardado activo</th>
                      <th>Ultima partida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUser.history.map((entry) => (
                      <tr key={`${selectedUser.id}-${entry.gameId}`}>
                        <td><strong>{resolveGameName(entry.gameId)}</strong><small>{entry.gameId}</small></td>
                        <td>{entry.sessions}</td>
                        <td>{entry.activeCampaignId ?? "Sin campana"}</td>
                        <td>{entry.activeSaveId ?? "Sin guardado"}</td>
                        <td>{formatDate(entry.lastPlayedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedUser.history.length === 0 && <div className="admin-empty-state"><Gamepad2 size={20} /><strong>Sin historial</strong><span>Este usuario aun no tiene partidas registradas.</span></div>}
              </section>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
