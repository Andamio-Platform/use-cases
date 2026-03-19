import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const wrappersEntry = resolve(
  process.cwd(),
  "node_modules/libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-wrappers.mjs",
);

try {
  const source = readFileSync(wrappersEntry, "utf8");
  const brokenImport = 'import e from"./libsodium-sumo.mjs";';

  if (!source.includes(brokenImport)) {
    process.exit(0);
  }

  const patched = source.replace(brokenImport, 'import e from "libsodium-sumo";');
  writeFileSync(wrappersEntry, patched, "utf8");
  console.log("Patched libsodium-wrappers-sumo ESM import for Mesh compatibility.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Mesh libsodium patch skipped: ${message}`);
}
