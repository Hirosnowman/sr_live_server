// ===============================
// commentGift.js（グローバル版）
// ===============================

function handleCommentGift(data) {
  if (data.type === "comment") {
    logMessage(`[コメント] ${data.user}: ${data.comment}`);
  }

  if (data.type === "gift") {
    logMessage(`[ギフト] ${data.user}: ${data.gift_name} ×${data.num}`);
  }
}
