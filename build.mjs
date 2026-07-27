// Universal build: emits dist/<target>/ for each supported browser family.
// Usage: node build.mjs [chromium|firefox|safari|all]  (default: all)
import {
    mkdirSync,
    cpSync,
    copyFileSync,
    existsSync,
    rmSync,
    readdirSync,
    writeFileSync,
    readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const distRoot = join(root, "dist");

const SHARED_DIRS = ["src"];
const SHARED_FILES = ["background.js", "popup.html", "popup.css"];

const targets = {
    chromium: {
        manifest: "manifest.json",
        note: "Load unpacked in Chrome/Edge/Brave/Opera/Vivaldi/Arc: chrome://extensions",
    },
    firefox: {
        manifest: "manifest.firefox.json",
        note: "about:debugging#/runtime/this-firefox → Load Temporary Add-on",
    },
    safari: {
        manifest: "manifest.json",
        note: "Requires macOS + Xcode. After building, run: xcrun safari-web-extension-converter dist/safari",
    },
};

function copyExtensionInto(outDir, manifestFile) {
    if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    for (const d of SHARED_DIRS) {
        cpSync(join(root, d), join(outDir, d), { recursive: true });
    }
    for (const f of SHARED_FILES) {
        copyFileSync(join(root, f), join(outDir, f));
    }

    const iconsOut = join(outDir, "icons");
    mkdirSync(iconsOut, { recursive: true });
    for (const name of readdirSync(join(root, "icons"))) {
        if (name.endsWith(".png")) {
            copyFileSync(join(root, "icons", name), join(iconsOut, name));
        }
    }

    copyFileSync(join(root, manifestFile), join(outDir, "manifest.json"));
}

function build(target) {
    const spec = targets[target];
    if (!spec) throw new Error(`Unknown target: ${target}`);
    const outDir = join(distRoot, target);
    copyExtensionInto(outDir, spec.manifest);
    console.log(`✓ ${target.padEnd(9)} → ${outDir}`);
    console.log(`  ${spec.note}`);
}

const arg = (process.argv[2] || "all").toLowerCase();
if (arg === "all") {
    for (const t of Object.keys(targets)) build(t);
} else {
    build(arg);
}
