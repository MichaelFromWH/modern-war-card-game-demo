Original prompt: 这个项目我现在想部署到线上能跟我的朋友1v1对局，还需要做哪些事情，你能帮我推进么

## 2026-05-21

- Goal: move the current local single-player/AI WebDemo toward online 1v1 play.
- Finding: current app is a browser-side game with AI opponent. `server.js` only serves static files, and `src/main.js` owns battle state, shuffling, actions, AI, and rendering in one client.
- Architecture decision: GitHub Pages/static hosting is enough for a public demo, but not enough for true 1v1. Use a Node web service that serves the app and also hosts a WebSocket room server.
- First implementation slice: add online deployment/multiplayer planning docs and a non-invasive WebSocket room foundation. Preserve current local single-player behavior.
- TODO after foundation: extract pure battle engine from `src/main.js`, add deterministic seeded battle creation, define action protocol, make server authoritative, add create/join room UI, then test two-browser 1v1 flows.
- Implemented first slice:
  - Added `ws` dependency.
  - Added `/healthz` endpoint.
  - Added `/ws` WebSocket room server with create/join/leave/ready/chat/game_action forwarding.
  - Added `online_1v1_roadmap.md`.
- Verification:
  - `PORT=3123 npm start` starts successfully.
  - `curl -I http://localhost:3123/` returns 200.
  - `curl http://localhost:3123/healthz` returns `{ "ok": true }`.
  - Two Node WebSocket clients can create and join a room, set ready, and both receive `match_ready`.
- Playwright note:
  - The web game Playwright client could not run because the local Playwright Chromium v1217 browser was missing.
  - Attempted install was very slow and was stopped at about 30%; UI screenshot validation should be retried before frontend UI changes.
- Implemented Phase 2 lobby foundation:
  - Added `online-panel` to `index.html`.
  - Added browser WebSocket connection, create room, join room, ready toggle, copy code, and leave room actions in `src/main.js`.
  - Added responsive online lobby styling in `styles.css`.
  - Added `render.yaml` for Render Web Service deployment.
- Verification:
  - `node --check src/main.js` passes.
  - `node --check server.js` passes.
  - Local service on port 3000 starts and `/healthz` returns ok.
  - WebSocket script still confirms create/join/ready -> `match_ready`.
  - Browser visual check in Chrome confirms the online panel appears on the home page.
  - Browser click check confirms `创建房间` creates a room code and `离开/断开` returns to idle; `/healthz` returns rooms/sockets to 0.
- Added invite-link quality-of-life:
  - Copy now uses a URL with `?room=<code>`.
  - Opening a link with `?room=AB12CD` auto-fills the room code and scrolls/focuses the online panel.
  - Browser check confirmed the invite room code auto-fill behavior.
