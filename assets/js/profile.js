(function () {
    function msg(el, text, ok) {
      if (!el) return;
      el.textContent = text || '';
      el.classList.remove('ok','err');
      if (text) el.classList.add(ok ? 'ok' : 'err');
    }
  
    async function getJSON(url) {
      const r = await fetch(url, { credentials: 'same-origin' });
      try { return await r.json(); } catch { return {}; }
    }
  
    async function postJSON(url, data) {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });
      try { return await r.json(); } catch { return {}; }
    }
  
    function initialsFrom(name, fallback) {
      const base = (name || fallback || 'SP').trim().split(/\s+/).map(w => w[0]?.toUpperCase()).slice(0,2).join('');
      return base || 'SP';
    }
  
    function setAvatar(url, name) {
      const img = document.getElementById('avatar-img');
      const fb = document.getElementById('avatar-fallback');
      if (url) {
        img.src = url;
        img.style.display = 'block';
        fb.style.display = 'none';
        return;
      }
      img.style.display = 'none';
      fb.style.display = 'grid';
      fb.textContent = initialsFrom(name, 'SP');
    }
  
    async function ensureAuth() {
      const me = await getJSON('../api/me.php');
      if (!me || me.ok !== true || me.authenticated !== true) {
        localStorage.removeItem('sp_user');
        window.location.href = '../login/';
        return null;
      }
      return me.user_id;
    }
  
    async function loadProfile() {
      const data = await getJSON('../api/profile_get.php');
      if (!data || data.ok !== true) return;
      document.getElementById('display-name').value = data.profile.display_name || '';
      document.getElementById('username').value = data.profile.username || '';
      document.getElementById('email').value = data.profile.email || '';
      setAvatar(data.profile.avatar_url, data.profile.display_name || data.profile.username);
    }
  
    function bindLogout() {
      const btn = document.getElementById('sp-logout');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try { await fetch('../api/logout.php', { method: 'POST', credentials: 'same-origin' }); } catch(e) {}
        localStorage.removeItem('sp_user');
        window.location.href = '../login/';
      });
    }
  
    function bindProfileForm() {
      const form = document.getElementById('profile-form');
      const msgBox = document.getElementById('profile-msg');
      if (!form) return;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const display_name = document.getElementById('display-name').value.trim();
        msg(msgBox, 'Salvando...', true);
        const res = await postJSON('../api/profile_update.php', { display_name });
        if (!res || res.ok !== true) {
          msg(msgBox, res && res.error ? res.error : 'Erro ao salvar', false);
          return;
        }
        try {
          const u = JSON.parse(localStorage.getItem('sp_user') || '{}');
          if (u) { u.display_name = display_name; localStorage.setItem('sp_user', JSON.stringify(u)); }
        } catch(e) {}
        msg(msgBox, 'Alterações salvas', true);
      });
    }
  
    function bindAvatarForm() {
      const form = document.getElementById('avatar-form');
      const input = document.getElementById('avatar-input');
      const msgBox = document.getElementById('avatar-msg');
      const img = document.getElementById('avatar-img');
      const fb = document.getElementById('avatar-fallback');
  
      if (input) {
        input.addEventListener('change', () => {
          const f = input.files && input.files[0];
          if (!f) return;
          const url = URL.createObjectURL(f);
          img.src = url;
          img.style.display = 'block';
          fb.style.display = 'none';
        });
      }
  
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const f = input.files && input.files[0];
          if (!f) return;
          msg(msgBox, 'Enviando...', true);
          const fd = new FormData();
          fd.append('avatar', f);
          const r = await fetch('../api/profile_avatar.php', {
            method: 'POST',
            body: fd,
            credentials: 'same-origin'
          });
          let data = {};
          try { data = await r.json(); } catch(e) {}
          if (!data || data.ok !== true) {
            msg(msgBox, data && data.error ? data.error : 'Erro ao enviar', false);
            return;
          }
          setAvatar(data.avatar_url);
          try {
            const u = JSON.parse(localStorage.getItem('sp_user') || '{}');
            if (u) { u.avatar_url = data.avatar_url; localStorage.setItem('sp_user', JSON.stringify(u)); }
          } catch(e) {}
          msg(msgBox, 'Foto atualizada', true);
        });
      }
    }
  
    (async function init(){
      const uid = await ensureAuth();
      if (!uid) return;
      await loadProfile();
      bindProfileForm();
      bindAvatarForm();
      bindLogout();
    })();
  })();
  