#!/usr/bin/env node
/**
 * Regenera el bundle offline de íconos usados por <Icon icon="prefix:name" />
 * (@iconify/react). El componente Icon de @iconify/react carga los datos por
 * red desde api.iconify.design en el primer render; en este proyecto ese
 * fetch nunca llega a dispararse en dev (Next 16 + Turbopack), dejando todos
 * los íconos en blanco. Este script extrae solo los íconos realmente usados
 * de los paquetes @iconify-json/* y genera un archivo con addCollection()
 * para registrarlos localmente al arrancar la app (ver providers.tsx).
 *
 * Uso: npm run icons:generate
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { getIcons } from "@iconify/utils";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "..");
const OUTPUT_FILE = join(__dirname, "icon-data.generated.ts");
const PREFIXES = ["material-symbols", "mdi", "logos"];
const ICON_NAME_RE = new RegExp(
    `["'](${PREFIXES.join("|")}):([a-z0-9-]+)["']`,
    "g",
);
const SCANNABLE_EXT = new Set([".ts", ".tsx"]);

function collectFiles(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
            collectFiles(full, out);
        } else if (SCANNABLE_EXT.has(extname(entry))) {
            out.push(full);
        }
    }
    return out;
}

function findUsedIcons() {
    const byPrefix = new Map(PREFIXES.map((p) => [p, new Set()]));
    for (const file of collectFiles(SRC_DIR)) {
        const content = readFileSync(file, "utf8");
        for (const match of content.matchAll(ICON_NAME_RE)) {
            const [, prefix, name] = match;
            byPrefix.get(prefix).add(name);
        }
    }
    return byPrefix;
}

function buildCollections(byPrefix) {
    const collections = [];
    for (const prefix of PREFIXES) {
        const names = Array.from(byPrefix.get(prefix)).sort();
        if (names.length === 0) continue;
        const fullSetPath = join(
            __dirname,
            "..",
            "..",
            "node_modules",
            "@iconify-json",
            prefix,
            "icons.json",
        );
        const fullSet = JSON.parse(readFileSync(fullSetPath, "utf8"));
        const subset = getIcons(fullSet, names);
        if (!subset) {
            throw new Error(`No se pudo extraer íconos del set "${prefix}"`);
        }
        const missing = names.filter((name) => !subset.icons[name]);
        if (missing.length) {
            console.warn(
                `[icons:generate] "${prefix}" no tiene estos íconos (revisa el nombre): ${missing.join(", ")}`,
            );
        }
        collections.push(subset);
    }
    return collections;
}

function main() {
    const byPrefix = findUsedIcons();
    const total = Array.from(byPrefix.values()).reduce((n, s) => n + s.size, 0);
    const collections = buildCollections(byPrefix);

    const header =
        "// Generado por `npm run icons:generate` (src/lib/generate-icons.mjs).\n" +
        "// No editar a mano: agrega/quita usos de <Icon icon=\"prefix:name\" />\n" +
        "// en el código y vuelve a correr el script.\n\n" +
        'import type { IconifyJSON } from "@iconify/types";\n\n';
    const body = `export const ICON_COLLECTIONS: IconifyJSON[] = ${JSON.stringify(collections)};\n`;
    writeFileSync(OUTPUT_FILE, header + body);

    console.log(
        `[icons:generate] ${total} íconos únicos, ${collections.length} sets → ${OUTPUT_FILE}`,
    );
}

main();
