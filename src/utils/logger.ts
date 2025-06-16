export default function log(...args: any[]) {
    if (process.env.SCRAPER_DEBUG) {
        console.log("[scraper]", ...args);
    }
}
