// ===============================
// server.js（Node22 + ESM / Render用）
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

// public フォルダを配信
app.use(express.static(path.join(__dirname, "public")));

// デフォルト HTML
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/sr_live.html"));
});

// ===============================
// ① broadcast_key 取得 API
// ===============================
app.get("/get_broadcast_key", async (req, res) => {
    const roomId = req.query.room_id;
    if (!roomId) return res.status(400).json({ error: "room_id required" });

    try {
        const apiUrl = `https://www.showroom-live.com/api/live/live_info?room_id=${roomId}`;
        const r = await fetch(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
                "Referer": `https://www.showroom-live.com/room/profile?room_id=${roomId}`,
                "Accept": "application/json, text/javascript, */*; q=0.01"
            }
        });
        const json = await r.json();

        if (json.bcsvr_key) res.json({ broadcast_key: json.bcsvr_key });
        else res.status(404).json({ error: "broadcast_key not found", data: json });

    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});


// ===============================
// ② 過去コメント取得 API（コメント配列のみ返す）
// ===============================
app.get("/comment_log", async (req, res) => {
    const roomId = req.query.room_id;
    if (!roomId) return res.status(400).json({ error: "room_id required" });

    try {
        const url = `https://www.showroom-live.com/api/live/comment_log?room_id=${roomId}`;
        const r = await fetch(url);
        const json = await r.json();

        if (!json.comments || !Array.isArray(json.comments)) {
            return res.status(404).json({ error: "no comments" });
        }

        // ブラウザ側は配列を期待しているので comments のみ返す
        res.json(json.comments);

    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});


// ===============================
// HTTP Server 起動
// ===============================
const server = app.listen(PORT, () =>
    console.log(`Server running on ${PORT}`)
);

// ===============================
// WebSocket Relay（Browser → Node → Showroom）
// ===============================
const wss = new WebSocketServer({ server, path: "/ws" });

let showroomWS = null;
let lastKey = null;
let reconnectTimer = null;

// ===============================
// ③ Showroom WS 接続
// ===============================
function connectShowroomWS(broadcastKey) {
    if (!broadcastKey) return;

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

    // Showroom → Browser 全転送
    showroomWS.on("message", (msg) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg.toString());
            }
        });
    });

    // 切断 → 3秒後に再接続
    showroomWS.on("close", () => {
        console.log("Showroom WS closed → reconnecting...");
        reconnectTimer = setTimeout(() => connectShowroomWS(lastKey), 3000);
    });

    showroomWS.on("error", (err) => {
        console.log("Showroom WS Error:", err);
    });
}

// ===============================
// ④ Showroom Heartbeat（PING）
// ===============================
setInterval(() => {
    if (showroomWS && showroomWS.readyState === WebSocket.OPEN) {
        try {
            showroomWS.send("PING");
        } catch (e) {
            console.log("PING error:", e.toString());
        }
    }
}, 10000);

// ===============================
// ⑤ ブラウザ Heartbeat（Node → Browser）
// ===============================
setInterval(() => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ hb: Date.now() }));
        }
    });
}, 10000);

// ===============================
// ⑥ ブラウザ WS 接続処理
// ===============================
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
