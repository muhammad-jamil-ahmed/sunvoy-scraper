import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, "../../.session");
const USERS_FILE = path.join(__dirname, "../../users.json");

export default {
    async readSession(): Promise<string | null> {
        try {
            return await readFile(SESSION_FILE, "utf8");
        } catch {
            return null;
        }
    },

    async writeSession(cookie: string): Promise<void> {
        await writeFile(SESSION_FILE, cookie, "utf8");
    },

    async writeUsers(users: any[]): Promise<void> {
        await writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    }
};
