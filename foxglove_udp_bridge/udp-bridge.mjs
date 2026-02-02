import dgram from "node:dgram";
import { WebSocketServer } from "ws";

const WS_PORT = 4010;
const wss = new WebSocketServer({ port: WS_PORT });
console.log(`[bridge] WebSocket: ws://127.0.0.1:${WS_PORT}`);

const udpSockets = new Map(); // port -> socket

function ensureUdpBound(port) {
  if (udpSockets.has(port)) return;

  const sock = dgram.createSocket("udp4");
  sock.on("message", (msg, rinfo) => {
    const payload = JSON.stringify({
      type: "udp_recv",
      ts: Date.now(),
      localPort: port,
      from: `${rinfo.address}:${rinfo.port}`,
      dataBase64: msg.toString("base64"),
    });
    for (const c of wss.clients) {
      if (c.readyState === 1) c.send(payload);
    }
  });

  sock.on("listening", () => {
    console.log(`[bridge] UDP bound on 0.0.0.0:${port}`);
  });

  sock.on("error", (e) => {
    console.error(`[bridge] UDP error on port ${port}:`, e);
  });

  sock.bind(port);
  udpSockets.set(port, sock);
}

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "status", ok: true, message: "connected" }));

  ws.on("message", (raw) => {
    let m;
    try {
      m = JSON.parse(String(raw));
    } catch {
      ws.send(JSON.stringify({ type: "status", ok: false, message: "invalid json" }));
      return;
    }

    if (m.type === "bind_udp") {
      const port = Number(m.port);
      if (!Number.isFinite(port) || port <= 0 || port > 65535) {
        ws.send(JSON.stringify({ type: "status", ok: false, message: "invalid port" }));
        return;
      }
      ensureUdpBound(port);
      ws.send(JSON.stringify({ type: "status", ok: true, message: `bind udp ${port}` }));
      return;
    }

    ws.send(JSON.stringify({ type: "status", ok: false, message: "unknown message type" }));
  });
});
