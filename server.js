// ===============================
// server.js  完全同期版（Render対応）
// ===============================
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 3000;

// public 配信
app.use(express.static(path.join(__dirname, "public")));

// sr_live.html を返す
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/sr_live.html"));
});

// broadcast_key をフロントへ渡すAPI
app.get("/get_broadcast_key", async (req, res) => {
    const roomId = req.query.room_id;
    if (!roomId) return res.status(400).json({ error: "room_id required" });

    try {
        const url = `https://www.showroom-live.com/api/live/live_info?room_id=${roomId}`;
        const result = await fetch(url);
        const json = await result.json();

        if (json.bcsvr_key) res.json({ broadcast_key: json.bcsvr_key });
        else res.status(404).json({ error: "broadcast_key not found" });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// HTTPサーバー作成
const server = app.listen(PORT, () =>
    console.log(`Server running: ${PORT}`)
);

// ===============================
// WebSocket 中継サーバー
// ===============================
const wss = new WebSocket.Server({ server, path: "/ws" });

let showroomWS = null;
let lastKey = null;
let reconnectTimer = null;

// -------------------------------
// Showroom WS へ接続
// -------------------------------
function connectShowroomWS(broadcastKey) {
    if (showroomWS) showroomWS.close();

    const url = `wss://bcsv-showroom1.showroom-cdn.com/?bcsvr_key=${broadcastKey}`;
    console.log("Connecting to Showroom WS:", url);

    showroomWS = new WebSocket(url);

    showroomWS.on("open", () => {
        console.log("Showroom WS connected");
        clearTimeout(reconnectTimer);
    });

    showroomWS.on("message", (msg) => {
        // そのまま全ブラウザへ転送
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg.toString());
            }
        });
    });

    showroomWS.on("close", () => {
        console.log("Showroom WS closed. Reconnecting...");
        reconnectTimer = setTimeout(() => connectShowroomWS(lastKey), 3000);
    });

    showroomWS.on("error", (err) => {
        console.log("Showroom WS error:", err);
    });
}

// -------------------------------
// ブラウザ → Node 〜 Relay メッセージ
// -------------------------------
wss.on("connection", (socket) => {
    console.log("Browser connected to relay");

    socket.on("message", async (msg) => {
        try {
            const data = JSON.parse(msg);

            // broadcast_key 渡されたら Showroom WSへ接続
            if (data.broadcast_key) {
                lastKey = data.broadcast_key;
                connectShowroomWS(lastKey);
            }
        } catch (e) {
            console.log("Browser msg error:", e);
        }
    });
});
