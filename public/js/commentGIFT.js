let startedAt = null;

// コメント表示
function showComment(c) {
    const div = document.createElement("div");
    const img = document.createElement("img");
    img.src = `https://image.showroom-cdn.com/showroom-prod/image/avatar/${c.av}.png`;
    const p = document.createElement("p");
    p.textContent = `${c.ac}：${c.cm}`;
    div.appendChild(img);
    div.appendChild(p);
    document.getElementById("comment").prepend(div);
}

// ギフト表示
const paidGiftMap = {};
const freeGiftMap = {};

function showGift(g) {
    const gt = parseInt(g.gt);
    let containerId, giftMap;
    if (gt === 2) { containerId = "freeGift"; giftMap = freeGiftMap; }
    else { containerId = "paidGift"; giftMap = paidGiftMap; }

    const key = `${g.u}_${g.g}`;
    if (giftMap[key]) {
        giftMap[key].count += g.n;
        giftMap[key].div.querySelector("p").textContent = `${g.ac}：${giftMap[key].count}個`;
        return;
    }

    const div = document.createElement("div");
    div.className = "giftItem";
    const img1 = document.createElement("img");
    img1.src = `https://image.showroom-cdn.com/showroom-prod/image/avatar/${g.av}.png`;
    const img2 = document.createElement("img");
    img2.src = `https://static.showroom-live.com/image/gift/${g.g}_s.png?v=7`;
    img2.width = 30;
    const p = document.createElement("p");
    p.textContent = `${g.ac}：${g.n}個`;
    div.appendChild(img1); div.appendChild(img2); div.appendChild(p);
    document.getElementById(containerId).prepend(div);

    giftMap[key] = { div: div, count: g.n };
}

// ステータス色切替
function setStatus(status) {
    const span = document.getElementById("statusSpan");
    span.className = "";
    if (status === "connecting") span.classList.add("connecting");
    else if (status === "connected") span.classList.add("connected");
    else span.classList.add("disconnected");
}

// HB横メッセージ表示
function setStatusMsg(text, color = "black") {
    const span = document.getElementById("statusMsg");
    span.textContent = text;
    span.style.color = color;
}

// 経過時間表示
setInterval(() => {
    if (startedAt) {
        const now = Date.now();
        const diff = Math.floor((now - startedAt) / 1000);
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        document.getElementById("startedSpan").textContent = "開始: " + new Date(startedAt).toLocaleString();
        document.getElementById("elapsedSpan").textContent = `経過: ${h}時間 ${m}分 ${s}秒`;
    }
}, 1000);
