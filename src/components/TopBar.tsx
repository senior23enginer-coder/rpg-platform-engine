import { Activity, Box, ChevronDown, Monitor, Settings, Volume2 } from "lucide-react";
import type { PlayerProfile } from "../types/profile";

type Props = {
  profile: PlayerProfile;
  onProfile: () => void;
  onSettings: () => void;
};

export function TopBar({ profile, onProfile, onSettings }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-logo">
        <span className="topbar-gear"><Settings size={44} /></span>
        <strong>RPG Platform Engine</strong>
        <span>Tu universo. Tu historia. Tu aventura.</span>
      </div>

      <div className="status-cluster">
        <div className="status-card">
          <Monitor size={24} />
          <span>
            <small>Estado del sistema</small>
            <strong>Todo en orden</strong>
          </span>
        </div>

        <div className="status-card">
          <Activity size={24} />
          <span>
            <small>Audio ambiental</small>
            <strong>{profile.settings.audioEnabled ? "Activado" : "Desactivado"}</strong>
          </span>
        </div>

        <button className="status-card profile-card" onClick={onProfile}>
          <Box size={24} />
          <span>
            <small>{profile.name}</small>
            <strong>Nivel {profile.level}</strong>
            <i className="profile-meter" />
          </span>
        </button>

        <button className="square-button" onClick={onSettings}>
          <Settings size={22} />
          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}
