import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, BookOpen, Boxes, BoxSelect, CloudSun, Copy, Crosshair, Download, Eraser, Eye, FilePlus2, Flag, FolderOpen, Grid3X3, HelpCircle, Image as ImageIcon, Layers, LocateFixed, Map as MapIcon, MapPinned, Maximize2, MousePointer2, Move, Package, Pencil, Play, Plus, Redo2, RotateCw, Route, Ruler, Save, Shield, SlidersHorizontal, Swords, Trash2, Undo2, Upload, Users } from "lucide-react";
import type { GameConfig, GameMap, TacticalMarkerType, TacticalTerrainType } from "../types/game";
import { buildFallout4TomeMapLibrary, createFallout4LocationMaps } from "../lib/fallout4TomeCatalog";
import type { PlatformMapDocument, PlatformRepository } from "../lib/platformContracts";

type Props = {
  game: GameConfig;
  platformRepository?: PlatformRepository;
  onChange: (maps: GameMap[]) => void;
  onPersistMap?: (map: GameMap) => void;
  onBack?: () => void;
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
  { type: "cover", label: "Cobertura" },
  { type: "loot", label: "Botin" },
  { type: "weather", label: "Clima" },
  { type: "biome", label: "Bioma" },
  { type: "unit", label: "Unidad" },
  { type: "beast", label: "Bestiario" },
];

type ToolMode = "terrain" | "marker" | "erase";
type MapEditorView = "list" | "editor";
type LibraryTab = "mission" | "location" | "weather" | "biome" | "nodes" | "arsenal" | "units" | "bestiary";

const editorMenus = ["Archivo", "Editar", "Vista", "Capas", "Escenario", "Herramientas", "Avanzado", "Modulos", "Ventana", "Ayuda"];

const resourceTree = [
  { title: "Terreno", items: ["Texturas", "Altura", "Cobertura", "Coste movimiento"] },
  { title: "Escenario", items: ["Misiones", "Ubicaciones", "Eventos", "Rutas"] },
  { title: "Reglas", items: ["Biomas", "Clima", "Peligro", "Encuentros"] },
  { title: "Objetos", items: ["Armas", "Equipamiento", "Botin", "Interactivos"] },
  { title: "Actores", items: ["Unidades", "Bestiario", "NPCs", "Facciones"] },
];

const maxImportedImageSide = 2048;
const maxImportedTiles = 48;

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

function createDefaultMapLibraries(game: GameConfig) {
  const tomeLibrary = buildFallout4TomeMapLibrary(game);
  if (tomeLibrary) {
    return {
      missionSheets: tomeLibrary.missionSheets ?? [],
      locations: tomeLibrary.locations ?? [],
      weatherEffects: tomeLibrary.weatherEffects ?? [],
      biomes: tomeLibrary.biomes ?? [],
      arsenal: tomeLibrary.arsenal ?? [],
    };
  }

  const campaign = game.campaigns[0];
  return {
    missionSheets: [
      {
        id: `mission_${slugify(campaign?.id ?? "initial")}`,
        title: campaign?.title ?? "Mision inicial",
        objective: campaign?.description ?? "Define objetivo principal, condiciones de exito y consecuencias.",
        locationId: "loc_start",
        recommendedLevel: 1,
        status: "draft" as const,
      },
    ],
    locations: [
      { id: "loc_start", name: "Zona inicial", biome: "Urbano", danger: 1, description: "Punto de entrada de la escena tactica." },
      { id: "loc_objective", name: "Objetivo principal", biome: "Ruinas", danger: 2, description: "Lugar clave para activar la mision." },
    ],
    weatherEffects: [
      { id: "weather_clear", name: "Despejado", visibility: 100, movementModifier: 0, description: "Sin penalizadores climaticos." },
      { id: "weather_radstorm", name: "Tormenta radiactiva", visibility: 45, movementModifier: 1, damage: "radiacion menor", description: "Reduce visibilidad y aumenta riesgo ambiental." },
    ],
    biomes: [
      { id: "biome_urban", name: "Urbano", movementModifier: 0, encounterRisk: 2, description: "Cobertura alta, rutas cortas y peligro tactico." },
      { id: "biome_wasteland", name: "Yermo", movementModifier: 1, encounterRisk: 3, description: "Terreno abierto con exposicion y recursos dispersos." },
      { id: "biome_ruins", name: "Ruinas", movementModifier: 1, encounterRisk: 4, description: "Cobertura irregular, botin y emboscadas." },
    ],
    arsenal: [
      { id: "weapon_laser_musket", name: "Mosquete laser", category: "weapon" as const, tags: ["energia", "medio alcance"], description: "Arma de energia para encuentros iniciales." },
      { id: "equipment_stimpak", name: "Estimulante", category: "equipment" as const, tags: ["curacion"], description: "Consumible medico basico." },
      { id: "unit_minuteman", name: "Miliciano", category: "unit" as const, tags: ["aliado", "rango"], description: "Unidad aliada de apoyo." },
      { id: "beast_molerat", name: "Rata topo", category: "bestiary" as const, tags: ["bestia", "subterraneo"], description: "Amenaza comun en zonas de ruinas." },
    ],
  };
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
    gridOpacity: 0.55,
    terrainOpacity: 0.38,
    markerScale: 1,
    nodes: [],
    tiles: createTiles(width, height),
    markers: [
      { id: `marker_player_${Date.now()}`, x: 1, y: 1, type: "player", label: "Inicio", movementCost: 1, coverage: "light" },
      { id: `marker_enemy_${Date.now()}`, x: width - 2, y: height - 2, type: "enemy", label: "Rival", movementCost: 1, coverage: "heavy" },
    ],
    ...createDefaultMapLibraries(game),
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
    gridOpacity: map.gridOpacity ?? 0.55,
    terrainOpacity: map.terrainOpacity ?? 0.38,
    markerScale: map.markerScale ?? 1,
    nodes: map.nodes ?? [],
    tiles: createTiles(width, height).map((tile) => ({
      ...tile,
      terrain: existing.get(`${tile.x}:${tile.y}`) ?? tile.terrain,
    })),
    markers: map.markers ?? [],
    missionSheets: map.missionSheets ?? [],
    locations: map.locations ?? [],
    weatherEffects: map.weatherEffects ?? [],
    biomes: map.biomes ?? [],
    arsenal: map.arsenal ?? [],
  };
}

function ensureMaps(game: GameConfig, limit?: number) {
  if (game.maps?.length) return game.maps.map(normalizeTacticalMap);
  const tomeLocationMaps = createFallout4LocationMaps(game);
  if (tomeLocationMaps.length) return tomeLocationMaps.slice(0, limit ?? tomeLocationMaps.length).map(normalizeTacticalMap);
  return [createDefaultMap(game, 0)];
}

