// ===============================
// server.js（固定 room_id 用テスト）
// ===============================
import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// public フォルダ配信
app.use(express.static(path.join(__dirname, "public")));

// デフォルト HTML
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/sr_live_beta.html"));
});

// 固定 room_id
const TEST_ROOM_ID = "490133"; // ←ここを固定したいルームIDに置き換え

// ===============================
// 過去コメント取得 API テスト用
// ===============================
app.get("/comment_log", async (req, res) => {
    const roomId = TEST_ROOM_ID; // 常に固定
    try {
        const url = `https://www.showroom-live.com/api/live/comment_log?room_id=${roomId}`;
        const r = await fetch(url);
        const json = await r.json();

        if (!json.comments || !Array.isArray(json.comments)) {
            return res.status(404).json({ error: "no comments" });
        }

        res.json(json.comments);

    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

// ===============================
// broadcast_key API テスト用
// ===============================
app.get("/get_broadcast_key", async (req, res) => {
    const roomId = TEST_ROOM_ID;
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

// ===============================
// HTTP Server 起動
// ===============================
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
