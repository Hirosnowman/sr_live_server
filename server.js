import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// public 配下の静的ファイル配信
app.use(express.static(path.join(__dirname, "public")));

// broadcast_key 自動取得 API
app.get("/get_broadcast_key", async (req, res) => {
  const roomId = req.query.room_id;
  if (!roomId) return res.status(400).json({ error: "room_id required" });

  try {
    const response = await fetch(`https://www.showroom-live.com/api/live/live_info?room_id=${roomId}`);
    const json = await response.json();
    if (json.bcsvr_key) {
      res.json({ broadcast_key: json.bcsvr_key });
    } else {
      res.status(404).json({ error: "broadcast_key not found" });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