function fromPlatformMapDocument(map: PlatformMapDocument): GameMap {
  const terrainLayer = map.layers.find((layer) => layer.id === "terrain");
  const markerLayer = map.layers.find((layer) => layer.id === "markers");
  const tiles = terrainLayer?.tiles?.flatMap((row, y) =>
    row.map((terrain, x) => ({ x, y, terrain: terrain as TacticalTerrainType }))
  );

  return normalizeTacticalMap({
    id: map.id,
    name: map.name,
    width: map.width,
    height: map.height,
    tileSize: map.tileSize,
    background: map.image,
    backgroundMode: map.image ? "image" : "none",
    nodes: [],
    tiles,
    markers: markerLayer?.markers?.map((marker) => ({
      id: marker.id,
      x: marker.x,
      y: marker.y,
      type: marker.type as TacticalMarkerType,
      label: marker.label ?? marker.type,
    })),
  });
}

function mapFromPlayableLocation(item: Record<string, unknown>, index: number): GameMap {
  const id = String(item.id ?? item.locationId ?? `location_map_${index}`);
  const name = String(item.name ?? item.locationName ?? `Mapa ${index + 1}`);
  const width = Math.max(8, Math.min(40, Number(item.width ?? 14) || 14));
  const height = Math.max(8, Math.min(30, Number(item.height ?? 10) || 10));
  const locationId = String(item.locationId ?? id);

  return normalizeTacticalMap({
    id,
    name,
    description: String(item.summary ?? item.useInPlay ?? "Mapa cargado bajo demanda desde fichas jugables."),
    width,
    height,
    tileSize: 48,
    background: String(item.image ?? item.background ?? ""),
    backgroundMode: item.image || item.background ? "image" : "none",
    nodes: [
      {
        id: `node_${locationId}`,
        name,
        type: item.settlement ? "settlement" : "location",
        x: Math.max(1, Math.floor(width / 2)),
        y: Math.max(1, Math.floor(height / 2)),
        description: String(item.useInPlay ?? item.summary ?? ""),
        biome: String(item.biome ?? item.category ?? "Commonwealth"),
        danger: Number(item.risk ?? item.danger ?? 1) || 1,
        locationId,
        missionId: Array.isArray(item.missions) ? String((item.missions[0] as Record<string, unknown> | undefined)?.id ?? "") : undefined,
        movementCost: item.settlement ? 1 : 2,
        coverage: item.settlement ? "heavy" : "light",
        connections: [],
      },
    ],
    tiles: createTiles(width, height, item.settlement ? "base" : "plain"),
    markers: [
      {
        id: `marker_${id}`,
        x: Math.max(1, Math.floor(width / 2)),
        y: Math.max(1, Math.floor(height / 2)),
        type: item.settlement ? "shop" : "objective",
        label: name,
        movementCost: item.settlement ? 1 : 2,
        coverage: item.settlement ? "heavy" : "light",
      },
    ],
  });
}

function markerGlyph(type: TacticalMarkerType) {
  if (type === "player") return "P";
  if (type === "enemy") return "E";
  if (type === "objective") return "!";
  if (type === "spawn") return "S";
  if (type === "shop") return "$";
  if (type === "cover") return "C";
  if (type === "loot") return "L";
  if (type === "weather") return "W";
  if (type === "biome") return "B";
  if (type === "unit") return "U";
  return "X";
}

