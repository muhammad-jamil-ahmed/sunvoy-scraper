import { readFile, writeFile, rename } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const SESSION_F = path.join(root, ".session");
const USERS_F = path.join(root, "users.json");

export const FsStorage = {
    async readSession(): Promise<string | null> {
        try {
            return await readFile(SESSION_F, "utf8");
        } catch {
            return null;
        }
    },

    async writeSession(cookie: string): Promise<void> {
        await writeFile(SESSION_F, cookie, "utf8");
    },

    async writeUsers(arr: unknown[]): Promise<void> {
        const tmp = `${USERS_F}.tmp`;
        await writeFile(tmp, JSON.stringify(arr, null, 2));
        await rename(tmp, USERS_F);
    }
};
