import { ArrowLeft, Check, Eye, Image, Monitor, Palette, RotateCcw, Save, Speaker, Swords, Target, Volume2, X, Zap } from "lucide-react";
import { useState } from "react";
import { playTrack, stopAudio, type TrackCategory } from "../lib/audioEngine";
import type { AudioManifest } from "../types/game";
import type { HudColor, LanguageCode, ThemeMode, UserSettings } from "../types/profile";
import { t } from "../lib/i18n";

type Props = {
  manifest: AudioManifest;
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
  onBack: () => void;
};

const primaryTracks: Array<{ id: TrackCategory; labelKey: Parameters<typeof t>[1]; helpKey: Parameters<typeof t>[1]; icon: typeof Speaker }> = [
  { id: "background", labelKey: "settings.backgroundTrack", helpKey: "settings.backgroundTrackHelp", icon: Speaker },
  { id: "combat", labelKey: "settings.combatTrack", helpKey: "settings.combatTrackHelp", icon: Swords },
];

const hudOptions: Array<{ value: HudColor; label: string }> = [
  { value: "green", label: "Verde Pip-Boy" },
  { value: "amber", label: "Ambar clasico" },
  { value: "blue", label: "Azul Vault" },
  { value: "red", label: "Rojo peligro" },
  { value: "purple", label: "Purpura" },
];

