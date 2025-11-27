// websocket.js
let broadcastKey = null;
let socket = null;
let startedAt = null;
let reconnectTimeout = null;

// ギフト・コメント表示関数は commentGift.js で定義されている前提
// showComment(obj), showGift(obj)

const ROOM_INPUT = document.getElementById("roomInput");
const STATUS_SPAN = document.getElementById("statusSpan");
const ROOM_NAME_SPAN = document.getElementById("roomNameSpan");

// ステータス更新
function setStatus(status) {
    STATUS_SPAN.className = "";
    if(status==="connecting") { STATUS_SPAN.textContent="Status: 再接続中"; STATUS_SPAN.classList.add("connecting"); }
    else if(status==="connected") { STATUS_SPAN.textContent="Status: 接続中"; STATUS_SPAN.classList.add("connected"); }
    else { STATUS_SPAN.textContent="Status: 切断"; STATUS_SPAN.classList.add("disconnected"); }
}

// WebSocket接続関数
async function connectRoom(roomId){
    if(!roomId) return;
    if(reconnectTimeout) clearTimeout(reconnectTimeout);

    try{
        setStatus("connecting");

        // 最新 broadcast_key を取得
        const res = await fetch(`/get_broadcast_key?room_id=${roomId}`);
        const json = await res.json();
        if(!json.broadcast_key){ alert("broadcast_key取得失敗"); return; }
        broadcastKey = json.broadcast_key;

        // 既存接続を閉じる
        if(socket) socket.close();

        // WebSocket接続
        socket = new WebSocket("wss://online.showroom-live.com");

        socket.onopen = ()=>{
            socket.send("SUB\t"+broadcastKey);
            setStatus("connected");
            startHeartbeat(socket); // heartbeat.js で定義
        };

        socket.onmessage = (msg)=>{
            const data = msg.data;
            if(data.startsWith("ACK")||data.startsWith("ERR")) return;

            let obj = null;
            try{
                obj = JSON.parse(data.replace(`MSG\t${broadcastKey}`,""));
            } catch(e){ console.error("JSON parse error", e); return; }

            if(obj.cm) showComment(obj);
            else if(obj.g) showGift(obj);
            if(!startedAt && obj.started_at) startedAt = obj.started_at*1000;
            if(obj.main_name) ROOM_NAME_SPAN.textContent = "Room: "+obj.main_name;
        };

        socket.onclose = ()=>{
            setStatus("disconnected");
            stopHeartbeat(); // heartbeat.js で定義
            // 指数バックオフ再接続
            let retry = 5000;
            reconnectTimeout = setTimeout(()=>connectRoom(roomId), retry);
        };

        // UIリセット
        resetUI();

    } catch(e){
        console.error(e);
        setStatus("disconnected");
        reconnectTimeout = setTimeout(()=>connectRoom(roomId), 5000);
    }
}

// UIリセット
function resetUI(){
    document.getElementById("comment").innerHTML="";
    document.getElementById("paidGift").innerHTML="";
    document.getElementById("freeGift").innerHTML="";
}

// ルーム切替ボタン
document.getElementById("switchRoom").onclick = ()=>{
    const newRoomId = ROOM_INPUT.value.trim();
    if(newRoomId) connectRoom(newRoomId);
};

// 初期ルーム（必要なら変更）
connectRoom(490133);
