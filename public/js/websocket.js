window.broadcastKey = null;
window.socket = null;
window.startedAt = null;
window.reconnectTimeout = null;

function setStatus(status){
    const span = document.getElementById("statusSpan");
    span.className="";
    if(status==="connecting"){ span.textContent="Status: 再接続中"; span.classList.add("connecting"); }
    else if(status==="connected"){ span.textContent="Status: 接続中"; span.classList.add("connected"); }
    else { span.textContent="Status: 切断"; span.classList.add("disconnected"); }
}

async function connectRoom(roomId){
    if(!roomId) return;
    if(window.reconnectTimeout) clearTimeout(window.reconnectTimeout);

    try{
        setStatus("connecting");
        const res = await fetch(`/get_broadcast_key?room_id=${roomId}`);
        const json = await res.json();
        if(!json.broadcast_key){ alert("broadcast_key取得失敗"); return; }
        window.broadcastKey = json.broadcast_key;

        if(window.socket) window.socket.close();

        window.socket = new WebSocket("wss://online.showroom-live.com");
        window.socket.onopen = ()=>{
            window.socket.send("SUB\t"+window.broadcastKey);
            setStatus("connected");

            // ハートビート開始
            startHeartbeat();
        };

        window.socket.onmessage = (msg)=>{
            const data = msg.data;
            if(data.startsWith("ACK")||data.startsWith("ERR")) return;
            const obj = JSON.parse(data.replace(`MSG\t${window.broadcastKey}`,""));
            if(obj.cm) showComment(obj);
            else if(obj.g) showGift(obj);
            if(!window.startedAt && obj.started_at) window.startedAt = obj.started_at*1000;
            if(obj.main_name) document.getElementById("roomNameSpan").textContent="Room: "+obj.main_name;
        };

        window.socket.onclose = ()=>{
            setStatus("disconnected");
            stopHeartbeat();
            window.reconnectTimeout = setTimeout(()=>connectRoom(roomId),5000);
        };

        // UIリセット
        document.getElementById("comment").innerHTML="";
        document.getElementById("paidGift").innerHTML="";
        document.getElementById("freeGift").innerHTML="";
        Object.keys(window.paidGiftMap).forEach(k=>delete window.paidGiftMap[k]);
        Object.keys(window.freeGiftMap).forEach(k=>delete window.freeGiftMap[k]);

    }catch(e){
        console.error(e);
        setStatus("disconnected");
        window.reconnectTimeout = setTimeout(()=>connectRoom(roomId),5000);
    }
}

// 経過時間更新
setInterval(()=>{
    if(window.startedAt){
        const now=Date.now();
        const diff=Math.floor((now-window.startedAt)/1000);
        const h=Math.floor(diff/3600);
        const m=Math.floor((diff%3600)/60);
        const s=diff%60;
        document.getElementById("startedSpan").textContent="開始: "+new Date(window.startedAt).toLocaleString();
        document.getElementById("elapsedSpan").textContent=`経過: ${h}時間 ${m}分 ${s}秒`;
    }
},1000);
