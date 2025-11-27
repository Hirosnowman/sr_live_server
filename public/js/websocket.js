let socket = null;
let broadcastKey = null;
let reconnectTimeout = null;

async function connectRoom(roomId) {
    if (!roomId) return;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);

    setStatus("connecting");
    setStatusMsg("最新キー取得中...", "blue");

    try {
        const res = await fetch(`/get_broadcast_key?room_id=${roomId}`);
        const json = await res.json();
        if (!json.broadcast_key) {
            setStatusMsg("broadcast_key取得失敗", "red");
            return;
        }
        broadcastKey = json.broadcast_key;

        if (socket) socket.close();

        socket = new WebSocket("wss://online.showroom-live.com");

        socket.onopen = () => {
            socket.send("SUB\t" + broadcastKey);
            setStatus("connected");
            setStatusMsg("WS接続成功", "green");

            startHeartbeat(socket);
        };

        socket.onmessage = (msg) => {
            handleWSMessage(msg);
        };

        socket.onerror = (e) => {
            console.error("WSエラー", e);
            setStatusMsg("WSエラー発生", "red");
        };

        socket.onclose = () => {
            setStatus("disconnected");
            setStatusMsg("再接続中...", "orange");
            stopHeartbeat();
            reconnectTimeout = setTimeout(() => connectRoom(roomId), 5000);
        };

    } catch (e) {
        console.error(e);
        setStatus("disconnected");
        setStatusMsg("接続例外: " + e.message, "red");
        reconnectTimeout = setTimeout(() => connectRoom(roomId), 5000);
    }
}

// 受信メッセージ処理
function handleWSMessage(msg) {
    const data = msg.data;
    if (data.startsWith("ACK") || data.startsWith("ERR")) return;

    try {
        const obj = JSON.parse(data.replace(`MSG\t${broadcastKey}`, ""));
        if (obj.cm) showComment(obj);
        if (obj.g) showGift(obj);
        if (obj.main_name) document.getElementById("roomNameSpan").textContent = "Room: " + obj.main_name;
        if (!startedAt && obj.started_at) startedAt = obj.started_at * 1000;
    } catch (e) {
        console.error("JSON解析エラー", e, data);
        setStatusMsg("JSON解析エラー", "red");
    }
}
