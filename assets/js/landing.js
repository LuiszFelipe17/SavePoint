/**
 * Landing Page - SavePoint
 * Detecta se o usuário já está logado e adapta a interface
 */

// Verificar se usuário já está logado
async function checkAuth() {
    try {
        const res = await fetch('api/me.php', { credentials: 'same-origin' });
        const data = await res.json();

        if (data && data.ok && data.authenticated) {
            return {
                authenticated: true,
                username: data.username,
                user_id: data.user_id,
                display_name: data.display_name,
                avatar_url: data.avatar_url
            };
        }
        return null;
    } catch (e) {
        console.debug('Usuário não autenticado');
        return null;
    }
}

// Atualizar interface para usuário logado
function updateUIForLoggedUser(user) {
    const displayName = user.display_name || user.username;
    const firstLetter = displayName.charAt(0).toUpperCase();

    // Criar HTML do avatar
    let avatarHTML = '';
    if (user.avatar_url) {
        avatarHTML = `<div class="user-avatar"><img src="${user.avatar_url}" alt="Avatar"></div>`;
    } else {
        avatarHTML = `<div class="user-avatar">${firstLetter}</div>`;
    }

    // 1. Substituir botões do header
    const navButtons = document.querySelector('.nav-buttons');
    if (navButtons) {
        navButtons.innerHTML = `
            ${avatarHTML}
            <span class="welcome-text">Olá, <strong>${displayName}</strong>!</span>
            <button class="btn btn-primary btn-dashboard">Ir para Dashboard</button>
        `;
    }

    // 2. Atualizar botão principal do hero (Começar a Jogar)
    const heroBtns = document.querySelectorAll('.mjmppzazl');
    heroBtns.forEach(btn => {
        btn.textContent = 'Ir para Dashboard';
        btn.classList.remove('mjmppzazl');
        btn.classList.add('btn-dashboard');
    });

    // 3. Atualizar botão do CTA final (Criar Conta Grátis)
    const ctaBtns = document.querySelectorAll('.vddwxrhku');
    ctaBtns.forEach(btn => {
        btn.textContent = 'Continuar Jogando';
        btn.classList.remove('vddwxrhku');
        btn.classList.add('btn-dashboard');
    });

    // 4. Adicionar event listeners para redirecionar ao dashboard
    document.querySelectorAll('.btn-dashboard').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'dashboard/';
        });
    });
}

// Configurar botões padrão (Login/Cadastro) para usuários não logados
function setupDefaultButtons() {
    // Botões de Login
    const loginBtns = document.querySelectorAll('.mjmppzazl');
    loginBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'login/';
        });
    });

    // Botões de Cadastro
    const registerBtns = document.querySelectorAll('.vddwxrhku');
    registerBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'register/';
        });
    });
}

// Inicializar página
async function init() {
    // Verificar autenticação
    const user = await checkAuth();

    if (user && user.authenticated) {
        // Usuário logado - adaptar interface
        console.log('Usuário logado detectado:', user.username);
        updateUIForLoggedUser(user);
    } else {
        // Usuário não logado - manter botões padrão
        console.log('Usuário não logado - mostrando botões padrão');
        setupDefaultButtons();
    }
}

// Executar ao carregar a página
document.addEventListener('DOMContentLoaded', init);
