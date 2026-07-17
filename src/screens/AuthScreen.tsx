import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  Activity,
  AlertCircle,
  Box,
  Check,
  CheckSquare,
  Cloud,
  Eye,
  Gamepad2,
  Github,
  Headphones,
  Square,
  Lock,
  LogIn,
  Mail,
  Monitor,
  Send,
  Settings,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { gameHeroVars } from "../lib/gameLibrary";
import type { AppNewsEntry } from "../lib/appMetadataStorage";
import type { GameConfig } from "../types/game";
import type { PlayerProfile } from "../types/profile";

type Props = {
  profile: PlayerProfile;
  users: PlayerProfile[];
  games: GameConfig[];
  news?: AppNewsEntry[];
  platformName?: string;
  appVersion?: string;
  releaseChannel?: string;
  onAccess: (profile: PlayerProfile) => void;
  onRegister: (account: { email: string; username: string; password: string; role?: "user" | "admin" }) => void;
};

type AuthMode = "login" | "register";

type NewsItem = {
  id: string;
  title: string;
  summary?: string;
  date?: string;
  publishedAt?: string;
  gameId?: string;
  image?: string;
  body?: string;
};

const rememberedLoginKey = "rpg-platform.remembered-login";
const lastGameKey = "rpg-platform.last-game-id";

function matchesAccount(profile: PlayerProfile, value: string) {
  const normalizedValue = value.trim().toLowerCase();
  return (
    String(profile.email ?? "").toLowerCase() === normalizedValue ||
    String(profile.username ?? "").toLowerCase() === normalizedValue
  );
}

function readLocalStorage(key: string) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local storage may be unavailable in restricted webviews.
  }
}

function removeLocalStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Local storage may be unavailable in restricted webviews.
  }
}

function newsImage(item: NewsItem, games: GameConfig[]) {
  if (item.image) return item.image;
  const relatedGame = games.find((game) => game.id === item.gameId) ?? games[0];
  return relatedGame?.assets?.cover
    ? `${relatedGame.basePath ?? `/games/${relatedGame.id}`}/${relatedGame.assets.cover}`
    : "/platform/uiux-copied/rec-fallout4.png";
}

function newsDate(item: NewsItem) {
  const rawDate = item.date ?? item.publishedAt;
  if (!rawDate) return "";
  try {
    return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(rawDate));
  } catch {
    return rawDate;
  }
}

function publicNews(items: NewsItem[]) {
  return items
    .filter((item) => {
      const status = "status" in item ? String((item as NewsItem & { status?: string }).status ?? "published") : "published";
      const rawDate = item.publishedAt ?? item.date;
      const publishTime = rawDate ? new Date(rawDate).getTime() : 0;
      return status === "published" && (!rawDate || publishTime <= Date.now());
    })
    .sort((left, right) => new Date(right.publishedAt ?? right.date ?? 0).getTime() - new Date(left.publishedAt ?? left.date ?? 0).getTime());
}

