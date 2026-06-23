import { readFileSync } from "node:fs";

const css = readFileSync("src/styles/app.css", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

for (const breakpoint of ["max-width: 1180px", "max-width: 900px", "max-width: 720px", "max-width: 620px"]) {
  assert(css.includes(breakpoint), `Falta breakpoint ${breakpoint}`);
}

for (const selector of [
  ".fo4-runtime-grid",
  ".fo4-atlas-actions",
  ".fo4-mission-tracker",
  ".json-assisted-editor",
  ".json-image-preview-strip",
  ".load-save-card",
  ".auth-shell",
]) {
  assert(css.includes(selector), `Falta selector responsive ${selector}`);
}

assert(/\.fo4-runtime-grid,[\s\S]*?grid-template-columns:\s*1fr/.test(css), "Fallout runtime debe colapsar a 1 columna en movil");
assert(/\.json-assisted-editor > div[\s\S]*?grid-template-columns:\s*1fr/.test(css), "Editor asistido debe colapsar a 1 columna en movil");
assert(css.includes("overflow-wrap: anywhere"), "Debe existir proteccion contra textos largos");
assert(css.includes("minmax(0, 1fr)"), "Los grids deben usar minmax(0, 1fr) para evitar overflow");
assert(app.includes("lazy(() =>") && app.includes("Suspense"), "La campana pesada debe cargar de forma diferida");

console.log("Responsive layout audit");
console.log("=======================");
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log("OK: breakpoints, grids moviles, editor y lazy loading validados.");
