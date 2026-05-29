import { randomBytes } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { WebSocket, WebSocketServer } from "ws";
import {
  applyBattleAction,
  createAuthoritativeBattle,
  createBattleSnapshot,
} from "./src/online-battle-engine.js";

const rootDir = resolve(process.cwd(), process.env.ROOT_DIR || ".");
const port = Number(process.env.PORT || 3000);
const roomTtlMs = Number(process.env.ROOM_TTL_MS || 1000 * 60 * 60 * 6);
const heartbeatMs = Number(process.env.WS_HEARTBEAT_MS || 30000);
const roomResumeGraceMs = Number(process.env.ROOM_RESUME_GRACE_MS || 1000 * 60 * 3);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const rooms = new Map();
const sockets = new Map();

const server = createServer((request, response) => {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;

  if (pathname === "/healthz") {
    const payload = JSON.stringify({
      ok: true,
      rooms: rooms.size,
      sockets: sockets.size,
    });
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(payload),
      "Cache-Control": "no-store",
    });
    response.end(payload);
    return;
  }

  if (pathname === "/favicon.ico") {
    response.writeHead(204, {
      "Cache-Control": "public, max-age=86400",
    });
    response.end();
    return;
  }

  const filePath = resolvePath(request.url || "/");

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const stats = statSync(filePath);
  const type = contentTypes[extname(filePath)] || "application/octet-stream";
  const cacheControl = getCacheControl(pathname, type);
  const etag = createEtag(stats);
  const lastModified = stats.mtime.toUTCString();
  if (isFresh(request, etag, stats.mtime)) {
    response.writeHead(304, {
      "Cache-Control": cacheControl,
      ETag: etag,
      "Last-Modified": lastModified,
    });
    response.end();
    return;
  }
  response.writeHead(200, {
    "Content-Type": type,
    "Content-Length": stats.size,
    "Cache-Control": cacheControl,
    ETag: etag,
    "Last-Modified": lastModified,
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  if (pathname !== "/ws") {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws) => {
  const client = {
    id: createClientId(),
    ws,
    roomCode: null,
    side: null,
    name: "Player",
    ready: false,
    loadout: null,
    alive: true,
    connected: true,
    canResume: false,
    resumeToken: null,
    resumeUntil: 0,
  };

  sockets.set(client.id, client);
  send(client, "connected", {
    clientId: client.id,
    protocol: "warzone-1v1.v1",
  });

  ws.on("pong", () => {
    client.alive = true;
  });

  ws.on("message", (raw) => {
    handleSocketMessage(client, raw);
  });

  ws.on("close", () => {
    handleClientDisconnect(client);
  });

  ws.on("error", () => {
    handleClientDisconnect(client);
  });
});

const heartbeat = setInterval(() => {
  for (const client of sockets.values()) {
    if (!client.alive) {
      client.ws.terminate();
      continue;
    }
    client.alive = false;
    client.ws.ping();
  }
  pruneRooms();
}, heartbeatMs);

heartbeat.unref?.();

server.listen(port, () => {
  console.log(`Warzone immersive card game is running at http://localhost:${port}`);
  console.log(`1v1 room websocket endpoint is ws://localhost:${port}/ws`);
});

function handleSocketMessage(client, raw) {
  let message;
  try {
    message = JSON.parse(String(raw));
  } catch {
    sendError(client, "invalid_json", "Message must be valid JSON.");
    return;
  }

  if (!message || typeof message.type !== "string") {
    sendError(client, "invalid_message", "Message type is required.");
    return;
  }

  if (message.type === "ping") {
    send(client, "pong", { now: Date.now() });
    return;
  }

  if (message.type === "enable_resume") {
    enableResume(client, message);
    return;
  }

  if (message.type === "resume_room") {
    resumeRoomForClient(client, message);
    return;
  }

  if (message.type === "create_room") {
    createRoomForClient(client, message);
    return;
  }

  if (message.type === "join_room") {
    joinRoomForClient(client, message);
    return;
  }

  if (message.type === "leave_room") {
    leaveRoom(client);
    send(client, "left_room", {});
    return;
  }

  if (message.type === "ready") {
    setReady(client, Boolean(message.ready), message.loadout);
    return;
  }

  if (message.type === "battle_enter") {
    sendBattleSnapshotToClient(client);
    return;
  }

  if (message.type === "battle_action") {
    handleBattleAction(client, message.action);
    return;
  }

  if (message.type === "game_action") {
    forwardGameAction(client, message);
    return;
  }

  if (message.type === "chat") {
    forwardChat(client, message);
    return;
  }

  sendError(client, "unknown_type", `Unknown message type: ${message.type}`);
}

function createRoomForClient(client, message) {
  leaveRoom(client);

  const room = {
    code: createRoomCode(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    clients: new Map(),
    events: [],
    match: null,
    battle: null,
  };

  rooms.set(room.code, room);
  attachClientToRoom(room, client, "player", message.name);
  send(client, "room_created", { roomCode: room.code, side: client.side, resumeToken: client.resumeToken || null });
  broadcastRoomState(room);
}

function joinRoomForClient(client, message) {
  const code = normalizeRoomCode(message.roomCode);
  const room = rooms.get(code);
  if (!room) {
    sendError(client, "room_not_found", "Room was not found.");
    return;
  }

  if (room.clients.size >= 2 && !room.clients.has(client.id)) {
    sendError(client, "room_full", "Room already has two players.");
    return;
  }

  leaveRoom(client);
  const side = room.clients.size === 0 ? "player" : "enemy";
  attachClientToRoom(room, client, side, message.name);
  send(client, "room_joined", { roomCode: room.code, side: client.side, resumeToken: client.resumeToken || null });
  broadcastRoomState(room);
}

function attachClientToRoom(room, client, side, name) {
  if (client.canResume && !client.resumeToken) {
    client.resumeToken = createResumeToken();
  }
  client.roomCode = room.code;
  client.side = side;
  client.ready = false;
  client.loadout = null;
  client.name = sanitizeName(name);
  client.connected = true;
  client.resumeUntil = 0;
  room.clients.set(client.id, client);
  room.updatedAt = Date.now();
}

function leaveRoom(client) {
  removeClientFromRoom(client, { resetBattle: true });
}

function removeClientFromRoom(client, { resetBattle = true } = {}) {
  if (!client.roomCode) {
    return;
  }

  const room = rooms.get(client.roomCode);
  if (room) {
    room.clients.delete(client.id);
    room.updatedAt = Date.now();
    if (resetBattle) {
      room.match = null;
      room.battle = null;
    }
    broadcastRoomState(room);
    if (!room.clients.size) {
      rooms.delete(room.code);
    }
  }

  client.roomCode = null;
  client.side = null;
  client.ready = false;
  client.loadout = null;
  client.connected = true;
  client.resumeUntil = 0;
}

function handleClientDisconnect(client) {
  sockets.delete(client.id);
  if (client.canResume && client.roomCode) {
    reserveClientForResume(client);
    return;
  }

  leaveRoom(client);
}

function enableResume(client, message) {
  client.canResume = true;
  const requestedToken = sanitizeResumeToken(message.resumeToken);
  client.resumeToken = requestedToken || client.resumeToken || createResumeToken();
  send(client, "resume_ready", {
    resumeToken: client.resumeToken,
    roomCode: client.roomCode,
    side: client.side,
    graceMs: roomResumeGraceMs,
  });
}

function reserveClientForResume(client) {
  const room = getClientRoom(client);
  if (!room || !room.clients.has(client.id)) {
    leaveRoom(client);
    return;
  }

  client.connected = false;
  client.alive = false;
  client.ws = null;
  client.resumeUntil = Date.now() + roomResumeGraceMs;
  room.updatedAt = Date.now();
  broadcastRoomState(room);
}

function resumeRoomForClient(client, message) {
  const code = normalizeRoomCode(message.roomCode);
  const token = sanitizeResumeToken(message.resumeToken);
  const room = rooms.get(code);
  if (!room || !token) {
    sendError(client, "resume_not_found", "Room resume data was not found.");
    return;
  }

  const reserved = [...room.clients.values()].find((item) => item.resumeToken === token && item.canResume);
  if (!reserved) {
    sendError(client, "resume_not_found", "Room resume data was not found.");
    return;
  }

  if (reserved.connected !== false) {
    sendError(client, "resume_slot_active", "That room seat is still connected.");
    return;
  }

  const transientId = client.id;
  leaveRoom(client);
  sockets.delete(transientId);
  room.clients.delete(reserved.id);

  client.id = reserved.id;
  client.roomCode = room.code;
  client.side = reserved.side;
  client.name = sanitizeName(message.name || reserved.name);
  client.ready = reserved.ready;
  client.loadout = reserved.loadout;
  client.connected = true;
  client.canResume = true;
  client.resumeToken = reserved.resumeToken;
  client.resumeUntil = 0;
  client.alive = true;

  room.clients.set(client.id, client);
  room.updatedAt = Date.now();
  sockets.set(client.id, client);

  send(client, "room_resumed", { clientId: client.id, roomCode: room.code, side: client.side, resumeToken: client.resumeToken });
  broadcastRoomState(room);
  if (room.match) {
    const payload = {
      roomCode: room.code,
      match: room.match,
      sides: getRoomPlayers(room),
    };
    send(client, "match_ready", payload);
    send(client, "match_start", payload);
  }
  if (room.battle) {
    sendBattleSnapshotToClient(client);
  }
}

function setReady(client, ready, loadout) {
  const room = getClientRoom(client);
  if (!room) {
    sendError(client, "not_in_room", "Join a room before setting ready state.");
    return;
  }

  client.ready = ready;
  client.loadout = ready ? sanitizeLoadout(loadout) : null;
  if (!ready) {
    room.match = null;
    room.battle = null;
  }
  room.updatedAt = Date.now();
  broadcastRoomState(room);

  if (room.clients.size === 2 && [...room.clients.values()].every((item) => item.connected !== false && item.ready)) {
    room.match ||= createRoomMatch(room);
    room.battle ||= createAuthoritativeBattle({
      roomCode: room.code,
      match: room.match,
      players: [...room.clients.values()],
    });
    const payload = {
      roomCode: room.code,
      match: room.match,
      sides: getRoomPlayers(room),
    };
    broadcast(room, "match_ready", payload);
    broadcast(room, "match_start", payload);
    broadcastBattleSnapshots(room);
  }
}

function handleBattleAction(client, action) {
  const room = getClientRoom(client);
  if (!room) {
    sendError(client, "not_in_room", "Join a room before sending battle actions.");
    return;
  }
  if (!room.battle) {
    sendError(client, "battle_not_ready", "The battle is not ready yet.");
    return;
  }

  const result = applyBattleAction(room.battle, client.side, action);
  room.updatedAt = Date.now();
  if (!result.ok) {
    sendError(client, "battle_action_rejected", result.error || "Battle action was rejected.");
  }
  broadcastBattleSnapshots(room);
}

function forwardGameAction(client, message) {
  const room = getClientRoom(client);
  if (!room) {
    sendError(client, "not_in_room", "Join a room before sending game actions.");
    return;
  }

  if (!message.action || typeof message.action !== "object") {
    sendError(client, "invalid_action", "Game action payload is required.");
    return;
  }

  const event = {
    id: `${Date.now()}-${room.events.length + 1}`,
    side: client.side,
    action: message.action,
  };
  room.events.push(event);
  room.events = room.events.slice(-200);
  room.updatedAt = Date.now();

  broadcast(room, "game_action", event, client.id);
}

function forwardChat(client, message) {
  const room = getClientRoom(client);
  if (!room) {
    sendError(client, "not_in_room", "Join a room before sending chat.");
    return;
  }

  const text = String(message.text || "").slice(0, 280).trim();
  if (!text) {
    return;
  }

  broadcast(room, "chat", {
    side: client.side,
    name: client.name,
    text,
    at: Date.now(),
  });
}

function getClientRoom(client) {
  return client.roomCode ? rooms.get(client.roomCode) : null;
}

function broadcastRoomState(room) {
  if (!room.clients.size) {
    return;
  }

  for (const client of room.clients.values()) {
    send(client, "room_state", {
      roomCode: room.code,
      ownSide: client.side,
      players: getRoomPlayers(room),
      match: room.match,
      battleStatus: room.battle?.status || null,
    });
  }
}

function sendBattleSnapshotToClient(client) {
  const room = getClientRoom(client);
  if (!room?.battle) {
    sendError(client, "battle_not_ready", "The battle is not ready yet.");
    return;
  }
  send(client, "battle_snapshot", createBattleSnapshot(room.battle, client.side));
}

function broadcastBattleSnapshots(room) {
  if (!room?.battle) {
    return;
  }
  for (const client of room.clients.values()) {
    send(client, "battle_snapshot", createBattleSnapshot(room.battle, client.side));
  }
}

function getRoomPlayers(room) {
  return [...room.clients.values()].map((client) => ({
    id: client.id,
    side: client.side,
    name: client.name,
    ready: client.ready,
    connected: client.connected !== false,
    loadout: summarizeLoadout(client.loadout),
  }));
}

function broadcast(room, type, payload = {}, exceptClientId = null) {
  for (const client of room.clients.values()) {
    if (client.id === exceptClientId) {
      continue;
    }
    send(client, type, payload);
  }
}

function send(client, type, payload = {}) {
  if (!client.ws || client.ws.readyState !== WebSocket.OPEN) {
    return;
  }
  client.ws.send(JSON.stringify({ type, ...payload }));
}

function sendError(client, code, message) {
  send(client, "error", { code, message });
}

function pruneRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    expireDisconnectedClients(room, now);
    if (!room.clients.size || now - room.updatedAt > roomTtlMs) {
      for (const client of room.clients.values()) {
        send(client, "room_closed", { roomCode: code });
        client.roomCode = null;
        client.side = null;
        client.ready = false;
        client.loadout = null;
      }
      rooms.delete(code);
    }
  }
}

