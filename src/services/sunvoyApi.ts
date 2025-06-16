import log from "../utils/logger.js";
import { JSDOM } from "jsdom";

const BASE = "https://challenge.sunvoy.com";

/* ------------------------------------------------------------------
 * Helper – extract JSON from page HTML.
 * 1. Works for Next.js  <script id="__NEXT_DATA__">…</script>
 * 2. Fallback: loose   "key": {...}  or  "key": […]   anywhere in HTML
 * ----------------------------------------------------------------- */
function extractJson<T>(html: string, key: string): T | null {
    const nextMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextMatch?.[1]) {
        try {
            const data = JSON.parse(nextMatch[1]);
            const walk = (n: any): any => {
                if (n && typeof n === "object") {
                    if (Object.prototype.hasOwnProperty.call(n, key)) return n[key];
                    for (const v of Object.values(n)) {
                        const found = walk(v);
                        if (found) return found;
                    }
                }
            };
            const found = walk(data);
            if (found) return found as T;
        } catch {
            /* ignore JSON parse errors */
        }
    }

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const genericMatch = html.match(new RegExp(`"${escapeRegex(key)}"\\s*:\\s*([\\[{][\\s\\S]*?[\\]}])`));
    if (genericMatch?.[1]) {
        try {
            return JSON.parse(genericMatch[1]) as T;
        } catch {
            /* ignore JSON parse errors */
        }
    }

    return null;
}

export default class SunvoyApi {
    private cookie?: string;

    constructor(cookie?: string) {
        this.cookie = cookie;
    }

    private async request<T>(endpoint: string): Promise<T> {
        const url = `${BASE}${endpoint}`;
        log("→ GET", endpoint);

        const headers: Record<string, string> = {
            Accept: "application/json",
            Cookie: this.cookie || ""
        };

        const res = await fetch(url, { headers });
        log("←", res.status, endpoint);

        if (!res.ok) throw new Error(`${endpoint} → ${res.status}`);
        return res.json() as Promise<T>;
    }

    private async requestText(endpoint: string): Promise<string> {
        const url = `${BASE}${endpoint}`;
        log("→ GET", endpoint);

        const headers: Record<string, string> = {
            Accept: "text/html",
            Cookie: this.cookie || ""
        };

        const res = await fetch(url, { headers });
        log("←", res.status, endpoint);

        if (!res.ok) throw new Error(`${endpoint} → ${res.status}`);
        return res.text();
    }

    async getUsers(): Promise<any[]> {
        const endpoints = ["/internal/users", "/api/users", "/users", "/admin/users", "/v1/users", "/data/users"];

        for (const ep of endpoints) {
            try {
                const users = await this.request<any[]>(ep);
                if (Array.isArray(users)) return users;
            } catch (e) {
                log(`Endpoint ${ep} failed:`, e instanceof Error ? e.message : "");
            }
        }

        return this.scrapeUsers();
    }

    async getMe(): Promise<any> {
        const endpoints = ["/internal/me", "/api/users/me", "/me", "/settings/me", "/user"];

        for (const ep of endpoints) {
            try {
                const me = await this.request<any>(ep);
                if (me?.id) return me;
            } catch (e) {
                log(`Endpoint ${ep} failed:`, e instanceof Error ? e.message : "");
            }
        }

        return this.scrapeMe();
    }

    private async scrapeMe(): Promise<any> {
        const html = await this.requestText("/settings");
        return this.extractUserData(html);
    }

    private async scrapeUsers(): Promise<any[]> {
        const html = await this.requestText("/settings");
        return this.extractUsersData(html);
    }

