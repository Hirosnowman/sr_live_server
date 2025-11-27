// ----------------- ハートビート -----------------
window.hbInterval = null;

window.startHeartbeat = function(){
    if(window.hbInterval) clearInterval(window.hbInterval);
    window.hbInterval = setInterval(()=>{
        if(window.socket && window.socket.readyState===WebSocket.OPEN){
            window.socket.send("PING");
        }
    }, 10000); // 10秒
};