function expireDisconnectedClients(room, now) {
  let removed = false;
  for (const client of [...room.clients.values()]) {
    if (client.connected !== false || !client.resumeUntil || client.resumeUntil > now) {
      continue;
    }

    room.clients.delete(client.id);
    client.roomCode = null;
    client.side = null;
    client.ready = false;
    client.loadout = null;
    removed = true;
  }

  if (removed) {
    room.match = null;
    room.battle = null;
    room.updatedAt = now;
    broadcastRoomState(room);
  }
}

function createClientId() {
  return Math.random().toString(36).slice(2, 10);
}

function createRoomCode() {
  let code;
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function createResumeToken() {
  return randomBytes(18).toString("base64url");
}

function normalizeRoomCode(value) {
  return String(value || "").trim().toUpperCase();
}

function sanitizeName(value) {
  const name = String(value || "").replace(/\s+/g, " ").trim().slice(0, 32);
  return name || "Player";
}

function sanitizeResumeToken(value) {
  return String(value || "").trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 96);
}

function sanitizeLoadout(loadout) {
  const fallback = {
    faction: "usa",
    deck: [],
  };
  if (!loadout || typeof loadout !== "object") {
    return fallback;
  }
  const faction = ["usa", "russia"].includes(loadout.faction) ? loadout.faction : fallback.faction;
  const deck = Array.isArray(loadout.deck)
    ? loadout.deck
        .map((cardId) => String(cardId || "").trim())
        .filter(Boolean)
        .slice(0, 30)
    : [];
  return { faction, deck };
}

