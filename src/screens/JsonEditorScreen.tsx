import { useMemo, useState } from "react";
import { Copy, Download, Plus, Save, Trash2 } from "lucide-react";
import type { Campaign, ContentItem, GameConfig } from "../types/game";

type Props = {
  game: GameConfig;
  onChange: (game: GameConfig) => void;
  onBack: () => void;
};

type Category = "dlc" | "features" | "extras";
type Tab = "general" | "campaigns" | "content" | "raw";

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function emptyItem(category: Category): ContentItem {
  return {
    id: `${category}_${Date.now()}`,
    name: "Nuevo contenido",
    description: "Descripcion pendiente",
    enabled: false,
  };
}

function emptyCampaign(): Campaign {
  return {
    id: `campaign_${Date.now()}`,
    title: "Nueva campana",
    implemented: false,
    description: "Descripcion pendiente",
  };
}

export function JsonEditorScreen({ game, onChange, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("general");
  const [rawJson, setRawJson] = useState(() => JSON.stringify(game, null, 2));
  const [message, setMessage] = useState("");

  const jsonPreview = useMemo(() => JSON.stringify(game, null, 2), [game]);
  const errors = useMemo(() => {
    const result: string[] = [];
    if (!game.id.trim()) result.push("El ID es obligatorio.");
    if (!game.name.trim()) result.push("El nombre es obligatorio.");
    if (!game.short.trim()) result.push("El short es obligatorio.");
    if (!game.description.trim()) result.push("La descripcion es obligatoria.");
    if (!game.campaigns.length) result.push("Debe existir al menos una campana.");
    return result;
  }, [game]);

  function patchGame(patch: Partial<GameConfig>) {
    const next = { ...game, ...patch };
    onChange(next);
    setRawJson(JSON.stringify(next, null, 2));
  }

  function patchCampaign(index: number, patch: Partial<Campaign>) {
    const campaigns = [...game.campaigns];
    campaigns[index] = { ...campaigns[index], ...patch };
    patchGame({ campaigns });
  }

  function patchItem(category: Category, itemId: string, patch: Partial<ContentItem>) {
    patchGame({
      content: {
        ...game.content,
        [category]: game.content[category].map((item) =>
          item.id === itemId ? { ...item, ...patch } : item
        ),
      },
    });
  }

  function addItem(category: Category) {
    patchGame({
      content: {
        ...game.content,
        [category]: [...game.content[category], emptyItem(category)],
      },
    });
  }

  function removeItem(category: Category, itemId: string) {
    patchGame({
      content: {
        ...game.content,
        [category]: game.content[category].filter((item) => item.id !== itemId),
      },
    });
  }

  function applyRawJson() {
    try {
      const parsed = JSON.parse(rawJson) as GameConfig;
      onChange(parsed);
      setMessage("JSON aplicado correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "JSON invalido.");
    }
  }

  function downloadJson() {
    const blob = new Blob([jsonPreview], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${game.id}.game.config.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="screen-panel json-editor-screen">
      <div className="screen-heading editor-heading">
        <div>
          <h2>Editor de configuracion</h2>
          <p>Formulario visual para games/{game.id}/game.config.json.</p>
        </div>
        <div className="inline-actions">
          <button onClick={downloadJson}><Download size={16} /> Descargar</button>
          <button onClick={onBack}>Volver</button>
        </div>
      </div>

      <div className="editor-tabs">
        {(["general", "campaigns", "content", "raw"] as Tab[]).map((item) => (
          <button key={item} className={tab === item ? "selected" : ""} onClick={() => setTab(item)}>
            {item === "general" ? "General" : item === "campaigns" ? "Campanas" : item === "content" ? "DLC / Features / Extras" : "JSON crudo"}
          </button>
        ))}
      </div>

      {!!errors.length && (
        <div className="editor-errors">
          {errors.map((error) => <span key={error}>{error}</span>)}
        </div>
      )}

      {tab === "general" && (
        <div className="json-editor-grid">
          <article className="settings-card editor-form-card">
            <h3>Datos del juego</h3>
            <label className="form-row">
              <span>ID</span>
              <input value={game.id} onChange={(event) => patchGame({ id: slug(event.target.value) })} />
            </label>
            <label className="form-row">
              <span>Nombre</span>
              <input value={game.name} onChange={(event) => patchGame({ name: event.target.value })} />
            </label>
            <label className="form-row">
              <span>Short</span>
              <input value={game.short} onChange={(event) => patchGame({ short: event.target.value })} />
            </label>
            <label className="form-row wide-row">
              <span>Descripcion</span>
              <textarea value={game.description} onChange={(event) => patchGame({ description: event.target.value })} />
            </label>
          </article>

          <article className="settings-card editor-form-card">
            <h3>Metadatos</h3>
            <label className="checkbox-row">
              <input type="checkbox" checked={!!game.templateFuture} onChange={(event) => patchGame({ templateFuture: event.target.checked })} />
              Plantilla futura
            </label>
            <label className="form-row wide-row">
              <span>Tags separados por coma</span>
              <textarea
                value={(game.tags ?? []).join(", ")}
                onChange={(event) => patchGame({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })}
              />
            </label>
            <div className="editor-summary">
              <span><strong>{game.campaigns.length}</strong> campanas</span>
              <span><strong>{game.content.dlc.length}</strong> DLC</span>
              <span><strong>{game.content.features.length}</strong> features</span>
              <span><strong>{game.content.extras.length}</strong> extras</span>
            </div>
          </article>
        </div>
      )}

      {tab === "campaigns" && (
        <article className="settings-card editor-category">
          <div className="editor-title-row">
            <h3>Campanas</h3>
            <button className="green-button" onClick={() => patchGame({ campaigns: [...game.campaigns, emptyCampaign()] })}>
              <Plus size={16} /> Agregar campana
            </button>
          </div>
          {game.campaigns.map((campaign, index) => (
            <div className="editor-row campaign-editor-row" key={campaign.id}>
              <input value={campaign.id} onChange={(event) => patchCampaign(index, { id: slug(event.target.value) })} />
              <input value={campaign.title} onChange={(event) => patchCampaign(index, { title: event.target.value })} />
              <textarea value={campaign.description ?? ""} onChange={(event) => patchCampaign(index, { description: event.target.value })} />
              <label className="checkbox-row">
                <input type="checkbox" checked={campaign.implemented} onChange={(event) => patchCampaign(index, { implemented: event.target.checked })} />
                Implementada
              </label>
              <button onClick={() => patchGame({ campaigns: game.campaigns.filter((_, itemIndex) => itemIndex !== index) })}>
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          ))}
        </article>
      )}

      {tab === "content" && (
        <div className="json-editor-grid">
          {(["dlc", "features", "extras"] as const).map((category) => (
            <article className="settings-card editor-category" key={category}>
              <div className="editor-title-row">
                <h3>{category}</h3>
                <button onClick={() => addItem(category)}><Plus size={16} /> Agregar</button>
              </div>
              {game.content[category].map((item) => (
                <div className="editor-row" key={item.id}>
                  <input value={item.id} onChange={(event) => patchItem(category, item.id, { id: slug(event.target.value) })} />
                  <input value={item.name} onChange={(event) => patchItem(category, item.id, { name: event.target.value })} />
                  <textarea value={item.description ?? ""} onChange={(event) => patchItem(category, item.id, { description: event.target.value })} />
                  <label className="checkbox-row">
                    <input type="checkbox" checked={item.enabled} onChange={(event) => patchItem(category, item.id, { enabled: event.target.checked })} />
                    Activo
                  </label>
                  <button onClick={() => removeItem(category, item.id)}><Trash2 size={15} /> Eliminar</button>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}

      {tab === "raw" && (
        <article className="settings-card json-preview-card">
          <h3>JSON crudo</h3>
          <textarea className="raw-json-editor" value={rawJson} onChange={(event) => setRawJson(event.target.value)} />
          <div className="inline-actions">
            <button className="green-button" onClick={applyRawJson}><Save size={16} /> Aplicar JSON</button>
            <button onClick={() => navigator.clipboard?.writeText(jsonPreview)}><Copy size={16} /> Copiar JSON actual</button>
          </div>
          {message && <p className="editor-message">{message}</p>}
        </article>
      )}
    </section>
  );
}
