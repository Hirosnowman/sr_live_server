import { showComment, showGift, setStatus, setError } from "./commentGift.js";
import { startHeartbeat, stopHeartbeat } from "./heartbeat.js";

let socket = null;
let broadcastKey = null;
let reconnectTimeout = null;

export async function connectRoom(roomId) {
    if (!roomId) {
        console.warn("roomId が空です");
        return;
    }
    console.log("[WebSocket] connectRoom called, roomId=", roomId);

    if (reconnectTimeout) clearTimeout(reconnectTimeout);

    try {
        setStatus("connecting");
        setError("");

        // 最新キー取得
        const res = await fetch(`/get_broadcast_key?room_id=${roomId}`);
        if (!res.ok) throw new Error("broadcast_key取得失敗 status=" + res.status);
        const json = await res.json();
        if (!json.broadcast_key) throw new Error("broadcast_key取得失敗: キーなし");
        broadcastKey = json.broadcast_key;
        console.log("[WebSocket] broadcastKey=", broadcastKey);

        if (socket) {
            console.log("[WebSocket] 古い接続を閉じます");
            socket.close();
        }

        socket = new WebSocket("wss://online.showroom-live.com");
        socket.onopen = () => {
            console.log("[WebSocket] 接続成功, SUB送信");
            socket.send("SUB\t" + broadcastKey);
            setStatus("connected");
            startHeartbeat(socket);
        };

        socket.onmessage = (msg) => {
            // デバッグ用ログ
            console.log("[WebSocket] message received:", msg.data);

            const data = msg.data;
            if (data.startsWith("ACK") || data.startsWith("ERR")) return;

            let obj;
            try {
                obj = JSON.parse(data.replace(`MSG\t${broadcastKey}`, ""));
            } catch (e) {
                console.error("[WebSocket] JSON parse error:", e);
                setError("JSON parse error");
                return;
            }

            if (obj.cm) showComment(obj);
            else if (obj.g) showGift(obj);

            if (obj.main_name) document.getElementById("roomNameSpan").textContent = "Room: " + obj.main_name;
        };

        socket.onclose = (e) => {
            console.warn("[WebSocket] 切断されました", e);
            setStatus("disconnected");
            stopHeartbeat();
            reconnectTimeout = setTimeout(() => connectRoom(roomId), 5000);
        };

        socket.onerror = (e) => {
            console.error("[WebSocket] エラー:", e);
            setError("WebSocket error");
        };

    } catch (e) {
        console.error("[WebSocket] 接続エラー:", e);
        setStatus("disconnected");
        setError(e.message);
        reconnectTimeout = setTimeout(() => connectRoom(roomId), 5000);
    }
}
