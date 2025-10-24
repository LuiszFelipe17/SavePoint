/**
 * SavePoint - Indicador de Força de Senha
 *
 * Funcionalidades:
 * - Análise em tempo real da força da senha
 * - Feedback visual (barra de progresso colorida)
 * - Sugestões de melhoria
 */

(function() {
  'use strict';

  /**
   * Analisa a força de uma senha
   * @param {string} password - Senha a ser analisada
   * @returns {Object} { strength: string, score: number, feedback: string[] }
   */
  function analyzePasswordStrength(password) {
    let score = 0;
    const feedback = [];

    // Vazio
    if (!password || password.length === 0) {
      return { strength: 'none', score: 0, feedback: ['Digite uma senha'] };
    }

    // Comprimento
    if (password.length < 8) {
      feedback.push('Use pelo menos 8 caracteres');
    } else {
      score++;
      if (password.length >= 12) score++;
    }

    // Letras minúsculas
    if (/[a-z]/.test(password)) {
      score++;
    } else {
      feedback.push('Adicione letras minúsculas');
    }

    // Letras maiúsculas
    if (/[A-Z]/.test(password)) {
      score++;
    } else {
      feedback.push('Adicione letras maiúsculas');
    }

    // Números
    if (/[0-9]/.test(password)) {
      score++;
    } else {
      feedback.push('Adicione números');
    }

    // Caracteres especiais
    if (/[^a-zA-Z0-9]/.test(password)) {
      score++;
      feedback.push('Ótimo! Contém caracteres especiais');
    } else {
      feedback.push('Adicione caracteres especiais (!@#$%...)');
    }

    // Determinar força
    let strength;
    if (score <= 1) {
      strength = 'weak';
    } else if (score <= 3) {
      strength = 'medium';
    } else if (score <= 4) {
      strength = 'good';
    } else {
      strength = 'strong';
    }

    // Se senha muito curta, sempre é fraca
    if (password.length < 8) {
      strength = 'weak';
    }

    return { strength, score, feedback };
  }

  /**
   * Cria o HTML do indicador de força
   * @param {HTMLInputElement} passwordInput - Input de senha
   */
  function createStrengthIndicator(passwordInput) {
    // Verifica se já existe
    const existingContainer = passwordInput.parentElement.querySelector('.password-strength-container');
    if (existingContainer) {
      return existingContainer;
    }

    // Criar container
    const container = document.createElement('div');
    container.className = 'password-strength-container';
    container.innerHTML = `
      <div class="password-strength-bar">
        <div class="password-strength-fill"></div>
      </div>
      <div class="password-strength-text">
        <span class="strength-label"></span>
        <span class="strength-feedback"></span>
      </div>
    `;

    // Inserir após o input (ou wrapper do input)
    const wrapper = passwordInput.closest('.password-wrapper') || passwordInput.parentElement;
    wrapper.insertAdjacentElement('afterend', container);

    return container;
  }

  /**
   * Atualiza o indicador visual
   * @param {HTMLElement} container - Container do indicador
   * @param {Object} analysis - Resultado da análise
   */
  function updateStrengthIndicator(container, analysis) {
    const fill = container.querySelector('.password-strength-fill');
    const label = container.querySelector('.strength-label');
    const feedbackEl = container.querySelector('.strength-feedback');

    // Remover classes anteriores
    fill.className = 'password-strength-fill';
    label.className = 'strength-label';

    if (analysis.strength === 'none') {
      fill.style.width = '0%';
      label.textContent = '';
      feedbackEl.textContent = '';
      return;
    }

    // Adicionar classe de força
    fill.classList.add(analysis.strength);
    label.classList.add(analysis.strength);

    // Texto da força
    const strengthTexts = {
      weak: 'Fraca',
      medium: 'Média',
      good: 'Boa',
      strong: 'Forte'
    };
    label.textContent = strengthTexts[analysis.strength] || '';

    // Feedback (mostrar apenas 1 dica principal)
    if (analysis.feedback.length > 0) {
      feedbackEl.textContent = analysis.feedback[0];
    } else {
      feedbackEl.textContent = 'Senha segura!';
    }
  }

  /**
   * Inicializa o indicador de força em um input
   * @param {string|HTMLInputElement} selector - Seletor CSS ou elemento
   */
  window.initPasswordStrength = function(selector) {
    const input = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;

    if (!input) {
      console.warn('Password strength: input not found', selector);
      return;
    }

    // Criar indicador
    const container = createStrengthIndicator(input);

    // Listener para atualizar em tempo real
    input.addEventListener('input', function() {
      const password = input.value;
      const analysis = analyzePasswordStrength(password);
      updateStrengthIndicator(container, analysis);

      // Adicionar data attribute para uso externo
      input.setAttribute('data-password-strength', analysis.strength);
      input.setAttribute('data-password-score', analysis.score);
    });

    // Análise inicial
    if (input.value) {
      const analysis = analyzePasswordStrength(input.value);
      updateStrengthIndicator(container, analysis);
    }
  };

  /**
   * Exporta a função de análise para uso externo
   */
  window.analyzePasswordStrength = analyzePasswordStrength;

})();
