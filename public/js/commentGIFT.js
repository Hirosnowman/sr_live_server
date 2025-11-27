window.commentSettings = {size:14, color:"#000000"};
window.paidSettings = {size:14, color:"#000000"};
window.freeSettings = {size:14, color:"#000000"};

window.paidGiftMap = {};
window.freeGiftMap = {};

// コメント表示
function showComment(c){
    const div = document.createElement("div");
    const img = document.createElement("img");
    img.src = `https://image.showroom-cdn.com/showroom-prod/image/avatar/${c.av}.png`;
    const p = document.createElement("p");
    p.textContent = `${c.ac}：${c.cm}`;
    div.appendChild(img);
    div.appendChild(p);
    document.getElementById("comment").prepend(div);
}

// ギフト表示（累積）
function showGift(g){
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

    giftMap[key]={div:div,count:g.n,time:Date.now()};
}
