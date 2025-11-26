// common.js
// global namespace
window.SRApp = (function(){
  const state = {
    roomId: null,
    broadcastKey: null,
    socket: null,
    lastRx: null,
    keyPollInterval: 5000,
    heartbeatSec: 10,
    keyPollTimer: null,
    heartbeatTimer: null,
    reconnectDelay: 1000,
    maxReconnect: 8000,
    widgets: {}  // 各モジュール登録用
  };

  // utility: fetch broadcast_key from server proxy
  async function fetchBroadcastKey(roomId){
    try{
      const r = await fetch(`/get_broadcast_key?room_id=${roomId}`);
      if (!r.ok) return null;
      const j = await r.json();
      return j.broadcast_key || null;
    }catch(e){
      console.warn('fetchBroadcastKey error', e);
      return null;
    }
  }

  // WebSocket management
  function openSocket(key){
    if (!key) return;
    closeSocket();

    state.socket = new WebSocket('wss://online.showroom-live.com');
    state.socket.addEventListener('open', ()=> {
      state.socket.send('SUB\t' + key);
      state.reconnectDelay = 1000;
      updateStatus('connected');
    });
    state.socket.addEventListener('message', e => {
      state.lastRx = Date.now();
      document.getElementById('lastRx').textContent = new Date(state.lastRx).toLocaleTimeString();
      const raw = e.data;
      if (raw.startsWith('ACK') || raw.startsWith('ERR')) return;
      const jsonText = raw.replace(`MSG\t${key}`, '');
      let obj;
      try { obj = JSON.parse(jsonText); } catch(e){ return; }
      // dispatch to modules
      if (obj.cm) { state.widgets.comment && state.widgets.comment.onMessage(obj); }
      if (obj.g)   { state.widgets.paid && state.widgets.paid.onMessage(obj); state.widgets.free && state.widgets.free.onMessage(obj); }
    });
    state.socket.addEventListener('close', ()=> { updateStatus('disconnected'); scheduleReconnect(); });
    state.socket.addEventListener('error', ()=> { updateStatus('disconnected'); scheduleReconnect(); });
  }

  function closeSocket(){
    if (state.socket){
      try { state.socket.close(); } catch(e){}
      state.socket = null;
    }
  }

  // reconnect logic with exponential backoff
  function scheduleReconnect(){
    updateStatus('reconnecting');
    const d = state.reconnectDelay;
    setTimeout(async ()=>{
      // before re-open, ensure key still valid
      const key = state.broadcastKey || await fetchBroadcastKey(state.roomId);
      if (!key) { updateStatus('wait'); return; }
      state.broadcastKey = key;
      openSocket(key);
      state.reconnectDelay = Math.min(state.reconnectDelay*2, state.maxReconnect);
    }, d);
  }

  // poll broadcast key periodically
  async function startKeyPoll(){
    if (state.keyPollTimer) clearInterval(state.keyPollTimer);
    state.keyPollTimer = setInterval(async ()=>{
      if (!state.roomId) return;
      const key = await fetchBroadcastKey(state.roomId);
      if (!key){
        // no live
        state.broadcastKey = null;
        updateStatus('wait');
        closeSocket();
        return;
      }
      if (key !== state.broadcastKey){
        state.broadcastKey = key;
        openSocket(key);
      }
    }, state.keyPollInterval);
  }

  // heartbeat: check last Rx; if no messages for heartbeatSec => close socket to trigger reconnect
  function startHeartbeat(){
    if (state.heartbeatTimer) clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = setInterval(()=>{
      if (!state.socket || state.socket.readyState !== 1) return;
      const diff = Date.now() - (state.lastRx || 0);
      if (diff > state.heartbeatSec * 1000){
        // consider dead
        updateStatus('disconnected');
        try { state.socket.close(); } catch(e){}
      }
    }, 2000);
  }

  // status UI
  function updateStatus(s){
    const el = document.getElementById('statusText');
    if(!el) return;
    el.textContent = (s==='connected')? '接続中' : (s==='reconnecting')? '再接続中' : (s==='wait')? '待機中' : '切断';
    // class color handled in html css
    const header = document.getElementById('statusText');
    // simple color via parent
    const parent = header;
    parent.style.color = (s==='connected')? 'green' : (s==='reconnecting')? '#f08a24' : (s==='wait')? '#777' : '#d62828';
  }

  // register widget modules (comment/paid/free)
  function registerWidget(name, api){
    state.widgets[name] = api;
  }

  // build initial DOM widgets (if not present)
  function buildWorkspace(){
    const ws = document.getElementById('workspace');
    // try restore layout from localStorage
    const saved = JSON.parse(localStorage.getItem('sr_layout_v1') || 'null');
    ws.innerHTML = ''; // clear
    if (saved && Array.isArray(saved.order)){
      // create in saved order
      saved.order.forEach(spec => {
        createWidgetElement(spec.id, spec.title, spec.type, spec.width);
      });
    } else {
      // default: comment, paid, free
      createWidgetElement('w-comment','コメント','comment','33%');
      createWidgetElement('w-paid','有料ギフト','paid','34%');
      createWidgetElement('w-free','無料ギフト','free','33%');
    }
  }

  function createWidgetElement(id,title,type,width){
    const ws = document.getElementById('workspace');
    const wrap = document.createElement('div');
    wrap.className = 'widget';
    wrap.id = id;
    wrap.style.flex = '0 0 ' + (width || '33%');

    const hd = document.createElement('div'); hd.className = 'w-hd';
    const left = document.createElement('div'); left.style.display='flex'; left.style.gap='8px';
    const drag = document.createElement('div'); drag.className='drag-handle'; drag.textContent='☰';
    left.appendChild(drag);
    const titleEl = document.createElement('div'); titleEl.className='w-title'; titleEl.textContent=title;
    left.appendChild(titleEl);
    hd.appendChild(left);

    const controls = document.createElement('div'); controls.className='w-controls';
    const clearBtn = document.createElement('button'); clearBtn.textContent='クリア';
    clearBtn.onclick = ()=> {
      state.widgets[type] && state.widgets[type].clear && state.widgets[type].clear();
    };
    controls.appendChild(clearBtn);
    hd.appendChild(controls);

    const body = document.createElement('div'); body.className='w-body';
    body.id = (type==='comment')? 'comment' : (type==='paid')? 'paidGift' : 'freeGift';

    // resize grip
    const grip = document.createElement('div'); grip.className='resize-grip';
    grip.addEventListener('pointerdown', startResize.bind(null, wrap));

    wrap.appendChild(hd);
    wrap.appendChild(body);
    wrap.appendChild(grip);
    ws.appendChild(wrap);

    // make header draggable to reorder
    drag.addEventListener('pointerdown', startDrag.bind(null, wrap));
  }

  // drag reorder logic
  let dragState = null;
  function startDrag(elem, ev){
    ev.preventDefault();
    const ws = document.getElementById('workspace');
    const rect = elem.getBoundingClientRect();
    const placeholder = document.createElement('div');
    placeholder.style.width = rect.width + 'px';
    placeholder.style.height = rect.height + 'px';
    placeholder.style.border = '2px dashed #ccc';
    placeholder.className = 'placeholder';
    dragState = { elem, placeholder, startX: ev.clientX, startY: ev.clientY };
    document.body.style.userSelect='none';
    elem.style.opacity='0.7';
    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragEnd);
  }
  function onDragMove(e){
    if(!dragState) return;
    const { elem, placeholder } = dragState;
    const ws = document.getElementById('workspace');
    elem.style.position='absolute';
    elem.style.zIndex=1000;
    elem.style.left = (e.clientX - 100) + 'px';
    elem.style.top = (e.clientY - 30) + 'px';
    // detect drop target by x coordinate among children
    const children = Array.from(ws.children).filter(c=>c!==elem && c!==placeholder);
    let inserted = false;
    for(const c of children){
      const r = c.getBoundingClientRect();
      if (e.clientX < r.left + r.width/2){
        if (ws.contains(placeholder)) ws.removeChild(placeholder);
        ws.insertBefore(placeholder, c);
        inserted = true;
        break;
      }
    }
    if (!inserted){
      if (ws.contains(placeholder)) ws.removeChild(placeholder);
      ws.appendChild(placeholder);
    }
  }
  function onDragEnd(e){
    if(!dragState) return;
    const { elem, placeholder } = dragState;
    const ws = document.getElementById('workspace');
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup', onDragEnd);
    elem.style.position='static';
    elem.style.zIndex='auto';
    elem.style.opacity=1;
    if (ws.contains(placeholder)){
      ws.insertBefore(elem, placeholder);
      ws.removeChild(placeholder);
    }
    dragState = null;
    document.body.style.userSelect='';
    saveLayout();
  }

  // resize
  let resizeState = null;
  function startResize(elem, ev){
    ev.preventDefault();
    resizeState = { elem, startX: ev.clientX, startWidth: elem.getBoundingClientRect().width };
    document.addEventListener('pointermove', onResizeMove);
    document.addEventListener('pointerup', onResizeEnd);
  }
  function onResizeMove(e){
    if(!resizeState) return;
    const { elem, startX, startWidth } = resizeState;
    const dx = e.clientX - startX;
    const newW = Math.max(180, startWidth + dx);
    elem.style.flex = '0 0 ' + newW + 'px';
  }
  function onResizeEnd(e){
    if(!resizeState) return;
    document.removeEventListener('pointermove', onResizeMove);
    document.removeEventListener('pointerup', onResizeEnd);
    saveLayout();
    resizeState = null;
  }

  // save layout (order and widths)
  function saveLayout(){
    const ws = document.getElementById('workspace');
    const arr = Array.from(ws.children).map(c => {
      const body = c.querySelector('.w-body');
      return { id: c.id, title: c.querySelector('.w-title').textContent, type: (body.id==='comment')?'comment':(body.id==='paidGift')?'paid':'free', width: c.getBoundingClientRect().width };
    });
    localStorage.setItem('sr_layout_v1', JSON.stringify({ order: arr }));
  }

  // load layout wrapper already done in buildWorkspace

  // public API
  return {
    init: function(){
      buildWorkspace();
      // register modules (they will call SRApp.register)
      // modules were loaded after this file; they should call registerWidget themselves
      // restore layout after modules registered (short timeout)
      setTimeout(()=> {
        // attempt to restore widget content size etc.
      }, 50);
    },
    registerWidget,
    connectRoom: async function(newRoomId){
      state.roomId = newRoomId;
      document.getElementById('currentRoom').textContent = newRoomId;
      // stop previous timers
      if (state.keyPollTimer) clearInterval(state.keyPollTimer);
      if (state.heartbeatTimer) clearInterval(state.heartbeatTimer);
      // fetch key
      const key = await fetchBroadcastKey(newRoomId);
      if (!key){
        updateStatus('wait');
        state.broadcastKey = null;
        closeSocket();
        return;
      }
      state.broadcastKey = key;
      document.getElementById('currentKey').textContent = key;
      openSocket(key);
      startKeyPoll();
      startHeartbeat();
      saveLayout();
    },
    // expose small config
    cfg: state,
  };

})();
