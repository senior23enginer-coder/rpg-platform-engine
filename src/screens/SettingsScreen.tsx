import { ArrowLeft, Eye, Palette, RotateCcw, Save, Speaker, Swords, Target, Volume2, Zap } from "lucide-react";
import { playTrack, stopAudio, type TrackCategory } from "../lib/audioEngine";
import type { AudioManifest } from "../types/game";
import type { HudColor, ThemeMode, UserSettings } from "../types/profile";

type Props = {
  manifest: AudioManifest;
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
  onBack: () => void;
};

const categories: Array<{ id: TrackCategory; label: string; icon: typeof Speaker }> = [
  { id: "background", label: "Pista principal", icon: Speaker },
  { id: "combat", label: "Pista de combate", icon: Swords },
  { id: "exploration", label: "Pista de exploracion", icon: Eye },
  { id: "vault", label: "Pista de Vault / interior", icon: Speaker },
  { id: "day", label: "Pista de dia", icon: Zap },
  { id: "night", label: "Pista de noche", icon: Volume2 },
];

const hudOptions: Array<{ value: HudColor; label: string }> = [
  { value: "green", label: "Verde Pip-Boy" },
  { value: "amber", label: "Ambar clasico" },
  { value: "blue", label: "Azul Vault" },
  { value: "red", label: "Rojo peligro" },
  { value: "purple", label: "Purpura" },
];

export function SettingsScreen({ manifest, settings, onChange, onBack }: Props) {
  function patch(next: Partial<UserSettings>) {
    onChange({ ...settings, ...next });
  }

  function setTrack(category: TrackCategory, trackId: string) {
    const next = {
      ...settings,
      tracks: {
        ...settings.tracks,
        [category]: trackId,
      },
    };
    onChange(next);

    const track = manifest.tracks[category]?.find((item) => item.id === trackId);
    if (settings.audioEnabled) playTrack(track?.path, category);
  }

  function toggleAudio() {
    const enabled = !settings.audioEnabled;
    patch({ audioEnabled: enabled });
    if (!enabled) {
      stopAudio();
      return;
    }

    const track = manifest.tracks.background?.find((item) => item.id === settings.tracks.background);
    playTrack(track?.path, "background");
  }

  return (
    <section className="settings-layout">
      <div className="settings-heading">
        <div>
          <h2>Configuracion visual y audio</h2>
          <p>Personaliza fondo, color del HUD, musica, combate, clicks y animaciones.</p>
        </div>
        <button onClick={onBack}><ArrowLeft size={18} /> Volver</button>
      </div>

      <div className="settings-grid">
        <article className="settings-card theme-card">
          <h3><Palette size={20} /> Tema de fondo</h3>
          <div className="theme-options">
            {(["dark", "light"] as ThemeMode[]).map((theme) => (
              <button
                key={theme}
                className={`theme-preview ${settings.theme === theme ? "selected" : ""}`}
                onClick={() => patch({ theme })}
              >
                <span className={theme === "dark" ? "dark-preview" : "light-preview"} />
                <strong>{theme === "dark" ? "Fondo negro" : "Fondo blanco"}</strong>
                <small>{theme === "dark" ? "Yermo / terminal." : "Lectura clara."}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="settings-card hud-card">
          <h3><Palette size={20} /> Color HUD principal</h3>
          <div className="hud-preview">
            <span>HP</span><i /><strong>NE</strong>
          </div>
          <select
            value={settings.hudColor}
            onChange={(event) => patch({ hudColor: event.target.value as HudColor })}
          >
            {hudOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p>Color caracteristico del terminal Pip-Boy.</p>
        </article>

        <aside className="settings-preview">
          <h3><Eye size={20} /> Vista previa actual</h3>
          <div className="preview-image" />
          <p>Asi se vera el HUD y fondo con tu configuracion actual durante el juego.</p>
          <div className="settings-tip">
            <Zap size={36} />
            <div>
              <strong>Consejo</strong>
              <p>Un fondo animado con intensidad media ofrece un equilibrio ideal entre inmersion y rendimiento.</p>
            </div>
          </div>
        </aside>

        <article className="settings-card">
          <h3>Fondo animado</h3>
          <div className="config-row">
            <span>Movimiento ambiental del menu y pantallas.</span>
            <button
              className={`fake-toggle label-toggle ${settings.animatedBackground ? "on" : ""}`}
              onClick={() => patch({ animatedBackground: !settings.animatedBackground })}
            >
              {settings.animatedBackground ? "Activado" : "Desactivado"}
            </button>
          </div>
        </article>

        <article className="settings-card">
          <h3>Intensidad visual</h3>
          <div className="config-row">
            <span>Ajusta la intensidad de efectos y brillo general.</span>
            <select defaultValue="media">
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </article>

        {categories.slice(0, 2).map((category) => {
          const Icon = category.icon;
          return (
            <article className="settings-card track-card" key={category.id}>
              <h3><Icon size={20} /> {category.label}</h3>
              <div className="config-row">
                <span>{category.id === "background" ? "Musica ambiental en exploracion y menus." : "Musica intensa durante combates."}</span>
                <select
                  value={settings.tracks[category.id] ?? ""}
                  onChange={(event) => setTrack(category.id, event.target.value)}
                >
                  {(manifest.tracks[category.id] ?? []).map((track) => (
                    <option key={track.id} value={track.id}>{track.name}</option>
                  ))}
                </select>
              </div>
            </article>
          );
        })}

        <article className="settings-card">
          <h3><Volume2 size={20} /> Sonidos</h3>
          <div className="config-row">
            <span>Clicks de interfaz y sonido ambiental de fondo.</span>
            <button className={`fake-toggle label-toggle ${settings.audioEnabled ? "on" : ""}`} onClick={toggleAudio}>
              {settings.audioEnabled ? "Activado" : "Desactivado"}
            </button>
          </div>
        </article>

        <article className="settings-card">
          <h3>Accesibilidad</h3>
          <div className="config-row">
            <span>Reducir animaciones para moviles o comodidad visual.</span>
            <button className="fake-toggle label-toggle">Desactivado</button>
          </div>
        </article>

        <div className="settings-extra-tracks">
          {categories.slice(2).map((category) => {
            const Icon = category.icon;
            return (
              <article className="settings-card track-card" key={category.id}>
                <h3><Icon size={20} /> {category.label}</h3>
                <select
                  value={settings.tracks[category.id] ?? ""}
                  onChange={(event) => setTrack(category.id, event.target.value)}
                >
                  {(manifest.tracks[category.id] ?? []).map((track) => (
                    <option key={track.id} value={track.id}>{track.name}</option>
                  ))}
                </select>
              </article>
            );
          })}
        </div>
      </div>

      <div className="settings-actions">
        <button
          onClick={() => {
            const track = manifest.tracks.combat?.find((item) => item.id === settings.tracks.combat);
            playTrack(track?.path, "combat");
          }}
        >
          <Target size={22} /> Probar combate
        </button>
        <button onClick={() => patch({ theme: "dark", hudColor: "green", animatedBackground: true })}>
          <RotateCcw size={22} /> Restaurar apariencia
        </button>
        <button className="green-button" onClick={() => onChange(settings)}>
          <Save size={22} /> Guardar personalizacion
        </button>
      </div>
    </section>
  );
}
