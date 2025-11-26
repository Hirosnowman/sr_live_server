// freeGift.js
(function(){
  const mod = {
    name:'free',
    onMessage: function(obj){
      if (!obj.g) return;
      // free gift gt==2
      const gt = parseInt(obj.gt);
      if (gt === 1){
        addFree(obj);
      }
    },
    clear: function(){ document.getElementById('freeGift').innerHTML=''; }
  };

  function addFree(g){
    const box = document.getElementById('freeGift');
    const el = document.createElement('div');
    el.className = 'giftItem giftFree fade-in';
    const a = document.createElement('img'); a.src = `https://image.showroom-cdn.com/showroom-prod/image/avatar/${g.av}.png`;
    const gi = document.createElement('img'); gi.className='gift'; gi.src = `https://static.showroom-live.com/image/gift/${g.g}_s.png?v=7`;
    const info = document.createElement('div'); info.className='info'; info.textContent = `${g.ac}：${g.n}個`;
    el.appendChild(a); el.appendChild(gi); el.appendChild(info);
    box.prepend(el);
    if (box.children.length > 100) box.removeChild(box.lastChild);
  }

  if(window.SRApp) window.SRApp.registerWidget('free', mod);
  else console.error('SRApp not found');
})();