export function SettingsScreen({ manifest, settings, onChange, onBack }: Props) {
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [assetDraft, setAssetDraft] = useState(settings.assetOverrides ?? {});
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
    patch({ audioEnabled: enabled, audioPreferenceSaved: true });
    if (!enabled) {
      stopAudio();
      return;
    }

    const track = manifest.tracks.background?.find((item) => item.id === settings.tracks.background);
    playTrack(track?.path, "background");
  }

  function setAssetPath(key: string, value: string) {
    setAssetDraft((current) => ({ ...current, [key]: value }));
  }

  function saveAssetPaths() {
    patch({ assetOverrides: assetDraft });
    setAssetModalOpen(false);
  }

  return (
    <section className="settings-ref">
      <header className="settings-ref-head">
        <div>
          <h2>{t(settings.language, "settings.title")}</h2>
          <p>{t(settings.language, "settings.subtitle")}</p>
        </div>
        <button onClick={onBack}><ArrowLeft size={18} /> {t(settings.language, "settings.back")}</button>
      </header>

      <div className="settings-clean-layout">
        <div className="settings-clean-main">
          <article className="settings-ref-card settings-ref-row-card settings-ref-language">
            <h3><Monitor size={18} /> {t(settings.language, "settings.language")}</h3>
            <div className="settings-ref-control">
              <span>{t(settings.language, "settings.languageHelp")}</span>
              <select value={settings.language} onChange={(event) => patch({ language: event.target.value as LanguageCode })}>
                <option value="es">{t(settings.language, "settings.spanish")}</option>
                <option value="en">{t(settings.language, "settings.english")}</option>
              </select>
            </div>
          </article>

          <article className="settings-ref-card settings-ref-theme">
            <h3><Monitor size={18} /> {t(settings.language, "settings.theme")}</h3>
            <div className="settings-ref-themes">
              {(["dark", "light"] as ThemeMode[]).map((theme) => (
                <button
                  key={theme}
                  className={`settings-ref-theme-option ${settings.theme === theme ? "selected" : ""}`}
                  onClick={() => patch({ theme })}
                >
                  <span className={`settings-ref-theme-art ${theme}`} />
                  <strong>{theme === "dark" ? t(settings.language, "settings.dark") : t(settings.language, "settings.light")}</strong>
                  <span className="settings-ref-check">{settings.theme === theme ? <Check size={18} /> : null}</span>
                  <small>{theme === "dark" ? t(settings.language, "settings.darkHint") : t(settings.language, "settings.lightHint")}</small>
                </button>
              ))}
            </div>
          </article>

          <div className="settings-clean-two">
            <article className="settings-ref-card settings-ref-hud">
              <h3><Palette size={18} /> {t(settings.language, "settings.hud")}</h3>
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
              <p>{t(settings.language, "settings.hudHelp")}</p>
            </article>

            <article className="settings-ref-card settings-ref-row-card settings-ref-intensity">
              <h3><Eye size={18} /> {t(settings.language, "settings.intensity")}</h3>
              <div className="settings-ref-control">
                <span>{t(settings.language, "settings.intensityHelp")}</span>
                <select defaultValue="media">
                  <option value="baja">{t(settings.language, "settings.low")}</option>
                  <option value="media">{t(settings.language, "settings.medium")}</option>
                  <option value="alta">{t(settings.language, "settings.high")}</option>
                </select>
              </div>
            </article>
          </div>

          <div className="settings-clean-two">
            <article className="settings-ref-card settings-ref-row-card settings-ref-animated">
              <h3><Zap size={18} /> {t(settings.language, "settings.animated")}</h3>
              <div className="settings-ref-control">
                <span>{t(settings.language, "settings.animatedHelp")}</span>
                <button
                  className={`settings-ref-toggle ${settings.animatedBackground ? "on" : ""}`}
                  onClick={() => patch({ animatedBackground: !settings.animatedBackground })}
                >
                  {settings.animatedBackground ? t(settings.language, "status.enabled") : t(settings.language, "status.disabled")}
                </button>
              </div>
            </article>

            <article className="settings-ref-card settings-ref-row-card settings-ref-sounds">
              <h3><Volume2 size={18} /> {t(settings.language, "settings.sounds")}</h3>
              <div className="settings-ref-control">
                <span>{t(settings.language, "settings.soundsHelp")}</span>
                <button className={`settings-ref-toggle ${settings.audioEnabled ? "on" : ""}`} onClick={toggleAudio}>
                  {settings.audioEnabled ? t(settings.language, "status.enabled") : t(settings.language, "status.disabled")}
                </button>
              </div>
            </article>
          </div>

          <div className="settings-clean-two">
            {primaryTracks.map((category) => {
              const Icon = category.icon;
              return (
                <article className={`settings-ref-card settings-ref-track settings-ref-track-${category.id}`} key={category.id}>
                  <h3><Icon size={18} /> {t(settings.language, category.labelKey)}</h3>
                  <div className="settings-ref-control">
                    <span>{t(settings.language, category.helpKey)}</span>
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
          </div>

          <article className="settings-ref-card settings-ref-row-card settings-ref-accessibility">
            <h3><Zap size={18} /> {t(settings.language, "settings.accessibility")}</h3>
            <div className="settings-ref-control">
              <span>{t(settings.language, "settings.accessibilityHelp")}</span>
              <button className="settings-ref-toggle">{t(settings.language, "status.disabled")}</button>
            </div>
          </article>
        </div>

        <aside className="settings-ref-preview settings-clean-preview">
          <h3><Eye size={18} /> {t(settings.language, "settings.preview")}</h3>
          <div className="settings-ref-preview-image" />
          <p>{t(settings.language, "settings.previewHelp")}</p>
          <div className="settings-ref-tip">
            <Zap size={32} />
            <div>
              <strong>{t(settings.language, "settings.tip")}</strong>
              <p>{t(settings.language, "settings.tipText")}</p>
            </div>
          </div>
        </aside>
      </div>

      <footer className="settings-ref-actions">
        <button
          onClick={() => {
            const track = manifest.tracks.combat?.find((item) => item.id === settings.tracks.combat);
            playTrack(track?.path, "combat");
          }}
        >
          <Target size={22} />
          <span><strong>{t(settings.language, "settings.testCombat")}</strong><small>{t(settings.language, "settings.testCombatHelp")}</small></span>
        </button>
        <button onClick={() => patch({ theme: "dark", hudColor: "green", animatedBackground: true })}>
          <RotateCcw size={22} />
          <span><strong>{t(settings.language, "settings.restore")}</strong><small>{t(settings.language, "settings.restoreHelp")}</small></span>
        </button>
        <button className="green-button" onClick={() => onChange(settings)}>
          <Save size={22} />
          <span><strong>{t(settings.language, "settings.save")}</strong><small>{t(settings.language, "settings.saveHelp")}</small></span>
        </button>
        <button onClick={() => setAssetModalOpen(true)}>
          <Image size={22} />
          <span><strong>{t(settings.language, "settings.editImages")}</strong><small>{t(settings.language, "settings.editImagesHelp")}</small></span>
        </button>
      </footer>

      {assetModalOpen && (
        <div className="modal-backdrop">
          <article className="app-modal asset-path-modal">
            <button className="modal-close" onClick={() => setAssetModalOpen(false)}><X size={18} /></button>
            <h3><Image size={22} /> {t(settings.language, "settings.pathsTitle")}</h3>
            <p>{t(settings.language, "settings.pathsHelp")}</p>
            {[
              ["platform.logo", "/platform/uiux-icons/brand-gear.png"],
              ["topbar.logo", "/platform/uiux-icons/brand-gear.png"],
              ["sidebar.home", "/platform/uiux-icons/home.png"],
              ["sidebar.library", "/platform/uiux-icons/library.png"],
              ["sidebar.newGame", "/platform/uiux-icons/newGame.png"],
              ["sidebar.load", "/platform/uiux-icons/load.png"],
              ["sidebar.settings", "/platform/uiux-icons/settings.png"],
            ].map(([key, fallback]) => {
              const value = assetDraft[key] ?? fallback;
              return (
                <label className="asset-path-row" key={key}>
                  <span>{key}</span>
                  <input value={value} onChange={(event) => setAssetPath(key, event.target.value)} />
                  <i style={{ backgroundImage: `url("${value}")` }} />
                </label>
              );
            })}
            <button className="green-button" onClick={saveAssetPaths}>{t(settings.language, "settings.savePaths")}</button>
          </article>
        </div>
      )}
    </section>
  );
}
