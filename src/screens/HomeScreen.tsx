import { Dice5, Folder, Save, Star } from "lucide-react";
import type { CSSProperties } from "react";
import type { Campaign, GameConfig } from "../types/game";
import type { PlayerSave } from "../types/profile";
import { gameArt, gameHeroVars } from "../lib/gameLibrary";

type Props = {
  game: GameConfig;
  campaign?: Campaign;
  save?: PlayerSave;
  saves: PlayerSave[];
  recommended: GameConfig[];
  onContinue: () => void;
  onDice: () => void;
  onSelectRecommended: (gameId: string) => void;
};

export function HomeScreen({
  game,
  campaign,
  save,
  saves,
  recommended,
  onContinue,
  onDice,
  onSelectRecommended,
}: Props) {
  const activeCount = Object.values(game.content)
    .flat()
    .filter((item) => item.enabled).length;
  const artFor = (target: GameConfig): CSSProperties => ({ backgroundImage: gameArt(target) });
  const activeHeroStyle = gameHeroVars(game) as CSSProperties;
  const savedGame = (gameId: string) => recommended.find((item) => item.id === gameId) ?? game;

  return (
    <section className="home-layout">
      <div className={`hero-panel game-${game.id}`} style={activeHeroStyle}>
        <div className="hero-copy">
          <span className="eyebrow">Juego seleccionado</span>
          <h2>{game.name}</h2>
          <p>{game.description}</p>

          <div className="hero-tags">
            <span className="status-pill installed">Instalado</span>
            <span className="status-pill">{activeCount} contenidos activos</span>
            <span className="status-pill warning">Ver detalles</span>
          </div>

          <div className="hero-meta">
            <span>{game.short}</span>
            <span>{activeCount} extras</span>
            <span>config.json</span>
          </div>
        </div>

        <button className="continue-button" onClick={onContinue}>
          ▶ Continuar
          <small>{save ? `Ultima sesion: ${new Date(save.updatedAt).toLocaleString()}` : "Sin partidas guardadas"}</small>
        </button>
      </div>

      <aside className="home-side">
        <article className="list-panel save-access">
          <div className="panel-title"><Save size={18} /><strong>Acceso rapido: guardados</strong></div>

          {saves.map((entry) => (
            <button key={entry.saveId} className="save-mini">
              <span className={`save-thumb game-${entry.gameId}`} style={artFor(savedGame(entry.gameId))} />
              <span className="save-copy">
                <strong>{entry.name}</strong>
                <small>Nivel {entry.level}</small>
              </span>
              <small>{new Date(entry.updatedAt).toLocaleDateString()}</small>
            </button>
          ))}

          {!saves.length && <p><span>Sin partidas de {game.name}</span><small>Nuevo juego</small></p>}
          <button>Ver todos los guardados →</button>
        </article>

        <article className="quick-panel">
          <div className="panel-title">
            <Dice5 size={18} />
            <strong>Dados 3D</strong>
          </div>
          <div className="dice-preview">
            <span>d20</span><span>d8</span><span>d6</span>
          </div>
          <button className="green-button" onClick={onDice}>Abrir herramienta 3D</button>
        </article>
      </aside>

      <div className="dashboard-row">
        <article className="campaign-panel">
          <div className="panel-title">
            <Star size={18} />
            <strong>Campaña activa</strong>
          </div>
          <div className="campaign-body">
            <div className={`campaign-preview game-${game.id}`} style={activeHeroStyle} />
            <div>
              <h3>{campaign?.title ?? "Campaña guiada"}</h3>
              <p>{save?.currentMission ?? "Explorando Yermo"}</p>
              <small>Progreso general</small>
              <div className="progress"><i style={{ width: "68%" }} /></div>
            </div>
            <div className="level-box">
              <small>Nivel actual</small>
              <strong>{save?.level ?? 1}</strong>
            </div>
            <div className="level-box">
              <small>Tiempo de juego</small>
              <strong>42h 18m</strong>
            </div>
          </div>
        </article>

        <article className="list-panel recommended-panel">
          <div className="panel-title"><Folder size={18} /><strong>Recomendados para ti</strong></div>
          <div className="recommend-grid">
            {recommended.map((item) => (
              <button key={item.id} className={`recommend-card game-${item.id}`} style={artFor(item)} onClick={() => onSelectRecommended(item.id)}>
                {item.name}
              </button>
            ))}
          </div>
        </article>
      </div>

      <div className="bottom-grid">
        <article className="list-panel">
          <div className="panel-title"><Folder size={18} /><strong>Actividad reciente</strong></div>
          <p>Guardado automatico en {save?.currentZone ?? "Megaton"} <span>Hoy, 14:32</span></p>
          <p>{save?.currentMission ?? "Explorando Yermo"} <span>Hoy, 13:48</span></p>
          <p>Juego activo: {game.name} <span>Ayer, 23:11</span></p>
        </article>

        <article className="list-panel wide-news">
          <div className="panel-title"><Folder size={18} /><strong>Noticias y actualizaciones</strong></div>
          <p>Motor 1.6.0 disponible <span>Hace 2 dias</span></p>
          <p>Nuevos modulos de dados 3D <span>Hace 5 dias</span></p>
          <p>Paquete de reglas expandido <span>Hace 1 semana</span></p>
        </article>
      </div>
    </section>
  );
}
