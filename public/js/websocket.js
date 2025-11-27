let broadcastKey = null;
let socket = null;
let reconnectTimer = null;
let startedAt = null;

async function connectRoom(roomId) {
    try{
        const res = await fetch(`/get_broadcast_key?room_id=${roomId}`);
        const json = await res.json();
        if(!json.broadcast_key){ alert("broadcast_key取得失敗"); return; }
        broadcastKey=json.broadcast_key;

        if(socket) socket.close();
        updateStatus("接続中");

        socket = new WebSocket("wss://online.showroom-live.com");
        socket.onopen = ()=>{
            socket.send("SUB\t"+broadcastKey);
            startHeartbeat(socket);
            updateStatus("正常接続中");
        };
        socket.onmessage=(msg)=>{
            const data = msg.data;
            if(data.startsWith("ACK")||data.startsWith("ERR")) return;
            const obj = JSON.parse(data.replace(`MSG\t${broadcastKey}`,""));
            if(obj.cm) showComment(obj);
            else if(obj.g) showGift(obj);
            if(!startedAt && obj.started_at) startedAt = obj.started_at*1000;
            if(obj.main_name) document.getElementById("roomNameSpan").textContent="Room: "+obj.main_name;
        };
        socket.onclose = ()=>{
            updateStatus("切断");
            stopHeartbeat();
            attemptReconnect(roomId);
        };
    }catch(e){
        console.error(e);
        alert("broadcast_key取得中にエラー");
    }
}

function updateStatus(text){
    const span = document.getElementById("statusSpan");
    span.textContent = "Status: " + text;
    if(text==="正常接続中") span.style.color="green";
    else if(text==="接続中") span.style.color="blue";
    else span.style.color="red";
}

function attemptReconnect(roomId){
    if(reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(()=> connectRoom(roomId), 5000);
}

// ルーム切替
document.getElementById("switchRoom").onclick = ()=>{
    const newRoomId=document.getElementById("roomInput").value.trim();
    if(newRoomId) connectRoom(newRoomId);
};

// 経過時間更新
setInterval(()=>{
    if(startedAt){
        const now=Date.now();
        const diff=Math.floor((now-startedAt)/1000);
        const h=Math.floor(diff/3600);
        const m=Math.floor((diff%3600)/60);
        const s=diff%60;
        document.getElementById("startedSpan").textContent="開始: "+new Date(startedAt).toLocaleString();
        document.getElementById("elapsedSpan").textContent=`経過: ${h}時間 ${m}分 ${s}秒`;
    }
},1000);

// 初期ルーム
connectRoom(490133);
