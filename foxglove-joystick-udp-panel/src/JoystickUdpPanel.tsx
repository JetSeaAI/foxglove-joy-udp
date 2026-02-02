import { useEffect, useRef, useState } from "react";

type UdpRecv = {
  type: "udp_recv";
  ts: number;
  localPort: number;
  from: string;
  dataBase64: string;
};
type StatusMsg = { type: "status"; ok: boolean; message: string };

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}

function AxisBar({ value }: { value: number }) {
  // value expected in [-1, 1]
  const v = clamp(value, -1, 1);
  const pct = Math.round((v + 1) * 50); // 0..100
  return (
    <div style={{ width: 260, height: 12, background: "rgba(255,255,255,0.12)", borderRadius: 6, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "rgba(255,255,255,0.65)" }} />
    </div>
  );
}

function ButtonLamp({ on, index }: { on: boolean; index: number }) {
  return (
    <div
      title={`B${index}`}
      style={{
        width: 26,
        height: 26,
        borderRadius: 999,
        background: on ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        color: on ? "#111" : "rgba(255,255,255,0.8)",
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      {index}
    </div>
  );
}

export default function JoystickUdpPanel(): JSX.Element {
  const [wsUrl, setWsUrl] = useState("ws://127.0.0.1:4010");
  const [udpPort, setUdpPort] = useState(9999); // ✅ 你檔案的 joystick 預設 port
  const [status, setStatus] = useState("未連線");

  const [axes, setAxes] = useState<number[]>([]);
  const [buttons, setButtons] = useState<number[]>([]);
  const [from, setFrom] = useState<string>("");
  const [lastTs, setLastTs] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);

  const connect = () => {
    wsRef.current?.close();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("WebSocket 已連線，正在 bind UDP…");
      ws.send(JSON.stringify({ type: "bind_udp", port: udpPort }));
    };

    ws.onclose = () => setStatus("已斷線");
    ws.onerror = () => setStatus("連線錯誤：請確認 udp-bridge.mjs 是否在跑");

    ws.onmessage = (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }

      if (msg.type === "status") {
        const s = msg as StatusMsg;
        setStatus((s.ok ? "OK： " : "錯誤： ") + s.message);
        return;
      }

      if (msg.type === "udp_recv") {
        const m = msg as UdpRecv;

        // 只吃 joystick 那個 port（避免你之後也 bind waypoint 造成干擾）
        if (m.localPort !== udpPort) return;

        const u8 = b64ToU8(m.dataBase64);

        try {
          const txt = new TextDecoder("utf-8").decode(u8);
          const obj = JSON.parse(txt);

          // 你的程式送的 JSON 會有 axes/buttons/hats
          if (Array.isArray(obj.axes)) setAxes(obj.axes.map((x: any) => Number(x)));
          if (Array.isArray(obj.buttons)) setButtons(obj.buttons.map((x: any) => Number(x)));

          setFrom(m.from);
          setLastTs(m.ts);
        } catch {
          // 不是 JSON 就忽略
        }
      }
    };
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
  };

  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  return (
    <div style={{ padding: 12, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <h3 style={{ margin: "0 0 8px 0" }}>Joystick UDP 儀表</h3>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Bridge WS URL</div>
          <input value={wsUrl} onChange={(e) => setWsUrl(e.target.value)} style={{ width: 280 }} />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Joystick UDP Port</div>
          <input type="number" value={udpPort} onChange={(e) => setUdpPort(Number(e.target.value))} style={{ width: 120 }} />
        </div>

        <button onClick={connect}>連線</button>
        <button onClick={disconnect}>斷線</button>

        <div style={{ flex: "1 1 260px", fontSize: 12 }}>
          <div style={{ opacity: 0.8 }}>狀態</div>
          <div>{status}</div>
          <div style={{ opacity: 0.7, marginTop: 4 }}>
            From: {from || "—"} ｜ Last: {lastTs ? new Date(lastTs).toLocaleTimeString() : "—"}
          </div>
        </div>
      </div>

      <hr style={{ margin: "12px 0", borderColor: "rgba(255,255,255,0.15)" }} />

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px" }}>
          <h4 style={{ margin: "0 0 8px 0" }}>Axes</h4>
          {axes.length === 0 ? (
            <div style={{ opacity: 0.7 }}>尚未收到 joystick JSON（請確認 tak_launcher_gui_1.py 的目標 IP/port）</div>
          ) : (
            axes.map((v, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 60, fontSize: 12, opacity: 0.85 }}>Axis {i}</div>
                <AxisBar value={v} />
                <div style={{ width: 60, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                  {Number.isFinite(v) ? v.toFixed(2) : "—"}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ flex: "1 1 320px" }}>
          <h4 style={{ margin: "0 0 8px 0" }}>Buttons</h4>
          {buttons.length === 0 ? (
            <div style={{ opacity: 0.7 }}>尚未收到 buttons</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {buttons.map((b, i) => (
                <ButtonLamp key={i} on={Boolean(b)} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

