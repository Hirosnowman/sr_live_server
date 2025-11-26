// comment.js
(function(){
  const mod = {
    name: 'comment',
    onMessage: function(obj){
      // obj contains cm, ac, av, created_at etc
      addComment(obj);
    },
    clear: function(){ document.getElementById('comment').innerHTML=''; }
  };

  function addComment(c){
    const box = document.getElementById('comment');
    const item = document.createElement('div');
    item.className = 'commentItem fade-in';
    const img = document.createElement('img'); img.src = `https://image.showroom-cdn.com/showroom-prod/image/avatar/${c.av}.png`;
    const meta = document.createElement('div'); meta.className='meta';
    const name = document.createElement('div'); name.textContent = c.ac;
    const text = document.createElement('div'); text.textContent = c.cm;
    meta.appendChild(name); meta.appendChild(text);
    item.appendChild(img); item.appendChild(meta);
    box.prepend(item);
    // limit items
    if (box.children.length > 200) box.removeChild(box.lastChild);
  }

  // register
  if(window.SRApp) window.SRApp.registerWidget('comment', mod);
  else console.error('SRApp not found');
})();
