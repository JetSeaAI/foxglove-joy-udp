# Foxglove Joystick UDP Panel

This project provides a **Foxglove Desktop custom panel** for visualizing joystick data sent over **UDP (JSON format)**.  
It uses a lightweight **UDP ↔ WebSocket bridge** to forward joystick packets to Foxglove, where axes and buttons are rendered as real-time gauges.

---

## System Architecture

```
Joystick Source (UDP JSON)
        │  UDP :9999
        ▼
  udp-bridge (Node.js)
        │  WebSocket :4010
        ▼
Foxglove Desktop
  └─ Joystick UDP Panel
```

---

## Prerequisites

- Node.js >= 18
- Foxglove Desktop
- Python 3 (for simple testing)

---

## 1. Run the UDP ↔ WebSocket Bridge

### 1.1 Install dependencies

```bash
cd foxglove-joy-udp/foxglove_udp_bridge
npm install
```

### 1.2 Start the bridge

```bash
node udp-bridge.mjs
```

You should see:

```
[bridge] WebSocket: ws://127.0.0.1:4010
```

This indicates that the WebSocket server is running and ready to bind UDP ports.

> Keep this process running while using the Foxglove panel.

---

## 2. Install the Foxglove Custom Panel

### 2.1 Install dependencies

```bash
cd foxglove-joy-udp/foxglove-joystick-udp-panel
npm install
```

### 2.2 Install the extension into Foxglove Desktop

```bash
npm run local-install
```

After installation:

1. Restart Foxglove Desktop
2. Go to **Settings → Extensions**
3. Confirm that the extension is listed
4. The panel will appear as **Joystick UDP Panel**

> Layout creation is intentionally not covered here.

---

## 3. Panel Runtime Configuration

Inside the **Joystick UDP Panel**:

- **Bridge WS URL**
  ```
  ws://127.0.0.1:4010
  ```
- **Joystick UDP Port**
  ```
  9999
  ```

Click **Connect**.  
The status should display:

```
OK: bind udp 9999
```

---

## 4. Quick Test (Without Joystick / TAK)

You can verify the entire pipeline without any joystick hardware or TAK software.

### 4.1 Send a test UDP joystick packet

```bash
python3 - << 'PY'
import socket, json

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

msg = {
    "axes": [0.0, 0.5, -0.5, 1.0],
    "buttons": [0, 1, 0, 1, 0, 0, 1, 0]
}

sock.sendto(json.dumps(msg).encode(), ("127.0.0.1", 9999))
print("Sent test joystick JSON")
PY
```

### 4.2 Expected result

- Axes bars appear and reflect the values
- Button indicators light up accordingly
- Bridge terminal may log incoming UDP packets

---

## 5. Joystick JSON Format

```json
{
  "axes": [float, float, ...],
  "buttons": [0 or 1, 0 or 1, ...],
  "hats": [optional]
}
```

- `axes` values should be in the range `[-1.0, 1.0]`
- `buttons` are treated as boolean states

---

## Notes

- File locations do not matter; components communicate via IP and ports
- The bridge and panel are intentionally decoupled
- Designed for local development and visualization

---