export function MapEditor({ game, platformRepository, onChange, onPersistMap, onBack }: Props) {
  const fallbackMaps = ensureMaps(game, platformRepository ? 25 : undefined);
  const [backendMaps, setBackendMaps] = useState<GameMap[]>([]);
  const maps = backendMaps.length ? backendMaps : fallbackMaps;
  const [activeMapId, setActiveMapId] = useState(maps[0]?.id ?? "");
  const [view, setView] = useState<MapEditorView>("list");
  const activeMap = maps.find((map) => map.id === activeMapId) ?? maps[0];
  const [toolMode, setToolMode] = useState<ToolMode>("terrain");
  const [showGrid, setShowGrid] = useState(true);
  const [showTerrainLayer, setShowTerrainLayer] = useState(true);
  const [showImageLayer, setShowImageLayer] = useState(true);
  const [showMarkerLayer, setShowMarkerLayer] = useState(true);
  const [showMissionLayer, setShowMissionLayer] = useState(true);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [terrain, setTerrain] = useState<TacticalTerrainType>("plain");
  const [markerType, setMarkerType] = useState<TacticalMarkerType>("player");
  const [selectedMarkerId, setSelectedMarkerId] = useState(activeMap?.markers?.[0]?.id ?? "");
  const [selectedMarkerIds, setSelectedMarkerIds] = useState<string[]>(activeMap?.markers?.[0]?.id ? [activeMap.markers[0].id] : []);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("mission");
  const [saveStatus, setSaveStatus] = useState("Cambios locales");
  const [mapLoadStatus, setMapLoadStatus] = useState(platformRepository ? "Cargando mapas desde backend..." : "Mapas locales");
  const [history, setHistory] = useState<GameMap[][]>([]);
  const [future, setFuture] = useState<GameMap[][]>([]);
  const importMapInputRef = useRef<HTMLInputElement | null>(null);
  const selectedMarker = activeMap?.markers?.find((marker) => marker.id === selectedMarkerId);
  const selectedMarkers = (activeMap?.markers ?? []).filter((marker) => selectedMarkerIds.includes(marker.id));
  const missionSheets = activeMap?.missionSheets?.length ? activeMap.missionSheets : createDefaultMapLibraries(game).missionSheets;
  const locations = activeMap?.locations?.length ? activeMap.locations : createDefaultMapLibraries(game).locations;
  const weatherEffects = activeMap?.weatherEffects?.length ? activeMap.weatherEffects : createDefaultMapLibraries(game).weatherEffects;
  const biomes = activeMap?.biomes?.length ? activeMap.biomes : createDefaultMapLibraries(game).biomes;
  const arsenal = activeMap?.arsenal?.length ? activeMap.arsenal : createDefaultMapLibraries(game).arsenal;
  const tomeLibrary = buildFallout4TomeMapLibrary(game);
  const nodeTypes = tomeLibrary?.nodeTypes ?? [];
  const activeLocationMap = tomeLibrary?.locationMaps.find((map) => map.id === activeMap.id || map.locationId === activeMap.nodes?.[0]?.locationId);

  useEffect(() => {
    let cancelled = false;
    setBackendMaps([]);
    setActiveMapId("");
    setMapLoadStatus(platformRepository ? "Cargando mapas desde backend local..." : "Mapas locales");

    if (!platformRepository) {
      const next = ensureMaps(game, 25);
      setActiveMapId(next[0]?.id ?? "");
      setMapLoadStatus("Mapas cargados desde runtime local");
      return;
    }

    Promise.all([
      platformRepository.maps.list(game.id).catch(() => []),
      platformRepository.playable.list<Record<string, unknown>>(game.id, "locationMaps", { limit: 25 }).catch(() => ({ items: [] })),
    ])
      .then(([savedMaps, playableMaps]) => {
        if (cancelled) return;
        const loaded = [
          ...savedMaps.map(fromPlatformMapDocument),
          ...(playableMaps.items ?? []).map(mapFromPlayableLocation),
        ];
        const unique = loaded.filter((map, index, array) => array.findIndex((item) => item.id === map.id) === index);
        const nextMaps = unique.length ? unique : fallbackMaps;
        setBackendMaps(nextMaps);
        setActiveMapId(nextMaps[0]?.id ?? "");
        setMapLoadStatus(`${nextMaps.length} mapas listados bajo demanda`);
      })
      .catch(() => {
        if (cancelled) return;
        setBackendMaps(fallbackMaps);
        setActiveMapId(fallbackMaps[0]?.id ?? "");
        setMapLoadStatus("Backend no disponible, usando indice local paginado");
      });

    return () => {
      cancelled = true;
    };
  }, [game.id, platformRepository]);

  useEffect(() => {
    if (!platformRepository || !activeMapId) return;
    let cancelled = false;
    platformRepository.playable
      .detail<Record<string, unknown>>(game.id, "locationMaps", activeMapId)
      .then((detail) => {
        if (cancelled) return;
        const detailedMap = mapFromPlayableLocation(detail, 0);
        setBackendMaps((current) => current.map((map) => (map.id === activeMapId ? { ...map, ...detailedMap, id: map.id } : map)));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeMapId, game.id, platformRepository]);

  function emit(nextMaps: GameMap[]) {
    const normalized = nextMaps.map(normalizeTacticalMap);
    setHistory((items) => [...items.slice(-24), maps.map(normalizeTacticalMap)]);
    setFuture([]);
    if (backendMaps.length) setBackendMaps(normalized);
    onChange(normalized);
  }

  function updateMap(mapId: string, patch: Partial<GameMap>) {
    emit(maps.map((map) => (map.id === mapId ? { ...map, ...patch } : map)));
  }

  async function persistActiveMap() {
    if (!activeMap) return;
    const normalized = normalizeTacticalMap(activeMap);
    setSaveStatus("Guardando...");
    try {
      if (platformRepository) {
        await platformRepository.maps.save({
          id: normalized.id,
          gameId: game.id,
          name: normalized.name,
          width: normalized.width,
          height: normalized.height,
          tileSize: normalized.tileSize ?? 48,
          image: normalized.background,
          updatedAt: new Date().toISOString(),
          layers: [
            {
              id: "terrain",
              name: "Terreno",
              visible: true,
              opacity: normalized.terrainOpacity ?? 1,
              tiles: Array.from({ length: normalized.height }, (_, y) =>
                Array.from({ length: normalized.width }, (_, x) => normalized.tiles?.find((tile) => tile.x === x && tile.y === y)?.terrain ?? "plain")
              ),
            },
            {
              id: "markers",
              name: "Marcadores",
              visible: true,
              opacity: normalized.markerScale ?? 1,
              markers: normalized.markers ?? [],
            },
          ],
        });
        await platformRepository.playable.save(game.id, "locationMaps", normalized.id, {
          name: normalized.name,
          width: normalized.width,
          height: normalized.height,
          tileSize: normalized.tileSize ?? 48,
          background: normalized.background,
          backgroundMode: normalized.backgroundMode,
          backgroundSourceName: normalized.backgroundSourceName,
          gridOpacity: normalized.gridOpacity,
          terrainOpacity: normalized.terrainOpacity,
          markerScale: normalized.markerScale,
          nodes: normalized.nodes,
          markers: normalized.markers,
        });
      }
      onPersistMap?.(normalized);
      setSaveStatus("Guardado en backend local");
    } catch {
      setSaveStatus("Error guardando mapa");
    }
  }

  function restoreMaps(nextMaps: GameMap[]) {
    const normalized = nextMaps.map(normalizeTacticalMap);
    setBackendMaps(normalized);
    onChange(normalized);
    if (!normalized.some((map) => map.id === activeMapId)) setActiveMapId(normalized[0]?.id ?? "");
  }

  function undoMapChange() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((items) => items.slice(0, -1));
    setFuture((items) => [maps.map(normalizeTacticalMap), ...items.slice(0, 24)]);
    restoreMaps(previous);
    setSaveStatus("Cambio deshecho");
  }

  function redoMapChange() {
    const next = future[0];
    if (!next) return;
    setFuture((items) => items.slice(1));
    setHistory((items) => [...items.slice(-24), maps.map(normalizeTacticalMap)]);
    restoreMaps(next);
    setSaveStatus("Cambio rehecho");
  }

  function downloadJson(fileName: string, payload: unknown) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportActiveMap() {
    if (!activeMap) return;
    try {
      const payload = platformRepository ? await platformRepository.maps.export(activeMap.id) : { exportedAt: new Date().toISOString(), map: activeMap };
      downloadJson(`${activeMap.id}.map-export.json`, payload);
      setSaveStatus("Mapa exportado");
    } catch {
      downloadJson(`${activeMap.id}.map-export.json`, { exportedAt: new Date().toISOString(), map: normalizeTacticalMap(activeMap) });
      setSaveStatus("Exportado desde estado local");
    }
  }

  async function importMapFile(file?: File) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text()) as Record<string, unknown>;
      const imported = platformRepository
        ? await platformRepository.maps.import(payload)
        : ((payload.map ?? payload) as PlatformMapDocument);
      const nextMap = Array.isArray(imported.layers)
        ? fromPlatformMapDocument(imported)
        : normalizeTacticalMap(imported as unknown as GameMap);
      emit([nextMap, ...maps.filter((map) => map.id !== nextMap.id)]);
      setActiveMapId(nextMap.id);
      setView("editor");
      setSaveStatus("Mapa importado");
    } catch {
      setSaveStatus("Error importando mapa");
    } finally {
      if (importMapInputRef.current) importMapInputRef.current.value = "";
    }
  }

  function duplicateSelectedMarkers() {
    if (!selectedMarkers.length) return;
    const stamp = Date.now();
    const copies = selectedMarkers.map((marker, index) => ({
      ...marker,
      id: `marker_copy_${stamp}_${index}`,
      x: Math.min(activeMap.width - 1, marker.x + 1),
      y: Math.min(activeMap.height - 1, marker.y + 1),
      label: `${marker.label} copia`,
    }));
    updateMap(activeMap.id, { markers: [...(activeMap.markers ?? []), ...copies] });
    setSelectedMarkerIds(copies.map((marker) => marker.id));
    setSelectedMarkerId(copies[0]?.id ?? "");
  }

  function deleteSelectedMarkers() {
    if (!selectedMarkerIds.length) return;
    const markers = (activeMap.markers ?? []).filter((marker) => !selectedMarkerIds.includes(marker.id));
    updateMap(activeMap.id, { markers });
    setSelectedMarkerIds(markers[0]?.id ? [markers[0].id] : []);
    setSelectedMarkerId(markers[0]?.id ?? "");
  }

  function addMap() {
    const next = createDefaultMap(game, maps.length);
    emit([next, ...maps]);
    setActiveMapId(next.id);
    setSelectedMarkerId(next.markers?.[0]?.id ?? "");
    setView("editor");
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
      const width = Math.min(maxImportedTiles, Math.max(4, Math.round(image.naturalWidth / tileSize)));
      const height = Math.min(maxImportedTiles, Math.max(4, Math.round(image.naturalHeight / tileSize)));
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
    image.onerror = () => window.alert("No se pudo cargar la imagen. Usa PNG/JPG/WebP valido o una ruta publica accesible.");
    image.src = source;
  }

  function optimizeImageFile(file: File) {
    return new Promise<{ source: string; name: string }>((resolve, reject) => {
      if (file.size > 12 * 1024 * 1024) {
        reject(new Error("La imagen es demasiado pesada. Usa una imagen menor a 12 MB."));
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const image = new window.Image();
      image.onload = () => {
        try {
          const scale = Math.min(1, maxImportedImageSide / Math.max(image.naturalWidth, image.naturalHeight));
          const width = Math.max(1, Math.round(image.naturalWidth * scale));
          const height = Math.max(1, Math.round(image.naturalHeight * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas no disponible.");
          context.drawImage(image, 0, 0, width, height);
          const source = canvas.toDataURL("image/webp", 0.78);
          URL.revokeObjectURL(objectUrl);
          resolve({ source, name: `${file.name} (${width}x${height})` });
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("No se pudo leer la imagen."));
      };
      image.src = objectUrl;
    });
  }

  async function loadImageFile(file?: File) {
    if (!file) return;
    try {
      const optimized = await optimizeImageFile(file);
      decomposeImage(optimized.source, optimized.name);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo cargar la imagen.");
    }
  }

  function paintCell(x: number, y: number, additiveSelection = false) {
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
      if (additiveSelection) {
        setSelectedMarkerIds((current) => current.includes(existing.id) ? current.filter((id) => id !== existing.id) : [...current, existing.id]);
        setSelectedMarkerId(existing.id);
        return;
      }
      const markers = (activeMap.markers ?? []).map((marker) =>
        marker.id === existing.id ? { ...marker, type: markerType, label: marker.label || markerPalette.find((item) => item.type === markerType)?.label || markerType } : marker
      );
      updateMap(activeMap.id, { markers });
      setSelectedMarkerId(existing.id);
      setSelectedMarkerIds([existing.id]);
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
    setSelectedMarkerIds([nextMarker.id]);
  }

  function updateSelectedMarker(patch: Partial<NonNullable<GameMap["markers"]>[number]>) {
    if (!selectedMarker) return;
    updateMap(activeMap.id, {
      markers: (activeMap.markers ?? []).map((marker) => (marker.id === selectedMarker.id ? { ...marker, ...patch } : marker)),
    });
  }

  function addLibraryItem(tab: LibraryTab) {
    const stamp = Date.now();
    if (tab === "mission") {
      updateMap(activeMap.id, {
        missionSheets: [
          { id: `mission_${stamp}`, title: "Nueva mision", objective: "Define objetivo, escenas, recompensa y consecuencias.", status: "draft" },
          ...missionSheets,
        ],
      });
    }
    if (tab === "location") {
      updateMap(activeMap.id, {
        locations: [{ id: `loc_${stamp}`, name: "Nueva ubicacion", biome: "Urbano", danger: 1, description: "Describe rutas, cobertura y encuentros." }, ...locations],
      });
    }
    if (tab === "weather") {
      updateMap(activeMap.id, {
        weatherEffects: [{ id: `weather_${stamp}`, name: "Nuevo clima", visibility: 80, movementModifier: 0, description: "Efecto ambiental tactico." }, ...weatherEffects],
      });
    }
    if (tab === "biome") {
      updateMap(activeMap.id, {
        biomes: [{ id: `biome_${stamp}`, name: "Nuevo bioma", movementModifier: 0, encounterRisk: 1, description: "Reglas de movimiento, riesgo y recursos." }, ...biomes],
      });
    }
    if (tab === "arsenal" || tab === "units" || tab === "bestiary") {
      const category = tab === "units" ? "unit" : tab === "bestiary" ? "bestiary" : "equipment";
      updateMap(activeMap.id, {
        arsenal: [{ id: `${category}_${stamp}`, name: "Nuevo recurso", category, tags: ["custom"], description: "Ficha vinculable a mapa, mision o unidad." }, ...arsenal],
      });
    }
  }

  function applyLibraryToMarker() {
    if (!selectedMarker) return;
    const firstMission = missionSheets[0];
    const firstLocation = locations[0];
    const firstBiome = biomes[0];
    const firstWeather = weatherEffects[0];
    const firstAsset = arsenal[0];
    updateSelectedMarker({
      missionId: firstMission?.id,
      biome: firstBiome?.name,
      weatherEffect: firstWeather?.name,
      linkedAssetId: firstAsset?.id,
      label: firstLocation?.name ?? selectedMarker.label,
    });
  }

  function removeSelectedMarker() {
    if (!selectedMarker) return;
    const markers = (activeMap.markers ?? []).filter((marker) => marker.id !== selectedMarker.id);
    updateMap(activeMap.id, { markers });
    setSelectedMarkerId(markers[0]?.id ?? "");
  }

  if (view === "list") {
    return (
      <article className="admin-card map-editor map-manager-screen">
        <div className="admin-panel-title">
          <div>
            <strong><MapIcon size={18} /> Mapas de {game.name}</strong>
            <p>{mapLoadStatus}. Lista mapas existentes, crea nuevos mapas y abre el editor tactico en una pantalla aparte.</p>
          </div>
          <div className="map-manager-actions">
            {onBack && <button onClick={onBack}><ArrowLeft size={15} /> Juegos</button>}
            <button className="green-button" onClick={addMap}><Plus size={15} /> Crear mapa</button>
          </div>
        </div>

        <section className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Mapa</th>
                <th>Tamano</th>
                <th>Imagen</th>
                <th>Marcadores</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {maps.map((map) => (
                <tr key={map.id} className={map.id === activeMap.id ? "selected" : ""}>
                  <td><strong>{map.name}</strong><small>{map.id}</small></td>
                  <td>{map.width} x {map.height}</td>
                  <td>{map.background ? map.backgroundSourceName || "Imagen cargada" : "Sin imagen"}</td>
                  <td>{map.markers?.length ?? 0}</td>
                  <td>
                    <button onClick={() => { setActiveMapId(map.id); setSelectedMarkerId(map.markers?.[0]?.id ?? ""); setSelectedMarkerIds(map.markers?.[0]?.id ? [map.markers[0].id] : []); setView("editor"); }}>
                      <Eye size={15} /> Abrir editor
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </article>
    );
  }

  return (
    <article className="admin-card map-editor tactical-map-editor cad-map-editor">
      <div className="wasteland-editor-header">
        <div className="wasteland-editor-brand">
          <strong>WASTELAND CREATOR</strong>
          <span>Editor de mapas tacticos para {game.name}</span>
        </div>
        <label className="wasteland-project-select">
          <span>Proyecto</span>
          <select value={activeMap.id} onChange={(event) => {
            const next = maps.find((map) => map.id === event.target.value);
            setActiveMapId(event.target.value);
            setSelectedMarkerId(next?.markers?.[0]?.id ?? "");
            setSelectedMarkerIds(next?.markers?.[0]?.id ? [next.markers[0].id] : []);
          }}>
            {maps.map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
          </select>
        </label>
        <div className="wasteland-save-state">
          <CloudSun size={15} />
          <span>{saveStatus}</span>
        </div>
        <div className="wasteland-editor-actions">
          <button onClick={persistActiveMap}><Save size={15} /> Guardar</button>
          <button onClick={exportActiveMap}><Download size={15} /> Exportar</button>
          <button><Play size={15} /> Probar</button>
          <button onClick={() => setView("list")}><ArrowLeft size={15} /> Lista</button>
          <button onClick={addMap}><Plus size={15} /> Mapa</button>
          <button onClick={() => importMapInputRef.current?.click()}><Upload size={15} /> Importar</button>
          <input ref={importMapInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => importMapFile(event.target.files?.[0])} />
          <button title="Ayuda"><HelpCircle size={16} /></button>
        </div>
      </div>

      <div className="world-editor-menubar">
        {editorMenus.map((menu) => <button key={menu}>{menu}</button>)}
      </div>

      <div className="world-editor-toolbar" aria-label="Herramientas rapidas del editor">
        <button title="Nuevo mapa" onClick={addMap}><FilePlus2 size={16} /></button>
        <button title="Abrir lista" onClick={() => setView("list")}><FolderOpen size={16} /></button>
        <button title="Guardar cambios" onClick={persistActiveMap}><Save size={16} /></button>
        <span />
        <button className={toolMode === "marker" ? "selected" : ""} title="Seleccionar"><MousePointer2 size={16} /></button>
        <button title="Mover"><Move size={16} /></button>
        <button title="Rotar"><RotateCw size={16} /></button>
        <button title="Escalar"><Maximize2 size={16} /></button>
        <button title="Rectangulo"><BoxSelect size={16} /></button>
        <button title="Lapiz"><Pencil size={16} /></button>
        <span />
        <button title="Deshacer" disabled={!history.length} onClick={undoMapChange}><Undo2 size={16} /></button>
        <button title="Rehacer" disabled={!future.length} onClick={redoMapChange}><Redo2 size={16} /></button>
        <button title="Duplicar seleccion" disabled={!selectedMarkerIds.length} onClick={duplicateSelectedMarkers}><Copy size={16} /></button>
        <span />
        <button className={toolMode === "terrain" ? "selected" : ""} title="Pintar terreno" onClick={() => setToolMode("terrain")}><MapIcon size={16} /></button>
        <button className={toolMode === "marker" ? "selected" : ""} title="Colocar marcador" onClick={() => setToolMode("marker")}><Flag size={16} /></button>
        <button className={toolMode === "erase" ? "selected" : ""} title="Borrar" onClick={() => setToolMode("erase")}><Eraser size={16} /></button>
        <span />
        <button className={showGrid ? "selected" : ""} title="Mostrar grilla" onClick={() => setShowGrid((value) => !value)}><Grid3X3 size={16} /></button>
        <button className={showTerrainLayer ? "selected" : ""} title="Mostrar capa de terreno" onClick={() => setShowTerrainLayer((value) => !value)}><Layers size={16} /></button>
        <button className={showMarkerLayer ? "selected" : ""} title="Mostrar marcadores" onClick={() => setShowMarkerLayer((value) => !value)}><Flag size={16} /></button>
        <button className={showImageLayer ? "selected" : ""} title="Mostrar imagen base" onClick={() => setShowImageLayer((value) => !value)}><ImageIcon size={16} /></button>
        <button className={showMissionLayer ? "selected" : ""} title="Mostrar misiones vinculadas" onClick={() => setShowMissionLayer((value) => !value)}><BookOpen size={16} /></button>
        <button title="Regla"><Ruler size={16} /></button>
        <button title="Centrar vista"><LocateFixed size={16} /></button>
      </div>

      {tomeLibrary && (
        <div className="tome-coverage-strip">
          <span><BookOpen size={15} /> {tomeLibrary.counts.missions ?? missionSheets.length} misiones</span>
          <span><MapPinned size={15} /> {tomeLibrary.counts.locations ?? locations.length} ubicaciones/mapas</span>
          <span><Crosshair size={15} /> {tomeLibrary.counts.bestiary ?? 0} bestiario</span>
          <span><Swords size={15} /> {tomeLibrary.counts.weapons ?? 0} armas</span>
          <span><Package size={15} /> {tomeLibrary.counts.equipment ?? 0} equipo/objetos</span>
          <span><Shield size={15} /> {tomeLibrary.counts.settlements ?? 0} asentamientos</span>
          <span><Users size={15} /> {tomeLibrary.counts.factions ?? 0} facciones</span>
          <span><Boxes size={15} /> {tomeLibrary.counts.collectibles ?? 0} coleccionables</span>
          <span><Route size={15} /> {tomeLibrary.counts.locationEvents ?? 0} eventos</span>
          <span><Layers size={15} /> {tomeLibrary.counts.nodeTypes ?? nodeTypes.length} nodos</span>
        </div>
      )}

      <div className="cad-ribbon">
        <section>
          <small>Herramientas</small>
          <button className={toolMode === "terrain" ? "selected" : ""} onClick={() => setToolMode("terrain")}><MapIcon size={15} /> Terreno</button>
          <button className={toolMode === "marker" ? "selected" : ""} onClick={() => setToolMode("marker")}><Flag size={15} /> Marcador</button>
          <button className={toolMode === "erase" ? "selected" : ""} onClick={() => setToolMode("erase")}><Eraser size={15} /> Borrar</button>
        </section>
        <section>
          <small>Capas</small>
          <button className={showGrid ? "selected" : ""} onClick={() => setShowGrid((value) => !value)}><Grid3X3 size={15} /> Grilla</button>
          <button className={showTerrainLayer ? "selected" : ""} onClick={() => setShowTerrainLayer((value) => !value)}><SlidersHorizontal size={15} /> Terreno</button>
          <button className={showMarkerLayer ? "selected" : ""} onClick={() => setShowMarkerLayer((value) => !value)}><Flag size={15} /> Marcadores</button>
          <button className={showImageLayer ? "selected" : ""} onClick={() => setShowImageLayer((value) => !value)}><ImageIcon size={15} /> Imagen</button>
          <button className={showMissionLayer ? "selected" : ""} onClick={() => setShowMissionLayer((value) => !value)}><BookOpen size={15} /> Misiones</button>
        </section>
        <section>
          <small>Vista</small>
          <label><span>Zoom</span><input type="range" min={0.65} max={1.45} step={0.05} value={canvasZoom} onChange={(event) => setCanvasZoom(Number(event.target.value))} /></label>
          <label><span>Pan X</span><input type="range" min={-260} max={260} step={10} value={pan.x} onChange={(event) => setPan((current) => ({ ...current, x: Number(event.target.value) }))} /></label>
          <label><span>Pan Y</span><input type="range" min={-180} max={180} step={10} value={pan.y} onChange={(event) => setPan((current) => ({ ...current, y: Number(event.target.value) }))} /></label>
        </section>
        <section>
          <small>Bibliotecas</small>
          <button className={libraryTab === "mission" ? "selected" : ""} onClick={() => setLibraryTab("mission")}><BookOpen size={15} /> Misiones</button>
          <button className={libraryTab === "location" ? "selected" : ""} onClick={() => setLibraryTab("location")}><MapPinned size={15} /> Ubicaciones</button>
          <button className={libraryTab === "biome" ? "selected" : ""} onClick={() => setLibraryTab("biome")}><Layers size={15} /> Biomas</button>
          <button className={libraryTab === "nodes" ? "selected" : ""} onClick={() => setLibraryTab("nodes")}><Route size={15} /> Nodos</button>
          <button className={libraryTab === "arsenal" ? "selected" : ""} onClick={() => setLibraryTab("arsenal")}><Package size={15} /> Assets</button>
        </section>
      </div>

      <div className="map-editor-layout tactical-layout">
        <aside className="map-list world-editor-left-panel">
          <nav className="wasteland-side-tabs">
            {(["mission", "location", "nodes", "arsenal"] as LibraryTab[]).map((tab) => (
              <button key={tab} className={libraryTab === tab ? "selected" : ""} onClick={() => setLibraryTab(tab)}>
                {tab === "mission" ? "Misiones" : tab === "location" ? "Ubicaciones" : tab === "nodes" ? "Nodos" : "Assets"}
              </button>
            ))}
          </nav>
          <section className="world-minimap-panel">
            <strong><MapIcon size={15} /> Minimap</strong>
            <div className="world-minimap" style={{ aspectRatio: `${activeMap.width} / ${activeMap.height}` } as CSSProperties}>
              {(activeMap.markers ?? []).map((marker) => (
                <i
                  key={marker.id}
                  className={`marker-${marker.type}`}
                  style={{ left: `${(marker.x / Math.max(1, activeMap.width - 1)) * 100}%`, top: `${(marker.y / Math.max(1, activeMap.height - 1)) * 100}%` }}
                />
              ))}
            </div>
            <label><input type="checkbox" checked={showGrid} onChange={() => setShowGrid((value) => !value)} /> Mostrar grilla</label>
            <label><input type="checkbox" checked={showTerrainLayer} onChange={() => setShowTerrainLayer((value) => !value)} /> Mostrar terreno</label>
            <label><input type="checkbox" checked={showMarkerLayer} onChange={() => setShowMarkerLayer((value) => !value)} /> Mostrar marcadores</label>
            <label><input type="checkbox" checked={showMissionLayer} onChange={() => setShowMissionLayer((value) => !value)} /> Mostrar misiones</label>
          </section>

          <section className="world-camera-panel">
            <label><span>Distancia</span><input type="number" value={Math.round(canvasZoom * 400)} onChange={(event) => setCanvasZoom(Math.max(0.65, Math.min(1.45, Number(event.target.value) / 400 || canvasZoom)))} /></label>
            <label><span>Rotacion</span><input type="number" value={0} readOnly /></label>
            <label><span>Luz</span><select defaultValue="noon"><option value="noon">Mediodia</option><option value="dusk">Atardecer</option><option value="night">Noche</option></select></label>
          </section>

          <section className="world-resource-tree">
            {resourceTree.map((group) => (
              <details key={group.title} open>
                <summary>{group.title}</summary>
                {group.items.map((item) => <button key={item}>{item}</button>)}
              </details>
            ))}
            {tomeLibrary && (
              <div className="world-tome-source">
                <strong>Fuente tomos Fallout 4</strong>
                <small>TOMO 01-10 integrados como fichas jugables: misiones, ubicaciones, bestiario, armas, equipo, asentamientos, facciones, clima y coleccionables.</small>
              </div>
            )}
            {tomeLibrary?.tomeMatrix.map((tome) => (
              <details key={tome.id}>
                <summary>{tome.id}</summary>
                {(tome.editorSurfaces ?? []).map((surface) => <button key={surface}>{surface}</button>)}
              </details>
            ))}
          </section>

          <section className="world-map-list-panel">
            <strong><Route size={15} /> Mapas</strong>
          {maps.map((map) => (
            <button
              key={map.id}
              className={map.id === activeMap.id ? "selected" : ""}
              onClick={() => {
                setActiveMapId(map.id);
                setSelectedMarkerId(map.markers?.[0]?.id ?? "");
                setSelectedMarkerIds(map.markers?.[0]?.id ? [map.markers[0].id] : []);
              }}
            >
              <Route size={16} />
              <span><strong>{map.name}</strong><small>{map.width}x{map.height} tiles</small></span>
            </button>
          ))}
          </section>

          <section className="map-library-panel wasteland-left-library">
            <header>
              <div>
                <strong><BookOpen size={17} /> Biblioteca tactica</strong>
                <small>Fichas de tomos vinculables a mapa, nodo o mision.</small>
              </div>
              <button onClick={() => addLibraryItem(libraryTab)}><Plus size={15} /></button>
            </header>
            <nav>
              <button className={libraryTab === "mission" ? "selected" : ""} onClick={() => setLibraryTab("mission")}><BookOpen size={15} /> Misiones</button>
              <button className={libraryTab === "location" ? "selected" : ""} onClick={() => setLibraryTab("location")}><MapPinned size={15} /> Ubicaciones</button>
              <button className={libraryTab === "weather" ? "selected" : ""} onClick={() => setLibraryTab("weather")}><CloudSun size={15} /> Clima</button>
              <button className={libraryTab === "biome" ? "selected" : ""} onClick={() => setLibraryTab("biome")}><Layers size={15} /> Biomas</button>
              <button className={libraryTab === "nodes" ? "selected" : ""} onClick={() => setLibraryTab("nodes")}><Route size={15} /> Nodos</button>
              <button className={libraryTab === "arsenal" ? "selected" : ""} onClick={() => setLibraryTab("arsenal")}><Package size={15} /> Equipo</button>
              <button className={libraryTab === "units" ? "selected" : ""} onClick={() => setLibraryTab("units")}><Users size={15} /> Unidades</button>
              <button className={libraryTab === "bestiary" ? "selected" : ""} onClick={() => setLibraryTab("bestiary")}><Crosshair size={15} /> Bestiario</button>
            </nav>
            <div className="map-library-grid">
              {libraryTab === "mission" && missionSheets.map((mission) => (
                <button key={mission.id} onClick={() => selectedMarker && updateSelectedMarker({ missionId: mission.id, label: mission.title })}>
                  <BookOpen size={16} />
                  <span><strong>{mission.title}</strong><small>{mission.objective}</small></span>
                  <em>{mission.status ?? "draft"}</em>
                </button>
              ))}
              {libraryTab === "location" && locations.map((location) => (
                <button key={location.id} onClick={() => selectedMarker && updateSelectedMarker({ label: location.name, biome: location.biome })}>
                  <MapPinned size={16} />
                  <span><strong>{location.name}</strong><small>{location.description}</small></span>
                  <em>Riesgo {location.danger ?? 1}</em>
                </button>
              ))}
              {libraryTab === "weather" && weatherEffects.map((weather) => (
                <button key={weather.id} onClick={() => selectedMarker && updateSelectedMarker({ type: "weather", weatherEffect: weather.name, label: weather.name, movementCost: weather.movementModifier ?? 0 })}>
                  <CloudSun size={16} />
                  <span><strong>{weather.name}</strong><small>{weather.description}</small></span>
                  <em>Vis {weather.visibility ?? 100}%</em>
                </button>
              ))}
              {libraryTab === "biome" && biomes.map((biome) => (
                <button key={biome.id} onClick={() => selectedMarker && updateSelectedMarker({ type: "biome", biome: biome.name, label: biome.name, movementCost: biome.movementModifier ?? 0 })}>
                  <Layers size={16} />
                  <span><strong>{biome.name}</strong><small>{biome.description}</small></span>
                  <em>Riesgo {biome.encounterRisk ?? 1}</em>
                </button>
              ))}
              {libraryTab === "nodes" && nodeTypes.map((node) => (
                <button key={node.id} onClick={() => selectedMarker && updateSelectedMarker({ type: node.marker === "enemy" ? "enemy" : node.marker === "loot" ? "loot" : node.marker === "cover" ? "cover" : node.marker === "weather" ? "weather" : "objective", label: node.label, movementCost: node.apCost ?? 1 })}>
                  <Route size={16} />
                  <span><strong>{node.label}</strong><small>{node.use} {node.sourceTomes?.join(" + ")}</small></span>
                  <em>{node.apCost ? `${node.apCost} AP` : node.defense ? `DEF ${node.defense}` : "regla"}</em>
                </button>
              ))}
              {(libraryTab === "arsenal" || libraryTab === "units" || libraryTab === "bestiary") && arsenal
                .filter((item) => libraryTab === "arsenal" ? item.category === "weapon" || item.category === "equipment" : libraryTab === "units" ? item.category === "unit" : item.category === "bestiary")
                .map((item) => (
                  <button key={item.id} onClick={() => selectedMarker && updateSelectedMarker({ linkedAssetId: item.id, label: item.name, type: item.category === "unit" ? "unit" : item.category === "bestiary" ? "beast" : "loot" })}>
                    {item.category === "weapon" ? <Swords size={16} /> : item.category === "equipment" ? <Boxes size={16} /> : item.category === "unit" ? <Users size={16} /> : <Crosshair size={16} />}
                    <span><strong>{item.name}</strong><small>{item.description}</small></span>
                    <em>{item.category}</em>
                  </button>
                ))}
            </div>
          </section>

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

          <section className="map-personalization">
            <strong><SlidersHorizontal size={16} /> Personalizacion visual</strong>
            <label><span>Opacidad grilla</span><input type="range" min={0} max={1} step={0.05} value={activeMap.gridOpacity ?? 0.55} onChange={(event) => updateMap(activeMap.id, { gridOpacity: Number(event.target.value) })} /></label>
            <label><span>Opacidad terreno</span><input type="range" min={0} max={1} step={0.05} value={activeMap.terrainOpacity ?? 0.38} onChange={(event) => updateMap(activeMap.id, { terrainOpacity: Number(event.target.value) })} /></label>
            <label><span>Tamano marcadores</span><input type="range" min={0.65} max={1.55} step={0.05} value={activeMap.markerScale ?? 1} onChange={(event) => updateMap(activeMap.id, { markerScale: Number(event.target.value) })} /></label>
          </section>

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

          <section className="map-library-panel wasteland-context-strip">
            <header>
              <div>
                <strong><BookOpen size={17} /> Contexto del mapa</strong>
                <small>Resumen operativo de ubicacion, eventos, amenazas y objetos.</small>
              </div>
            </header>
            {activeLocationMap && (
              <div className="map-tome-context">
                <span><MapPinned size={15} /> {activeLocationMap.subzoneCount ?? activeLocationMap.subzones?.length ?? 0} subzonas</span>
                <span><Route size={15} /> {activeLocationMap.eventCount ?? activeLocationMap.events?.length ?? 0} eventos</span>
                <span><Crosshair size={15} /> {activeLocationMap.enemyCount ?? activeLocationMap.enemies?.length ?? 0} amenazas</span>
                <span><Boxes size={15} /> {activeLocationMap.collectibleCount ?? activeLocationMap.collectibles?.length ?? 0} objetos/pistas</span>
                <span><BookOpen size={15} /> {activeLocationMap.missionCount ?? activeLocationMap.missions?.length ?? 0} misiones vinculadas</span>
              </div>
            )}
          </section>

          <div className="tactical-toolbar">
            <button className={toolMode === "terrain" ? "selected" : ""} onClick={() => setToolMode("terrain")}><MapIcon size={15} /> Terreno</button>
            <button className={toolMode === "marker" ? "selected" : ""} onClick={() => setToolMode("marker")}><Flag size={15} /> Marcador</button>
            <button className={toolMode === "erase" ? "selected" : ""} onClick={() => setToolMode("erase")}><Eraser size={15} /> Borrar</button>
          </div>

          <div className="cad-canvas-frame">
            <div
              className={`tactical-grid ${activeMap.backgroundMode === "image" && activeMap.background ? "map-image-mode" : ""} ${!showGrid ? "grid-hidden" : ""} ${!showTerrainLayer ? "terrain-hidden" : ""} ${!showImageLayer ? "image-hidden" : ""} ${!showMarkerLayer ? "markers-hidden" : ""} ${!showMissionLayer ? "missions-hidden" : ""}`}
              style={{
                gridTemplateColumns: `repeat(${activeMap.width}, minmax(0, 1fr))`,
                aspectRatio: `${activeMap.width} / ${activeMap.height}`,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${canvasZoom})`,
                transformOrigin: "top left",
                "--map-image": activeMap.backgroundMode === "image" && activeMap.background ? `url("${activeMap.background}")` : "none",
                "--grid-opacity": String(activeMap.gridOpacity ?? 0.55),
                "--terrain-opacity": String(activeMap.terrainOpacity ?? 0.38),
                "--marker-scale": String(activeMap.markerScale ?? 1),
              } as CSSProperties}
            >
              {(activeMap.tiles ?? []).map((tile) => {
                const marker = (activeMap.markers ?? []).find((item) => item.x === tile.x && item.y === tile.y);
                return (
                  <button
                    key={`${tile.x}-${tile.y}`}
                    className={`tactical-tile ${activeMap.backgroundMode === "image" && activeMap.background ? "image-backed" : `terrain-${tile.terrain}`} terrain-overlay-${tile.terrain} ${marker ? `has-marker marker-${marker.type}` : ""} ${marker && selectedMarkerIds.includes(marker.id) ? "multi-selected" : ""} ${marker?.missionId ? "mission-linked" : ""}`}
                    onClick={(event) => paintCell(tile.x, tile.y, event.shiftKey)}
                    title={`${tile.x}, ${tile.y} - ${tile.terrain}`}
                  >
                    {marker && <span>{markerGlyph(marker.type)}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cad-status-bar">
            <span>Modo: {toolMode}</span>
            <span>Mapa: {activeMap.width} x {activeMap.height}</span>
            <span>Zoom: {Math.round(canvasZoom * 100)}%</span>
            <span>Marcadores: {activeMap.markers?.length ?? 0}</span>
            <span>Seleccion: {selectedMarkerIds.length}</span>
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
              <label>
                <span>Cobertura</span>
                <select value={selectedMarker.coverage ?? "none"} onChange={(event) => updateSelectedMarker({ coverage: event.target.value as NonNullable<typeof selectedMarker.coverage> })}>
                  <option value="none">Sin cobertura</option>
                  <option value="light">Ligera</option>
                  <option value="heavy">Pesada</option>
                  <option value="total">Total</option>
                </select>
              </label>
              <label><span>Coste movimiento</span><input type="number" min={0} max={8} value={selectedMarker.movementCost ?? 1} onChange={(event) => updateSelectedMarker({ movementCost: Number(event.target.value) || 0 })} /></label>
              <label>
                <span>Mision vinculada</span>
                <select value={selectedMarker.missionId ?? ""} onChange={(event) => updateSelectedMarker({ missionId: event.target.value })}>
                  <option value="">Sin mision</option>
                  {missionSheets.map((mission) => <option key={mission.id} value={mission.id}>{mission.title}</option>)}
                </select>
              </label>
              <label>
                <span>Bioma</span>
                <select value={selectedMarker.biome ?? ""} onChange={(event) => updateSelectedMarker({ biome: event.target.value })}>
                  <option value="">Sin bioma</option>
                  {biomes.map((biome) => <option key={biome.id} value={biome.name}>{biome.name}</option>)}
                </select>
              </label>
              <label>
                <span>Clima</span>
                <select value={selectedMarker.weatherEffect ?? ""} onChange={(event) => updateSelectedMarker({ weatherEffect: event.target.value })}>
                  <option value="">Sin clima</option>
                  {weatherEffects.map((weather) => <option key={weather.id} value={weather.name}>{weather.name}</option>)}
                </select>
              </label>
              <label>
                <span>Ficha asset</span>
                <select value={selectedMarker.linkedAssetId ?? ""} onChange={(event) => updateSelectedMarker({ linkedAssetId: event.target.value })}>
                  <option value="">Sin ficha</option>
                  {arsenal.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <div className="node-coordinate-grid">
                <label><span>X</span><input type="number" min={0} max={activeMap.width - 1} value={selectedMarker.x} onChange={(event) => updateSelectedMarker({ x: Number(event.target.value) || 0 })} /></label>
                <label><span>Y</span><input type="number" min={0} max={activeMap.height - 1} value={selectedMarker.y} onChange={(event) => updateSelectedMarker({ y: Number(event.target.value) || 0 })} /></label>
              </div>
              <button onClick={applyLibraryToMarker}><Shield size={15} /> Aplicar fichas base</button>
              <button disabled={selectedMarkerIds.length < 2} onClick={duplicateSelectedMarkers}><Copy size={15} /> Duplicar seleccion</button>
              <button className="danger-button" disabled={!selectedMarkerIds.length} onClick={deleteSelectedMarkers}><Trash2 size={15} /> Eliminar seleccion</button>
              <button className="danger-button" onClick={removeSelectedMarker}><Trash2 size={15} /> Eliminar marcador</button>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
