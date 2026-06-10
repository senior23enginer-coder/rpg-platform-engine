import type { GameConfig } from "../types/game";
import type { PlayerSave } from "../types/profile";

type Props = {
  game: GameConfig;
  saves: PlayerSave[];
  activeSaveId?: string;
  onLoad: (saveId: string) => void;
};

export function LoadGameScreen({ game, saves, activeSaveId, onLoad }: Props) {
  return (
    <section className="screen-panel">
      <div className="screen-heading">
        <div>
          <h2>Cargar partida</h2>
          <p>Solo partidas de {game.name}.</p>
        </div>
      </div>

      <div className="save-grid">
        {saves.map((save) => (
          <article key={save.saveId} className={`save-card ${save.saveId === activeSaveId ? "active-save" : ""}`}>
            <strong>{save.name}</strong>
            <span>Nivel {save.level} · {save.currentZone} · {new Date(save.updatedAt).toLocaleString()}</span>
            <small>{save.currentMission ?? "Explorando Yermo"}</small>
            <button className="green-button" onClick={() => onLoad(save.saveId)}>Cargar</button>
          </article>
        ))}

        {!saves.length && (
          <article className="save-card active-save">
            <strong>No hay partidas guardadas</strong>
            <span>{game.name} aun no tiene sesiones registradas.</span>
          </article>
        )}
      </div>
    </section>
  );
}