    private extractUserData(html: string): any {
        const jsonUser = extractJson<any>(html, "currentUser");
        if (jsonUser?.id) return jsonUser;

        const dom = new JSDOM(html);
        const doc = dom.window.document;

        const script = doc.querySelector("script#user-data");
        if (script?.textContent) {
            try {
                return JSON.parse(script.textContent);
            } catch {
                log("JSON parse failed for user-data script");
            }
        }

        const user: Record<string, string> = {};
        doc.querySelectorAll('meta[name^="user."]').forEach(m => {
            const name = m.getAttribute("name")?.replace("user.", "");
            const content = m.getAttribute("content");
            if (name && content) user[name] = content;
        });
        if (user.id) return user;

        doc.querySelectorAll('input[type="hidden"]').forEach(inp => {
            const name = inp.getAttribute("name");
            const val = inp.getAttribute("value");
            if (name && val && ["id", "name", "email", "role"].includes(name)) user[name] = val;
        });
        if (user.id) return user;

        const profileSel = [".user-profile", ".profile-container", ".user-info", "#user-profile", "#profile"];
        let profile: Element | null = null;
        for (const s of profileSel) {
            profile = doc.querySelector(s);
            if (profile) break;
        }
        if (profile) {
            ["id", "name", "email", "role"].forEach(fld => {
                const dataVal = profile?.getAttribute(`data-user-${fld}`);
                if (dataVal) return (user[fld] = dataVal);

                const el = profile?.querySelector(`[data-user-${fld}]`);
                if (el) return (user[fld] = el.getAttribute(`data-user-${fld}`) || el.textContent?.trim() || "");

                const cls = profile?.querySelector(`.user-${fld}`);
                if (cls) user[fld] = cls.textContent?.trim() || "";
            });
            if (user.id) return user;
        }

        const grab = (sel: string) =>
            doc
                .querySelector(sel)
                ?.getAttribute(sel.startsWith("[") ? Object.keys(doc.querySelector(sel)!.attributes)[0] : "") ||
            doc.querySelector(sel)?.textContent?.trim() ||
            "";

        user.id = user.id || grab("[data-user-id], .user-id");
        user.name = user.name || grab("[data-user-name], .user-name");
        user.email = user.email || grab("[data-user-email], .user-email");
        user.role = user.role || grab("[data-user-role], .user-role");

        if (user.id) return user;

        throw new Error("Could not extract current user from /settings");
    }

    private extractUsersData(html: string): any[] {
        const jsonUsers = extractJson<any[]>(html, "users");
        if (Array.isArray(jsonUsers) && jsonUsers.length) return jsonUsers;

        const dom = new JSDOM(html);
        const doc = dom.window.document;
        const users: any[] = [];

        const script = doc.querySelector("script#users-data");
        if (script?.textContent) {
            try {
                return JSON.parse(script.textContent);
            } catch {
                log("JSON parse failed for users-data script");
            }
        }

        const pushRow = (row: Element) => {
            const u: Record<string, string> = {};
            const grab = (sel: string) =>
                row
                    .querySelector(sel)
                    ?.getAttribute(sel.startsWith("[") ? Object.keys(row.querySelector(sel)!.attributes)[0] : "") ||
                row.querySelector(sel)?.textContent?.trim() ||
                "";
            u.id = grab("[data-user-id]");
            if (!u.id) return;
            u.name = grab("[data-user-name]");
            u.email = grab("[data-user-email]");
            u.role = grab("[data-user-role]");
            users.push(u);
        };

        doc.querySelectorAll("table.user-table tbody > tr, table.users tbody > tr").forEach(pushRow);
        doc.querySelectorAll("ul.user-list li, ol.user-list li, .user-list li").forEach(pushRow);
        doc.querySelectorAll(".user-card, .card-user").forEach(pushRow);

        if (users.length) return users;

        throw new Error("Could not extract users from /settings");
    }

    /* ------------------------------------------------ login helpers --- */
    static async login(creds: { email: string; password: string }): Promise<string> {
        log("Fetching login page");
        const loginGet = await fetch(`${BASE}/login`);
        const pageHtml = await loginGet.text();
        const initialCK = loginGet.headers.get("set-cookie") ?? "";

        /* optional CSRF token */
        const token =
            new JSDOM(pageHtml).window.document.querySelector<HTMLInputElement>('input[name="_token"]')?.value ?? "";

        const body = new URLSearchParams();
        if (token) body.append("_token", token);
        body.append("email", creds.email);
        body.append("password", creds.password);

        log("Submitting login form");
        const loginPost = await fetch(`${BASE}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: initialCK
            },
            body // follow redirects by default
        });

        /* <- grab the entire header string, not split by commas */
        const cookieHeader = (loginPost.headers.get("set-cookie") ?? "") + ";" + initialCK;

        const match = cookieHeader.match(/sunvoy_session=[^;]+/i);
        if (!match) throw new Error("Login failed – sunvoy_session cookie not found");

        log("Received sunvoy_session cookie");
        return match[0]; // e.g.  sunvoy_session=KXbHj…
    }

    private static extractCsrfToken(html: string): string {
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        const meta = doc.querySelector('meta[name="csrf-token"]');
        if (meta) return meta.getAttribute("content") || "";

        const inp = doc.querySelector('input[name="_token"]');
        if (inp) return inp.getAttribute("value") || "";

        return "";
    }
}
