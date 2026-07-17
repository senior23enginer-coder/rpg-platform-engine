import { useState, type CSSProperties } from "react";
import { Eraser, Flag, Grid3X3, Image as ImageIcon, Map as MapIcon, Plus, Route, Swords, Trash2, Upload } from "lucide-react";
import type { GameConfig, GameMap, TacticalMarkerType, TacticalTerrainType } from "../types/game";

type Props = {
  game: GameConfig;
  onChange: (maps: GameMap[]) => void;
};

const terrainPalette: Array<{ type: TacticalTerrainType; label: string; move: string }> = [
  { type: "plain", label: "Llanura", move: "1" },
  { type: "forest", label: "Bosque", move: "2" },
  { type: "mountain", label: "Montana", move: "3" },
  { type: "water", label: "Agua", move: "-" },
  { type: "road", label: "Camino", move: "1" },
  { type: "city", label: "Ciudad", move: "1" },
  { type: "base", label: "Base", move: "1" },
  { type: "wall", label: "Muro", move: "-" },
];

const markerPalette: Array<{ type: TacticalMarkerType; label: string }> = [
  { type: "player", label: "Jugador" },
  { type: "enemy", label: "Enemigo" },
  { type: "objective", label: "Objetivo" },
  { type: "spawn", label: "Spawn" },
  { type: "shop", label: "Tienda" },
];

type ToolMode = "terrain" | "marker" | "erase";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function createTiles(width: number, height: number, terrain: TacticalTerrainType = "plain") {
  return Array.from({ length: width * height }, (_, index) => ({
    x: index % width,
    y: Math.floor(index / width),
    terrain,
  }));
}

function createDefaultMap(game: GameConfig, index: number): GameMap {
  const campaign = game.campaigns[index] ?? game.campaigns[0];
  const width = 14;
  const height = 10;

  return {
    id: `map_${slugify(campaign?.title ?? game.name) || Date.now()}`,
    name: campaign?.title ? `Mapa - ${campaign.title}` : `Mapa tactico ${index + 1}`,
    description: "Mapa tactico 2D por tiles compatible con juegos tipo Advance Wars o Fire Emblem.",
    width,
    height,
    tileSize: 48,
    backgroundMode: "none",
    nodes: [],
    tiles: createTiles(width, height),
    markers: [
      { id: `marker_player_${Date.now()}`, x: 1, y: 1, type: "player", label: "Inicio" },
      { id: `marker_enemy_${Date.now()}`, x: width - 2, y: height - 2, type: "enemy", label: "Rival" },
    ],
  };
}

function normalizeTacticalMap(map: GameMap): GameMap {
  const width = Math.max(4, Math.round(map.width || 14));
  const height = Math.max(4, Math.round(map.height || 10));
  const existing = new Map((map.tiles ?? []).map((tile) => [`${tile.x}:${tile.y}`, tile.terrain]));
  return {
    ...map,
    width,
    height,
    tileSize: map.tileSize ?? 48,
    background: map.background ?? "",
    backgroundMode: map.backgroundMode ?? (map.background ? "image" : "none"),
    backgroundSourceName: map.backgroundSourceName,
    nodes: map.nodes ?? [],
    tiles: createTiles(width, height).map((tile) => ({
      ...tile,
      terrain: existing.get(`${tile.x}:${tile.y}`) ?? tile.terrain,
    })),
    markers: map.markers ?? [],
  };
}

function ensureMaps(game: GameConfig) {
  return game.maps?.length ? game.maps.map(normalizeTacticalMap) : [createDefaultMap(game, 0)];
}

