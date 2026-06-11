import { useState } from "react";
import {
  Activity,
  AlertCircle,
  Box,
  CheckSquare,
  Cloud,
  Eye,
  Gamepad2,
  Lock,
  LogIn,
  Mail,
  Monitor,
  Settings,
  User,
  UserPlus,
  Volume2,
  X,
} from "lucide-react";
import type { PlayerProfile } from "../types/profile";

type Props = {
  profile: PlayerProfile;
  users: PlayerProfile[];
  onAccess: (profile: PlayerProfile) => void;
  onRegister: (account: { email: string; username: string; password: string }) => void;
};

type AuthMode = "login" | "register";

function matchesAccount(profile: PlayerProfile, value: string) {
  const normalizedValue = value.trim().toLowerCase();
  return (
    String(profile.email ?? "").toLowerCase() === normalizedValue ||
    String(profile.username ?? "").toLowerCase() === normalizedValue
  );
}

export function AuthScreen({ profile, users, onAccess, onRegister }: Props) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [emailOrUser, setEmailOrUser] = useState(profile.email || profile.username || "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [remember, setRemember] = useState(true);
  const [news, setNews] = useState(true);

  const loginAccount = users.find((user) => matchesAccount(user, emailOrUser));
  const loginMatchesProfile = Boolean(loginAccount && password === loginAccount.password);
  const loginReady = emailOrUser.trim().length > 0 && password.trim().length > 0 && loginMatchesProfile;
  const accountAlreadyExists = users.some((user) => matchesAccount(user, email) || matchesAccount(user, username));
  const registerReady =
    email.trim().length > 0 &&
    username.trim().length > 0 &&
    password.trim().length >= 4 &&
    password === confirmPassword &&
    !accountAlreadyExists;
  const canEnter = mode === "login" ? loginReady : registerReady;

  function submit() {
    if (!canEnter) return;
    const now = new Date().toISOString();
    if (mode === "register") {
      onRegister({ email: email.trim(), username: username.trim(), password });
      return;
    }

    if (loginAccount) {
      onAccess({
        ...loginAccount,
        signedIn: true,
        previousLastLoginAt: loginAccount.lastLoginAt,
        lastLoginAt: now,
        lastActivityAt: now,
      });
      return;
    }
  }

  function recoverPassword() {
    const target = recoveryEmail.trim() || emailOrUser.trim();
    if (!target) {
      setRecoveryMessage("Escribe el correo o usuario de la cuenta.");
      return;
    }

    const matchesProfile =
      users.find((user) => matchesAccount(user, target));
    if (!matchesProfile) {
      setRecoveryMessage("No hay una cuenta local registrada con ese correo o usuario.");
      return;
    }

    const resetCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const resetLink = `${window.location.origin}${window.location.pathname}?reset=${resetCode}`;
    const subject = encodeURIComponent("Restablecer contrasena - RPG Platform Engine");
    const body = encodeURIComponent(
      `Usa este codigo para restablecer tu contrasena: ${resetCode}\n\nEnlace local: ${resetLink}\n\nPor seguridad no enviamos tu contrasena actual.`
    );
    onAccess({
      ...matchesProfile,
      signedIn: false,
      passwordResetCode: resetCode,
      lastPasswordResetRequestAt: new Date().toISOString(),
    });
    window.location.href = `mailto:${matchesProfile.email || target}?subject=${subject}&body=${body}`;
    setRecoveryMessage(`Codigo de restablecimiento generado: ${resetCode}. Correo preparado en tu cliente de correo.`);
  }

  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <div className="auth-brand">
          <Settings size={52} />
          <strong>RPG Platform Engine</strong>
          <span>Tu universo. Tu historia. Tu aventura.</span>
        </div>
        <div className="auth-status">
          <span><Monitor size={24} /><small>Estado del sistema</small><strong>Todo en orden</strong></span>
          <span><Activity size={24} /><small>Audio ambiental</small><strong>Activado</strong></span>
          <span><Box size={24} /><small>{profile.name}</small><strong>Nivel {profile.level}</strong></span>
          <button><Settings size={22} /></button>
        </div>
      </header>

      <main className="auth-main">
        <section className="auth-showcase">
          <div className="auth-hero-art" />
          <article className="auth-news">
            <header>
              <strong>Noticias</strong>
              <button>Ver todas →</button>
            </header>
            <div>
              <img src="/platform/uiux-copied/rec-fallout4.png" alt="" />
              <span><strong>Actualizacion 1.6.0 disponible</strong><small>Nuevas misiones, mejoras y mas contenido.</small></span>
              <small>24 mayo, 2025</small>
            </div>
            <div>
              <img src="/platform/uiux-copied/rec-skyrim.png" alt="" />
              <span><strong>Evento: Ecos del Portal</strong><small>Enfrenta nuevos desafios y obten recompensas unicas.</small></span>
              <small>20 mayo, 2025</small>
            </div>
            <div>
              <img src="/platform/uiux-copied/rec-newvegas.png" alt="" />
              <span><strong>Notas del parche</strong><small>Consulta los cambios y correcciones mas recientes.</small></span>
              <small>18 mayo, 2025</small>
            </div>
          </article>
        </section>

        <section className="auth-panel">
          <div className="auth-tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              <User size={22} /> Iniciar sesion
            </button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
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
                    <div><Lock size={18} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Ingresa tu contrasena" /><Eye size={18} /></div>
                  </label>
                  <button type="button" className={`auth-check ${remember ? "checked" : ""}`} onClick={() => setRemember((value) => !value)}>
                    <CheckSquare size={18} /> Recordarme
                  </button>
                  <button className="auth-submit" type="submit" disabled={!canEnter}><LogIn size={22} /> Iniciar sesion</button>
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
                    <div><Lock size={18} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Crea una contrasena" /><Eye size={18} /></div>
                    <small>Minimo 4 caracteres. Luego se cambia a validacion real.</small>
                  </label>
                  <label>
                    <span>Confirmar contrasena</span>
                    <div><Lock size={18} /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirma tu contrasena" /><Eye size={18} /></div>
                  </label>
                  <button type="button" className="auth-check checked"><CheckSquare size={18} /> Acepto terminos y condiciones</button>
                  <button type="button" className={`auth-check ${news ? "checked" : ""}`} onClick={() => setNews((value) => !value)}>
                    <CheckSquare size={18} /> Recibir noticias y actualizaciones
                  </button>
                  <button className="auth-submit" type="submit" disabled={!canEnter}><LogIn size={22} /> Crear cuenta</button>
                </>
              )}

              <div className="auth-social">
                <span /> <small>{mode === "login" ? "o continua con" : "o registrate con"}</small> <span />
                <button type="button"><Box size={24} /></button>
                <button type="button"><Mail size={24} /></button>
                <button type="button"><Gamepad2 size={24} /></button>
                <button type="button"><Volume2 size={24} /></button>
              </div>

              <p className="auth-switch">
                {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
                <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
                  {mode === "login" ? "Registrate ahora" : "Inicia sesion"}
                </button>
              </p>
            </form>

            <aside className="auth-benefits">
              <p>{mode === "login" ? "Crea tu cuenta para guardar progreso, sincronizar campanas y activar modulos." : "Al registrarte podras:"}</p>
              <span><Cloud size={28} /><strong>Guardar tu progreso</strong><small>Tu aventura se guarda de forma segura.</small></span>
              <span><Activity size={28} /><strong>Sincronizar tus campanas</strong><small>Accede a tus partidas en cualquier dispositivo.</small></span>
              <span><Box size={28} /><strong>Activar modulos y DLC</strong><small>Desbloquea contenido adicional y funcionalidades.</small></span>
              <span><UserPlus size={28} /><strong>Unirte a la comunidad</strong><small>Conectate con otros jugadores.</small></span>
            </aside>
          </div>
        </section>
      </main>

      <footer className="auth-footer">
        <span><Settings size={20} /> Version 1.6.0</span>
        <span><i /> Estable</span>
        <span><Monitor size={20} /> Launcher actualizado</span>
        <span><Activity size={20} /> Servicios en linea</span>
        <button onClick={submit} disabled={!canEnter}><Settings size={30} /> Entrar</button>
      </footer>

      {showRecovery && (
        <div className="modal-backdrop">
          <article className="app-modal auth-recovery-modal">
            <button className="modal-close" onClick={() => setShowRecovery(false)}><X size={18} /></button>
            <h3><AlertCircle size={22} /> Recuperar contrasena</h3>
            <p>Escribe el correo o usuario registrado para enviar un codigo de restablecimiento.</p>
            <label>
              <span>Correo o usuario</span>
              <input value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} />
            </label>
            {recoveryMessage && <strong>{recoveryMessage}</strong>}
            <button className="green-button" onClick={recoverPassword}>Enviar correo</button>
          </article>
        </div>
      )}
    </div>
  );
}

