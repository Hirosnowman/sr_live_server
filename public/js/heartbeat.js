let hbInterval = null;

export function startHeartbeat(socket) {
    if (hbInterval) clearInterval(hbInterval);
    hbInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send("PING");
        }
    }, 10000);
}
