import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VISUAL_URL ?? "http://localhost:1420";
const outDir = path.join(process.cwd(), "test-results", "responsive");
mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const failures = [];

async function tryLogin(page) {
  try {
    await page.getByText(/iniciar sesion/i).first().click({ timeout: 1500 });
  } catch {
    // Login tab may already be active.
  }
  const inputs = await page.locator("input").all();
  if (inputs.length < 2) return false;
  try {
    await inputs[0].fill("operador");
    await inputs[1].fill("operador123");
    const button = page.getByRole("button", { name: /iniciar|entrar|login/i }).last();
    await button.click({ timeout: 2000 });
    await page.waitForTimeout(1200);
    return true;
  } catch {
    return false;
  }
}

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, `${viewport.name}-login.png`), fullPage: true });

  const logged = await tryLogin(page);
  await page.screenshot({ path: path.join(outDir, `${viewport.name}-${logged ? "app" : "initial"}.png`), fullPage: true });

  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    title: document.title,
    text: document.body.innerText.slice(0, 200),
  }));
  const maxWidth = Math.max(metrics.scrollWidth, metrics.bodyScrollWidth);
  if (maxWidth > metrics.innerWidth + 4) {
    failures.push(`${viewport.name}: overflow horizontal ${maxWidth} > ${metrics.innerWidth}`);
  }
  await page.close();
}

await browser.close();

console.log("Visual responsive audit");
console.log("=======================");
console.log(`Screenshots: ${outDir}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log("OK: capturas reales generadas y sin overflow horizontal critico.");
