let hbInterval = 10000; // 10秒
let hbTimer = null;

function startHeartbeat(ws) {
    if(hbTimer) clearInterval(hbTimer);
    hbTimer = setInterval(()=>{
        if(ws && ws.readyState === WebSocket.OPEN){
            ws.send("PING");
        }
    }, hbInterval);
}

function stopHeartbeat() {
    if(hbTimer) clearInterval(hbTimer);
}
