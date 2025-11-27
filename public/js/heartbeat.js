// ===============================
// heartbeat.js（グローバル版）
// ===============================

let hbCount = 0;

function startHeartbeat(ws) {
  stopHeartbeat();

  hbTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
      hbCount++;
      document.getElementById("hb").textContent = hbCount + " 回";
    }
  }, 10000); // 10秒
}

function stopHeartbeat() {
  if (hbTimer) {
    clearInterval(hbTimer);
    hbTimer = null;
  }
}
