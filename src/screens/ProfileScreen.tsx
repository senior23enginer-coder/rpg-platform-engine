import { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  FolderOpen,
  Gamepad2,
  Image,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  MoreHorizontal,
  Trophy,
  User,
  Vault,
  X,
} from "lucide-react";
import type { GameConfig } from "../types/game";
import type { PlayerProfile } from "../types/profile";
import { resolveUserAsset } from "../lib/userLibrary";

type Props = {
  profile: PlayerProfile;
  games: GameConfig[];
  onSave: (profile: PlayerProfile) => void;
  onBack: () => void;
};

export function ProfileScreen({ profile, games, onSave, onBack }: Props) {
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username ?? profile.id);
  const [email, setEmail] = useState(profile.email ?? "");
  const [avatar, setAvatar] = useState(profile.avatar ?? "");
  const [avatarFit, setAvatarFit] = useState(profile.avatarFit ?? { x: 50, y: 50, scale: 1 });
  const [password, setPassword] = useState("");
  const [savedModal, setSavedModal] = useState(false);
  const [saveError, setSaveError] = useState("");
  const avatarPath = resolveUserAsset(profile, avatar);
  const gameNameById = new Map(games.map((game) => [game.id, game.name]));
  const totalSessions = profile.openSessions ?? 0;
  const gameProfiles = profile.saves;
  const gameProfilesStarted = Math.max(profile.gameProfilesStarted ?? 0, gameProfiles.length);
  const completedAdventures = profile.completedCampaigns ?? 0;
  const latestActivity = [
    profile.lastActivityAt,
    ...gameProfiles.map((save) => save.updatedAt),
  ]
    .filter(Boolean)
    .map((date) => new Date(String(date)))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  function signIn() {
    try {
      onSave({
        ...profile,
        name: name.trim() || "Operador",
        username: username.trim() || profile.id,
        email: email.trim() || "operador@vault.local",
        avatar: avatar.trim() || profile.avatar,
        avatarFit,
        signedIn: true,
        lastActivityAt: new Date().toISOString(),
      });
      setPassword("");
      setSaveError("");
      setSavedModal(true);
    } catch {
      setSaveError("No se pudo guardar el perfil.");
      setSavedModal(true);
    }
  }

  function loadAvatarFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
      }
    });
    reader.readAsDataURL(file);
  }

  function signOut() {
    onSave({ ...profile, signedIn: false, lastActivityAt: new Date().toISOString() });
  }

  return (
    <section className="screen-panel profile-screen profile-ref">
      <div className="screen-heading profile-ref-heading">
        <div>
          <h2>Perfil del jugador</h2>
          <p>Sesion local, historial, configuracion y progreso del operador.</p>
        </div>
        <div className="profile-terminal-stamp">
          <Vault size={54} />
          <span>Vault-Tec<br />Terminal<br />Ver. 0.1.0</span>
        </div>
        <button onClick={onBack}><ArrowLeft size={18} /> Volver</button>
      </div>

      <article className="profile-ref-hero">
        <div className="profile-ref-avatar">
          {avatarPath ? (
            <img
              src={avatarPath}
              alt=""
              style={{
                objectPosition: `${avatarFit.x}% ${avatarFit.y}%`,
                transform: `scale(${avatarFit.scale})`,
              }}
            />
          ) : <User size={64} />}
        </div>
        <div className="profile-ref-identity">
          <strong>{profile.signedIn ? profile.name : "Invitado local"}</strong>
          <span><i /> Sesion local activa en este equipo</span>
          <small>Ultima conexion: {profile.previousLastLoginAt ? new Date(profile.previousLastLoginAt).toLocaleString() : "Sin registro anterior"}</small>
          <p><b>Nivel {profile.level}</b><i /> {totalSessions} sesiones</p>
        </div>
        <div className="profile-ref-stat">
          <Gamepad2 size={34} />
          <span>Perfiles de juego</span>
          <strong>{gameProfilesStarted}</strong>
          <small>Guardados</small>
        </div>
        <div className="profile-ref-stat">
          <Clock3 size={34} />
          <span>Ultima actividad</span>
          <strong>{latestActivity ? latestActivity.toLocaleDateString() : "--"}</strong>
          <small>{latestActivity ? latestActivity.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Sin registros"}</small>
        </div>
        <div className="profile-ref-stat">
          <Trophy size={34} />
          <span>Aventuras completadas</span>
          <strong>{completedAdventures}</strong>
          <small>Campanas</small>
        </div>
      </article>

      <div className="profile-grid profile-ref-grid">
        <article className="settings-card profile-login-panel">
          <h3><User size={32} /> {profile.signedIn ? "Perfil de sesion" : "Iniciar sesion"}</h3>
          <p>{profile.signedIn ? "Edita los datos del usuario activo en este equipo." : "Inicia sesion para guardar tus preferencias y sincronizar tu progreso."}</p>
          <label className="form-row">
            <span>Nombre</span>
            <div className="profile-input-shell">
              <User size={18} />
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
          </label>
          <label className="form-row">
            <span>Nombre de usuario</span>
            <div className="profile-input-shell">
              <User size={18} />
              <input value={username} onChange={(event) => setUsername(event.target.value)} />
            </div>
          </label>
          <label className="form-row">
            <span>Correo</span>
            <div className="profile-input-shell">
              <Mail size={18} />
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
          </label>
          <label className="form-row">
            <span>Imagen de sesion</span>
            <div className="profile-input-shell profile-file-shell">
              <Image size={18} />
              <span className="profile-avatar-name">
                {avatar.startsWith("data:") ? "Imagen cargada" : avatar || "avatar.svg"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => loadAvatarFile(event.target.files?.[0])}
              />
              <strong>Cargar</strong>
            </div>
          </label>
          <div className="avatar-fit-controls">
            <span>Mover, zoom y recorte circular de la foto</span>
            <label>Horizontal <input type="range" min="0" max="100" value={avatarFit.x} onChange={(event) => setAvatarFit((current) => ({ ...current, x: Number(event.target.value) }))} /></label>
            <label>Vertical <input type="range" min="0" max="100" value={avatarFit.y} onChange={(event) => setAvatarFit((current) => ({ ...current, y: Number(event.target.value) }))} /></label>
            <label>Zoom / recorte <input type="range" min="1" max="2.8" step="0.05" value={avatarFit.scale} onChange={(event) => setAvatarFit((current) => ({ ...current, scale: Number(event.target.value) }))} /></label>
          </div>
          {!profile.signedIn && (
            <label className="form-row">
              <span>Clave</span>
              <div className="profile-input-shell">
                <KeyRound size={18} />
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
            </label>
          )}
          <label className="profile-remember">
            <input type="checkbox" defaultChecked />
            <span>Recordar sesion en este equipo</span>
          </label>
          <div className="settings-actions inline-actions">
            <button className="green-button" onClick={signIn}><LogIn size={18} /> {profile.signedIn ? "Guardar perfil" : "Iniciar sesion"}</button>
            <button onClick={signOut}><LogOut size={18} /> Cerrar sesion</button>
          </div>
          <div className="profile-local-note">
            <Clock3 size={18} /> La sesion local no requiere conexion a internet.
          </div>
        </article>

        <article className="settings-card profile-history">
          <header>
            <div>
              <h3><Clock3 size={32} /> Historia de juegos</h3>
              <p>Perfiles de juego creados en este equipo.</p>
            </div>
            <span>{gameProfilesStarted} perfiles</span>
          </header>
          <div className="profile-history-table">
            <div className="profile-history-head">
              <span>Perfil</span>
              <span>Juego</span>
              <span>Ultima partida</span>
              <span>Sesiones</span>
              <span />
            </div>
            {gameProfiles.length === 0 && (
              <div className="profile-history-row profile-history-empty">
                <span><User size={18} /> Sin perfiles guardados</span>
                <span>--</span>
                <span>--</span>
                <strong>0 sesiones</strong>
                <span />
              </div>
            )}
            {gameProfiles.map((save) => (
              <div className="profile-history-row" key={save.saveId}>
                <span><User size={18} /> {save.playerName}</span>
                <span>{gameNameById.get(save.gameId) ?? save.gameId}</span>
                <span>{new Date(save.updatedAt).toLocaleString()}</span>
                <strong>{save.sessions ?? 0} sesiones</strong>
                <button aria-label={`Opciones ${save.name}`}><MoreHorizontal size={20} /></button>
              </div>
            ))}
          </div>
          <button className="profile-view-all"><FolderOpen size={20} /> Ver todos los perfiles <ChevronRight size={18} /></button>
        </article>
      </div>

      {savedModal && (
        <div className="modal-backdrop">
          <article className="app-modal">
            <button className="modal-close" onClick={() => setSavedModal(false)}><X size={18} /></button>
            <h3><User size={22} /> {saveError ? "Error al guardar" : "Perfil guardado"}</h3>
            <p>{saveError || "Perfil guardado correctamente."}</p>
            <button className="green-button" onClick={() => setSavedModal(false)}>Aceptar</button>
          </article>
        </div>
      )}
    </section>
  );
}
