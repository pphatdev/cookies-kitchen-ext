import { RESTRICTED_SCHEMES, baseDomain } from "./scope.js";

export async function getCookiesForScope(scope, tab) {
    if (scope === "all") {
        const stores = await chrome.cookies.getAllCookieStores();
        if (stores.length === 0) {
            return await chrome.cookies.getAll({});
        }
        const results = await Promise.all(
            stores.map((s) => chrome.cookies.getAll({ storeId: s.id }))
        );
        return results.flat();
    }

    if (!tab?.url) {
        throw new Error("No active tab. Open a website tab first.");
    }

    const url = new URL(tab.url);
    if (RESTRICTED_SCHEMES.has(url.protocol)) {
        throw new Error(
            `Active tab uses ${url.protocol} — no cookies exist here. Switch to a website tab.`
        );
    }

    if (scope === "current") {
        return await chrome.cookies.getAll({ url: tab.url });
    }

    if (scope === "domain") {
        return await chrome.cookies.getAll({ domain: baseDomain(url.hostname) });
    }

    return [];
}

export async function importCookie(cookie, { overwrite } = { overwrite: true }) {
    const url = cookieUrl(cookie);

    if (overwrite) {
        try {
            await chrome.cookies.remove({
                url,
                name: cookie.name,
                storeId: cookie.storeId,
            });
        } catch {
            /* ignore */
        }
    }

    const details = {
        url,
        name: cookie.name,
        value: cookie.value,
        path: cookie.path || "/",
        secure: !!cookie.secure,
        httpOnly: !!cookie.httpOnly,
        sameSite: normalizeSameSite(cookie.sameSite),
        storeId: cookie.storeId,
    };

    if (cookie.domain && !cookie.hostOnly) {
        details.domain = cookie.domain;
    }
    if (typeof cookie.expirationDate === "number" && !cookie.session) {
        details.expirationDate = cookie.expirationDate;
    }

    return await chrome.cookies.set(details);
}

export async function removeCookie(cookie) {
    return await chrome.cookies.remove({
        url: cookieUrl(cookie),
        name: cookie.name,
        storeId: cookie.storeId,
    });
}

export function cookieUrl(cookie) {
    const protocol = cookie.secure ? "https:" : "http:";
    const host = (cookie.domain || "").replace(/^\./, "");
    const path = cookie.path || "/";
    return `${protocol}//${host}${path}`;
}

function normalizeSameSite(v) {
    const allowed = ["no_restriction", "lax", "strict", "unspecified"];
    return allowed.includes(v) ? v : "unspecified";
}
