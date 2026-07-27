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
};

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
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === "light" || saved === "dark") {
            document.body.dataset.theme = saved;
        }
    } catch {
        /* ignore */
    }
}

export function toggleTheme() {
    const current = document.body.dataset.theme;
    const next =
        current === "dark"
            ? "light"
            : current === "light"
                ? "auto"
                : "dark";
    document.body.dataset.theme = next;
    try {
        if (next === "auto") localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, next);
    } catch {
        /* ignore */
    }
}
