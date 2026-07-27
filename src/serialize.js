export function buildFilename(scope, tabUrl, ext = "json") {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    let label = "all";
    if (scope !== "all" && tabUrl) {
        try {
            label = new URL(tabUrl).hostname;
        } catch {
            label = "cookies";
        }
    }
    return `cookies_${label}_${ts}.${ext}`;
}
