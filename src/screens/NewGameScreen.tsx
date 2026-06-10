import { ArrowLeft, Box, ClipboardList, Compass, Crosshair, HeartPulse, Plus, Settings, User, Users, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { CharacterSheetConfig, GameConfig } from "../types/game";
import { gameHeroVars, loadGameCharacterSheet } from "../lib/gameLibrary";

type Props = {
  game: GameConfig;
  characters: CharacterSheetConfig;
  onStart: (characterName: string, attributes: Record<string, number>) => void;
  onContent: () => void;
  onBack: () => void;
};

type SheetOption = {
  id: string;
  name: string;
  description?: string;
};

type RuntimeCharacterSheetConfig = CharacterSheetConfig & {
  skills?: SheetOption[];
  origins?: SheetOption[];
  archetypes?: SheetOption[];
};

const fallbackPlayerOptions = [
  { value: 1, label: "1 jugador", mode: "Solitario" },
  { value: 2, label: "2 jugadores", mode: "Cooperativo" },
  { value: 4, label: "3-4 jugadores", mode: "Grupo" },
];

const gameSheetLabels: Record<string, { species: string; quote: string; system: string }> = {
  fallout3: { species: "Habitante del refugio", quote: "La radiacion no siempre mata. A veces transforma.", system: "Sistema Fallout 2d20" },
  fallout4: { species: "Superviviente del Refugio 111", quote: "Reconstruye, resiste, sobrevive.", system: "Commonwealth 2d20" },
  newvegas: { species: "Mensajero del Mojave", quote: "La casa siempre gana... salvo que cambies las reglas.", system: "Mojave 2d20" },
  fallout76: { species: "Residente de Appalachia", quote: "Reclama el yermo, evento por evento.", system: "Appalachia 2d20" },
  fallout1_2: { species: "Morador clasico", quote: "Cada punto de accion cuenta.", system: "Fallout clasico" },
  metro: { species: "Ranger del Metro", quote: "La luz cuesta municion.", system: "Metro supervivencia" },
  daysgone: { species: "Errante de Oregon", quote: "La carretera decide quien vuelve.", system: "Hordas y supervivencia" },
  thelastofus: { species: "Superviviente infectado", quote: "Escucha antes de moverte.", system: "Drama de supervivencia" },
  stalker: { species: "Stalker de la Zona", quote: "La anomalia premia al paciente.", system: "Zona modular" },
  skyrim: { species: "Sangre de dragon", quote: "Tu voz puede cambiar el mundo.", system: "Tamriel aventura" },
};

const fallbackSkills: SheetOption[] = [
  { id: "athletics", name: "Atletismo" },
  { id: "survival", name: "Supervivencia" },
  { id: "stealth", name: "Sigilo" },
  { id: "speech", name: "Persuasion" },
  { id: "repair", name: "Reparar" },
  { id: "medicine", name: "Medicina" },
  { id: "science", name: "Ciencia" },
  { id: "combat", name: "Combate" },
];

const fallbackOrigins: SheetOption[] = [
  { id: "vault", name: "Refugio / Base segura", description: "Criado bajo reglas y proteccion." },
  { id: "wasteland", name: "Superviviente del yermo", description: "Conoces el camino y el hambre." },
  { id: "wanderer", name: "Nomada", description: "Sin ataduras, siempre en movimiento." },
  { id: "faction", name: "Faccion local", description: "Tienes contactos, enemigos y deuda." },
];

export function NewGameScreen({ game, characters, onStart, onContent, onBack }: Props) {
  const [stage, setStage] = useState<"setup" | "character">("setup");
  const [sheetConfig, setSheetConfig] = useState<RuntimeCharacterSheetConfig>(characters);
  const [characterName, setCharacterName] = useState("Superviviente");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [originId, setOriginId] = useState(fallbackOrigins[0].id);
  const [notes, setNotes] = useState("");
  const [players, setPlayers] = useState(1);
  const [survival, setSurvival] = useState(false);
  const [mode, setMode] = useState<"guided" | "free">("guided");
  const [attributes, setAttributes] = useState<Record<string, number>>(() =>
    Object.fromEntries(characters.attributes.map((attr) => [attr.id, attr.default]))
  );

  const activeContent = useMemo(() => {
    return Object.values(game.content).flat().filter((item) => item.enabled);
  }, [game]);

  const campaign = game.campaigns[0];
  const gameArtStyle = gameHeroVars(game) as CSSProperties;
  const playerOptions = (game.playerOptions?.length ? game.playerOptions : fallbackPlayerOptions)
    .filter((option) => option.value <= (game.maxPlayers ?? 4));
  const sheetLabels = gameSheetLabels[game.id] ?? {
    species: `${game.name} - personaje`,
    quote: "Tu universo. Tu historia. Tu aventura.",
    system: "RPG Platform Engine",
  };
  const origins = sheetConfig.origins?.length ? sheetConfig.origins : fallbackOrigins;
  const skills = sheetConfig.skills?.length ? sheetConfig.skills : fallbackSkills;
  const seeds = sheetConfig.seeds ?? [];
  const attributeTotal = Object.values(attributes).reduce((sum, value) => sum + Number(value || 0), 0);
  const health = Math.max(8, (attributes.END ?? attributes.RES ?? 5) + 5);
  const actionPoints = Math.max(4, Math.ceil(((attributes.AGI ?? 5) + (attributes.PER ?? 5)) / 2));

  useEffect(() => {
    let active = true;
    setStage("setup");
    setSheetConfig(characters);
    loadGameCharacterSheet(game)
      .then((config: RuntimeCharacterSheetConfig) => {
        if (active) setSheetConfig(config);
      })
      .catch(() => {
        if (active) setSheetConfig(characters);
      });

    return () => {
      active = false;
    };
  }, [characters, game.id]);

  useEffect(() => {
    setAttributes(Object.fromEntries(sheetConfig.attributes.map((attr) => [attr.id, attr.default])));
    setCharacterName(sheetConfig.seeds?.[0]?.name ?? "Superviviente");
    setOriginId((sheetConfig.origins?.[0] ?? fallbackOrigins[0]).id);
    setPlayers((current) => Math.min(current, game.maxPlayers ?? 4));
    setGender("");
    setAge("");
    setNotes("");
  }, [game.maxPlayers, sheetConfig]);

  function handleStart() {
    if (stage === "setup") {
      setStage("character");
      return;
    }

    onStart(characterName.trim() || "Superviviente", attributes);
  }

  function applySeed(seedId: string) {
    const seed = seeds.find((item) => item.id === seedId);
    if (!seed) return;
    setCharacterName(seed.name);
    if (seed.attributes) {
      setAttributes((current) => ({ ...current, ...seed.attributes }));
    }
  }

  if (stage === "character") {
    return (
      <section className="character-creation-screen" style={gameArtStyle}>
        <div className="character-sheet-top">
          <button onClick={() => setStage("setup")}><ArrowLeft size={18} /> Volver</button>
          <div>
            <strong>{sheetLabels.system} - {mode === "guided" ? "Modo guiado" : "Modo libre"}</strong>
            <h2>Hoja de creacion de personaje</h2>
            <p>{game.name} - {sheetConfig.creationMode}</p>
          </div>
          <div className="vault-card">
            <span>{game.short}</span>
            <strong>{sheetLabels.species}</strong>
          </div>
        </div>

        <div className="paper-character-sheet">
          <section className="paper-panel personal-data">
            <h3>Datos personales</h3>
            <label>
              Nombre del personaje
              <input value={characterName} onChange={(event) => setCharacterName(event.target.value)} />
            </label>
            <label>
              Genero
              <input value={gender} onChange={(event) => setGender(event.target.value)} />
            </label>
            <label>
              Edad aparente
              <input value={age} onChange={(event) => setAge(event.target.value)} />
            </label>
            <label>
              Plantilla inicial
              <select onChange={(event) => applySeed(event.target.value)} defaultValue="">
                <option value="" disabled>Elegir seed</option>
                {seeds.map((seed) => (
                  <option key={seed.id} value={seed.id}>{seed.name}</option>
                ))}
              </select>
            </label>
          </section>

          <section className="paper-panel species-panel">
            <h3>Especie / modulo</h3>
            <strong>{sheetLabels.species}</strong>
            <p>{game.description}</p>
          </section>

          <section className="paper-panel attributes-paper">
            <h3>{game.id.startsWith("fallout") ? "S.P.E.C.I.A.L." : "Atributos"}</h3>
            {sheetConfig.attributes.map((attr) => (
              <label key={attr.id}>
                <span>
                  <strong>{attr.name}</strong>
                  <small>{attr.id}</small>
                </span>
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
          </section>

          <section className="paper-panel origins-paper">
            <h3>Origen / antecedente</h3>
            {origins.map((origin) => (
              <button
                key={origin.id}
                className={originId === origin.id ? "selected" : ""}
                onClick={() => setOriginId(origin.id)}
              >
                <strong>{origin.name}</strong>
                <small>{origin.description ?? "Define tu punto de partida."}</small>
              </button>
            ))}
          </section>

          <section className="paper-panel health-paper">
            <h3>Salud y condiciones</h3>
            <p><span>Puntos de salud</span><strong>{health}</strong></p>
            <p><span>Puntos de accion</span><strong>{actionPoints}</strong></p>
            <p><span>Jugadores</span><strong>{players}</strong></p>
            <p><span>Supervivencia</span><strong>{survival ? "Activa" : "Normal"}</strong></p>
          </section>

          <section className="paper-panel skills-paper">
            <h3>Habilidades</h3>
            {skills.slice(0, 10).map((skill, index) => (
              <p key={skill.id}>
                <span>{skill.name}</span>
                <i>{sheetConfig.attributes[index % sheetConfig.attributes.length]?.id ?? "ATR"}</i>
                <strong>{Math.max(0, Math.floor(attributeTotal / 12) + (index % 3))}</strong>
              </p>
            ))}
          </section>

          <section className="paper-panel equipment-paper">
            <h3>Equipo inicial</h3>
            <p>Arma principal</p>
            <p>Herramienta de supervivencia</p>
            <p>Raciones / suministros</p>
            <p>Objeto personal</p>
          </section>

          <section className="paper-panel notes-paper">
            <h3>Notas del personaje</h3>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Rasgos, motivaciones, cicatrices, deudas o juramentos." />
          </section>
        </div>

        <div className="character-sheet-actions">
          <p><ClipboardList size={18} /> Total de atributos: <strong>{attributeTotal}</strong>. Esta hoja se guardara con la nueva partida.</p>
          <button onClick={() => setStage("setup")}><ArrowLeft size={18} /> Ajustar aventura</button>
          <button className="green-button" onClick={handleStart}><Zap size={20} /> Confirmar e iniciar</button>
        </div>

        <div className="character-sheet-quote">{sheetLabels.quote}</div>
      </section>
    );
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
          <p>{game.loadedDescription ?? game.description}</p>
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
            {playerOptions.map((option) => (
              <button key={option.value} className={players === option.value ? "selected" : ""} onClick={() => setPlayers(option.value)}>
                {option.value === 1 ? <User size={42} /> : <Users size={46} />}
                <strong>{option.label}</strong>
                <small>{option.mode}</small>
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
            {sheetConfig.attributes.slice(0, 6).map((attr) => (
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
        <Zap size={36} /> Crear hoja de personaje
        <small>Revisar personaje antes de comenzar</small>
      </button>
    </section>
  );
}
