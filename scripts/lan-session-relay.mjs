import http from "node:http";
import os from "node:os";

const port = Number(process.env.PORT || 8787);
const clients = new Map();

function headers(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    ...extra,
  };
}

function getRoomClients(room) {
  if (!clients.has(room)) clients.set(room, new Set());
  return clients.get(room);
}

function send(client, payload) {
  client.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcast(room, payload) {
  const roomClients = getRoomClients(room);
  for (const client of roomClients) send(client, payload);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 8 * 1024 * 1024) {
        request.destroy();
        reject(new Error("Payload too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function localAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers());
    response.end();
    return;
  }

  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/health") {
    response.writeHead(200, headers({ "Content-Type": "application/json" }));
    response.end(JSON.stringify({ ok: true, rooms: clients.size, addresses: localAddresses() }));
    return;
  }

  if (request.method === "GET" && url.pathname === "/events") {
    const room = url.searchParams.get("room") || "mesa-rpg";
    const userId = url.searchParams.get("userId") || "guest";
    const userName = url.searchParams.get("userName") || userId;
    response.writeHead(200, headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    }));
    response.write(": connected\n\n");
    const roomClients = getRoomClients(room);
    roomClients.add(response);
    broadcast(room, {
      id: `presence_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: "presence",
      userId,
      userName,
      text: `${userName} esta en linea.`,
      createdAt: new Date().toISOString(),
    });
    request.on("close", () => {
      roomClients.delete(response);
      broadcast(room, {
        id: `presence_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type: "presence",
        userId,
        userName,
        text: `${userName} salio de la sala.`,
        createdAt: new Date().toISOString(),
      });
    });
    return;
  }

  if (request.method === "POST" && (url.pathname === "/message" || url.pathname === "/audio")) {
    try {
      const body = await readBody(request);
      const room = String(body.room || "mesa-rpg");
      const type = url.pathname === "/audio" ? "audio" : String(body.type || "message");
      broadcast(room, {
        id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type,
        userId: String(body.userId || "guest"),
        userName: String(body.userName || body.userId || "guest"),
        text: body.text ? String(body.text) : undefined,
        audio: body.audio ? String(body.audio) : undefined,
        mimeType: body.mimeType ? String(body.mimeType) : undefined,
        createdAt: new Date().toISOString(),
      });
      response.writeHead(202, headers({ "Content-Type": "application/json" }));
      response.end(JSON.stringify({ ok: true }));
    } catch {
      response.writeHead(400, headers({ "Content-Type": "application/json" }));
      response.end(JSON.stringify({ ok: false }));
    }
    return;
  }

  response.writeHead(404, headers({ "Content-Type": "application/json" }));
  response.end(JSON.stringify({ ok: false, error: "Not found" }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`RPG LAN session relay listening on http://localhost:${port}`);
  for (const address of localAddresses()) {
    console.log(`WiFi/LAN URL: http://${address}:${port}`);
  }
});
