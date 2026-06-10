import { ArrowLeft, CalendarDays, CloudRain, Crosshair, Database, Globe2, ListChecks, Radiation, ShieldPlus, Skull, Utensils, Zap } from "lucide-react";
import { useState } from "react";

type Props = {
  onBack: () => void;
};

const initialRules = [
  { name: "Eventos por turnos", description: "Eventos menores, de zona y mundiales.", enabled: true, icon: CalendarDays },
  { name: "Clima", description: "Lluvia, niebla, tormentas y ambiente.", enabled: true, icon: CloudRain },
  { name: "Dia y noche", description: "Bloques horarios y vision.", enabled: true, icon: Zap },
  { name: "Supervivencia", description: "Sed, hambre, sueno y recursos.", enabled: false, icon: Utensils },
  { name: "Radiacion", description: "Zonas contaminadas y tormentas.", enabled: true, icon: Radiation },
  { name: "Municion", description: "Control real de municion.", enabled: true, icon: Database },
  { name: "Loot", description: "Busqueda de objetos.", enabled: true, icon: ListChecks },
  { name: "IA enemiga", description: "Comportamientos automaticos.", enabled: true, icon: Skull },
  { name: "Ataque de oportunidad", description: "Salir de melee puede provocar golpe.", enabled: true, icon: Crosshair },
  { name: "Cobertura", description: "Cobertura ligera, media y pesada.", enabled: true, icon: ShieldPlus },
  { name: "Dano hardcore", description: "Mas letalidad.", enabled: false, icon: Skull },
  { name: "Eventos mundiales", description: "Eventos regionales.", enabled: true, icon: Globe2 },
];

const presets = [
  { id: "classic", label: "Clasico", description: "Experiencia estandar equilibrada.", icon: Zap },
  { id: "survival", label: "Supervivencia", description: "Mas desafio, menos recursos.", icon: Radiation },
  { id: "narrative", label: "Narrativo", description: "Mas historia, menos dificultad.", icon: ListChecks },
  { id: "tactical", label: "Tactico", description: "Combate estrategico y realista.", icon: Crosshair },
];

export function RulesScreen({ onBack }: Props) {
  const [selectedPreset, setSelectedPreset] = useState("classic");
  const [rules, setRules] = useState(initialRules);

  function toggleRule(name: string) {
    setRules((current) =>
      current.map((rule) => rule.name === name ? { ...rule, enabled: !rule.enabled } : rule)
    );
  }

  return (
    <section className="rules-layout">
      <aside className="preset-panel">
        <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Volver</button>
        <h3>Presets</h3>
        {presets.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              className={`preset-card ${selectedPreset === preset.id ? "selected" : ""}`}
              key={preset.id}
              onClick={() => setSelectedPreset(preset.id)}
            >
              <span><Icon size={34} /></span>
              <strong>{preset.label}</strong>
              <small>{preset.description}</small>
            </button>
          );
        })}
        <div className="apply-preset-box">
          <strong>Aplicar preset</strong>
          <p>Aplica la configuracion seleccionada.</p>
          <button className="apply-preset">Aplicar preset</button>
        </div>
      </aside>

      <main className="rules-panel">
        <h2>Reglas globales</h2>
        <p>Configura las reglas que afectan a toda tu partida.</p>

        <div className="rules-grid">
          {rules.map((rule) => {
            const Icon = rule.icon;
            return (
              <article className="rule-card" key={rule.name}>
                <div className="rule-icon"><Icon size={34} /></div>
                <div>
                  <h3>{rule.name}</h3>
                  <p>{rule.description}</p>
                  <strong>{rule.enabled ? "Activada" : "Desactivada"}</strong>
                </div>
                <button className={`toggle-switch ${rule.enabled ? "on" : ""}`} onClick={() => toggleRule(rule.name)} aria-label={`Alternar ${rule.name}`}>
                  <i />
                </button>
              </article>
            );
          })}
        </div>

        <div className="rules-footer">
          <div>
            <strong>Modifica las reglas globales</strong>
            <p>Los cambios se aplicaran a la partida actual y futuras partidas nuevas.</p>
          </div>
          <button onClick={() => setRules(initialRules)}>Restaurar</button>
          <button className="green-button">Guardar reglas</button>
        </div>
      </main>
    </section>
  );
}
