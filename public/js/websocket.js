// WebSocket 接続・再接続
window.websocket = (function(){
    let socket = null;
    let broadcastKey = null;
    let reconnectTimeout = null;

    function setStatus(status){
        const span = document.getElementById("statusSpan");
        span.className="";
        if(status==="connecting") span.textContent="Status: 再接続中", span.classList.add("connecting");
        else if(status==="connected") span.textContent="Status: 接続中", span.classList.add("connected");
        else span.textContent="Status: 切断", span.classList.add("disconnected");
    }

    async function connectRoom(roomId){
        if(!roomId) return;
        if(reconnectTimeout) clearTimeout(reconnectTimeout);
        document.getElementById("errorSpan").textContent = "";

        setStatus("connecting");

        try {
            const res = await fetch(`/get_broadcast_key?room_id=${roomId}`);
            const json = await res.json();
            if(!json.broadcast_key){ document.getElementById("errorSpan").textContent="broadcast_key取得失敗"; return; }
            broadcastKey = json.broadcast_key;

            if(socket) socket.close();
            socket = new WebSocket("wss://online.showroom-live.com");

            socket.onopen = () => {
                socket.send("SUB\t"+broadcastKey);
                setStatus("connected");
                window.heartbeat.startHB(socket);
            };

            socket.onmessage = (msg) => {
                try {
                    const data = msg.data;
                    if(data.startsWith("ACK") || data.startsWith("ERR")) return;
                    const obj = JSON.parse(data.replace(`MSG\t${broadcastKey}`,""));
                    if(obj.cm) window.commentGift.showComment(obj);
                    if(obj.g) window.commentGift.showGift(obj);
                    if(obj.main_name) document.getElementById("roomNameSpan").textContent="Room: "+obj.main_name;
                    if(obj.started_at) window.heartbeat.setStarted(obj.started_at*1000);
                } catch(e){
                    console.error(e);
                    document.getElementById("errorSpan").textContent = e.toString();
                }
            };

            socket.onclose = () => {
                setStatus("disconnected");
                reconnectTimeout = setTimeout(()=>connectRoom(roomId),5000);
            };

            window.commentGift.reset();

        } catch(e){
            console.error(e);
            document.getElementById("errorSpan").textContent = e.toString();
            setStatus("disconnected");
            reconnectTimeout = setTimeout(()=>connectRoom(roomId),5000);
        }
    }

    document.getElementById("switchRoom").onclick = ()=>{
        const newRoomId = document.getElementById("roomInput").value.trim();
        if(newRoomId) connectRoom(newRoomId);
    };

    // 初期ルーム
    connectRoom("490133");

    return { connectRoom };
})();
