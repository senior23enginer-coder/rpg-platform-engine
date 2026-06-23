import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Download, Edit3, FileJson, FolderOpen, RefreshCw, XCircle } from "lucide-react";
import { pickGamesFolder, loadLibraryFromFolder } from "../lib/tauriFs";
import type { GameConfig, GameJsonFile } from "../types/game";

type Props = {
  games: GameConfig[];
  activeGameId: string;
  files: GameJsonFile[];
  onLoadGames: (games: GameConfig[]) => void;
  onSelectGame: (gameId: string) => void;
  onEditConfig: (gameId: string) => void;
  onUpdateFile: (path: string, raw: string) => void;
  canEdit?: boolean;
};

function formatBytes(raw: string) {
  const bytes = new Blob([raw]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FilesScreen({
  games,
  activeGameId,
  files,
  onLoadGames,
  onSelectGame,
  onEditConfig,
  onUpdateFile,
  canEdit = false,
}: Props) {
  const activeGame = games.find((game) => game.id === activeGameId) ?? games[0];
  const [selectedPath, setSelectedPath] = useState(activeGame?.configPath ?? files[0]?.path ?? "");
  const selectedFile = files.find((file) => file.path === selectedPath) ?? files.find((file) => file.path === activeGame?.configPath) ?? files[0];
  const [draftByPath, setDraftByPath] = useState<Record<string, string>>({});
  const draft = selectedFile ? draftByPath[selectedFile.path] ?? selectedFile.raw : "";

  const filesByGame = useMemo(() => {
    const map = new Map<string, GameJsonFile[]>();
    for (const file of files) {
      const list = map.get(file.gameId) ?? [];
      list.push(file);
      map.set(file.gameId, list);
    }
    return map;
  }, [files]);

  const parsedStatus = useMemo(() => {
    if (!selectedFile) return { ok: false, message: "Selecciona un archivo JSON." };
    try {
      JSON.parse(draft);
      return { ok: true, message: "JSON valido." };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "JSON invalido." };
    }
  }, [draft, selectedFile]);

  const parsedSummary = useMemo(() => {
    if (!selectedFile || !parsedStatus.ok) return [];
    try {
      const parsed = JSON.parse(draft) as Record<string, unknown>;
      return Object.entries(parsed).slice(0, 14).map(([key, value]) => {
        const label = Array.isArray(value)
          ? `${value.length} elementos`
          : value && typeof value === "object"
            ? `${Object.keys(value as Record<string, unknown>).length} claves`
            : String(value ?? "vacio").slice(0, 80);
        return { key, label };
      });
    } catch {
      return [];
    }
  }, [draft, parsedStatus.ok, selectedFile]);

  const imagePathCandidates = useMemo(() => {
    if (!selectedFile || !parsedStatus.ok) return [];
    try {
      const parsed = JSON.parse(draft) as unknown;
      const paths: string[] = [];
      const scan = (value: unknown) => {
        if (typeof value === "string" && /\.(png|jpe?g|webp|gif|svg)$/i.test(value)) paths.push(value);
        if (Array.isArray(value)) value.forEach(scan);
        if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(scan);
      };
      scan(parsed);
      return [...new Set(paths)].slice(0, 12);
    } catch {
      return [];
    }
  }, [draft, parsedStatus.ok, selectedFile]);

  async function selectFolder() {
    if (!canEdit) return;
    const folder = await pickGamesFolder();
    if (!folder) return;
    const loaded = await loadLibraryFromFolder(folder);
    onLoadGames(loaded);
  }

  function updateDraft(value: string) {
    if (!selectedFile) return;
    setDraftByPath((current) => ({ ...current, [selectedFile.path]: value }));
  }

  function applyDraft() {
    if (!selectedFile || !parsedStatus.ok || !canEdit) return;
    onUpdateFile(selectedFile.path, draft);
  }

  function downloadJson() {
    if (!selectedFile) return;
    const blob = new Blob([draft], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = selectedFile.fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="screen-panel files-screen">
      <div className="screen-heading">
        <h2>Archivos y estructura</h2>
        <p>La biblioteca se arma solo desde carpetas en public/games que tienen game.config.json.</p>
      </div>

      <div className="file-overview-grid">
        <article className="file-card file-structure-card">
          <h3>Estructura base por juego</h3>
          <pre>{`public/games/<gameId>/
  game.config.json
  templates/templates.json
  rules/rules.json
  missions/missions.json
  bestiary/bestiary.json
  features/features.json
  characters/characters.json
  audio/audio.manifest.json
  assets/...`}</pre>
          <div className="file-actions">
            <button className="green-button" disabled={!canEdit} onClick={selectFolder}><FolderOpen size={16} /> Validar carpeta games/</button>
            {activeGame && <button disabled={!canEdit} onClick={() => onEditConfig(activeGame.id)}><Edit3 size={16} /> Editar config activo</button>}
          </div>
          {!canEdit && <p className="role-lock-note">Modo lectura: inicia sesion como administrador para editar archivos.</p>}
        </article>

        <article className="file-card library-source-card">
          <h3>Biblioteca detectada</h3>
          <div className="file-stats-row">
            <span><strong>{games.length}</strong> juegos cargados</span>
            <span><strong>{files.length}</strong> JSON editables</span>
            <span><strong>public/games</strong> ruta fuente</span>
          </div>
          <p>Las carpetas sin manifiesto minimo no se cargan como juego. Sus archivos tampoco aparecen en la biblioteca principal.</p>
        </article>
      </div>

      <div className="files-workbench">
        <aside className="game-folder-list">
          {games.map((game) => {
            const gameFiles = filesByGame.get(game.id) ?? [];
            const hasConfig = gameFiles.some((file) => file.isConfig);
            return (
              <article className={`game-folder-card ${game.id === activeGameId ? "selected" : ""}`} key={game.id}>
                <button className="folder-title" onClick={() => onSelectGame(game.id)}>
                  <FolderOpen size={18} />
                  <span>{game.name}</span>
                </button>
                <small>{game.basePath ?? `/games/${game.id}`}</small>
                <div className="folder-status-row">
                  <span className={hasConfig ? "status-ok" : "status-error"}>
                    {hasConfig ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    game.config.json
                  </span>
                  <span>{gameFiles.length} JSON</span>
                </div>
                <div className="folder-file-list">
                  {gameFiles.map((file) => (
                    <button
                      className={file.path === selectedFile?.path ? "selected" : ""}
                      key={file.path}
                      onClick={() => {
                        onSelectGame(game.id);
                        setSelectedPath(file.path);
                      }}
                    >
                      <FileJson size={14} />
                      <span>{file.relativePath}</span>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </aside>

        <article className="json-file-editor">
          {selectedFile ? (
            <>
              <div className="json-file-header">
                <div>
                  <h3>{selectedFile.relativePath}</h3>
                  <p>{selectedFile.path} · {formatBytes(draft)}</p>
                </div>
                <div className="inline-actions">
                  {selectedFile.isConfig && <button disabled={!canEdit} onClick={() => onEditConfig(selectedFile.gameId)}><Edit3 size={16} /> Formulario</button>}
                  <button onClick={() => setDraftByPath((current) => ({ ...current, [selectedFile.path]: selectedFile.raw }))}>
                    <RefreshCw size={16} /> Restaurar
                  </button>
                  <button onClick={() => navigator.clipboard?.writeText(draft)}><Copy size={16} /> Copiar</button>
                  <button onClick={downloadJson}><Download size={16} /> Descargar</button>
                </div>
              </div>

              <div className={`json-validation ${parsedStatus.ok ? "valid" : "invalid"}`}>
                {parsedStatus.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span>{parsedStatus.message}</span>
              </div>

              {parsedSummary.length > 0 && (
                <div className="json-file-summary">
                  {parsedSummary.map((item) => (
                    <span key={item.key}>
                      <small>{item.key}</small>
                      <strong>{item.label}</strong>
                    </span>
                  ))}
                </div>
              )}

              {imagePathCandidates.length > 0 && (
                <div className="json-image-preview-strip">
                  {imagePathCandidates.map((path) => (
                    <figure key={path}>
                      <img src={path.startsWith("/") ? path : `/${path.replace(/^public\//, "")}`} alt={path} />
                      <figcaption>{path}</figcaption>
                    </figure>
                  ))}
                </div>
              )}

              <textarea className="raw-json-editor file-json-textarea" value={draft} readOnly={!canEdit} onChange={(event) => updateDraft(event.target.value)} />

              <div className="inline-actions editor-footer-actions">
                <button className="green-button" disabled={!parsedStatus.ok || !canEdit} onClick={applyDraft}>
                  Aplicar al estado de la plataforma
                </button>
                <span>{canEdit ? "Para persistir en disco desde navegador, usa Descargar; en Tauri se puede conectar escritura directa." : "Lectura protegida: el rol usuario no modifica configuracion."}</span>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <FileJson size={42} />
              <p>No hay archivos JSON detectados en public/games.</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
