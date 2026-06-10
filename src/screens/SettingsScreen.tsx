import { ArrowLeft, Check, Eye, Monitor, Palette, RotateCcw, Save, Speaker, Swords, Target, Volume2, Zap } from "lucide-react";
import { playTrack, stopAudio, type TrackCategory } from "../lib/audioEngine";
import type { AudioManifest } from "../types/game";
import type { HudColor, ThemeMode, UserSettings } from "../types/profile";

type Props = {
  manifest: AudioManifest;
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
  onBack: () => void;
};

const primaryTracks: Array<{ id: TrackCategory; label: string; help: string; icon: typeof Speaker }> = [
  { id: "background", label: "Pista principal", help: "Musica ambiental en exploracion y menus.", icon: Speaker },
  { id: "combat", label: "Pista de combate", help: "Musica intensa durante combates.", icon: Swords },
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
    <section className="settings-ref">
      <header className="settings-ref-head">
        <div>
          <h2>Configuracion visual y audio</h2>
          <p>Personaliza fondo, color del HUD, musica, combate, clicks y animaciones.</p>
        </div>
        <button onClick={onBack}><ArrowLeft size={18} /> Volver</button>
      </header>

      <div className="settings-ref-grid">
        <article className="settings-ref-card settings-ref-theme">
          <h3><Monitor size={18} /> Tema de fondo</h3>
          <div className="settings-ref-themes">
            {(["dark", "light"] as ThemeMode[]).map((theme) => (
              <button
                key={theme}
                className={`settings-ref-theme-option ${settings.theme === theme ? "selected" : ""}`}
                onClick={() => patch({ theme })}
              >
                <span className={`settings-ref-theme-art ${theme}`} />
                <strong>{theme === "dark" ? "Fondo negro" : "Fondo blanco"}</strong>
                <span className="settings-ref-check">{settings.theme === theme ? <Check size={18} /> : null}</span>
                <small>{theme === "dark" ? "Yermo / terminal." : "Lectura clara."}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="settings-ref-card settings-ref-hud">
          <h3><Palette size={18} /> Color HUD principal</h3>
          <div className="settings-ref-hud-preview">
            <span className="vault-boy-line" />
            <div>
              <span>HP</span>
              <i />
              <strong>NE</strong>
            </div>
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

        <aside className="settings-ref-preview">
          <h3><Eye size={18} /> Vista previa actual</h3>
          <div className="settings-ref-preview-image" />
          <p>Asi se vera el HUD y fondo con tu configuracion actual durante el juego.</p>
          <div className="settings-ref-tip">
            <Zap size={32} />
            <div>
              <strong>Consejo</strong>
              <p>Un fondo animado con intensidad media ofrece un equilibrio ideal entre inmersion y rendimiento.</p>
            </div>
          </div>
        </aside>

        <article className="settings-ref-card settings-ref-row-card settings-ref-animated">
          <h3><Zap size={18} /> Fondo animado</h3>
          <div className="settings-ref-control">
            <span>Movimiento ambiental del menu y pantallas.</span>
            <button
              className={`settings-ref-toggle ${settings.animatedBackground ? "on" : ""}`}
              onClick={() => patch({ animatedBackground: !settings.animatedBackground })}
            >
              {settings.animatedBackground ? "Activado" : "Desactivado"}
            </button>
          </div>
        </article>

        <article className="settings-ref-card settings-ref-row-card settings-ref-intensity">
          <h3><Eye size={18} /> Intensidad visual</h3>
          <div className="settings-ref-control">
            <span>Ajusta la intensidad de efectos y brillo general.</span>
            <select defaultValue="media">
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </article>

        {primaryTracks.map((category) => {
          const Icon = category.icon;
          return (
            <article className={`settings-ref-card settings-ref-track settings-ref-track-${category.id}`} key={category.id}>
              <h3><Icon size={18} /> {category.label}</h3>
              <div className="settings-ref-control">
                <span>{category.help}</span>
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

        <article className="settings-ref-card settings-ref-row-card settings-ref-sounds">
          <h3><Volume2 size={18} /> Sonidos</h3>
          <div className="settings-ref-control">
            <span>Clicks de interfaz y sonido ambiental de fondo.</span>
            <button className={`settings-ref-toggle ${settings.audioEnabled ? "on" : ""}`} onClick={toggleAudio}>
              {settings.audioEnabled ? "Activado" : "Desactivado"}
            </button>
          </div>
        </article>

        <article className="settings-ref-card settings-ref-row-card settings-ref-accessibility">
          <h3><Zap size={18} /> Accesibilidad</h3>
          <div className="settings-ref-control">
            <span>Reducir animaciones para moviles o comodidad visual.</span>
            <button className="settings-ref-toggle">Desactivado</button>
          </div>
        </article>

      </div>

      <footer className="settings-ref-actions">
        <button
          onClick={() => {
            const track = manifest.tracks.combat?.find((item) => item.id === settings.tracks.combat);
            playTrack(track?.path, "combat");
          }}
        >
          <Target size={22} />
          <span><strong>Probar combate</strong><small>Vista previa en combate</small></span>
        </button>
        <button onClick={() => patch({ theme: "dark", hudColor: "green", animatedBackground: true })}>
          <RotateCcw size={22} />
          <span><strong>Restaurar apariencia</strong><small>Volver a valores predeterminados</small></span>
        </button>
        <button className="green-button" onClick={() => onChange(settings)}>
          <Save size={22} />
          <span><strong>Guardar personalizacion</strong><small>Aplicar y guardar cambios</small></span>
        </button>
      </footer>
    </section>
  );
}
