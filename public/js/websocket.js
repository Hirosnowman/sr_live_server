// ===============================
// websocket.js（グローバル版）
// ===============================

let ws = null;
let hbTimer = null;

function logMessage(msg) {
  const log = document.getElementById("log");
  log.textContent += msg + "\n";
  log.scrollTop = log.scrollHeight;
}

function startConnection() {
  const roomId = document.getElementById("roomId").value.trim();
  if (!roomId) return alert("Room ID を入力してください");

  document.getElementById("status").textContent = "接続中…";

  ws = new WebSocket(`wss://sr-live-server.onrender.com/ws?room_id=${roomId}`);

  ws.onopen = () => {
    document.getElementById("status").textContent = "接続されました。";
    logMessage("WebSocket: connected");

    startHeartbeat(ws);
  };

  ws.onmessage = (ev) => {
    const data = JSON.parse(ev.data);

    if (data.type === "room") {
      document.getElementById("room_name").textContent = data.room_name;
      document.getElementById("start_time").textContent = data.start_time;
    }

    if (data.type === "elapsed") {
      document.getElementById("elapsed").textContent = data.elapsed;
    }

    // コメント・ギフト処理（commentGift.js に定義）
    if (data.type === "comment" || data.type === "gift") {
      handleCommentGift(data);
    }
  };

  ws.onerror = (err) => {
    document.getElementById("status").textContent = "エラー発生";
    logMessage("WebSocket ERROR: " + err);
  };

  ws.onclose = () => {
    document.getElementById("status").textContent = "切断されました";
    logMessage("WebSocket: disconnected");
    stopHeartbeat();
  };
}

