// paidGift.js
(function(){
  const sound = new Audio();
  // small chime for paid gift (base64 short beep) — you may replace with external file
  sound.src = "data:audio/mp3;base64,//uQZAAAAAAAAAAAA..."; // (省略) optional — replace with URL to mp3
  const mod = {
    name:'paid',
    onMessage: function(obj){
      if (!obj.g) return;
      // dispatch only paid (gt==1 per SR spec)
      const gt = parseInt(obj.gt);
      if (gt === 1){
        addPaid(obj);
      }
    },
    clear: function(){ document.getElementById('paidGift').innerHTML=''; }
  };

  function addPaid(g){
    const box = document.getElementById('paidGift');
    const el = document.createElement('div');
    el.className = 'giftItem giftPaid fade-in';
    const a = document.createElement('img'); a.src = `https://image.showroom-cdn.com/showroom-prod/image/avatar/${g.av}.png`;
    const gi = document.createElement('img'); gi.className='gift'; gi.src = `https://static.showroom-live.com/image/gift/${g.g}_s.png?v=7`;
    const info = document.createElement('div'); info.className='info'; info.textContent = `${g.ac}：${g.n}個`;
    el.appendChild(a); el.appendChild(gi); el.appendChild(info);
    box.prepend(el);
    if (box.children.length > 100) box.removeChild(box.lastChild);
    // play sound & highlight
    try { sound.currentTime = 0; sound.play().catch(()=>{}); } catch(e){}
    // flash background effect
    el.animate([{transform:'scale(1.02)'},{transform:'scale(1)'}],{duration:300, easing:'ease-out'});
  }

  if(window.SRApp) window.SRApp.registerWidget('paid', mod);
  else console.error('SRApp not found');
})();
