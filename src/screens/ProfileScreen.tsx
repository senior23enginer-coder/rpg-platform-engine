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
import type { PlayerProfile } from "../types/profile";

type Props = {
  profile: PlayerProfile;
  onSave: (profile: PlayerProfile) => void;
  onBack: () => void;
};

export function ProfileScreen({ profile, onSave, onBack }: Props) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? "");
  const totalSessions = profile.history.reduce((sum, item) => sum + item.sessions, 0);
  const completedAdventures = Math.max(0, profile.saves.filter((save) => save.level >= 10).length);
  const latestActivity = profile.history
    .map((entry) => new Date(entry.lastPlayedAt))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  function signIn() {
    onSave({
      ...profile,
      name: name.trim() || "Operador",
      email: email.trim() || "operador@vault.local",
      signedIn: true,
    });
  }

  function signOut() {
    onSave({ ...profile, signedIn: false });
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
          <User size={64} />
        </div>
        <div className="profile-ref-identity">
          <strong>{profile.signedIn ? profile.name : "Invitado local"}</strong>
          <span><i /> Sesion local activa en este equipo</span>
          <p><b>Nivel {profile.level}</b><i /> {totalSessions} sesiones</p>
        </div>
        <div className="profile-ref-stat">
          <Gamepad2 size={34} />
          <span>Perfiles de juego</span>
          <strong>{profile.history.length}</strong>
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
            <span>{profile.history.length} perfiles</span>
          </header>
          <div className="profile-history-table">
            <div className="profile-history-head">
              <span>Perfil</span>
              <span>Ultima partida</span>
              <span>Sesiones</span>
              <span />
            </div>
            {profile.history.map((entry) => (
              <div className="profile-history-row" key={entry.gameId}>
                <span><User size={18} /> {entry.gameId}</span>
                <span>{new Date(entry.lastPlayedAt).toLocaleString()}</span>
                <strong>{entry.sessions} sesiones</strong>
                <button aria-label={`Opciones ${entry.gameId}`}><MoreHorizontal size={20} /></button>
              </div>
            ))}
          </div>
          <button className="profile-view-all"><FolderOpen size={20} /> Ver todos los perfiles <ChevronRight size={18} /></button>
        </article>
      </div>
    </section>
  );
}
