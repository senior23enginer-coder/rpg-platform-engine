import { ArrowLeft, Box, ClipboardList, Compass, Crosshair, Eye, HeartPulse, Plus, Settings, User, Users, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { CampaignCharacter, CharacterSheetConfig, GameConfig } from "../types/game";
import { gameHeroVars, loadGameCharacterSheet, resolveGameAsset } from "../lib/gameLibrary";

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
  { value: 3, label: "3 jugadores", mode: "Grupo" },
  { value: 4, label: "4 jugadores", mode: "Grupo" },
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
  const [stage, setStage] = useState<"setup" | "character" | "campaignSheet">("setup");
  const [sheetConfig, setSheetConfig] = useState<RuntimeCharacterSheetConfig>(characters);
  const [characterName, setCharacterName] = useState("Superviviente");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [originId, setOriginId] = useState(fallbackOrigins[0].id);
  const [notes, setNotes] = useState("");
  const [players, setPlayers] = useState(1);
  const [survival, setSurvival] = useState(false);
  const [mode, setMode] = useState<"guided" | "free">("guided");
  const [selectedCampaignCharacterIds, setSelectedCampaignCharacterIds] = useState<string[]>([]);
  const [sheetCharacterId, setSheetCharacterId] = useState("");
  const [attributes, setAttributes] = useState<Record<string, number>>(() =>
    Object.fromEntries(characters.attributes.map((attr) => [attr.id, attr.default]))
  );

  const activeContent = useMemo(() => {
    return Object.values(game.content).flat().filter((item) => item.enabled);
  }, [game]);

  const campaign = game.campaigns[0];
  const isFallout4 = game.id === "fallout4";
  const campaignCharacters = campaign?.characters ?? [];
  const guidedUsesPrebuiltCharacters = isFallout4 && mode === "guided" && campaignCharacters.length > 0;
  const selectedCampaignCharacters = Array.from({ length: players }, (_, index) => {
    const fallback = campaignCharacters[index] ?? campaignCharacters[0];
    return campaignCharacters.find((character) => character.id === selectedCampaignCharacterIds[index]) ?? fallback;
  }).filter((character): character is CampaignCharacter => Boolean(character));
  const visibleCampaignCharacters = mode === "guided"
    ? guidedUsesPrebuiltCharacters
      ? selectedCampaignCharacters
      : campaignCharacters.slice(0, players)
    : [];
  const freeModeSheet = campaign?.freeModeSheetImage;
  const isDaysGone = game.id === "daysgone";
  const isDaysGoneFreeMode = isDaysGone && mode === "free";
  const daysGoneSheetImage = isDaysGoneFreeMode
    ? freeModeSheet
    : visibleCampaignCharacters[0]?.sheetImage;
  const gameArtStyle = gameHeroVars(game) as CSSProperties;
  const configuredValues = new Set(game.playerOptions?.map((option) => option.value) ?? []);
  const configuredOptions = fallbackPlayerOptions.map((fallback) => {
    const custom = game.playerOptions?.find((option) => option.value === fallback.value);
    return custom ?? fallback;
  });
  const playerOptions = configuredOptions
    .filter((option) => option.value <= (game.maxPlayers ?? 4))
    .filter((option) => !configuredValues.size || configuredValues.has(option.value))
    .filter((option) => !(isFallout4 && mode === "guided" && option.value > 2));
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
  const sheetCharacter = campaignCharacters.find((character) => character.id === sheetCharacterId);

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
    setSelectedCampaignCharacterIds(campaignCharacters.slice(0, 2).map((character) => character.id));
    setSheetCharacterId("");
    setGender("");
    setAge("");
    setNotes("");
  }, [game.maxPlayers, sheetConfig, campaignCharacters]);

  useEffect(() => {
    if (isFallout4 && mode === "guided") {
      setPlayers((current) => Math.min(current, 2));
      setSelectedCampaignCharacterIds((current) => {
        const defaults = campaignCharacters.slice(0, 2).map((character) => character.id);
        return defaults.map((id, index) => current[index] || id);
      });
    }
  }, [campaignCharacters, isFallout4, mode]);

  function setCampaignCharacter(playerIndex: number, characterId: string) {
    setSelectedCampaignCharacterIds((current) => {
      const next = [...current];
      next[playerIndex] = characterId;
      if (players === 2 && next[0] === next[1]) {
        const alternate = campaignCharacters.find((character) => character.id !== characterId)?.id;
        if (alternate) next[playerIndex === 0 ? 1 : 0] = alternate;
      }
      return next;
    });
  }

  function handleStart() {
    if (guidedUsesPrebuiltCharacters) {
      const selectedCharacters = selectedCampaignCharacters.slice(0, players);
      const name = selectedCharacters.map((character) => character.name).join(" / ") || "Superviviente";
      const characterAttributes = selectedCharacters[0]?.attributes ?? attributes;
      onStart(name, characterAttributes);
      return;
    }

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

  if (stage === "campaignSheet" && sheetCharacter) {
    return (
      <section className="campaign-character-sheet-screen" style={gameArtStyle}>
        <header className="character-sheet-top">
          <button onClick={() => setStage("setup")}><ArrowLeft size={18} /> Volver</button>
          <div>
            <strong>{game.name} - campaña guiada</strong>
            <h2>{sheetCharacter.name}</h2>
            <p>{sheetCharacter.role}</p>
          </div>
          <div className="vault-card">
            <span>{game.short}</span>
            <strong>Personaje precreado</strong>
          </div>
        </header>

        <div className="fallout4-sheet-layout">
          <article className="fallout4-sheet-image">
            {sheetCharacter.sheetImage && <img src={resolveGameAsset(game, sheetCharacter.sheetImage)} alt="" />}
          </article>

          <aside className="fallout4-sheet-data">
            <h3>S.P.E.C.I.A.L.</h3>
            <div className="fallout4-character-stats">
              {Object.entries(sheetCharacter.attributes ?? {}).map(([key, value]) => (
                <span key={key}><strong>{key}</strong><b>{value}</b></span>
              ))}
            </div>
            <div className="fallout4-sheet-note">
              <strong>{sheetCharacter.name}</strong>
              <p>Esta ficha pertenece a la campaña. No se crea una hoja nueva en modo campaña; se elige un personaje precreado y se inicia la partida con sus datos.</p>
            </div>
            <button className="green-button" onClick={() => setStage("setup")}><ArrowLeft size={18} /> Volver a selección</button>
          </aside>
        </div>
      </section>
    );
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
          {isDaysGone && daysGoneSheetImage && (
            <section className="paper-panel daysgone-visual-sheet">
              <h3>Hoja visual Days Gone</h3>
              <img src={resolveGameAsset(game, daysGoneSheetImage)} alt="" />
              <p>{isDaysGoneFreeMode ? "Creacion inicial para modo libre." : "Hoja de campaña para personaje creado."}</p>
            </section>
          )}

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

          {!isDaysGoneFreeMode && (
            <section className="paper-panel health-paper">
              <h3>Salud y condiciones</h3>
              <p><span>Puntos de salud</span><strong>{health}</strong></p>
              <p><span>Puntos de accion</span><strong>{actionPoints}</strong></p>
              <p><span>Jugadores</span><strong>{players}</strong></p>
              <p><span>Supervivencia</span><strong>{survival ? "Activa" : "Normal"}</strong></p>
            </section>
          )}

          {isDaysGoneFreeMode && (
            <section className="paper-panel health-paper">
              <h3>Estilo de superviviente</h3>
              <p><span>Ruta</span><strong>{origins.find((origin) => origin.id === originId)?.name ?? "Errante"}</strong></p>
              <p><span>Equipo inicial</span><strong>Moto, combustible, arma corta</strong></p>
              <p><span>Enfoque</span><strong>Carretera, campamentos y NERO</strong></p>
            </section>
          )}

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

          {!isDaysGoneFreeMode && (
            <section className="paper-panel notes-paper">
              <h3>Notas del personaje</h3>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Rasgos, motivaciones, cicatrices, deudas o juramentos." />
            </section>
          )}
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
          {(visibleCampaignCharacters.length > 0 || freeModeSheet) && (
            <div className="campaign-character-sheets">
              {mode === "guided" && visibleCampaignCharacters.map((character) => (
                <article key={character.id}>
                  {character.sheetImage && <img src={resolveGameAsset(game, character.sheetImage)} alt="" />}
                  <strong>{character.name}</strong>
                  <small>{character.role}</small>
                </article>
              ))}
              {mode === "free" && freeModeSheet && (
                <article>
                  <img src={resolveGameAsset(game, freeModeSheet)} alt="" />
                  <strong>Personaje libre</strong>
                  <small>Hoja editable para modo libre.</small>
                </article>
              )}
            </div>
          )}
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
          {guidedUsesPrebuiltCharacters ? (
            <div className="campaign-prebuilt-selector">
              <strong>Fallout 4 - personaje base</strong>
              {Array.from({ length: players }, (_, index) => {
                const selectedId = selectedCampaignCharacterIds[index] ?? campaignCharacters[index]?.id ?? campaignCharacters[0]?.id ?? "";
                const selectedCharacter = campaignCharacters.find((character) => character.id === selectedId) ?? campaignCharacters[0];
                return (
                  <label key={index}>
                    <span>Jugador {index + 1}</span>
                    <div>
                      <select value={selectedId} onChange={(event) => setCampaignCharacter(index, event.target.value)}>
                        {campaignCharacters.slice(0, 2).map((character) => (
                          <option key={character.id} value={character.id}>{character.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setSheetCharacterId(selectedCharacter?.id ?? "");
                          setStage("campaignSheet");
                        }}
                      >
                        <Eye size={18} /> Ver ficha
                      </button>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <input
              className="text-input"
              value={characterName}
              onChange={(event) => setCharacterName(event.target.value)}
              aria-label="Nombre del personaje"
            />
          )}
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
      <footer className="new-game-footer">
        <p><ClipboardList size={18} /> Puedes cambiar estos ajustes en cualquier momento desde el menu de pausa.</p>
        <button className="start-button" onClick={handleStart}>
          <Zap size={36} /> {guidedUsesPrebuiltCharacters ? "Empezar campaña" : "Crear hoja de personaje"}
          <small>{guidedUsesPrebuiltCharacters ? "Usar personaje precreado de Fallout 4" : "Revisar personaje antes de comenzar"}</small>
        </button>
      </footer>
</section>
  );
}
