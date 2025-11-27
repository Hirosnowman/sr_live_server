// heartbeat.js
let hbInterval = null;

function startHeartbeat(ws){
    stopHeartbeat();
    hbInterval = setInterval(()=>{
        if(ws && ws.readyState===WebSocket.OPEN) ws.send("PING");
    }, 10000); // 10秒
}

function stopHeartbeat(){
    if(hbInterval) clearInterval(hbInterval);
}
