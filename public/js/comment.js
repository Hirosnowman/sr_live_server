// comment.js
const commentDiv = document.getElementById("comment");
const paidDiv = document.getElementById("paidGift");
const freeDiv = document.getElementById("freeGift");

const paidGiftMap = {};
const freeGiftMap = {};

export function showCommentOrGift(obj){
    // コメント
    if(obj.cm){
        const div = document.createElement("div");
        const img = document.createElement("img");
        img.src = `https://image.showroom-cdn.com/showroom-prod/image/avatar/${obj.av}.png`;
        img.width = 40;
        img.height = 40;
        const p = document.createElement("p");
        p.textContent = `${obj.ac}: ${obj.cm}`;
        div.appendChild(img);
        div.appendChild(p);
        commentDiv.prepend(div);
    }
    // ギフト
    else if(obj.g){
        const gt = parseInt(obj.gt);
        const container = gt===2 ? freeDiv : paidDiv;
        const giftMap = gt===2 ? freeGiftMap : paidGiftMap;
        const key = `${obj.u}_${obj.g}`;

        if(giftMap[key]){
            giftMap[key].count += obj.n;
            giftMap[key].div.querySelector("p").textContent = `${obj.ac}: ${giftMap[key].count}個`;
            return;
        }

        const div = document.createElement("div");
        div.className = "giftItem";

        const img1 = document.createElement("img");
        img1.src = `https://image.showroom-cdn.com/showroom-prod/image/avatar/${obj.av}.png`;
        img1.width = 40; img1.height = 40;

        const img2 = document.createElement("img");
        img2.src = `https://static.showroom-live.com/image/gift/${obj.g}_s.png?v=7`;
        img2.width = 30; img2.height = 30;

        const p = document.createElement("p");
        p.textContent = `${obj.ac}: ${obj.n}個`;

        div.appendChild(img1);
        div.appendChild(img2);
        div.appendChild(p);

        container.prepend(div);
        giftMap[key] = {div, count: obj.n};
    }
}
