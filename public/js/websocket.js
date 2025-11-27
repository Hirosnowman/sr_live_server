let broadcastKey = null;
let socket = null;
let reconnectTimeout = null;

export async function connectRoom(roomId) {
    if (!roomId) return;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);

    setStatus("connecting");

    try {
        const res = await fetch(`/get_broadcast_key?room_id=${roomId}`);
        const json = await res.json();
        if (!json.broadcast_key) { alert("broadcast_key取得失敗"); return; }
        broadcastKey = json.broadcast_key;

        if (socket) socket.close();

        socket = new WebSocket("wss://online.showroom-live.com");

        socket.onopen = () => {
            socket.send("SUB\t" + broadcastKey);
            setStatus("connected");
            startHeartbeat(socket); // heartbeat.js 側関数
        };

        socket.onmessage = (msg) => {
            const data = msg.data;
            if (data.startsWith("ACK") || data.startsWith("ERR")) return;
            let obj = null;
            try {
                obj = JSON.parse(data.replace(`MSG\t${broadcastKey}`, ""));
            } catch(e) { console.error("JSON parse error:", data); return; }

            if (obj.cm || obj.g) handleMessage(obj); // commentGift.js 側関数
            if (obj.main_name) document.getElementById("roomNameSpan").textContent = "Room: " + obj.main_name;
        };

        socket.onclose = () => {
            setStatus("disconnected");
            reconnectTimeout = setTimeout(() => connectRoom(roomId), 5000);
        };

    } catch (e) {
        console.error(e);
        setStatus("disconnected");
        reconnectTimeout = setTimeout(() => connectRoom(roomId), 5000);
    }
}

// ルーム切替
document.getElementById("switchRoom").onclick = () => {
    const roomId = document.getElementById("roomInput").value.trim();
    if (roomId) connectRoom(roomId);
};

// 初期ルーム
connectRoom(490133);

// ステータス関数
export function setStatus(status) {
    const span = document.getElementById("statusSpan");
    span.className = "";
    if (status === "connecting") span.textContent = "Status: 再接続中";
    else if (status === "connected") span.textContent = "Status: 接続中";
    else span.textContent = "Status: 切断";
}
