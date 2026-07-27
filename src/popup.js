import {
    els,
    getScope,
    setScope,
    setStatus,
    setCount,
    highlightActiveStat,
    emptyScopeMessage,
    initTheme,
    toggleTheme,
    getFormat,
    setFormat,
} from "./ui.js";
import { isRestrictedUrl } from "./scope.js";
import {
    getCookiesForScope,
    importCookie,
    removeCookie,
} from "./cookies.js";
import { FORMATS, encode, decode } from "./formats.js";
import { buildFilename } from "./serialize.js";

let currentTab = null;

initTheme();
init();

async function init() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tab;

        if (!tab?.url) {
            els.siteInfo.textContent = "no active site";
        } else {
            const u = new URL(tab.url);
            els.siteInfo.textContent = `${u.hostname || u.protocol}${u.pathname === "/" ? "" : u.pathname}`;

            if (isRestrictedUrl(tab.url)) {
                setStatus(
                    `${u.protocol} pages have no cookies — switched to "All cookies"`,
                    "info"
                );
                setScope("all");
            }
        }
    } catch {
        els.siteInfo.textContent = "unable to read active tab";
    }

    highlightActiveStat(getScope());
    setFormat(getFormat());
    wireEvents();
    setStatus("ready");
    refreshCounts();
}

function wireEvents() {
    els.exportBtn.addEventListener("click", onExport);
    els.copyBtn.addEventListener("click", onCopy);
    els.importFile.addEventListener("change", onImportFile);
    els.clearBtn.addEventListener("click", onClear);
    els.themeToggle.addEventListener("click", toggleTheme);

    document.querySelectorAll('input[name="scope"]').forEach((input) => {
        input.addEventListener("change", () => {
            highlightActiveStat(getScope());
        });
    });

    els.stats.forEach((btn) => {
        btn.addEventListener("click", () => setScope(btn.dataset.scope));
    });

    els.formatPills.forEach((btn) => {
        btn.addEventListener("click", () => setFormat(btn.dataset.format));
    });
}

async function refreshCounts() {
    const scopes = ["current", "domain", "all"];
    await Promise.all(
        scopes.map(async (scope) => {
            try {
                const cookies = await getCookiesForScope(scope, currentTab);
                setCount(scope, cookies.length);
            } catch {
                setCount(scope, null);
            }
        })
    );
}

function encodeCurrent(cookies) {
    const format = getFormat();
    return {
        format,
        content: encode(format, cookies, {
            source: currentTab?.url,
            scope: getScope(),
            pretty: els.pretty.checked,
        }),
    };
}

async function onExport() {
    try {
        els.exportBtn.disabled = true;
        setStatus("reading cookies…", "info");
        const scope = getScope();
        const cookies = await getCookiesForScope(scope, currentTab);
        if (cookies.length === 0) {
            setStatus(emptyScopeMessage(scope, currentTab?.url), "err");
            return;
        }
        const { format, content } = encodeCurrent(cookies);
        const { ext, mime, label } = FORMATS[format];
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        await chrome.downloads.download({
            url,
            filename: buildFilename(scope, currentTab?.url, ext),
            saveAs: true,
        });
        setStatus(`exported ${cookies.length} cookie(s) as ${label}`, "ok");
    } catch (err) {
        setStatus(`export failed: ${err.message}`, "err");
    } finally {
        els.exportBtn.disabled = false;
    }
}

async function onCopy() {
    try {
        els.copyBtn.disabled = true;
        const scope = getScope();
        const cookies = await getCookiesForScope(scope, currentTab);
        if (cookies.length === 0) {
            setStatus(emptyScopeMessage(scope, currentTab?.url), "err");
            return;
        }
        const { format, content } = encodeCurrent(cookies);
        const { label } = FORMATS[format];
        await navigator.clipboard.writeText(content);
        setStatus(`copied ${cookies.length} cookie(s) as ${label}`, "ok");
    } catch (err) {
        setStatus(`copy failed: ${err.message}`, "err");
    } finally {
        els.copyBtn.disabled = false;
    }
}

async function onImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
        setStatus(`reading ${file.name}…`, "info");
        const text = await file.text();
        const { format, cookies } = decode(text);
        const overwrite = els.overwrite.checked;

        // Header/incomplete cookies need a fallback context from the active tab.
        const tabHost = safeUrl(currentTab?.url);
        const needsFallback = format === "header";

        let ok = 0;
        let failed = 0;
        for (const raw of cookies) {
            try {
                const c = needsFallback && tabHost
                    ? { ...raw, domain: raw.domain || tabHost.hostname, path: raw.path || "/", secure: raw.secure ?? (tabHost.protocol === "https:") }
                    : raw;
                await importCookie(c, { overwrite });
                ok++;
            } catch {
                failed++;
            }
        }
        setStatus(
            `imported ${ok} (${FORMATS[format].label}), failed ${failed}`,
            failed ? "err" : "ok"
        );
        refreshCounts();
    } catch (err) {
        setStatus(`import failed: ${err.message}`, "err");
    } finally {
        event.target.value = "";
    }
}

function safeUrl(u) {
    try {
        return u ? new URL(u) : null;
    } catch {
        return null;
    }
}

async function onClear() {
    const scope = getScope();
    if (!confirm(`This will delete cookies in scope: "${scope}". Continue?`)) {
        return;
    }

    try {
        els.clearBtn.disabled = true;
        const cookies = await getCookiesForScope(scope, currentTab);
        let removed = 0;
        for (const c of cookies) {
            try {
                await removeCookie(c);
                removed++;
            } catch {
                /* ignore */
            }
        }
        setStatus(`deleted ${removed} cookie(s)`, "ok");
        refreshCounts();
    } catch (err) {
        setStatus(`delete failed: ${err.message}`, "err");
    } finally {
        els.clearBtn.disabled = false;
    }
}
