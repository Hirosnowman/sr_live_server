window.hbInterval = null;

function startHeartbeat(){
    stopHeartbeat();
    window.hbInterval = setInterval(()=>{
        if(window.socket && window.socket.readyState===WebSocket.OPEN) window.socket.send("PING");
    },10000);
}

function stopHeartbeat(){
    if(window.hbInterval) clearInterval(window.hbInterval);
}
