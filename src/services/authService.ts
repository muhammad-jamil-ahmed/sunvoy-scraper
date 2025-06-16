import SunvoyApi from "./sunvoyApi.js";
import FsStorage from "../adapters/fsStorage.js";
import log from "../utils/logger.js";

const CREDENTIALS = {
    email: "demo@example.org",
    password: "test"
};

export default async function ensureSession(): Promise<SunvoyApi> {
    let cookie = await FsStorage.readSession();
    let api = new SunvoyApi(cookie ?? undefined);

    if (cookie) {
        try {
            await api.getMe(); // ensures session still valid
            log("Using existing session");
            return api;
        } catch {
            log("Stored session expired – re-logging in");
        }
    }

    cookie = await SunvoyApi.login(CREDENTIALS);
    await FsStorage.writeSession(cookie);
    log("New session created");

    api = new SunvoyApi(cookie);
    return api;
}
