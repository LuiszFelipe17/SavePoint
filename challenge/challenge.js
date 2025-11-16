/**
 * SavePoint - Sala de Espera do Desafio
 */

let challengeId = null;
let challenge = null;
let updateInterval = null;

/**
 * Inicializar
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Pegar ID do desafio da URL
    const urlParams = new URLSearchParams(window.location.search);
    challengeId = urlParams.get('id');

    if (!challengeId) {
        showError('ID do desafio não fornecido');
        return;
    }

    // Carregar dados do desafio
    await loadChallenge();

    // Atualizar a cada 2 segundos
    updateInterval = setInterval(updateChallenge, 2000);

    // Botão de voltar
    document.getElementById('leave-btn').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja sair? Você não participará do desafio.')) {
            window.location.href = '../dashboard/';
        }
    });
});

/**
 * Carregar dados do desafio
 */
async function loadChallenge() {
    try {
        const res = await fetch(`../api/challenge/get_waiting_room.php?challenge_id=${challengeId}`, {
            credentials: 'same-origin'
        });

        const data = await res.json();

        if (!data.ok) {
            showError(data.error || 'Erro ao carregar desafio');
            return;
        }

        challenge = data.challenge;
        renderChallenge();

        // Ocultar loading
        document.getElementById('loading').style.display = 'none';
        document.getElementById('challenge-content').style.display = 'block';

    } catch (err) {
        console.error('Erro ao carregar desafio:', err);
        showError('Erro ao conectar com o servidor');
    }
}

/**
 * Atualizar status do desafio
 */
async function updateChallenge() {
    try {
        const res = await fetch(`../api/challenge/get_waiting_room.php?challenge_id=${challengeId}`, {
            credentials: 'same-origin'
        });

        const data = await res.json();

        if (data.ok) {
            challenge = data.challenge;
            renderChallenge();

            // Se o desafio começou, redirecionar
            if (challenge.can_play_now) {
                clearInterval(updateInterval);
                startGame();
            }
        }
    } catch (err) {
        console.error('Erro ao atualizar:', err);
    }
}

/**
 * Renderizar desafio
 */
function renderChallenge() {
    // Título
    document.getElementById('challenge-title').textContent = challenge.title;

    // Informações
    document.getElementById('game-name').textContent = challenge.game_name;
    document.getElementById('duration').textContent = `${challenge.duration_minutes} minutos`;

    const difficultyLabels = {
        easy: 'Fácil',
        medium: 'Médio',
        hard: 'Difícil',
        expert: 'Expert'
    };
    document.getElementById('difficulty').textContent =
        challenge.difficulty ? difficultyLabels[challenge.difficulty] : 'Livre';

    // Countdown
    updateCountdown();

    // Participantes
    const readyCount = challenge.participants.filter(p => p.status === 'accepted').length;
    const totalCount = challenge.participants.length;

    document.getElementById('ready-count').textContent = readyCount;
    document.getElementById('total-count').textContent = totalCount;

    const participantsList = document.getElementById('participants-list');
    participantsList.innerHTML = challenge.participants.map(p => {
        const isReady = p.status === 'accepted';
        return `<div class="participant ${isReady ? 'ready' : ''}">
            ${isReady ? '✓' : '⏳'} ${p.display_name || p.username}
        </div>`;
    }).join('');

    // Status do desafio
    const statusEl = document.getElementById('status-message');
    const btnEl = document.getElementById('start-btn');

    if (challenge.challenge_status === 'cancelled') {
        statusEl.textContent = '❌ Desafio cancelado pelo professor';
        btnEl.disabled = true;
        btnEl.innerHTML = '<i class="fas fa-ban"></i> Desafio Cancelado';
        clearInterval(updateInterval);
    } else if (challenge.can_play_now) {
        statusEl.textContent = '🎮 Desafio ativo! Clique para jogar';
        btnEl.disabled = false;
        btnEl.innerHTML = '<i class="fas fa-rocket"></i> JOGAR AGORA!';
        btnEl.onclick = startGame;
    } else if (challenge.seconds_until_start > 0) {
        statusEl.textContent = `⏳ Aguardando início em ${formatTime(challenge.seconds_until_start)}`;
        btnEl.disabled = true;
        btnEl.innerHTML = '<i class="fas fa-hourglass-half"></i> Aguarde o início...';
    } else {
        statusEl.textContent = '⏳ Aguardando...';
    }
}

/**
 * Atualizar countdown
 */
function updateCountdown() {
    const countdownEl = document.getElementById('countdown');

    if (challenge.seconds_until_start > 0) {
        countdownEl.textContent = formatTime(challenge.seconds_until_start);
        // Decrementar para efeito visual
        challenge.seconds_until_start = Math.max(0, challenge.seconds_until_start - 1);
    } else {
        countdownEl.textContent = '00:00';
    }
}

/**
 * Formatar tempo (segundos -> MM:SS)
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Iniciar jogo
 */
function startGame() {
    clearInterval(updateInterval);

    // BUG FIX #10: Usar game_code dinamicamente da API
    if (!challenge.game_code) {
        alert('Erro: Código do jogo não encontrado');
        console.error('Challenge sem game_code:', challenge);
        return;
    }

    // Construir URL dinamicamente
    const gameUrl = `../${challenge.game_code}`;

    // Preparar parâmetros do desafio
    const params = new URLSearchParams({
        challenge_id: challengeId,
        challenge_mode: 'true',
        title: challenge.title || 'Desafio',
        difficulty: challenge.difficulty || 'free',
        duration: challenge.duration_minutes * 60, // converter para segundos
        ends_at: challenge.ends_at // BUG FIX #3: Passar ends_at para o timer funcionar
    });

    // Redirecionar para o jogo
    window.location.href = `${gameUrl}/?${params.toString()}`;
}

/**
 * Mostrar erro
 */
function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('challenge-content').style.display = 'none';
    document.getElementById('error-content').style.display = 'block';
    document.getElementById('error-message').textContent = message;
}

/**
 * Limpar interval ao sair
 */
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});
