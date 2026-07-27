chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        console.log("Cookies Kitchen installed.");
    }
});

export { };
