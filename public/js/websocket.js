// websocket.js
let srSocket = null;
let broadcastKey = null;
let reconnectTimeout = null;

// 状態表示用
window.setStatus = function(status){
    const span = document.getElementById("statusSpan");
    span.className="";
    if(status==="connecting"){ span.textContent="Status: 再接続中"; span.classList.add("connecting"); }
    else if(status==="connected"){ span.textContent="Status: 接続中"; span.classList.add("connected"); }
    else { span.textContent="Status: 切断"; span.classList.add("disconnected"); }
};

// 接続関数（グローバル）
window.connectRoom = async function(roomId){
    if(!roomId) return;
    if(reconnectTimeout) clearTimeout(reconnectTimeout);

    try{
        setStatus("connecting");
        const res = await fetch(`/get_broadcast_key?room_id=${roomId}`);
        const json = await res.json();
        if(!json.broadcast_key){ alert("broadcast_key取得失敗"); return; }
        broadcastKey = json.broadcast_key;

        if(srSocket) srSocket.close();

        srSocket = new WebSocket("wss://online.showroom-live.com");
        srSocket.onopen = () => {
            srSocket.send("SUB\t"+broadcastKey);
            setStatus("connected");
            startHeartbeat();
        };

        srSocket.onmessage = (msg) => {
            if(!msg.data) return;
            if(msg.data.startsWith("ACK") || msg.data.startsWith("ERR")) return;
            try {
                const obj = JSON.parse(msg.data.replace(`MSG\t${broadcastKey}`,""));
                if(obj.cm) showComment(obj);
                else if(obj.g) showGift(obj);
                if(!window.startedAt && obj.started_at) window.startedAt = obj.started_at*1000;
                if(obj.main_name) document.getElementById("roomNameSpan").textContent="Room: "+obj.main_name;
            } catch(e) {
                console.error("メッセージ解析エラー:", e, msg.data);
                document.getElementById("hbError").textContent = e.toString();
            }
        };

        srSocket.onclose = () => {
            setStatus("disconnected");
            stopHeartbeat();
            reconnectTimeout = setTimeout(()=>connectRoom(roomId),5000);
        };

        // UIリセット
        document.getElementById("comment").innerHTML="";
        document.getElementById("paidGift").innerHTML="";
        document.getElementById("freeGift").innerHTML="";
        window.paidGiftMap = {};
        window.freeGiftMap = {};

    } catch(e){
        console.error(e);
        document.getElementById("hbError").textContent = e.toString();
        setStatus("disconnected");
        reconnectTimeout = setTimeout(()=>connectRoom(roomId),5000);
    }
};
