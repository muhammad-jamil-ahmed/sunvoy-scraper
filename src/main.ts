import ensureSession from "./services/authService.js";
import SunvoyApi from "./services/sunvoyApi.js";
import FsStorage from "./adapters/fsStorage.js";

async function main() {
    try {
        const api = await ensureSession();

        // Get current user
        const me = await api.getMe();

        // Get all users
        const users = await api.getUsers();

        // Combine and save
        const allUsers = [...users, me];
        await FsStorage.writeUsers(allUsers);
        console.log("✅ Data saved successfully!");
    } catch (error) {
        console.error("❌ Error:", error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

main();
