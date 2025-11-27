// commentGift.js

window.startedAt = null;
window.paidGiftMap = {};
window.freeGiftMap = {};

// コメント表示
window.showComment = function(c){
    const div = document.createElement("div");
    div.style.display="flex"; div.style.alignItems="center"; div.style.marginBottom="5px";

    const img = document.createElement("img");
    img.src = `https://image.showroom-cdn.com/showroom-prod/image/avatar/${c.av}.png`;
    img.width=40; img.height=40; img.style.marginRight="5px";

    const p = document.createElement("p");
    p.textContent = `${c.ac}：${c.cm}`;

    div.appendChild(img); div.appendChild(p);
    document.getElementById("comment").prepend(div);
};

// ギフト表示（累積）
window.showGift = function(g){
    const gt = parseInt(g.gt);
    let containerId, giftMap;
    if(gt===2){ containerId="freeGift"; giftMap=window.freeGiftMap; }
    else { containerId="paidGift"; giftMap=window.paidGiftMap; }

    const key = `${g.u}_${g.g}`;
    if(giftMap[key]){
        giftMap[key].count += g.n;
        giftMap[key].time = Date.now();
        giftMap[key].div.querySelector("p").textContent = `${g.ac}：${giftMap[key].count}個`;
        return;
    }

    const div = document.createElement("div");
    div.className="giftItem";
    const img1 = document.createElement("img");
    img1.src=`https://image.showroom-cdn.com/showroom-prod/image/avatar/${g.av}.png`;
    const img2 = document.createElement("img");
    img2.src=`https://static.showroom-live.com/image/gift/${g.g}_s.png?v=7`;
    img2.width=30;

    const p = document.createElement("p");
    p.textContent=`${g.ac}：${g.n}個`;

    div.appendChild(img1); div.appendChild(img2); div.appendChild(p);
    document.getElementById(containerId).prepend(div);

    giftMap[key] = {div: div, count: g.n, time: Date.now()};
};

// 経過時間更新
setInterval(()=>{
    if(window.startedAt){
        const now = Date.now();
        const diff = Math.floor((now - window.startedAt)/1000);
        const h = Math.floor(diff/3600);
        const m = Math.floor((diff%3600)/60);
        const s = diff%60;
        document.getElementById("startedSpan").textContent="開始: "+new Date(window.startedAt).toLocaleString();
        document.getElementById("elapsedSpan").textContent=`経過: ${h}時間 ${m}分 ${s}秒`;
    }
},1000);
