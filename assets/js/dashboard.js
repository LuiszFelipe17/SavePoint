(function () {
    async function getSession() {
      const r = await fetch('../api/me.php', { credentials: 'same-origin' });
      try { return await r.json(); } catch { return { ok:false }; }
    }
  
    function getStoredUser() {
      try {
        const raw = localStorage.getItem('sp_user');
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    }
  
    function setUsername(name) {
      const el = document.getElementById('sp-username');
      if (el) el.textContent = name || 'Jogador';
    }
  
    function setAvatar(name, url) {
      const box = document.getElementById('sp-avatar');
      if (!box) return;
  
      if (url) {
        box.innerHTML = '';
        const img = document.createElement('img');
        img.alt = 'avatar';
        img.src = url;
        box.appendChild(img);
        return;
      }
      const initials = (name || 'J').trim().split(/\s+/).map(w => w[0]?.toUpperCase()).slice(0,2).join('') || 'J';
      box.textContent = initials;
    }
  
    async function ensureAuth() {
      const cached = getStoredUser();
      if (cached) {
        setUsername(cached.username || cached.email || 'Jogador');
        setAvatar(cached.username || cached.email, cached.avatar_url);
      }
  
      const me = await getSession();
      if (!me || me.ok !== true || me.authenticated !== true) {
        localStorage.removeItem('sp_user');
        window.location.href = '../login/';
        return;
      }
    }
  
    function bindLogout() {
      const btn = document.getElementById('sp-logout');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await fetch('../api/logout.php', { method: 'POST', credentials: 'same-origin' });
        } catch {}
        localStorage.removeItem('sp_user');
        window.location.href = '../login/';
      });
    }
  
    ensureAuth();
    bindLogout();
  })();
  