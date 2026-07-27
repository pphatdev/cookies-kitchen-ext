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
} from "./ui.js";
import { isRestrictedUrl } from "./scope.js";
import {
    getCookiesForScope,
    importCookie,
    removeCookie,
} from "./cookies.js";
import { serialize, parseImportFile, buildFilename } from "./serialize.js";

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
        input.addEventListener("change", () => highlightActiveStat(getScope()));
    });

    els.stats.forEach((btn) => {
        btn.addEventListener("click", () => setScope(btn.dataset.scope));
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
        const json = serialize(cookies, {
            source: currentTab?.url,
            scope,
            pretty: els.pretty.checked,
        });
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        await chrome.downloads.download({
            url,
            filename: buildFilename(scope, currentTab?.url),
            saveAs: true,
        });
        setStatus(`exported ${cookies.length} cookie(s)`, "ok");
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
        const json = serialize(cookies, {
            source: currentTab?.url,
            scope,
            pretty: els.pretty.checked,
        });
        await navigator.clipboard.writeText(json);
        setStatus(`copied ${cookies.length} cookie(s) to clipboard`, "ok");
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
        const cookies = parseImportFile(await file.text());
        const overwrite = els.overwrite.checked;

        let ok = 0;
        let failed = 0;
        for (const c of cookies) {
            try {
                await importCookie(c, { overwrite });
                ok++;
            } catch {
                failed++;
            }
        }
        setStatus(
            `imported ${ok}, failed ${failed}`,
            failed ? "err" : "ok"
        );
        refreshCounts();
    } catch (err) {
        setStatus(`import failed: ${err.message}`, "err");
    } finally {
        event.target.value = "";
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
