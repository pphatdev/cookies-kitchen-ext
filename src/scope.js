export const RESTRICTED_SCHEMES = new Set([
    "chrome:",
    "chrome-extension:",
    "edge:",
    "about:",
    "view-source:",
    "devtools:",
    "file:",
]);

export function baseDomain(hostname) {
    const parts = hostname.split(".").filter(Boolean);
    if (parts.length <= 2) return hostname;
    return parts.slice(-2).join(".");
}

export function baseDomainSafe(hostname) {
    try {
        return baseDomain(hostname);
    } catch {
        return hostname;
    }
}

export function isRestrictedUrl(url) {
    try {
        return RESTRICTED_SCHEMES.has(new URL(url).protocol);
    } catch {
        return true;
    }
}
