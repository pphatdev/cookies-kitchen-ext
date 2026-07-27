import { baseDomainSafe } from "./scope.js";

export const els = {
    siteInfo: document.getElementById("site-info"),
    exportBtn: document.getElementById("export-btn"),
    copyBtn: document.getElementById("copy-btn"),
    importFile: document.getElementById("import-file"),
    clearBtn: document.getElementById("clear-btn"),
    statusEl: document.getElementById("status"),
    statusMsg: document.getElementById("status-msg"),
    pretty: document.getElementById("pretty"),
    overwrite: document.getElementById("overwrite"),
    themeToggle: document.getElementById("theme-toggle"),
    counts: {
        current: document.getElementById("count-current"),
        domain: document.getElementById("count-domain"),
        all: document.getElementById("count-all"),
    },
    stats: document.querySelectorAll(".stat"),
    formatPills: document.querySelectorAll(".format-pill"),
};

let currentFormat = "json";

export function getFormat() {
    return currentFormat;
}

export function setFormat(format) {
    currentFormat = format;
    els.formatPills.forEach((btn) => {
        btn.dataset.active = btn.dataset.format === format ? "true" : "false";
    });
}

export function getScope() {
    return document.querySelector('input[name="scope"]:checked').value;
}

export function setScope(value) {
    const input = document.querySelector(`input[name="scope"][value="${value}"]`);
    if (input) {
        input.checked = true;
        highlightActiveStat(value);
    }
}

export function highlightActiveStat(scope) {
    els.stats.forEach((btn) => {
        btn.dataset.active = btn.dataset.scope === scope ? "true" : "false";
    });
}

export function setStatus(msg, kind = "info") {
    els.statusMsg.textContent = msg;
    els.statusEl.dataset.kind = kind;
}

export function setCount(scope, value) {
    const el = els.counts[scope];
    if (!el) return;
    if (value === null || value === undefined) {
        el.textContent = "—";
    } else if (value >= 1000) {
        el.textContent = `${(value / 1000).toFixed(1)}k`;
    } else {
        el.textContent = String(value);
    }
}

export function emptyScopeMessage(scope, tabUrl) {
    if (scope === "all") {
        return "no cookies found in any store";
    }
    let where = "the active tab";
    try {
        if (tabUrl) where = new URL(tabUrl).hostname;
    } catch {
        /* ignore */
    }
    if (scope === "current") {
        return `no cookies match ${where} — try "Entire domain"`;
    }
    return `no cookies found for ${baseDomainSafe(where)}`;
}

const THEME_KEY = "cookies-kitchen:theme";

export function initTheme() {
    let theme = "auto";
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === "light" || saved === "dark") theme = saved;
    } catch {
        /* ignore */
    }
    applyTheme(theme);
}

export function toggleTheme() {
    // Flip based on what's actually rendered, not the stored setting —
    // so "auto" resolves to its visible mode first, then flips.
    const next = resolvedTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
        localStorage.setItem(THEME_KEY, next);
    } catch {
        /* ignore */
    }
}

function resolvedTheme() {
    const set = document.body.dataset.theme;
    if (set === "light" || set === "dark") return set;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function applyTheme(theme) {
    document.body.dataset.theme = theme;
    if (els.themeToggle) {
        const shown = resolvedTheme();
        els.themeToggle.title =
            shown === "dark" ? "Dark — click for light" : "Light — click for dark";
    }
}
