import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// public フォルダを静的配信
app.use(express.static("public"));

// broadcast_key を取得する API
app.get("/get_broadcast_key", async (req, res) => {
    const roomId = req.query.room_id || "490133"; // デフォルトを 490133 に設定
    try {
        const response = await fetch(`https://www.showroom-live.com/api/live/live_info?room_id=${roomId}`);
        const data = await response.json();
        if (data.bcsvr_key) {
            res.json({ broadcast_key: data.bcsvr_key });
        } else {
            res.status(404).json({ error: "broadcast_key not found" });
        }
    } catch (e) {
        res.status(500).json({ error: e.toString() });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
