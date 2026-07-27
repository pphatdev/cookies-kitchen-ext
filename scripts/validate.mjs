// Validates both manifests: schema shape, referenced files exist.
// Runs in CI and locally via: npm run validate
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let hadError = false;

function fail(msg) {
    console.error(`✗ ${msg}`);
    hadError = true;
}

function ok(msg) {
    console.log(`✓ ${msg}`);
}

const REQUIRED_TOP = ["manifest_version", "name", "version", "action", "icons"];
const REQUIRED_MV3 = 3;

function validateManifest(file) {
    const path = join(root, file);
    if (!existsSync(path)) {
        fail(`${file} missing`);
        return;
    }

    let manifest;
    try {
        manifest = JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
        fail(`${file}: invalid JSON — ${err.message}`);
        return;
    }

    for (const key of REQUIRED_TOP) {
        if (!(key in manifest)) fail(`${file}: missing "${key}"`);
    }

    if (manifest.manifest_version !== REQUIRED_MV3) {
        fail(`${file}: manifest_version must be ${REQUIRED_MV3}, got ${manifest.manifest_version}`);
    }

    if (!manifest.background) {
        fail(`${file}: missing "background"`);
    } else if (file.includes("firefox")) {
        if (!Array.isArray(manifest.background.scripts) || manifest.background.scripts.length === 0) {
            fail(`${file}: Firefox background must use "scripts" array`);
        }
    } else {
        if (!manifest.background.service_worker) {
            fail(`${file}: Chromium background must set "service_worker"`);
        }
    }

    // Collect every referenced file: popup, background, icons.
    const refs = new Set();
    if (manifest.action?.default_popup) refs.add(manifest.action.default_popup);
    if (manifest.background?.service_worker) refs.add(manifest.background.service_worker);
    if (Array.isArray(manifest.background?.scripts)) {
        manifest.background.scripts.forEach((s) => refs.add(s));
    }
    for (const p of Object.values(manifest.icons || {})) refs.add(p);
    for (const p of Object.values(manifest.action?.default_icon || {})) refs.add(p);

    let missing = 0;
    for (const p of refs) {
        if (!existsSync(join(root, p))) {
            fail(`${file}: references missing file "${p}"`);
            missing++;
        }
    }
    if (missing === 0) ok(`${file}: ${refs.size} referenced file(s) exist`);

    // Cookies + host permissions sanity
    if (!manifest.permissions?.includes("cookies")) {
        fail(`${file}: missing "cookies" permission`);
    }
    if (!manifest.host_permissions?.length) {
        fail(`${file}: host_permissions is empty`);
    }
}

for (const f of ["manifest.json", "manifest.firefox.json"]) {
    validateManifest(f);
}

if (hadError) {
    console.error("\nValidation failed.");
    process.exit(1);
}
console.log("\nAll manifests valid.");
