import { ArrowLeft, Box, Compass, Crosshair, HeartPulse, Plus, Settings, User, Users, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import type { CharacterSheetConfig, GameConfig } from "../types/game";

type Props = {
  game: GameConfig;
  characters: CharacterSheetConfig;
  onStart: (characterName: string, attributes: Record<string, number>) => void;
  onContent: () => void;
  onBack: () => void;
};

export function NewGameScreen({ game, characters, onStart, onContent, onBack }: Props) {
  const [characterName, setCharacterName] = useState("Superviviente");
  const [players, setPlayers] = useState(1);
  const [survival, setSurvival] = useState(false);
  const [mode, setMode] = useState<"guided" | "free">("guided");
  const [sheetReview, setSheetReview] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, number>>(() =>
    Object.fromEntries(characters.attributes.map((attr) => [attr.id, attr.default]))
  );

  const activeContent = useMemo(() => {
    return Object.values(game.content).flat().filter((item) => item.enabled);
  }, [game]);

  const campaign = game.campaigns[0];
  const gameArtStyle = {
    "--active-game-art": `url("/games/${game.id}/assets/hero/generated.png")`,
    "--active-game-net-art": `url("/games/${game.id}/assets/hero/internet.jpg")`,
  } as CSSProperties;
  const attributeTotal = Object.values(attributes).reduce((sum, value) => sum + Number(value || 0), 0);

  function handleStart() {
    if (!sheetReview) {
      setSheetReview(true);
      return;
    }

    onStart(characterName.trim() || "Superviviente", attributes);
  }

  return (
    <section className="new-game-layout" style={gameArtStyle}>
      <div className="new-game-heading">
        <div>
          <h2>Nueva partida</h2>
          <p>Comienza una nueva aventura en {game.name}.</p>
        </div>
        <button onClick={onBack}><ArrowLeft size={18} /> Volver</button>
      </div>

      <div className="new-game-grid">
        <aside className="world-preview-panel">
          <h3>Vista previa del mundo</h3>
          <div className={`world-preview game-${game.id}`} />
          <div className="session-summary">
            <h3>Resumen de sesion</h3>
            <p><span>Juego</span><strong>{game.name}</strong></p>
            <p><span>Campana</span><strong>{campaign?.title ?? "Explorando Yermo"}</strong></p>
            <p><span>Modo</span><strong>{mode === "guided" ? "Campana guiada" : "Modo libre"}</strong></p>
            <p><span>Jugadores</span><strong>{players} jugador{players > 1 ? "es" : ""}</strong></p>
            <p><span>Supervivencia</span><strong>{survival ? "Activada" : "Desactivada"}</strong></p>
            <p><span>DLC / Contenido</span><strong>{activeContent.length} activos</strong></p>
          </div>

          <div className="recommend-experience">
            <Zap size={48} />
            <div>
              <strong>Experiencia recomendada</strong>
              <p>Perfecto para quienes juegan {game.name} por primera vez o buscan la historia clasica.</p>
            </div>
          </div>
        </aside>

        <section className="setup-block setup-game-loaded">
          <h3><Settings size={20} /> 1. Juego cargado</h3>
          <div className="large-select">
            <span className="gear-small"><Settings size={34} /></span>
            <strong>{game.name}</strong>
          </div>
          <p>{game.description}</p>
        </section>

        <section className="setup-block campaign-card">
          <h3><Crosshair size={20} /> 2. Campana</h3>
          <div className="campaign-choice">
            <div className="campaign-choice-art" />
            <div>
              <strong>{campaign?.title ?? `Explorando ${game.name}`}</strong>
              <small>{campaign?.implemented ? "Campana jugable" : "Plantilla futura"} - {campaign?.id ?? "sin_mision"}</small>
              <p>{campaign?.description ?? "Exploracion libre hasta definir misiones."}</p>
            </div>
          </div>
        </section>

        <section className="setup-block mode-block">
          <h3><Compass size={20} /> 3. Modo de juego</h3>
          <button className={`mode-card ${mode === "guided" ? "selected" : ""}`} onClick={() => setMode("guided")}>
            <Crosshair size={34} />
            <span>Campana guiada <small>Objetivos y escenas para vivir la historia.</small></span>
          </button>
          <button className={`mode-card ${mode === "free" ? "selected" : ""}`} onClick={() => setMode("free")}>
            <Compass size={34} />
            <span>Modo libre <small>Exploracion emergente sin guia principal.</small></span>
          </button>
        </section>

        <section className="setup-block players-block">
          <h3><Users size={20} /> 4. Jugadores</h3>
          <div className="player-options">
            {[1, 2, 4].map((value) => (
              <button key={value} className={players === value ? "selected" : ""} onClick={() => setPlayers(value)}>
                {value === 1 ? <User size={42} /> : <Users size={46} />}
                <strong>{value === 4 ? "3-4" : value} jugador{value > 1 ? "es" : ""}</strong>
                <small>{value === 1 ? "Solitario" : value === 2 ? "Cooperativo" : "Grupo"}</small>
              </button>
            ))}
          </div>
          <input
            className="text-input"
            value={characterName}
            onChange={(event) => setCharacterName(event.target.value)}
            aria-label="Nombre del personaje"
          />
          <div className="attribute-grid">
            {characters.attributes.slice(0, 6).map((attr) => (
              <label key={attr.id}>
                <span>{attr.id}</span>
                <input
                  type="number"
                  min={attr.min ?? 1}
                  max={attr.max ?? 10}
                  value={attributes[attr.id] ?? attr.default}
                  onChange={(event) =>
                    setAttributes((prev) => ({
                      ...prev,
                      [attr.id]: Number(event.target.value),
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </section>

        {sheetReview && (
          <section className="setup-block character-sheet-confirm">
            <h3><User size={20} /> Hoja de personaje</h3>
            <div className="character-sheet-card">
              <div>
                <small>Personaje principal</small>
                <strong>{characterName.trim() || "Superviviente"}</strong>
                <span>{players} jugador{players > 1 ? "es" : ""} - {mode === "guided" ? "Campana guiada" : "Modo libre"}</span>
              </div>
              <div className="character-attribute-list">
                {characters.attributes.slice(0, 8).map((attr) => (
                  <p key={attr.id}>
                    <span>{attr.id}</span>
                    <strong>{attributes[attr.id] ?? attr.default}</strong>
                  </p>
                ))}
              </div>
              <p>
                Total de atributos: <strong>{attributeTotal}</strong>. Esta ficha se usara para crear el registro inicial de la partida.
              </p>
            </div>
          </section>
        )}

        <section className="setup-block survival-block">
          <h3><HeartPulse size={20} /> 5. Supervivencia</h3>
          <p>Hambre, sed, cansancio, clima y recursos.</p>
          <button className={`fake-toggle label-toggle ${survival ? "on" : ""}`} onClick={() => setSurvival((value) => !value)}>
            {survival ? "Activada" : "Desactivada"}
          </button>
        </section>

        <section className="setup-block content-summary">
          <h3><Box size={20} /> 6. DLC / Contenido</h3>
          <p>Contenido adicional disponible para esta partida.</p>
          <div className="mini-tags">
            {activeContent.slice(0, 8).map((item) => <span key={item.id}>{item.name}</span>)}
          </div>
          <button onClick={onContent}>Gestionar contenido <Plus size={16} /></button>
        </section>
      </div>

      <button className="start-button" onClick={handleStart}>
        <Zap size={36} /> {sheetReview ? "Confirmar e iniciar partida" : "Crear hoja de personaje"}
        <small>{sheetReview ? `Comenzar tu aventura en ${game.name}` : "Revisar personaje antes de comenzar"}</small>
      </button>
    </section>
  );
}
