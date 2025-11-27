// ws.js
import { showCommentOrGift } from "./comment.js";
import { setStatus } from "./heartbeat.js";

let ws = null;

export function connectRoom(roomId){
    if(!roomId) return;

    if(ws){
        ws.close();
        ws = null;
    }

    setStatus("connecting");

    ws = new WebSocket(`wss://${location.host}`);
    ws.onopen = () => {
        setStatus("connected");
        ws.send(JSON.stringify({action:"subscribe", room_id: roomId}));
    };

    ws.onmessage = (evt) => {
        const data = evt.data;
        // 中継サーバーからそのまま来るので、まず JSON パース
        try {
            const obj = JSON.parse(data.replace(/^MSG\t.*?\t/,""));
            showCommentOrGift(obj);
        } catch(e){
            console.error("parse error", e, data);
        }
    };

    ws.onclose = () => {
        setStatus("disconnected");
        // 5秒後に自動再接続
        setTimeout(()=>connectRoom(roomId),5000);
    };

    ws.onerror = (e) => {
        setStatus("error");
        console.error("WebSocket error", e);
    };
}
