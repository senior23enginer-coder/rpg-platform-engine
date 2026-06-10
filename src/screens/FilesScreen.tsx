import { pickGamesFolder, loadLibraryFromFolder } from "../lib/tauriFs";
import type { GameConfig } from "../types/game";

type Props = {
  onLoadGames: (games: GameConfig[]) => void;
  onEditConfig: () => void;
};

export function FilesScreen({ onLoadGames, onEditConfig }: Props) {
  async function selectFolder() {
    const folder = await pickGamesFolder();
    if (!folder) return;
    const loaded = await loadLibraryFromFolder(folder);
    onLoadGames(loaded);
  }

  return (
    <section className="screen-panel">
      <div className="screen-heading">
        <h2>Archivos y estructura</h2>
        <p>Selecciona la carpeta games/ o edita los JSON desde formularios.</p>
      </div>

      <div className="file-layout">
        <article className="file-card">
          <h3>Estructura esperada</h3>
          <pre>{`games/
  fallout3/
    game.config.json
    rules/rules.json
    missions/missions.json
    bestiary/bestiary.json
    features/features.json
    characters/characters.json
    dlc/
    audio/audio.manifest.json`}</pre>
        </article>

        <article className="file-card">
          <h3>Acciones</h3>
          <p>El editor trabaja sobre el juego activo y sincroniza la biblioteca en memoria.</p>
          <div className="file-actions">
            <button className="green-button" onClick={selectFolder}>Seleccionar carpeta games/</button>
            <button onClick={onEditConfig}>Editar game.config.json</button>
          </div>
        </article>
      </div>
    </section>
  );
}
