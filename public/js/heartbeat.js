let hbInterval = null;

function startHeartbeat(sock) {
    stopHeartbeat();
    hbInterval = setInterval(() => {
        if (sock && sock.readyState === WebSocket.OPEN) {
            sock.send("PING");
            document.getElementById("hbSpan").textContent = "HB: 10s";
        }
    }, 10000);
}

function stopHeartbeat() {
    if (hbInterval) {
        clearInterval(hbInterval);
        hbInterval = null;
    }
}
