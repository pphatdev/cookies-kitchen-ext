export function serialize(cookies, { source, scope, pretty }) {
    const payload = {
        exportedAt: new Date().toISOString(),
        source: source ?? null,
        scope,
        count: cookies.length,
        cookies,
    };
    return JSON.stringify(payload, null, pretty ? 2 : 0);
}

export function parseImportFile(text) {
    const data = JSON.parse(text);
    const cookies = Array.isArray(data) ? data : data.cookies;
    if (!Array.isArray(cookies)) {
        throw new Error("Invalid file: expected an array or { cookies: [...] }.");
    }
    return cookies;
}

export function buildFilename(scope, tabUrl) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    let label = "all";
    if (scope !== "all" && tabUrl) {
        try {
            label = new URL(tabUrl).hostname;
        } catch {
            label = "cookies";
        }
    }
    return `cookies_${label}_${ts}.json`;
}
