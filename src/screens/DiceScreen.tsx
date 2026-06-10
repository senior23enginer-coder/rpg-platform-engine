import { useState } from "react";

function parseRoll(expression: string) {
  const match = expression.replace(/\s+/g, "").match(/^(\d*)d(\d+|%)([+-]\d+)?$/i);
  if (!match) return null;

  const count = Number(match[1] || 1);
  const sides = match[2] === "%" ? 100 : Number(match[2]);
  const modifier = Number(match[3] || 0);
  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
  const total = rolls.reduce((sum, value) => sum + value, 0) + modifier;

  return { rolls, total };
}

export function DiceScreen() {
  const [expression, setExpression] = useState("2d20+3");
  const [face, setFace] = useState(20);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  function roll(expr = expression) {
    const result = parseRoll(expr);
    if (!result) {
      setHistory((prev) => ["Expresión inválida", ...prev]);
      return;
    }

    setFace(result.rolls[result.rolls.length - 1]);
    setRolling(true);
    setTimeout(() => setRolling(false), 900);

    setHistory((prev) => [
      `${expr}: [${result.rolls.join(", ")}] = ${result.total}`,
      ...prev,
    ]);
  }

  return (
    <section className="dice-layout-screen">
      <article className="dice-main-card">
        <h2>Herramienta de dados 3D</h2>
        <p>Dado poligonal, textura CSS y color configurable.</p>

        <div className="dice-stage">
          <div className={`poly-die ${rolling ? "rolling" : ""}`}>
            <span>{face}</span>
          </div>
        </div>

        <div className="dice-buttons">
          {[2, 4, 6, 8, 10, 12, 20, 100].map((sides) => (
            <button key={sides} onClick={() => roll(`1d${sides}`)}>
              d{sides}
            </button>
          ))}
        </div>

        <div className="dice-expression">
          <input value={expression} onChange={(event) => setExpression(event.target.value)} />
          <button className="green-button" onClick={() => roll()}>Tirar</button>
        </div>
      </article>

      <article className="dice-history-card">
        <h3>Resultado / historial</h3>
        <div className="history-list">
          {history.length === 0 && <p>Aún no has tirado dados.</p>}
          {history.map((entry, index) => (
            <div key={index}>{entry}</div>
          ))}
        </div>
      </article>
    </section>
  );
}
