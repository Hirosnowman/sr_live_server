// heartbeat.js
const statusSpan = document.getElementById("statusSpan");
const hbSpan = document.getElementById("hbSpan");

let hbInterval = null;

export function setStatus(status){
    statusSpan.className = "";
    if(status==="connecting"){ statusSpan.textContent="Status: 再接続中"; statusSpan.classList.add("connecting"); }
    else if(status==="connected"){ statusSpan.textContent="Status: 接続中"; statusSpan.classList.add("connected"); }
    else if(status==="disconnected"){ statusSpan.textContent="Status: 切断"; statusSpan.classList.add("disconnected"); }
    else if(status==="error"){ statusSpan.textContent="Status: エラー"; statusSpan.classList.add("disconnected"); }
}

// ハートビート表示
export function startHeartbeat(){
    if(hbInterval) clearInterval(hbInterval);
    hbInterval = setInterval(()=>{
        hbSpan.textContent = "HB: " + new Date().toLocaleTimeString();
    },10000);
}

startHeartbeat();
