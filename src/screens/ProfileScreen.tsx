import { useState } from "react";
import type { PlayerProfile } from "../types/profile";

type Props = {
  profile: PlayerProfile;
  onSave: (profile: PlayerProfile) => void;
  onBack: () => void;
};

export function ProfileScreen({ profile, onSave, onBack }: Props) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? "");

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
    <section className="screen-panel profile-screen">
      <div className="screen-heading">
        <div>
          <h2>Perfil del jugador</h2>
          <p>Sesion local, historial, configuracion y progreso del operador.</p>
        </div>
        <button onClick={onBack}>← Volver</button>
      </div>

      <div className="profile-grid">
        <article className="profile-card-large">
          <div className="profile-avatar">⚙</div>
          <div>
            <strong>{profile.signedIn ? profile.name : "Invitado local"}</strong>
            <span>{profile.signedIn ? profile.email : "Inicia sesion para guardar tus preferencias"}</span>
            <small>Nivel {profile.level} · {profile.history.reduce((sum, item) => sum + item.sessions, 0)} sesiones</small>
          </div>
        </article>

        <article className="settings-card">
          <h3>Iniciar sesion</h3>
          <label className="form-row">
            <span>Nombre</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="form-row">
            <span>Correo</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <div className="settings-actions inline-actions">
            <button className="green-button" onClick={signIn}>Iniciar sesion</button>
            <button onClick={signOut}>Cerrar sesion</button>
          </div>
        </article>

        <article className="settings-card profile-history">
          <h3>Historia de juegos</h3>
          {profile.history.map((entry) => (
            <p key={entry.gameId}>
              <span>{entry.gameId}</span>
              <strong>{entry.sessions} sesiones</strong>
              <small>{new Date(entry.lastPlayedAt).toLocaleString()}</small>
            </p>
          ))}
        </article>
      </div>
    </section>
  );
}
