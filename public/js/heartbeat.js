// heartbeat.js
let hbInterval = null;

window.startHeartbeat = function(){
    if(hbInterval) clearInterval(hbInterval);
    hbInterval = setInterval(()=>{
        if(srSocket && srSocket.readyState===WebSocket.OPEN){
            srSocket.send("PING");
        }
    }, 10000);
};

window.stopHeartbeat = function(){
    if(hbInterval) clearInterval(hbInterval);
};
