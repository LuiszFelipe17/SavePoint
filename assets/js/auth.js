(function () {
  const path = location.pathname.replace(/\\/g, '/');
  const isLoginPage = /\/login(\/|\/index\.html)?$/i.test(path);
  const isRegisterPage = /\/register(\/|\/index\.html)?$/i.test(path);

  function qs(sel, root = document) { return root.querySelector(sel); }
  function setMsg(container, msg, ok = false) {
    if (!container) return;
    container.textContent = msg || '';
    container.style.marginTop = '10px';
    container.style.fontWeight = '600';
    container.style.color = ok ? '#2e7d32' : '#c62828';
  }
  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'same-origin',
      body: JSON.stringify(data)
    });
    let json = {};
    try { json = await res.json(); } catch(_) {}
    return { ok: res.ok && json.ok !== false, status: res.status, data: json };
  }

  if (isRegisterPage) {
    const form = qs('#register-form');
    const msg = qs('.form-msg', form);
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = qs('#reg-username').value.trim();
        const email    = qs('#reg-email').value.trim();
        const password = qs('#reg-password').value;
        const confirm  = qs('#reg-confirm').value;

        setMsg(msg, 'Enviando...');
        const { ok, data } = await postJSON('../api/register.php', { username, email, password, confirm });
        if (!ok) {
          setMsg(msg, data.error || 'Erro ao cadastrar.');
          return;
        }
        setMsg(msg, 'Cadastro realizado! Redirecionando…', true);
        setTimeout(() => { window.location.href = '../dashboard/'; }, 600);
      });
    }
  }

  if (isLoginPage) {
    const form = qs('#login-form');
    const msg = qs('.form-msg', form);
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = qs('#login-identifier').value.trim();
        const password   = qs('#login-password').value;

        setMsg(msg, 'Enviando...');
        const { ok, data } = await postJSON('../api/login.php', { identifier, password });
        if (!ok) {
          setMsg(msg, data.error || 'Erro ao entrar.');
          return;
        }
        setMsg(msg, 'Login realizado! Redirecionando…', true);
        setTimeout(() => { window.location.href = '../dashboard/'; }, 400);
      });
    }
  }
})();