function summarizeLoadout(loadout) {
  if (!loadout) {
    return null;
  }
  return {
    faction: loadout.faction,
    deckSize: loadout.deck.length,
  };
}

function createRoomMatch(room) {
  return {
    id: `${room.code}-${Date.now().toString(36)}`,
    seed: createMatchSeed(),
    createdAt: Date.now(),
    status: "ready",
    players: getRoomPlayers(room),
  };
}

function createMatchSeed() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function resolvePath(urlPath) {
  const pathname = new URL(urlPath || "/", "http://localhost").pathname;
  const rawPath = pathname === "/" ? "/index.html" : pathname;
  const decodedPath = safeDecodePath(rawPath);
  const safePath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  return join(rootDir, safePath);
}

function safeDecodePath(rawPath) {
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

function getCacheControl(pathname, type) {
  if (pathname.startsWith("/assets/")) {
    return "public, max-age=604800, stale-while-revalidate=86400";
  }
  if (
    pathname.startsWith("/src/") ||
    type.startsWith("text/html") ||
    type.startsWith("text/javascript") ||
    type.startsWith("text/css")
  ) {
    return "no-cache";
  }
  return "public, max-age=300";
}

function createEtag(stats) {
  return `"${stats.size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}"`;
}

function isFresh(request, etag, modifiedAt) {
  const ifNoneMatch = request.headers["if-none-match"];
  if (ifNoneMatch) {
    const current = normalizeEtagValue(etag);
    const candidates = ifNoneMatch
      .split(",")
      .map((value) => normalizeEtagValue(value));
    if (candidates.includes("*") || candidates.includes(current)) {
      return true;
    }
  }
  const ifModifiedSince = request.headers["if-modified-since"];
  if (!ifModifiedSince) {
    return false;
  }
  const sinceTime = Date.parse(ifModifiedSince);
  return Number.isFinite(sinceTime) && modifiedAt.getTime() <= sinceTime + 1000;
}

function normalizeEtagValue(value) {
  return String(value || "")
    .trim()
    .replace(/^W\//, "")
    .replace(/\\"/g, "\"")
    .replace(/^"|"$/g, "");
}
