import { ArrowLeft, CheckCircle2, Download, FolderOpen, Package, Puzzle, Save, Settings, XCircle } from "lucide-react";
import type { ContentItem, GameConfig } from "../types/game";

type Props = {
  game: GameConfig;
  onBack: () => void;
  onToggle: (category: "dlc" | "features" | "extras", itemId: string) => void;
  onSetAll: (enabled: boolean) => void;
  onEditJson: () => void;
};

function ContentCard({
  item,
  category,
  onToggle,
}: {
  item: ContentItem;
  category: "dlc" | "features" | "extras";
  onToggle: () => void;
}) {
  const Icon = category === "dlc" ? Puzzle : category === "features" ? Settings : Package;

  return (
    <article className="content-card">
      <div className="content-icon"><Icon size={30} /></div>
      <div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <small>ID: {item.id}</small>
        <strong>{item.enabled ? "Activado" : "Desactivado"}</strong>
      </div>
      <button className={`toggle-switch ${item.enabled ? "on" : ""}`} onClick={onToggle} aria-label={`Alternar ${item.name}`}>
        <i />
      </button>
    </article>
  );
}

export function ContentScreen({ game, onBack, onToggle, onSetAll, onEditJson }: Props) {
  function exportConfig() {
    const blob = new Blob([JSON.stringify(game, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${game.id}.game.config.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="screen-panel content-screen">
      <div className="screen-heading back-heading">
        <div>
          <h2>DLC, features y extras</h2>
          <p>Todo se lee desde el game.config.json del juego activo.</p>
        </div>
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>
      </div>

      <div className="content-top">
        <div className="content-select">
          <strong>Juego activo</strong>
          <span><Settings size={36} /> {game.name}</span>
          <small>{game.description}</small>
        </div>

        <div className="content-select">
          <strong>Archivo</strong>
          <span><FolderOpen size={36} /> games/{game.id}/game.config.json</span>
          <div className="inline-actions">
            <button onClick={exportConfig}><Download size={16} /> Exportar config JSON</button>
            <button onClick={onEditJson}>Editar formulario</button>
          </div>
        </div>
      </div>

      {(["dlc", "features", "extras"] as const).map((category) => (
        <div className="content-section" key={category}>
          <h3>{category === "dlc" ? "DLC / expansiones" : category === "features" ? "Features / reglas del juego" : "Extras"}</h3>
          <div className="content-grid">
            {game.content[category].map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                category={category}
                onToggle={() => onToggle(category, item.id)}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="bottom-actions">
        <button onClick={() => onSetAll(true)}><CheckCircle2 size={18} /> Activar todo</button>
        <button onClick={() => onSetAll(false)}><XCircle size={18} /> Desactivar todo</button>
        <button className="green-button" onClick={exportConfig}><Save size={18} /> Guardar contenido</button>
      </div>
    </section>
  );
}
