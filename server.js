// server.js
import express from "express";
import { WebSocketServer } from "ws";
import fetch from "node-fetch";

const app = express();
const port = 3000;

// クライアント用静的配信
app.use(express.static("public"));

// WebSocketサーバー（ブラウザ用）
const wss = new WebSocketServer({ port: 8080 });
let clients = [];

wss.on("connection", (ws) => {
    clients.push(ws);
    ws.on("message", async (msg) => {
        const obj = JSON.parse(msg);
        if(obj.room_id) {
            // Showroom公式WebSocketに接続して中継
            const data = await getInitialData(obj.room_id);
            ws.send(JSON.stringify({ type:"comment_log", data: data.comments }));
            ws.send(JSON.stringify({ type:"gift_log", data: data.gifts }));
            // ここで公式WSに接続してリアルタイム中継開始
        }
    });
    ws.on("close", ()=>{ clients = clients.filter(c=>c!==ws); });
});

// 放送ページから初期ログ取得（簡略例）
async function getInitialData(roomId){
    const res = await fetch(`https://www.showroom-live.com/${roomId}`);
    const html = await res.text();
    // broadcast_keyを正規表現で抽出（実際はDOM解析が必要）
    const broadcastKeyMatch = html.match(/broadcast_key":"(\w+)"/);
    const broadcast_key = broadcastKeyMatch ? broadcastKeyMatch[1] : null;

    // ここで公式WebSocket接続して初期コメント・ギフトを取得する
    // サンプルでは空データ返却
    return { comments: [], gifts: [] };
}

app.listen(port, ()=>console.log(`Server running at http://localhost:${port}`));
