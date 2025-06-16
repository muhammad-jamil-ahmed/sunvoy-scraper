# Sunvoy Scraper 🛰️

A TypeScript‑based CLI tool that logs in to **challenge.sunvoy.com**, pulls the current user plus all users returned by the hidden API/Next.js payload, and writes them to `users.json`.

---

## Demo

[Watch the demo on Loom](https://www.loom.com/share/4a0ec1ffe64f4593ab61c73538e4efc4?sid=b1ba5b60-1bb0-453f-b50d-a41329d4a223)

---

## Quick start

```bash
# install deps
npm ci

# build ➜ dist/
npm run build

# run with verbose logs
SCRAPER_DEBUG=1 npm start

# inspect output (should be 10 users)
jq '. | length' users.json  # → 10
```

---

## Project structure

```
src/
  adapters/       # FS persistence helpers
  services/       # Sunvoy API + auth session management
  utils/          # tiny logger
  main.ts         # orchestrator

users.json        # output file
.session          # cached cookie
```

---
