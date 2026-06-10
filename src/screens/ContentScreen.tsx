import { ArrowLeft, CheckCircle2, Download, FolderOpen, Save, XCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
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
  gameId,
  onToggle,
  onSelect,
  selected,
}: {
  item: ContentItem;
  category: "dlc" | "features" | "extras";
  gameId: string;
  onToggle: () => void;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <article className={`content-card content-${category} ${selected ? "selected" : ""}`} onClick={onSelect}>
      <div
        className="content-icon content-image"
        style={{
          "--content-card-thumb": `url("/games/${gameId}/assets/content-thumbs/${category}/${item.id}.png")`,
          "--content-card-art": `url("/games/${gameId}/assets/hero/generated.png")`,
          "--content-card-net-art": `url("/games/${gameId}/assets/hero/internet.jpg")`,
        } as CSSProperties}
      />
      <div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <small>ID: {item.id}</small>
        <strong>{item.enabled ? "Activado" : "Desactivado"}</strong>
      </div>
      <button
        className={`toggle-switch ${item.enabled ? "on" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        aria-label={`Alternar ${item.name}`}
      >
        <i />
      </button>
    </article>
  );
}

export function ContentScreen({ game, onBack, onToggle, onSetAll, onEditJson }: Props) {
  const allItems = useMemo(
    () =>
      (["dlc", "features", "extras"] as const).flatMap((category) =>
        game.content[category].map((item) => ({ item, category }))
      ),
    [game]
  );
  const [selectedKey, setSelectedKey] = useState(() => allItems[0] ? `${allItems[0].category}:${allItems[0].item.id}` : "");
  const selected = allItems.find((entry) => `${entry.category}:${entry.item.id}` === selectedKey) ?? allItems[0];

  useEffect(() => {
    setSelectedKey(allItems[0] ? `${allItems[0].category}:${allItems[0].item.id}` : "");
  }, [game.id]);

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
    <section
      className="screen-panel content-screen"
      style={{
        "--active-game-art": `url("/games/${game.id}/assets/hero/generated.png")`,
        "--active-game-net-art": `url("/games/${game.id}/assets/hero/internet.jpg")`,
      } as CSSProperties}
    >
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
          <span>{game.name}</span>
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

      {selected && (
        <article
          className="content-detail-panel"
          style={{
            "--content-card-thumb": `url("/games/${game.id}/assets/content-thumbs/${selected.category}/${selected.item.id}.png")`,
            "--content-card-art": `url("/games/${game.id}/assets/hero/generated.png")`,
            "--content-card-net-art": `url("/games/${game.id}/assets/hero/internet.jpg")`,
          } as CSSProperties}
        >
          <div className="content-detail-art" />
          <div>
            <small>
              {selected.category === "dlc"
                ? "Expansion / contenido"
                : selected.category === "features"
                  ? "Feature / regla"
                  : "Extra"}
            </small>
            <h3>{selected.item.name}</h3>
            <p>{selected.item.description || "Modulo listo para completar con reglas, escenas y recompensas propias."}</p>
            <div className="detail-facts">
              <span>ID: {selected.item.id}</span>
              <span>{selected.item.enabled ? "Activado" : "Desactivado"}</span>
              <span>Asset: games/{game.id}/assets/content-thumbs/{selected.category}/{selected.item.id}.png</span>
            </div>
          </div>
          <div className="content-detail-adds">
            <strong>Agrega a la partida</strong>
            <p>
              {selected.category === "dlc"
                ? "Nueva zona, escenas, enemigos, recompensas y reglas opcionales asociadas al contenido."
                : selected.category === "features"
                  ? "Mecanica activa para modificar tiradas, progresion, exploracion o combate."
                  : "Encuentros, eventos o variantes de ambientacion para enriquecer la campana."}
            </p>
            <button
              className={`fake-toggle label-toggle ${selected.item.enabled ? "on" : ""}`}
              onClick={() => onToggle(selected.category, selected.item.id)}
            >
              {selected.item.enabled ? "Activado" : "Desactivado"}
            </button>
          </div>
        </article>
      )}

      {(["dlc", "features", "extras"] as const).map((category) => (
        <div className="content-section" key={category}>
          <h3>{category === "dlc" ? "DLC / expansiones" : category === "features" ? "Features / reglas del juego" : "Extras"}</h3>
          <div className="content-grid">
            {game.content[category].map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                category={category}
                gameId={game.id}
                onToggle={() => onToggle(category, item.id)}
                onSelect={() => setSelectedKey(`${category}:${item.id}`)}
                selected={selectedKey === `${category}:${item.id}`}
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
