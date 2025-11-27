let hbInterval = null;

export function startHeartbeat(socket) {
    if (hbInterval) clearInterval(hbInterval);
    hbInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send("PING");
            console.log("[Heartbeat] PING sent");
        }
    }, 10000);
}

export function stopHeartbeat() {
    if (hbInterval) clearInterval(hbInterval);
    hbInterval = null;
}
