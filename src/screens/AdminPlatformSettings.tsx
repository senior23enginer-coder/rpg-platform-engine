import { Bell, Globe2, Image, Languages, MessageCircle, Music, Save, Settings, Type } from "lucide-react";
import type { AppMetadata } from "../lib/appMetadataStorage";

type Props = {
  metadata: AppMetadata;
  onChange: (patch: Partial<AppMetadata>) => void;
  onBack: () => void;
};

type LanguageCode = "es" | "en";

const languageLabels: Record<LanguageCode, string> = {
  es: "Espanol",
  en: "English",
};

export function AdminPlatformSettings({ metadata, onChange, onBack }: Props) {
  function updateLocalized(language: LanguageCode, key: keyof AppMetadata["localizedText"]["es"], value: string) {
    onChange({
      localizedText: {
        ...metadata.localizedText,
        [language]: {
          ...metadata.localizedText[language],
          [key]: value,
        },
      },
    });
  }

  function toggleLanguage(language: LanguageCode) {
    const hasLanguage = metadata.languagesEnabled.includes(language);
    const nextLanguages = hasLanguage
      ? metadata.languagesEnabled.filter((item) => item !== language)
      : [...metadata.languagesEnabled, language];
    onChange({ languagesEnabled: nextLanguages.length ? nextLanguages : [language] });
  }

  function updateIcon(key: string, value: string) {
    onChange({ platformIcons: { ...metadata.platformIcons, [key]: value } });
  }

  function updateAudio(key: string, value: string) {
    onChange({ platformAudio: { ...metadata.platformAudio, [key]: value } });
  }

  return (
    <section className="screen-panel admin-platform-settings-screen">
      <div className="screen-heading admin-heading">
        <div>
          <h2><Settings size={34} /> Configuracion de plataforma</h2>
          <p>Control global de identidad, textos, idiomas, iconos, audios, chat cloud y experiencia visual.</p>
        </div>
        <button onClick={onBack}>Volver</button>
      </div>

      <div className="admin-platform-settings-grid">
        <article className="admin-card admin-platform-section platform-section-identity">
          <div className="admin-panel-title">
            <strong><Type size={18} /> Identidad y version</strong>
            <span className="admin-status-pill">{metadata.releaseChannel}</span>
          </div>
          <div className="admin-form-grid">
            <label><span>Nombre de la plataforma</span><input value={metadata.platformName} onChange={(event) => onChange({ platformName: event.target.value })} /></label>
            <label><span>Version admin</span><input value={metadata.version} onChange={(event) => onChange({ version: event.target.value })} /></label>
            <label><span>Canal</span><input value={metadata.releaseChannel} onChange={(event) => onChange({ releaseChannel: event.target.value })} /></label>
            <label><span>Nombre corto launcher</span><input value={metadata.platformIcons.shortName ?? "RPG Engine"} onChange={(event) => updateIcon("shortName", event.target.value)} /></label>
          </div>
        </article>

        <article className="admin-card admin-platform-section">
          <div className="admin-panel-title">
            <strong><Languages size={18} /> Idiomas y textos</strong>
            <span>{metadata.languagesEnabled.length} activos</span>
          </div>
          <div className="admin-language-toggle-row">
            {(Object.keys(languageLabels) as LanguageCode[]).map((language) => (
              <button
                key={language}
                className={metadata.languagesEnabled.includes(language) ? "selected" : ""}
                onClick={() => toggleLanguage(language)}
              >
                <Globe2 size={16} /> {languageLabels[language]}
              </button>
            ))}
          </div>
          <div className="admin-localized-text-grid">
            {(Object.keys(languageLabels) as LanguageCode[]).map((language) => (
              <section key={language}>
                <h3>{languageLabels[language]}</h3>
                <label><span>Titulo</span><input value={metadata.localizedText[language].platformTitle} onChange={(event) => updateLocalized(language, "platformTitle", event.target.value)} /></label>
                <label><span>Frase superior</span><input value={metadata.localizedText[language].tagline} onChange={(event) => updateLocalized(language, "tagline", event.target.value)} /></label>
                <label><span>Texto login</span><textarea value={metadata.localizedText[language].loginSubtitle} onChange={(event) => updateLocalized(language, "loginSubtitle", event.target.value)} /></label>
              </section>
            ))}
          </div>
        </article>

        <article className="admin-card admin-platform-section platform-section-icons">
          <div className="admin-panel-title">
            <strong><Image size={18} /> Iconos e imagenes del sistema</strong>
          </div>
          <div className="admin-form-grid">
            <label><span>Logo plataforma</span><input value={metadata.platformIcons.logo ?? ""} onChange={(event) => updateIcon("logo", event.target.value)} /></label>
            <label><span>Icono pestana</span><input value={metadata.platformIcons.favicon ?? ""} onChange={(event) => updateIcon("favicon", event.target.value)} /></label>
            <label><span>Icono mobile</span><input value={metadata.platformIcons.mobile ?? "/platform/vault-boy-icon-192.png"} onChange={(event) => updateIcon("mobile", event.target.value)} /></label>
            <label><span>Icono notificacion</span><input value={metadata.platformIcons.notification ?? ""} onChange={(event) => updateIcon("notification", event.target.value)} /></label>
            <label><span>Fondo login</span><input value={metadata.platformIcons.loginHero ?? "/platform/wasteland-hero.png"} onChange={(event) => updateIcon("loginHero", event.target.value)} /></label>
            <label><span>Fondo dashboard</span><input value={metadata.platformIcons.dashboardHero ?? "/platform/wasteland-hero.png"} onChange={(event) => updateIcon("dashboardHero", event.target.value)} /></label>
          </div>
        </article>

        <article className="admin-card admin-platform-section platform-section-audio">
          <div className="admin-panel-title">
            <strong><Music size={18} /> Audios globales</strong>
          </div>
          <div className="admin-form-grid">
            <label><span>Login principal</span><input value={metadata.platformAudio.loginMain ?? ""} onChange={(event) => updateAudio("loginMain", event.target.value)} /></label>
            <label><span>Audio por defecto</span><input value={metadata.platformAudio.ambientDefault ?? ""} onChange={(event) => updateAudio("ambientDefault", event.target.value)} /></label>
            <label><span>Combate por defecto</span><input value={metadata.platformAudio.combatDefault ?? ""} onChange={(event) => updateAudio("combatDefault", event.target.value)} /></label>
            <label><span>Click UI</span><input value={metadata.platformAudio.uiClick ?? ""} onChange={(event) => updateAudio("uiClick", event.target.value)} /></label>
          </div>
        </article>

        <article className="admin-card admin-platform-section platform-section-chat">
          <div className="admin-panel-title">
            <strong><MessageCircle size={18} /> Chat cloud</strong>
            <Bell size={18} />
          </div>
          <div className="admin-form-grid">
            <label><span>Endpoint cloud por defecto</span><input value={metadata.chatRelayUrl} onChange={(event) => onChange({ chatRelayUrl: event.target.value })} /></label>
            <label><span>Sala por defecto</span><input value={metadata.chatRoom} onChange={(event) => onChange({ chatRoom: event.target.value })} /></label>
            <label><span>Proveedor realtime</span><input value={metadata.platformIcons.realtimeProvider ?? "cloud-relay"} onChange={(event) => updateIcon("realtimeProvider", event.target.value)} /></label>
            <label><span>Modo conexion usuario</span><input value={metadata.platformIcons.userConnectionMode ?? "automatico"} onChange={(event) => updateIcon("userConnectionMode", event.target.value)} /></label>
          </div>
          <p className="admin-platform-help">El administrador define el endpoint cloud. Los usuarios solo entran a la sala, sin IP local ni configuracion LAN.</p>
        </article>

        <article className="admin-card admin-platform-save-panel">
          <Save size={28} />
          <strong>Configuracion guardada automaticamente</strong>
          <p>Los cambios se sincronizan con el almacenamiento local y se aplican en la plataforma.</p>
        </article>
      </div>
    </section>
  );
}
