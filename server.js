import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// public 配下の静的ファイル配信
app.use(express.static(path.join(__dirname, "public")));

// / で index.html を返す
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// broadcast_key 取得 API
app.get("/get_broadcast_key", async (req, res) => {
  const roomId = req.query.room_id;
  if (!roomId) return res.status(400).json({ error: "room_id is required" });

  try {
    const response = await fetch(
      `https://www.showroom-live.com/api/live/live_info?room_id=${roomId}`
    );
    const data = await response.json();
    if (data.bcsvr_key) res.json({ broadcast_key: data.bcsvr_key });
    else res.status(404).json({ error: "broadcast_key not found" });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

// WebSocketServer（ブラウザ中継用）
const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocketServer listening on port 8080");

wss.on("connection", ws => {
  console.log("Browser connected");
  ws.on("message", async message => {
    // ブラウザから {type:"subscribe", broadcastKey:"xxxx"} が送られてくる想定
    let msgObj;
    try {
      msgObj = JSON.parse(message.toString());
    } catch {
      return;
    }
    if (msgObj.type === "subscribe" && msgObj.broadcastKey) {
      const key = msgObj.broadcastKey;
      // Showroom 公式 WebSocket に接続
      const ShowroomWS = new WebSocket(`wss://online.showroom-live.com`);
      ShowroomWS.on("open", () => {
        ShowroomWS.send("SUB\t" + key);
        console.log("Subscribed to Showroom room with key:", key);
      });
      ShowroomWS.on("message", data => {
        // 中継してブラウザに送る
        ws.send(data.toString());
      });
      ShowroomWS.on("close", () => console.log("Showroom WS closed"));
      ShowroomWS.on("error", err => console.error("Showroom WS error:", err));
    }
  });
});

app.listen(PORT, () => console.log(`Express server running on port ${PORT}`));