export function AuthScreen({ profile, users, games, news = [], platformName = "RPG Platform Engine", appVersion = "0.10-1625", releaseChannel = "Pre-release", onAccess, onRegister }: Props) {
  const rememberedLogin = readLocalStorage(rememberedLoginKey);
  const [mode, setMode] = useState<AuthMode>("login");
  const [emailOrUser, setEmailOrUser] = useState(rememberedLogin || "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [showAllNews, setShowAllNews] = useState(false);
  const [showPublicSettings, setShowPublicSettings] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportMessages, setSupportMessages] = useState<Array<{ id: string; author: "Sistema" | "Visitante"; body: string; createdAt: string }>>([
    {
      id: "support_welcome",
      author: "Sistema",
      body: "Soporte publico disponible. Describe tu problema y un operador podra ayudarte antes de iniciar sesion.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [remember, setRemember] = useState(Boolean(rememberedLogin));
  const [newsOptIn, setNewsOptIn] = useState(true);

  const availableUsers = users.length ? users : [profile];
  const selectedGame = useMemo(() => {
    const storedGameId = readLocalStorage(lastGameKey);
    return (
      games.find((game) => game.id === storedGameId) ??
      games.find((game) => game.id === profile.activeGameId) ??
      games[0]
    );
  }, [games, profile.activeGameId]);
  const heroStyle = selectedGame ? (gameHeroVars(selectedGame) as CSSProperties) : undefined;
  const managedNews = publicNews(news).slice(0, 5);
  const fallbackNews = managedNews.length
    ? managedNews
    : [
        {
          id: "fallback-news",
          title: "RPG Platform Engine listo",
          summary: "Noticias cargadas desde archivo cuando exista /platform/news/news.json.",
          date: "2026-06-22",
          gameId: selectedGame?.id,
        },
      ];

  const loginAccount = availableUsers.find((user) => matchesAccount(user, emailOrUser));
  const passwordRequired = Boolean(loginAccount?.password);
  const loginMatchesProfile = Boolean(loginAccount && (!passwordRequired || password === loginAccount.password));
  const loginReady = emailOrUser.trim().length > 0 && password.trim().length > 0;
  const accountAlreadyExists = availableUsers.some((user) => matchesAccount(user, email) || matchesAccount(user, username));
  const registerReady =
    email.trim().length > 0 &&
    username.trim().length > 0 &&
    password.trim().length >= 4 &&
    password === confirmPassword &&
    !accountAlreadyExists;
  const canEnter = mode === "login" ? loginReady : registerReady;

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  function accessProfile(account: PlayerProfile) {
    const now = new Date().toISOString();
    if (remember) writeLocalStorage(rememberedLoginKey, account.username || account.email || emailOrUser.trim());
    else removeLocalStorage(rememberedLoginKey);
    onAccess({
      ...account,
      signedIn: true,
      previousLastLoginAt: account.lastLoginAt,
      lastLoginAt: now,
      lastActivityAt: now,
    });
  }

  function submit() {
    if (mode === "register") {
      if (!canEnter) {
        setAuthMessage("Completa correo, usuario y una contrasena valida.");
        return;
      }
      if (remember) writeLocalStorage(rememberedLoginKey, username.trim() || email.trim());
      onRegister({ email: email.trim(), username: username.trim(), password });
      return;
    }

    if (!emailOrUser.trim() || !password.trim()) {
      setAuthMessage("Escribe tu usuario y contrasena.");
      return;
    }
    if (!loginAccount || !loginMatchesProfile) {
      setAuthMessage("Usuario o contrasena incorrectos.");
      return;
    }
    setAuthMessage("");
    accessProfile(loginAccount);
  }

  function socialAccess(provider: "google" | "facebook" | "github") {
    const usernameByProvider = {
      google: "google_demo",
      facebook: "facebook_demo",
      github: "github_demo",
    };
    const usernameFromProvider = usernameByProvider[provider];
    const existing = availableUsers.find((user) => user.username === usernameFromProvider);
    if (existing) {
      accessProfile(existing);
      return;
    }
    if (remember) writeLocalStorage(rememberedLoginKey, usernameFromProvider);
    onRegister({
      email: `${usernameFromProvider}@rpg.local`,
      username: usernameFromProvider,
      password: `${provider}123`,
    });
  }

  function recoverPassword() {
    const target = recoveryEmail.trim() || emailOrUser.trim();
    if (!target) {
      setRecoveryMessage("Escribe el correo o usuario de la cuenta.");
      return;
    }

    const matchedProfile = availableUsers.find((user) => matchesAccount(user, target));
    if (!matchedProfile) {
      setRecoveryMessage("No hay una cuenta local registrada con ese correo o usuario.");
      return;
    }

    const resetCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const resetLink = `${window.location.origin}${window.location.pathname}?reset=${resetCode}`;
    const subject = encodeURIComponent("Restablecer contrasena - RPG Platform Engine");
    const body = encodeURIComponent(
      `Usa este codigo para restablecer tu contrasena: ${resetCode}\n\nEnlace local: ${resetLink}\n\nPor seguridad no enviamos tu contrasena actual.`
    );
    writeLocalStorage(`rpg-platform.password-reset.${matchedProfile.id}`, JSON.stringify({
      code: resetCode,
      requestedAt: new Date().toISOString(),
    }));
    window.location.href = `mailto:${matchedProfile.email || target}?subject=${subject}&body=${body}`;
    setRecoveryMessage(`Codigo generado: ${resetCode}. Se preparo el correo de restablecimiento.`);
  }

  function sendSupportMessage() {
    const body = supportMessage.trim();
    if (!body) return;
    setSupportMessages((current) => [
      ...current,
      {
        id: `support_guest_${Date.now()}`,
        author: "Visitante",
        body,
        createdAt: new Date().toISOString(),
      },
      {
        id: `support_auto_${Date.now()}`,
        author: "Sistema",
        body: "Mensaje recibido. Mantente en esta pantalla o inicia sesion si ya tienes cuenta.",
        createdAt: new Date().toISOString(),
      },
    ]);
    setSupportMessage("");
  }

  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <div className="auth-brand">
          <Settings size={52} />
          <strong>{platformName}</strong>
          <span>Tu universo. Tu historia. Tu aventura.</span>
        </div>
        <div className="auth-status auth-status-public">
          <span><Monitor size={24} /><small>Estado del sistema</small><strong>{isOnline ? "Conexion" : "Sin conexion"}</strong></span>
          <span className="auth-version-status"><i /> <small>Version</small><strong>{appVersion}</strong></span>
          <button type="button" aria-label="Configuracion" title="Configuracion" onClick={() => setShowPublicSettings(true)}><Settings size={22} /></button>
        </div>
      </header>

      <main className="auth-main">
        <section className="auth-showcase">
          <div className="auth-hero-art" style={heroStyle}>
            <span>{selectedGame?.name ?? "RPG Platform Engine"}</span>
          </div>
          <article className="auth-news">
            <header>
              <strong>Noticias</strong>
              <button type="button" onClick={() => setShowAllNews(true)}>Ver todas</button>
            </header>
            {fallbackNews.slice(0, 5).map((item) => (
              <div key={item.id}>
                <img src={newsImage(item, games)} alt="" />
                <span><strong>{item.title}</strong><small>{item.summary}</small></span>
                <small>{newsDate(item)}</small>
              </div>
            ))}
          </article>
        </section>

        <section className="auth-panel">
          <div className="auth-tabs">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              <User size={22} /> Iniciar sesion
            </button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              <UserPlus size={22} /> Registrarse
            </button>
          </div>

          <div className="auth-panel-body">
            <form
              className="auth-form"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              {mode === "login" ? (
                <>
                  <p>Accede a tu cuenta para continuar.</p>
                  <label>
                    <span>Correo o usuario</span>
                    <div><User size={18} /><input value={emailOrUser} onChange={(event) => setEmailOrUser(event.target.value)} placeholder="Ingresa tu correo o usuario" /></div>
                  </label>
                  <label>
                    <span>Contrasena</span>
                    <div><Lock size={18} /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresa tu contrasena" /><button type="button" className="auth-eye-button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contrasena" : "Ver contrasena"}><Eye size={18} /></button></div>
                  </label>
                  <button
                    type="button"
                    className={`auth-check ${remember ? "checked" : ""}`}
                    onClick={() => setRemember((value) => !value)}
                    aria-pressed={remember}
                  >
                    <span className="auth-checkbox-icon">{remember ? <Check size={16} /> : <Square size={16} />}</span>
                    Recordarme
                  </button>
                  {authMessage && <strong className="auth-message">{authMessage}</strong>}
                  <button className="auth-submit" type="submit"><LogIn size={22} /> Iniciar sesion</button>
                  <button type="button" className="auth-link" onClick={() => setShowRecovery(true)}>Olvidaste tu contrasena?</button>
                </>
              ) : (
                <>
                  <p>Crea tu cuenta para comenzar tu aventura.</p>
                  <label>
                    <span>Correo electronico</span>
                    <div><Mail size={18} /><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Ingresa tu correo electronico" /></div>
                  </label>
                  <label>
                    <span>Nombre de usuario</span>
                    <div><User size={18} /><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Elige tu nombre de usuario" /></div>
                  </label>
                  <label>
                    <span>Contrasena</span>
                    <div><Lock size={18} /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Crea una contrasena" /><button type="button" className="auth-eye-button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contrasena" : "Ver contrasena"}><Eye size={18} /></button></div>
                    <small>Minimo 4 caracteres. Luego se cambia a validacion real.</small>
                  </label>
                  <label>
                    <span>Confirmar contrasena</span>
                    <div><Lock size={18} /><input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirma tu contrasena" /><button type="button" className="auth-eye-button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? "Ocultar confirmacion" : "Ver confirmacion"}><Eye size={18} /></button></div>
                  </label>
                  <button type="button" className="auth-check checked"><CheckSquare size={18} /> Acepto terminos y condiciones</button>
                  <button type="button" className={`auth-check ${newsOptIn ? "checked" : ""}`} onClick={() => setNewsOptIn((value) => !value)}>
                    <CheckSquare size={18} /> Recibir noticias y actualizaciones
                  </button>
                  <button className="auth-submit" type="submit" disabled={!canEnter}><LogIn size={22} /> Crear cuenta</button>
                </>
              )}

              <div className="auth-social">
                <span /> <small>{mode === "login" ? "o continua con" : "o registrate con"}</small> <span />
                <button type="button" title="Google" aria-label="Google" onClick={() => socialAccess("google")}><Mail size={24} /></button>
                <button type="button" title="Facebook" aria-label="Facebook" onClick={() => socialAccess("facebook")}><Box size={24} /></button>
                <button type="button" title="GitHub" aria-label="GitHub" onClick={() => socialAccess("github")}><Github size={24} /></button>
              </div>

              <p className="auth-switch">
                {mode === "login" ? "No tienes cuenta?" : "Ya tienes cuenta?"}
                <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
                  {mode === "login" ? "Registrate ahora" : "Inicia sesion"}
                </button>
              </p>

              <button type="button" className="auth-support-entry" onClick={() => setShowSupportChat(true)}>
                <Headphones size={20} />
                Soporte por chat sin iniciar sesion
              </button>
            </form>

            <aside className="auth-benefits">
              <p>{mode === "login" ? "Entra para continuar tus campanas y partidas guardadas." : "Al registrarte podras:"}</p>
              <span><Cloud size={28} /><strong>Guardar tu progreso</strong><small>Tu aventura se guarda de forma segura.</small></span>
              <span><Activity size={28} /><strong>Sincronizar tus campanas</strong><small>Accede a tus partidas en cualquier dispositivo.</small></span>
              <span><Box size={28} /><strong>Activar modulos y DLC</strong><small>Desbloquea contenido adicional y funcionalidades.</small></span>
              <span><UserPlus size={28} /><strong>Unirte a la comunidad</strong><small>Conectate con otros jugadores.</small></span>
            </aside>
          </div>
        </section>
      </main>

      {showRecovery && (
        <div className="modal-backdrop">
          <article className="app-modal auth-recovery-modal">
            <button className="modal-close" type="button" onClick={() => setShowRecovery(false)}><X size={18} /></button>
            <h3><AlertCircle size={22} /> Recuperar contrasena</h3>
            <p>Escribe el correo o usuario registrado para generar un codigo local de restablecimiento.</p>
            <label>
              <span>Correo o usuario</span>
              <input value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} />
            </label>
            {recoveryMessage && <strong>{recoveryMessage}</strong>}
            <button className="green-button" type="button" onClick={recoverPassword}>Enviar correo</button>
          </article>
        </div>
      )}

      {showPublicSettings && (
        <div className="modal-backdrop">
          <article className="app-modal auth-public-settings-modal">
            <button className="modal-close" type="button" onClick={() => setShowPublicSettings(false)}><X size={18} /></button>
            <h3><Settings size={22} /> Configuracion</h3>
            <div className="auth-public-settings-grid">
              <span><small>Plataforma</small><strong>{platformName}</strong></span>
              <span><small>Version</small><strong>{appVersion}</strong></span>
              <span><small>Canal</small><strong>{releaseChannel}</strong></span>
              <span><small>Estado</small><strong>{isOnline ? "Conexion" : "Sin conexion"}</strong></span>
            </div>
            <button className="green-button" type="button" onClick={() => setShowPublicSettings(false)}>Cerrar</button>
          </article>
        </div>
      )}

      {showSupportChat && (
        <div className="modal-backdrop">
          <article className="app-modal auth-support-chat-modal">
            <button className="modal-close" type="button" onClick={() => setShowSupportChat(false)}><X size={18} /></button>
            <h3><Headphones size={22} /> Soporte por chat</h3>
            <p>Usa este canal si no puedes iniciar sesion o no puedes crear un ticket.</p>
            <div className="auth-support-chat-log">
              {supportMessages.map((message) => (
                <section key={message.id} className={message.author === "Visitante" ? "guest" : ""}>
                  <strong>{message.author}</strong>
                  <p>{message.body}</p>
                  <small>{new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}</small>
                </section>
              ))}
            </div>
            <div className="auth-support-chat-input">
              <input
                value={supportMessage}
                onChange={(event) => setSupportMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendSupportMessage();
                }}
                placeholder="Escribe tu solicitud de soporte..."
              />
              <button type="button" className="green-button" onClick={sendSupportMessage}><Send size={18} /> Enviar</button>
            </div>
          </article>
        </div>
      )}

      {showAllNews && (
        <div className="modal-backdrop">
          <article className="app-modal auth-news-modal">
            <button className="modal-close" type="button" onClick={() => setShowAllNews(false)}><X size={18} /></button>
            <h3><Activity size={22} /> Todas las noticias</h3>
            <div className="auth-news-list">
              {fallbackNews.map((item) => (
                <section key={item.id}>
                  <img src={newsImage(item, games)} alt="" />
                  <div>
                    <strong>{item.title}</strong>
                    <small>{newsDate(item)}</small>
                    <p>{item.body || item.summary}</p>
                  </div>
                </section>
              ))}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
