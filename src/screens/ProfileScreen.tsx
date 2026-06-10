import { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  FolderOpen,
  Gamepad2,
  LogIn,
  LogOut,
  Mail,
  MoreHorizontal,
  Trophy,
  User,
  Vault,
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
  const [email, setEmail] = useState(profile.email ?? "");
  const avatarPath = resolveUserAsset(profile, profile.avatar);
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
    onSave({
      ...profile,
      name: name.trim() || "Operador",
      email: email.trim() || "operador@vault.local",
      signedIn: true,
      lastActivityAt: new Date().toISOString(),
    });
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
          {avatarPath ? <img src={avatarPath} alt="" /> : <User size={64} />}
        </div>
        <div className="profile-ref-identity">
          <strong>{profile.signedIn ? profile.name : "Invitado local"}</strong>
          <span><i /> Sesion local activa en este equipo</span>
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
          <h3><User size={32} /> Iniciar sesion</h3>
          <p>Inicia sesion para guardar tus preferencias y sincronizar tu progreso.</p>
          <label className="form-row">
            <span>Nombre</span>
            <div className="profile-input-shell">
              <User size={18} />
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
          </label>
          <label className="form-row">
            <span>Correo</span>
            <div className="profile-input-shell">
              <Mail size={18} />
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
          </label>
          <label className="profile-remember">
            <input type="checkbox" defaultChecked />
            <span>Recordar sesion en este equipo</span>
          </label>
          <div className="settings-actions inline-actions">
            <button className="green-button" onClick={signIn}><LogIn size={18} /> Iniciar sesion</button>
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
    </section>
  );
}
