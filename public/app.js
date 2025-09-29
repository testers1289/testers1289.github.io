
// Set this to your backend API URL (e.g. 'https://your-backend.vercel.app')
const API_BASE = window.API_BASE || '';
const el = id => document.getElementById(id);
let state = { channels: [], current: null, me: null };

async function whoami(){
  const r = await fetch(API_BASE + '/api/me', { credentials: 'include' });
  const j = await r.json();
  state.me = j.loggedIn ? j.username : null;
  updateAuthUI();
}

function updateAuthUI(){
  // add a small auth area in header
  let area = document.getElementById('auth-area');
  if (!area){
    area = document.createElement('div'); area.id='auth-area'; area.style.marginTop='8px';
    const channelsHeader = document.querySelector('#channels .header');
    if (channelsHeader) channelsHeader.appendChild(area);
  }
  area.innerHTML = '';
  if (state.me){
    const span = document.createElement('span'); span.textContent = 'Signed in: ' + state.me; span.style.color='var(--muted)'; area.appendChild(span);
    const btn = document.createElement('button'); btn.textContent='Logout'; btn.style.marginLeft='8px'; btn.addEventListener('click', async () => { await fetch('/api/logout', { method:'POST', credentials:'same-origin' }); state.me=null; updateAuthUI(); });
    area.appendChild(btn);
  } else {
    const a = document.createElement('a'); a.href='/login.html'; a.textContent='Login/Register'; a.style.color='var(--muted)'; area.appendChild(a);
  }
}

async function fetchChannels() {
  const res = await fetch(API_BASE + '/api/channels', { credentials: 'include' });
  state.channels = await res.json();
  renderChannels();
}

function renderChannels() {
  const ul = el('channel-list');
  ul.innerHTML = '';
  state.channels.forEach(c => {
    const li = document.createElement('li');
    li.textContent = '# ' + c.name;
    li.dataset.id = c.id;
    if (state.current === c.id) li.classList.add('active');
    li.addEventListener('click', () => selectChannel(c.id));
    ul.appendChild(li);
  });
}

async function selectChannel(id) {
  state.current = id;
  el('channel-title').textContent = '#' + id;
  renderChannels();
  const res = await fetch(API_BASE + `/api/channels/${id}/messages`, { credentials: 'include' });
  const msgs = await res.json();
  const ul = el('message-list');
  ul.innerHTML = '';
  msgs.forEach(m => {
    const li = document.createElement('li');
    li.textContent = m.text;
    const b = document.createElement('button');
    b.textContent = 'x';
    b.style.float = 'right';
    b.addEventListener('click', async () => {
      await fetch(`/api/channels/${id}/messages/${m.id}`, { method: 'DELETE' });
      selectChannel(id);
    });
    li.appendChild(b);
    ul.appendChild(li);
  });
}

el('create-channel').addEventListener('click', async () => {
  const name = el('new-channel-name').value.trim();
  if (!name) return;
  const res = await fetch(API_BASE + '/api/channels', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name }) });
  if (res.ok) {
    el('new-channel-name').value = '';
    await fetchChannels();
  } else if (res.status === 403) {
    alert('Forbidden');
  } else {
    alert('Could not create channel');
  }
});

el('delete-channel').addEventListener('click', async () => {
  if (!state.current) return alert('No channel selected');
  if (!confirm('Delete channel ' + state.current + '?')) return;
  const res = await fetch(API_BASE + `/api/channels/${state.current}`, { method: 'DELETE', credentials: 'include' });
  if (res.ok) {
    state.current = null;
    el('channel-title').textContent = 'Select a channel';
    await fetchChannels();
    el('message-list').innerHTML = '';
  } else if (res.status === 403) {
    alert('Only the channel owner can delete this channel');
  } else {
    alert('Delete failed');
  }
});

el('send-message').addEventListener('click', async () => {
  const text = el('message-text').value.trim();
  if (!text || !state.current) return;
  await fetch(API_BASE + `/api/channels/${state.current}/messages`, { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ text }) });
  el('message-text').value = '';
  selectChannel(state.current);
});

el('search').addEventListener('input', async (e) => {
  const q = e.target.value.trim();
  const res = await fetch(API_BASE + '/api/search?q=' + encodeURIComponent(q), { credentials: 'include' });
  const data = await res.json();
  // show channel matches on left and message matches in main
  if (q) {
    state.channels = data.channels;
    renderChannels();
    const ul = el('message-list');
    ul.innerHTML = '';
    data.messages.forEach(m => {
      const li = document.createElement('li');
      li.textContent = `[#${m.channelId}] ${m.text}`;
      ul.appendChild(li);
    });
  } else {
    await fetchChannels();
    if (state.current) selectChannel(state.current);
  }
});

// bottom nav demo
el('nav-channels').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
el('nav-search').addEventListener('click', () => el('search').focus());
el('nav-about').addEventListener('click', () => alert('Demo Discord-like site. Data stored in data.json.'));

whoami();
fetchChannels();
