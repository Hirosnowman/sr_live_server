import express from "express";
import WebSocket from "ws";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.static("public")); // sr_live.html などを public に置く

// broadcast_key を返す簡易 API
app.get("/get_broadcast_key", async (req, res) => {
    const roomId = req.query.room_id;
    try {
        const r = await fetch(`https://www.showroom-live.com/api/live/live_info?room_id=${roomId}`);
        const j = await r.json();
        res.json({ broadcast_key: j.bcsvr_key || null });
    } catch (e) {
        res.json({ broadcast_key: null });
    }
});

// WebSocket プロキシ
const wss = new WebSocket.Server({ noServer: true });

app.server = app.listen(PORT, () => console.log(`Server running on ${PORT}`));

app.server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
        wss.emit("connection", ws, request);
    });
});

// 各クライアント接続時
wss.on("connection", async (clientWs, req) => {
    console.log("Client connected");

    let broadcastWs = null;

    clientWs.on("message", async msg => {
        try {
            const { room_id } = JSON.parse(msg); // クライアントから { room_id: ... }
            if (!room_id) return;

            // broadcast_key 取得
            const r = await fetch(`https://www.showroom-live.com/api/live/live_info?room_id=${room_id}`);
            const j = await r.json();
            const key = j.bcsvr_key;
            if (!key) return;

            // SR WebSocket 接続
            broadcastWs = new WebSocket("wss://online.showroom-live.com");

            broadcastWs.on("open", () => {
                broadcastWs.send("SUB\t" + key);
                console.log("Subscribed to room:", room_id);
            });

            broadcastWs.on("message", (data) => {
                let text = data.toString();
                if (text.startsWith("ACK") || text.startsWith("ERR")) return;

                // MSG を JSON に変換
                text = text.replace(`MSG\t${key}`, "");
                let obj = null;
                try { obj = JSON.parse(text); } catch(e){}

                if (!obj) return;

                // クライアントへ送信（コメント・ギフトともに送る）
                if (obj.cm) clientWs.send(JSON.stringify({ type: "comment", data: obj }));
                else if (obj.g) clientWs.send(JSON.stringify({ type: "gift", data: obj }));
            });

            broadcastWs.on("close", () => console.log("Broadcast WS closed"));

        } catch(e) {
            console.error(e);
        }
    });

    clientWs.on("close", () => {
        console.log("Client disconnected");
        if (broadcastWs) broadcastWs.close();
    });
});
