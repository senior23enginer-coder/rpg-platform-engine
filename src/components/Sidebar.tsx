import {
  Archive,
  BookOpen,
  Box,
  Dice5,
  Folder,
  Home,
  LogOut,
  Plus,
  Settings,
} from "lucide-react";
import type { Screen } from "../screens/types";

type Props = {
  active: Screen;
  onChange: (screen: Screen) => void;
};

const items: Array<{ id: Screen; label: string; hint: string; icon: JSX.Element }> = [
  { id: "home", label: "Inicio", hint: "Panel principal", icon: <Home /> },
  { id: "library", label: "Biblioteca", hint: "Juegos instalados", icon: <BookOpen /> },
  { id: "newGame", label: "Nueva partida", hint: "Crear aventura", icon: <Plus /> },
  { id: "load", label: "Cargar partida", hint: "Continuar progreso", icon: <Archive /> },
  { id: "dice", label: "Dados 3D", hint: "Herramienta 3D", icon: <Dice5 /> },
  { id: "settings", label: "Configuración", hint: "Visual y audio", icon: <Settings /> },
  { id: "rules", label: "Reglas globales", hint: "Reglas del motor", icon: <Box /> },
  { id: "files", label: "Archivos", hint: "Estructura y backups", icon: <Folder /> },
];

export function Sidebar({ active, onChange }: Props) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="gear-mark">
          <Settings size={40} />
        </div>
        <div>
          <h1>RPG Platform Engine</h1>
          <p>Tu universo. Tu historia.</p>
        </div>
      </div>

      <nav className="nav-list">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? "selected" : ""}`}
            onClick={() => onChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </span>
          </button>
        ))}

        <button className="nav-item exit">
          <span className="nav-icon"><LogOut /></span>
          <span>
            <strong>Salir</strong>
            <small>Cerrar plataforma</small>
          </span>
        </button>
      </nav>

      <div className="version-row">
        <span>Versión 0.1.0</span>
        <span className="stable-dot">● Estable</span>
      </div>
    </aside>
  );
}
