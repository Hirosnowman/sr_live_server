// ハートビートと経過時間表示
window.heartbeat = (function(){
    let startedAt = null;
    let hbInterval = null;

    function startHB(socket){
        if(hbInterval) clearInterval(hbInterval);
        hbInterval = setInterval(()=>{
            if(socket && socket.readyState===WebSocket.OPEN) socket.send("PING");
        },10000);
    }

    function setStarted(time){
        startedAt = time;
    }

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

    return { startHB, setStarted };
})();
