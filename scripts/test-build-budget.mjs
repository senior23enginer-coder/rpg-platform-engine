import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const assetsDir = path.join(root, "dist", "assets");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function gzipSize(filePath) {
  const data = Buffer.from(readFileSync(filePath));
  return zlib.gzipSync(data).length;
}

if (!existsSync(assetsDir)) {
  failures.push("dist/assets no existe; ejecuta npm.cmd run build antes de test:build-budget");
} else {
  const files = readdirSync(assetsDir).map((name) => {
    const fullPath = path.join(assetsDir, name);
    return {
      name,
      path: fullPath,
      size: statSync(fullPath).size,
      gzip: gzipSize(fullPath),
    };
  });

  const initial = files.find((file) => /^index-.*\.js$/.test(file.name));
  const campaign = files.find((file) => /^fallout4-campaign-.*\.js$/.test(file.name));
  const css = files.find((file) => /^index-.*\.css$/.test(file.name));

  assert(Boolean(initial), "No se encontro chunk inicial index-*.js");
  assert(Boolean(campaign), "No se encontro chunk diferido fallout4-campaign-*.js");
  assert(Boolean(css), "No se encontro CSS principal index-*.css");

  if (initial) {
    assert(initial.size <= 3_800_000, `Chunk inicial demasiado grande: ${initial.size} bytes`);
    assert(initial.gzip <= 300_000, `Chunk inicial gzip demasiado grande: ${initial.gzip} bytes`);
  }
  if (campaign) {
    assert(campaign.size <= 10_000_000, `Chunk Fallout 4 demasiado grande: ${campaign.size} bytes`);
    assert(campaign.gzip <= 500_000, `Chunk Fallout 4 gzip demasiado grande: ${campaign.gzip} bytes`);
  }
  if (css) {
    assert(css.size <= 400_000, `CSS principal demasiado grande: ${css.size} bytes`);
    assert(css.gzip <= 70_000, `CSS gzip demasiado grande: ${css.gzip} bytes`);
  }

  console.log("Build budget audit");
  console.log("==================");
  for (const file of [initial, campaign, css].filter(Boolean)) {
    console.log(`${file.name}: ${file.size} bytes / gzip ${file.gzip} bytes`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log("OK: bundles dentro del presupuesto local actual.");