export function MapEditor({ game, onChange }: Props) {
  const maps = ensureMaps(game);
  const [activeMapId, setActiveMapId] = useState(maps[0]?.id ?? "");
  const activeMap = maps.find((map) => map.id === activeMapId) ?? maps[0];
  const [toolMode, setToolMode] = useState<ToolMode>("terrain");
  const [terrain, setTerrain] = useState<TacticalTerrainType>("plain");
  const [markerType, setMarkerType] = useState<TacticalMarkerType>("player");
  const [selectedMarkerId, setSelectedMarkerId] = useState(activeMap?.markers?.[0]?.id ?? "");
  const selectedMarker = activeMap?.markers?.find((marker) => marker.id === selectedMarkerId);

  function emit(nextMaps: GameMap[]) {
    onChange(nextMaps.map(normalizeTacticalMap));
  }

  function updateMap(mapId: string, patch: Partial<GameMap>) {
    emit(maps.map((map) => (map.id === mapId ? { ...map, ...patch } : map)));
  }

  function addMap() {
    const next = createDefaultMap(game, maps.length);
    emit([next, ...maps]);
    setActiveMapId(next.id);
    setSelectedMarkerId(next.markers?.[0]?.id ?? "");
  }

  function resizeMap(width: number, height: number) {
    const nextWidth = Math.max(4, width);
    const nextHeight = Math.max(4, height);
    updateMap(activeMap.id, {
      width: nextWidth,
      height: nextHeight,
      tiles: createTiles(nextWidth, nextHeight).map((tile) => {
        const existing = (activeMap.tiles ?? []).find((item) => item.x === tile.x && item.y === tile.y);
        return existing ?? tile;
      }),
      markers: (activeMap.markers ?? []).filter((marker) => marker.x < nextWidth && marker.y < nextHeight),
    });
  }

  function updateTileSize(tileSize: number) {
    updateMap(activeMap.id, { tileSize: Math.max(16, Math.min(128, Math.round(tileSize) || activeMap.tileSize || 48)) });
  }

  function decomposeImage(source: string, sourceName = "Imagen importada") {
    const image = new window.Image();
    image.onload = () => {
      const tileSize = Math.max(16, activeMap.tileSize ?? 48);
      const width = Math.max(4, Math.round(image.naturalWidth / tileSize));
      const height = Math.max(4, Math.round(image.naturalHeight / tileSize));
      updateMap(activeMap.id, {
        background: source,
        backgroundMode: "image",
        backgroundSourceName: sourceName,
        width,
        height,
        tiles: createTiles(width, height, "plain"),
        markers: (activeMap.markers ?? []).filter((marker) => marker.x < width && marker.y < height),
      });
    };
    image.src = source;
  }

  function loadImageFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const source = typeof reader.result === "string" ? reader.result : "";
      if (source) decomposeImage(source, file.name);
    };
    reader.readAsDataURL(file);
  }

  function tileImageStyle(x: number, y: number) {
    if (!activeMap.background || activeMap.backgroundMode !== "image") return undefined;
    const xPosition = activeMap.width <= 1 ? 0 : (x / (activeMap.width - 1)) * 100;
    const yPosition = activeMap.height <= 1 ? 0 : (y / (activeMap.height - 1)) * 100;
    return {
      "--tile-image": `url("${activeMap.background}")`,
      "--tile-bg-size": `${activeMap.width * 100}% ${activeMap.height * 100}%`,
      "--tile-bg-position": `${xPosition}% ${yPosition}%`,
    } as CSSProperties;
  }

  function paintCell(x: number, y: number) {
    if (toolMode === "terrain") {
      updateMap(activeMap.id, {
        tiles: (activeMap.tiles ?? []).map((tile) => (tile.x === x && tile.y === y ? { ...tile, terrain } : tile)),
      });
      return;
    }

    if (toolMode === "erase") {
      updateMap(activeMap.id, {
        tiles: (activeMap.tiles ?? []).map((tile) => (tile.x === x && tile.y === y ? { ...tile, terrain: "plain" } : tile)),
        markers: (activeMap.markers ?? []).filter((marker) => marker.x !== x || marker.y !== y),
      });
      return;
    }

    const existing = (activeMap.markers ?? []).find((marker) => marker.x === x && marker.y === y);
    if (existing) {
      const markers = (activeMap.markers ?? []).map((marker) =>
        marker.id === existing.id ? { ...marker, type: markerType, label: marker.label || markerPalette.find((item) => item.type === markerType)?.label || markerType } : marker
      );
      updateMap(activeMap.id, { markers });
      setSelectedMarkerId(existing.id);
      return;
    }

    const nextMarker = {
      id: `marker_${markerType}_${Date.now()}`,
      x,
      y,
      type: markerType,
      label: markerPalette.find((item) => item.type === markerType)?.label ?? markerType,
    };
    updateMap(activeMap.id, { markers: [...(activeMap.markers ?? []), nextMarker] });
    setSelectedMarkerId(nextMarker.id);
  }

  function updateSelectedMarker(patch: Partial<NonNullable<GameMap["markers"]>[number]>) {
    if (!selectedMarker) return;
    updateMap(activeMap.id, {
      markers: (activeMap.markers ?? []).map((marker) => (marker.id === selectedMarker.id ? { ...marker, ...patch } : marker)),
    });
  }

  function removeSelectedMarker() {
    if (!selectedMarker) return;
    const markers = (activeMap.markers ?? []).filter((marker) => marker.id !== selectedMarker.id);
    updateMap(activeMap.id, { markers });
    setSelectedMarkerId(markers[0]?.id ?? "");
  }

  return (
    <article className="admin-card map-editor tactical-map-editor">
      <div className="admin-panel-title">
        <strong><MapIcon size={18} /> Editor tactico 2D</strong>
        <button onClick={addMap}><Plus size={15} /> Mapa</button>
      </div>

      <div className="map-editor-layout tactical-layout">
        <aside className="map-list">
          {maps.map((map) => (
            <button
              key={map.id}
              className={map.id === activeMap.id ? "selected" : ""}
              onClick={() => {
                setActiveMapId(map.id);
                setSelectedMarkerId(map.markers?.[0]?.id ?? "");
              }}
            >
              <Route size={16} />
              <span><strong>{map.name}</strong><small>{map.width}x{map.height} tiles</small></span>
            </button>
          ))}
          <div className="map-format-note">
            <strong>Formato tactico 2D</strong>
            <small>Tiles, terreno, coste de movimiento y marcadores para combate tactico.</small>
          </div>
        </aside>

        <div className="map-workspace">
          <div className="map-meta-grid">
            <label><span>ID</span><input value={activeMap.id} onChange={(event) => updateMap(activeMap.id, { id: slugify(event.target.value) || activeMap.id })} /></label>
            <label><span>Nombre</span><input value={activeMap.name} onChange={(event) => updateMap(activeMap.id, { name: event.target.value })} /></label>
            <label><span>Ancho tiles</span><input type="number" min={4} max={40} value={activeMap.width} onChange={(event) => resizeMap(Number(event.target.value) || activeMap.width, activeMap.height)} /></label>
            <label><span>Alto tiles</span><input type="number" min={4} max={30} value={activeMap.height} onChange={(event) => resizeMap(activeMap.width, Number(event.target.value) || activeMap.height)} /></label>
          </div>

          <section className="map-image-importer">
            <div>
              <strong><ImageIcon size={17} /> Imagen base del mapa</strong>
              <small>{activeMap.backgroundSourceName || "Carga un PNG/JPG o pega una ruta de asset para descomponerlo en tiles."}</small>
            </div>
            <label className="map-image-path">
              <span>Ruta asset / data URL</span>
              <input
                value={activeMap.background ?? ""}
                onChange={(event) => updateMap(activeMap.id, { background: event.target.value, backgroundMode: event.target.value ? "image" : "none", backgroundSourceName: event.target.value ? "Asset manual" : "" })}
                placeholder="/games/fallout4/assets/maps/concord.png"
              />
            </label>
            <label>
              <span>Tile px</span>
              <input type="number" min={16} max={128} value={activeMap.tileSize ?? 48} onChange={(event) => updateTileSize(Number(event.target.value))} />
            </label>
            <label className="green-button map-file-button">
              <Upload size={15} /> Cargar imagen
              <input type="file" accept="image/*" onChange={(event) => loadImageFile(event.target.files?.[0])} />
            </label>
            <button onClick={() => activeMap.background && decomposeImage(activeMap.background, activeMap.backgroundSourceName || "Asset manual")}><Grid3X3 size={15} /> Descomponer</button>
          </section>

          <div className="tactical-toolbar">
            <button className={toolMode === "terrain" ? "selected" : ""} onClick={() => setToolMode("terrain")}><MapIcon size={15} /> Terreno</button>
            <button className={toolMode === "marker" ? "selected" : ""} onClick={() => setToolMode("marker")}><Flag size={15} /> Marcador</button>
            <button className={toolMode === "erase" ? "selected" : ""} onClick={() => setToolMode("erase")}><Eraser size={15} /> Borrar</button>
          </div>

          <div
            className={`tactical-grid ${activeMap.backgroundMode === "image" && activeMap.background ? "map-image-mode" : ""}`}
            style={{
              gridTemplateColumns: `repeat(${activeMap.width}, minmax(0, 1fr))`,
              aspectRatio: `${activeMap.width} / ${activeMap.height}`,
            }}
          >
            {(activeMap.tiles ?? []).map((tile) => {
              const marker = (activeMap.markers ?? []).find((item) => item.x === tile.x && item.y === tile.y);
              return (
                <button
                  key={`${tile.x}-${tile.y}`}
                  className={`tactical-tile ${activeMap.backgroundMode === "image" && activeMap.background ? "image-backed" : `terrain-${tile.terrain}`} terrain-overlay-${tile.terrain} ${marker ? `has-marker marker-${marker.type}` : ""}`}
                  style={tileImageStyle(tile.x, tile.y)}
                  onClick={() => paintCell(tile.x, tile.y)}
                  title={`${tile.x}, ${tile.y} - ${tile.terrain}`}
                >
                  {marker && <span>{marker.type === "player" ? "P" : marker.type === "enemy" ? "E" : marker.type === "objective" ? "!" : marker.type === "spawn" ? "S" : "$"}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="node-editor tactical-side-panel">
          <div className="admin-panel-title compact">
            <strong><Swords size={16} /> Paleta tactica</strong>
          </div>

          <strong>Terreno</strong>
          <div className="terrain-palette">
            {terrainPalette.map((item) => (
              <button key={item.type} className={`terrain-${item.type} ${terrain === item.type ? "selected" : ""}`} onClick={() => { setTerrain(item.type); setToolMode("terrain"); }}>
                <span>{item.label}</span><small>Mov {item.move}</small>
              </button>
            ))}
          </div>

          <strong>Marcadores</strong>
          <div className="marker-palette">
            {markerPalette.map((item) => (
              <button key={item.type} className={markerType === item.type ? "selected" : ""} onClick={() => { setMarkerType(item.type); setToolMode("marker"); }}>
                {item.label}
              </button>
            ))}
          </div>

          {selectedMarker && (
            <section className="marker-editor">
              <strong>Marcador seleccionado</strong>
              <label><span>Etiqueta</span><input value={selectedMarker.label} onChange={(event) => updateSelectedMarker({ label: event.target.value })} /></label>
              <div className="node-coordinate-grid">
                <label><span>X</span><input type="number" min={0} max={activeMap.width - 1} value={selectedMarker.x} onChange={(event) => updateSelectedMarker({ x: Number(event.target.value) || 0 })} /></label>
                <label><span>Y</span><input type="number" min={0} max={activeMap.height - 1} value={selectedMarker.y} onChange={(event) => updateSelectedMarker({ y: Number(event.target.value) || 0 })} /></label>
              </div>
              <button className="danger-button" onClick={removeSelectedMarker}><Trash2 size={15} /> Eliminar marcador</button>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
