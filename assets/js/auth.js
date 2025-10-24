(function () {
  'use strict';

  const path = location.pathname.replace(/\\/g, '/');
  const isLoginPage = /\/login(\/|\/index\.html)?$/i.test(path);
  const isRegisterPage = /\/register(\/|\/index\.html)?$/i.test(path);

  function qs(sel, root = document) { return root.querySelector(sel); }

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

  // ========== REGISTRO ==========
  if (isRegisterPage) {
    const form = qs('#register-form');
    const msg = qs('.form-msg', form);
    const button = qs('#register-button');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = qs('#reg-username').value.trim();
        const email    = qs('#reg-email').value.trim();
        const password = qs('#reg-password').value;
        const confirm  = qs('#reg-confirm').value;

        // Limpar mensagem anterior
        if (window.clearFormMessage) {
          window.clearFormMessage(msg);
        }

        // Validações básicas frontend
        if (!username || !email || !password || !confirm) {
          if (window.showFormMessage) {
            window.showFormMessage(msg, 'Preencha todos os campos.', 'error');
          }
          return;
        }

        if (password !== confirm) {
          if (window.showFormMessage) {
            window.showFormMessage(msg, 'As senhas não coincidem.', 'error');
          }
          return;
        }

        // Loading
        if (window.setButtonLoading) {
          window.setButtonLoading(button, true);
        }

        // Enviar
        const { ok, data } = await postJSON('../api/register.php', {
          username,
          email,
          password,
          confirm
        });

        // Remover loading
        if (window.setButtonLoading) {
          window.setButtonLoading(button, false);
        }

        if (!ok) {
          // Mostrar erro (com detalhes se existirem)
          const errorMsg = data.details && data.details.length > 0
            ? data.details
            : (data.error || 'Erro ao cadastrar.');

          if (window.showFormMessage) {
            window.showFormMessage(msg, errorMsg, 'error');
          }
          return;
        }

        // Sucesso
        if (window.showFormMessage) {
          window.showFormMessage(msg, 'Cadastro realizado! Redirecionando...', 'success');
        }

        setTimeout(() => {
          window.location.href = '../dashboard/';
        }, 800);
      });
    }
  }

  // ========== LOGIN ==========
  if (isLoginPage) {
    const form = qs('#login-form');
    const msg = qs('.form-msg', form);
    const button = qs('#login-button');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const identifier = qs('#login-identifier').value.trim();
        const password   = qs('#login-password').value;
        const rememberCheckbox = qs('#login-remember');
        const remember = rememberCheckbox ? rememberCheckbox.checked : false;

        // Limpar mensagem anterior
        if (window.clearFormMessage) {
          window.clearFormMessage(msg);
        }

        // Validações básicas frontend
        if (!identifier || !password) {
          if (window.showFormMessage) {
            window.showFormMessage(msg, 'Preencha todos os campos.', 'error');
          }
          return;
        }

        // Loading
        if (window.setButtonLoading) {
          window.setButtonLoading(button, true);
        }

        // Enviar (com remember me)
        const { ok, data } = await postJSON('../api/login.php', {
          identifier,
          password,
          remember
        });

        // Remover loading
        if (window.setButtonLoading) {
          window.setButtonLoading(button, false);
        }

        if (!ok) {
          // Mostrar erro
          if (window.showFormMessage) {
            window.showFormMessage(msg, data.error || 'Erro ao entrar.', 'error');
          }
          return;
        }

        // Sucesso - salvar no localStorage para cache
        if (data.user) {
          try {
            localStorage.setItem('sp_user', JSON.stringify(data.user));
          } catch(_) {}
        }

        if (window.showFormMessage) {
          window.showFormMessage(msg, 'Login realizado! Redirecionando...', 'success');
        }

        setTimeout(() => {
          window.location.href = '../dashboard/';
        }, 600);
      });
    }
  }
})();
