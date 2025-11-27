// ===============================
// server.js（Node22 + ESM 完全対応）
// ===============================
import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import WebSocket from "ws";

// ESM の __dirname 再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// public フォルダの静的配信
app.use(express.static(path.join(__dirname, "public")));

// SR HTML
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/sr_live.html"));
});

// broadcast_key取得 API
app.get("/get_broadcast_key", async (req, res) => {
    const roomId = req.query.room_id;
    if (!roomId) return res.status(400).json({ error: "room_id required" });

    try {
        const apiUrl = `https://www.showroom-live.com/api/live/live_info?room_id=${roomId}`;
        const r = await fetch(apiUrl);
        const json = await r.json();

        if (json.bcsvr_key) res.json({ broadcast_key: json.bcsvr_key });
        else res.status(404).json({ error: "broadcast_key not found" });

    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

// HTTP Server
const server = app.listen(PORT, () =>
    console.log(`Server running on ${PORT}`)
);

// ===============================
// WebSocket Relay（ブラウザ → Node → Showroom）
// ===============================
const wss = new WebSocketServer({ server, path: "/ws" });

let showroomWS = null;
let lastKey = null;
let reconnectTimer = null;

// Showroom へ接続開始
function connectShowroomWS(broadcastKey) {
    if (showroomWS) {
        try { showroomWS.close(); } catch {}
    }

    const url = `wss://bcsv-showroom1.showroom-cdn.com/?bcsvr_key=${broadcastKey}`;
    console.log("Connecting to Showroom WS:", url);

    showroomWS = new WebSocket(url);

    showroomWS.on("open", () => {
        console.log("Showroom WS connected");
        clearTimeout(reconnectTimer);
    });

    showroomWS.on("message", (msg) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg.toString());
            }
        });
    });

    showroomWS.on("close", () => {
        console.log("Showroom WS closed → reconnecting...");
        reconnectTimer = setTimeout(() => connectShowroomWS(lastKey), 3000);
    });

    showroomWS.on("error", (err) => {
        console.log("Showroom WS Error:", err);
    });
}

// ブラウザ WS 接続
wss.on("connection", (socket) => {
    console.log("Browser connected");

    socket.on("message", (msg) => {
        try {
            const data = JSON.parse(msg);
            if (data.broadcast_key) {
                lastKey = data.broadcast_key;
                connectShowroomWS(lastKey);
            }
        } catch (e) {
            console.log("Browser msg parse error:", e);
        }
    });
});
