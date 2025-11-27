import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import WebSocket from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// public フォルダの静的ファイル配信
app.use(express.static(path.join(__dirname, "public")));

// / で自動的に sr_live.html を返す
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/sr_live.html"));
});

// broadcast_key 取得 API
app.get("/get_broadcast_key", async (req, res) => {
    const roomId = req.query.room_id;
    if (!roomId) return res.status(400).json({ error: "room_id is required" });

    try {
        const response = await fetch(`https://www.showroom-live.com/api/live/live_info?room_id=${roomId}`);
        const data = await response.json();
        if (data.bcsvr_key) res.json({ broadcast_key: data.bcsvr_key });
        else res.status(404).json({ error: "broadcast_key not found" });
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// HTTP サーバー
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// WebSocket サーバー（ブラウザ向け）
const wss = new WebSocket.Server({ server });

// Showroom WS 接続保持用
const ROOM_CONNECTIONS = {}; // roomId -> { ws, clients: Set }

// ブラウザ WS 接続時
wss.on("connection", (ws) => {
    console.log("ブラウザ接続");

    ws.on("message", async (msg) => {
        let data;
        try { data = JSON.parse(msg.toString()); } catch(e){ return; }

        if(data.action === "subscribe" && data.room_id){
            const roomId = data.room_id;

            // Room 接続済みか
            if(!ROOM_CONNECTIONS[roomId]){
                // Showroom broadcast_key 取得
                let bcKey = null;
                try{
                    const res = await fetch(`https://www.showroom-live.com/api/live/live_info?room_id=${roomId}`);
                    const json = await res.json();
                    bcKey = json.bcsvr_key;
                }catch(e){ console.error(e); return; }

                if(!bcKey) return;

                // Showroom WS 接続
                const srWs = new WebSocket("wss://online.showroom-live.com");

                srWs.on("open", () => {
                    srWs.send("SUB\t" + bcKey);
                    console.log(`Showroom WS connected for room ${roomId}`);

                    // ハートビート
                    srWs.hbInterval = setInterval(()=>{
                        if(srWs.readyState === WebSocket.OPEN) srWs.send("PING");
                    }, 10000);
                });

                srWs.on("message", (msg)=>{
                    // ブラウザ全員に中継
                    ROOM_CONNECTIONS[roomId].clients.forEach(client => {
                        if(client.readyState === WebSocket.OPEN){
                            client.send(msg.toString());
                        }
                    });
                });

                srWs.on("close", ()=>{
                    clearInterval(srWs.hbInterval);
                    console.log(`Showroom WS closed for room ${roomId}`);
                    // 再接続
                    setTimeout(()=>connectShowroomRoom(roomId), 5000);
                });

                srWs.on("error", (e)=>console.error(e));

                ROOM_CONNECTIONS[roomId] = { ws: srWs, clients: new Set() };
            }

            // このブラウザを client に追加
            ROOM_CONNECTIONS[roomId].clients.add(ws);
        }
    });

    ws.on("close", ()=>{
        console.log("ブラウザ切断");
        // Room 内の clients から削除
        for(const roomId in ROOM_CONNECTIONS){
            ROOM_CONNECTIONS[roomId].clients.delete(ws);
        }
    });
});

// Showroom 再接続用
async function connectShowroomRoom(roomId){
    const bcRes = await fetch(`https://www.showroom-live.com/api/live/live_info?room_id=${roomId}`);
    const bcJson = await bcRes.json();
    const bcKey = bcJson.bcsvr_key;
    if(!bcKey) return;

    const srWs = new WebSocket("wss://online.showroom-live.com");

    srWs.on("open", ()=>{
        srWs.send("SUB\t"+bcKey);
        console.log(`Showroom WS reconnected for room ${roomId}`);
        srWs.hbInterval = setInterval(()=>{
            if(srWs.readyState===WebSocket.OPEN) srWs.send("PING");
        },10000);
    });

    srWs.on("message",(msg)=>{
        ROOM_CONNECTIONS[roomId].clients.forEach(client=>{
            if(client.readyState===WebSocket.OPEN) client.send(msg.toString());
        });
    });

    srWs.on("close", ()=>{
        clearInterval(srWs.hbInterval);
        console.log(`Showroom WS closed for room ${roomId}`);
        setTimeout(()=>connectShowroomRoom(roomId),5000);
    });

    srWs.on("error",(e)=>console.error(e));

    ROOM_CONNECTIONS[roomId].ws = srWs;
}
