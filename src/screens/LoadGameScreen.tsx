import { Archive, CalendarClock, Clock3, FolderOpen, MapPin, Play, ShieldCheck, UserRound } from "lucide-react";
import type { CSSProperties } from "react";
import type { GameConfig } from "../types/game";
import type { PlayerSave } from "../types/profile";
import { gameHeroVars } from "../lib/gameLibrary";

type Props = {
  game: GameConfig;
  saves: PlayerSave[];
  activeSaveId?: string;
  onLoad: (saveId: string) => void;
};

function formatDate(value?: string) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString();
}

function campaignName(game: GameConfig, save: PlayerSave) {
  return game.campaigns.find((campaign) => campaign.id === save.campaignId)?.title ?? save.campaignId;
}

export function LoadGameScreen({ game, saves, activeSaveId, onLoad }: Props) {
  const activeSave = saves.find((save) => save.saveId === activeSaveId) ?? saves[0];
  const totalHours = saves.reduce((sum, save) => sum + (save.playTimeHours ?? 0), 0);

  return (
    <section className="screen-panel load-game-screen" style={gameHeroVars(game) as CSSProperties}>
      <div className="load-game-hero">
        <div>
          <span><Archive size={18} /> {game.name}</span>
          <h2>Cargar partida</h2>
          <p>Partidas guardadas asociadas al juego activo y a sus campanas configuradas.</p>
        </div>
        <aside>
          <strong>{saves.length}</strong>
          <small>guardado{saves.length === 1 ? "" : "s"}</small>
        </aside>
      </div>

      <div className="load-game-layout">
        <aside className="load-summary-panel">
          <div className="load-summary-art" />
          <h3>Resumen</h3>
          {activeSave ? (
            <div className="load-summary-list">
              <p><UserRound size={16} /><span>Personaje</span><strong>{activeSave.playerName}</strong></p>
              <p><MapPin size={16} /><span>Zona</span><strong>{activeSave.currentZone}</strong></p>
              <p><ShieldCheck size={16} /><span>Campana</span><strong>{campaignName(game, activeSave)}</strong></p>
              <p><Clock3 size={16} /><span>Horas</span><strong>{activeSave.playTimeHours ?? 0}</strong></p>
            </div>
          ) : (
            <p className="load-empty-copy">Crea una partida nueva para empezar a registrar progreso.</p>
          )}
          <div className="load-summary-footer">
            <span>Total jugado</span>
            <strong>{totalHours} h</strong>
          </div>
        </aside>

        <div className="save-grid load-save-grid">
          {saves.map((save) => (
            <article key={save.saveId} className={`save-card load-save-card ${save.saveId === activeSaveId ? "active-save" : ""}`}>
              <header>
                <div>
                  <strong>{save.name}</strong>
                  <span>{campaignName(game, save)}</span>
                </div>
                <b>Nivel {save.level}</b>
              </header>

              <div className="save-meta-grid">
                <p><UserRound size={16} /><span>{save.playerName}</span></p>
                <p><MapPin size={16} /><span>{save.currentZone}</span></p>
                <p><CalendarClock size={16} /><span>{formatDate(save.updatedAt)}</span></p>
                <p><FolderOpen size={16} /><span>{save.storagePath ?? "Guardado local"}</span></p>
              </div>

              <footer>
                <small>{save.currentMission ?? "Explorando Yermo"}</small>
                <button className="green-button" onClick={() => onLoad(save.saveId)}><Play size={18} /> Cargar</button>
              </footer>
            </article>
          ))}

          {!saves.length && (
            <article className="save-card load-save-card active-save">
              <header>
                <div>
                  <strong>No hay partidas guardadas</strong>
                  <span>{game.name} aun no tiene sesiones registradas.</span>
                </div>
              </header>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
