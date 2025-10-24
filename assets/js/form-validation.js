/**
 * SavePoint - Validação de Formulários em Tempo Real
 *
 * Funcionalidades:
 * - Validação de username, email, senha
 * - Feedback visual instantâneo
 * - Ícones de validação
 * - Botão mostrar/ocultar senha
 */

(function() {
  'use strict';

  /**
   * Adiciona botão de toggle (mostrar/ocultar) em input de senha
   * @param {HTMLInputElement} input - Input de senha
   */
  function addPasswordToggle(input) {
    if (!input) return;

    // Pega o wrapper (se já existir) ou o parent
    let wrapper = input.closest('.password-wrapper') || input.parentElement;

    // Verifica se já existe toggle neste wrapper
    if (wrapper.querySelector('.password-toggle')) {
      return; // Já tem toggle, não criar outro
    }

    // Se não é um password-wrapper ainda, criar um
    if (!wrapper.classList.contains('password-wrapper')) {
      const newWrapper = document.createElement('div');
      newWrapper.className = 'password-wrapper';
      input.parentNode.insertBefore(newWrapper, input);
      newWrapper.appendChild(input);
      wrapper = newWrapper;
    }

    // Criar botão de toggle
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.setAttribute('aria-label', 'Mostrar senha');
    toggle.innerHTML = '👁️';

    // Listener para alternar visualização
    toggle.addEventListener('click', function(e) {
      e.preventDefault(); // Prevenir submit do form
      e.stopPropagation(); // Prevenir propagação

      const type = input.type === 'password' ? 'text' : 'password';
      input.type = type;
      toggle.innerHTML = type === 'password' ? '👁️' : '👁️‍🗨️';
      toggle.setAttribute('aria-label', type === 'password' ? 'Mostrar senha' : 'Ocultar senha');
    });

    wrapper.appendChild(toggle);
  }

  /**
   * Valida username (formato: 3-30 caracteres alfanuméricos, _ e -)
   * @param {string} username
   * @returns {boolean}
   */
  function validateUsername(username) {
    return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
  }

  /**
   * Valida email
   * @param {string} email
   * @returns {boolean}
   */
  function validateEmail(email) {
    // Regex básico de email
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Valida senha (mínimo 8 caracteres, letras + números)
   * @param {string} password
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  function validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('Mínimo de 8 caracteres');
    }

    if (!/[a-zA-Z]/.test(password)) {
      errors.push('Deve conter letras');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Deve conter números');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Adiciona feedback visual ao input
   * @param {HTMLInputElement} input
   * @param {boolean} isValid
   */
  function setInputValidation(input, isValid) {
    input.classList.remove('valid', 'invalid');

    if (isValid === null) {
      // Neutral (sem validação)
      return;
    }

    if (isValid) {
      input.classList.add('valid');
    } else {
      input.classList.add('invalid');
    }
  }

  /**
   * Valida campo de username em tempo real
   * @param {string|HTMLInputElement} selector
   */
  window.initUsernameValidation = function(selector) {
    const input = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!input) return;

    input.addEventListener('input', function() {
      const value = input.value.trim();

      if (value.length === 0) {
        setInputValidation(input, null);
        return;
      }

      const isValid = validateUsername(value);
      setInputValidation(input, isValid);
    });

    input.addEventListener('blur', function() {
      const value = input.value.trim();
      if (value.length > 0) {
        const isValid = validateUsername(value);
        setInputValidation(input, isValid);
      }
    });
  };

  /**
   * Valida campo de email em tempo real
   * @param {string|HTMLInputElement} selector
   */
  window.initEmailValidation = function(selector) {
    const input = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!input) return;

    input.addEventListener('input', function() {
      const value = input.value.trim();

      if (value.length === 0) {
        setInputValidation(input, null);
        return;
      }

      // Validar apenas se tiver @ (para não ficar vermelho enquanto digita)
      if (value.includes('@')) {
        const isValid = validateEmail(value);
        setInputValidation(input, isValid);
      } else {
        setInputValidation(input, null);
      }
    });

    input.addEventListener('blur', function() {
      const value = input.value.trim();
      if (value.length > 0) {
        const isValid = validateEmail(value);
        setInputValidation(input, isValid);
      }
    });
  };

  /**
   * Valida confirmação de senha (se coincide)
   * @param {string|HTMLInputElement} passwordSelector
   * @param {string|HTMLInputElement} confirmSelector
   */
  window.initPasswordConfirmation = function(passwordSelector, confirmSelector) {
    const password = typeof passwordSelector === 'string'
      ? document.querySelector(passwordSelector)
      : passwordSelector;

    const confirm = typeof confirmSelector === 'string'
      ? document.querySelector(confirmSelector)
      : confirmSelector;

    if (!password || !confirm) return;

    const validate = () => {
      if (confirm.value.length === 0) {
        setInputValidation(confirm, null);
        return;
      }

      const match = password.value === confirm.value;
      setInputValidation(confirm, match);
    };

    password.addEventListener('input', validate);
    confirm.addEventListener('input', validate);
    confirm.addEventListener('blur', validate);
  };

  /**
   * Inicializa botões de toggle em todos os inputs de senha
   * @param {string} selector - Seletor CSS (ex: 'input[type="password"]')
   */
  window.initPasswordToggles = function(selector = 'input[type="password"]') {
    const inputs = document.querySelectorAll(selector);
    inputs.forEach(input => {
      // Só adiciona se ainda não tiver toggle
      const wrapper = input.closest('.password-wrapper') || input.parentElement;
      if (!wrapper.querySelector('.password-toggle')) {
        addPasswordToggle(input);
      }
    });
  };

  /**
   * Mostra mensagem de erro no formulário
   * @param {HTMLElement} container - Container da mensagem
   * @param {string|string[]} message - Mensagem ou array de mensagens
   * @param {string} type - 'error', 'success' ou 'info'
   */
  window.showFormMessage = function(container, message, type = 'error') {
    if (!container) return;

    container.className = `form-msg show ${type}`;

    if (Array.isArray(message)) {
      // Lista de mensagens
      const ul = document.createElement('ul');
      message.forEach(msg => {
        const li = document.createElement('li');
        li.textContent = msg;
        ul.appendChild(li);
      });
      container.innerHTML = '';
      container.appendChild(ul);
    } else {
      // Mensagem única
      container.textContent = message;
    }
  };

  /**
   * Limpa mensagem do formulário
   * @param {HTMLElement} container
   */
  window.clearFormMessage = function(container) {
    if (!container) return;
    container.className = 'form-msg';
    container.textContent = '';
  };

  /**
   * Define estado de loading no botão
   * @param {HTMLButtonElement} button
   * @param {boolean} isLoading
   */
  window.setButtonLoading = function(button, isLoading) {
    if (!button) return;

    if (isLoading) {
      button.disabled = true;
      button.classList.add('loading');
      button.setAttribute('data-original-text', button.textContent);
      button.textContent = 'Processando...';
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      const originalText = button.getAttribute('data-original-text');
      if (originalText) {
        button.textContent = originalText;
        button.removeAttribute('data-original-text');
      }
    }
  };

  // Exportar funções de validação para uso externo
  window.validateUsername = validateUsername;
  window.validateEmail = validateEmail;
  window.validatePassword = validatePassword;

})();
