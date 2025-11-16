// Variáveis globais do jogo
let dadosPalavraAtual = null;
let pontuacao = 0;
let tempoRestante = 60;
let intervaloTimer = null;
let usuarioLogado = null;
let palavrasCompletadas = 0;
let palavrasPuladas = 0;
let tempoTotalJogo = 0;

// AudioManager
const audioManager = new AudioManager();
audioManager.loadSound('correct', '../assets/sounds/correct-answer.mp3');
audioManager.loadSound('wrong', '../assets/sounds/match-fail.mp3');
audioManager.loadSound('skip', '../assets/sounds/timeout.mp3');
audioManager.loadSound('warning', '../assets/sounds/time-warning.mp3');

// Sistema de Toast Notifications
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const titles = {
        success: 'Sucesso!',
        error: 'Ops!',
        warning: 'Atenção!',
        info: 'Informação'
    };

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Fechar">
            <i class="fas fa-times"></i>
        </button>
        <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    container.appendChild(toast);

    // Fechar ao clicar no X
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });

    // Auto-remover após duração
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

function removeToast(toast) {
    toast.classList.add('hiding');
    setTimeout(() => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    }, 300);
}

// Verificar autenticação
async function verificarAutenticacao() {
    try {
        const res = await fetch('../api/game_auth.php', { credentials: 'same-origin' });
        const data = await res.json();

        if (!data.authenticated) {
            window.location.href = '../login/';
            return false;
        }

        usuarioLogado = data;
        return true;
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '../login/';
        return false;
    }
}

// Salvar pontuação
async function salvarPontuacao() {
    if (!usuarioLogado) return;

    try {
        const res = await fetch('../api/portuguese_save_score.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                score: pontuacao,
                palavras_completadas: palavrasCompletadas,
                palavras_puladas: palavrasPuladas,
                tempo_total: tempoTotalJogo
            })
        });

        const data = await res.json();

        if (data.ok) {
            console.log('Pontuação salva:', data);

            // FASE 4: Se for um desafio, enviar também para a API de desafios
            if (window.challengeHelper && window.challengeHelper.isActive()) {
                await window.challengeHelper.submitScore(pontuacao, tempoTotalJogo, data.session_id);
            }
        }
    } catch (error) {
        console.error('Erro ao salvar pontuação:', error);
    }
}

// BUG FIX #3: Listener para tempo esgotado do desafio
window.addEventListener('challengeTimeExpired', async (event) => {
    console.log('[Português] Tempo do desafio esgotado!', event.detail);

    // Parar o timer do jogo
    if (intervaloTimer) {
        clearInterval(intervaloTimer);
        intervaloTimer = null;
    }

    // Calcular pontuação final
    const pontosFinal = pontuacao;
    const duracaoJogo = tempoTotalJogo;

    // Salvar pontuação
    await salvarPontuacao(pontosFinal, duracaoJogo);

    // Se está em modo desafio, submeter via challengeHelper
    if (window.challengeHelper && window.challengeHelper.isActive()) {
        // O submitScore já é chamado dentro de salvarPontuacao quando há desafio ativo
        console.log('[Português] Score já submetido via salvarPontuacao');
    }

    // Mostrar toast
    showToast('Tempo do desafio esgotado! Sua pontuação foi salva automaticamente.', 'warning', 5000);

    console.log('[Português] Score salvo após tempo esgotado:', { pontosFinal, duracaoJogo });
});

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação primeiro
    const autenticado = await verificarAutenticacao();
    if (!autenticado) return;

    // FASE 4: Detectar modo desafio
    if (window.challengeHelper) {
        window.challengeHelper.detectActiveChallenge();
    }

    const containerPalavra = document.getElementById('word-container');
    const textoDica = document.getElementById('hint-text');
    const containerBancoDeLetras = document.getElementById('letter-bank-container');
    const valorPontuacao = document.getElementById('score-value');
    const valorTempo = document.getElementById('timer-value');

    const btnVerificar = document.querySelector('.btn-verify');
    const btnPular = document.querySelector('.btn-skip');
    const btnDica = document.querySelector('.btn-hint');
    const btnSair = document.getElementById('exit-game-btn');

    async function carregarNovaPalavra() {

        clearInterval(intervaloTimer);

        try {
            const resposta = await fetch('../api/get-palavra.php', { credentials: 'same-origin' });

            if (!resposta.ok) {
                throw new Error('Falha ao buscar palavra da API');
            }

            dadosPalavraAtual = await resposta.json();

            const palavra = dadosPalavraAtual.palavra;
            const indices = dadosPalavraAtual.indicesFaltando;
            const dica = dadosPalavraAtual.dica;
            let letrasFaltantes = [];

            textoDica.textContent = dica;
            textoDica.classList.remove('revealed');
            btnDica.disabled = false;
            containerPalavra.innerHTML = '';
            containerBancoDeLetras.innerHTML = '';
            valorPontuacao.textContent = pontuacao;

            palavra.split('').forEach((letra, index) => {
                if (indices.includes(index)) {
                    const spanVazio = document.createElement('span');
                    spanVazio.classList.add('blank');
                    spanVazio.textContent = '_';
                    spanVazio.dataset.letter = letra;
                    spanVazio.addEventListener('click', devolverLetraAoBanco);
                    containerPalavra.appendChild(spanVazio);
                    letrasFaltantes.push(letra);
                } else {
                    const spanLetra = document.createElement('span');
                    spanLetra.textContent = letra;
                    containerPalavra.appendChild(spanLetra);
                }
            });

            let letrasDoBanco = [...letrasFaltantes];
            const alfabeto = 'ABCDEFGHIJLMNOPQRSTUVWXYZ';
            const numDistratores = 6 - letrasDoBanco.length;

            for (let i = 0; i < numDistratores; i++) {
                let letraAleatoria;
                do {
                    letraAleatoria = alfabeto[Math.floor(Math.random() * alfabeto.length)];
                } while (letrasDoBanco.includes(letraAleatoria) || palavra.includes(letraAleatoria));
                letrasDoBanco.push(letraAleatoria);
            }

            letrasDoBanco.sort(() => 0.5 - Math.random()).forEach(letra => {
                const btn = document.createElement('button');
                btn.textContent = letra;
                btn.addEventListener('click', selecionarLetra);
                containerBancoDeLetras.appendChild(btn);
            });

            tempoRestante = 60;
            valorTempo.textContent = tempoRestante;
            intervaloTimer = setInterval(atualizarTempo, 1000);

        } catch (error) {
            console.error('Erro ao carregar nova palavra:', error);
            showToast('Não foi possível carregar o jogo. Verifique sua conexão ou tente mais tarde.', 'error', 4000);
        }
    }

    function atualizarTempo() {
        tempoRestante--;
        tempoTotalJogo++;
        valorTempo.textContent = tempoRestante;

        // Alerta sonoro aos 10 segundos
        if (tempoRestante === 10) {
            audioManager.play('warning');
        }

        if (tempoRestante <= 0) {
            clearInterval(intervaloTimer);
            audioManager.play('skip');
            showToast("Tempo esgotado! Palavra pulada.", 'warning', 2500);
            palavrasPuladas++;
            carregarNovaPalavra();
        }
    }

    function selecionarLetra(event) {
        const botaoClicado = event.target;
        const letra = botaoClicado.textContent;

        const primeiroVazio = containerPalavra.querySelector('.blank:not([data-filled])');

        if (primeiroVazio) {
            primeiroVazio.textContent = letra;
            primeiroVazio.dataset.filled = letra;
            botaoClicado.disabled = true;
            botaoClicado.style.visibility = 'hidden';
        }
    }

    function devolverLetraAoBanco(event) {
        const spanVazioClicado = event.target;

        if (!spanVazioClicado.dataset.filled) return;

        const letra = spanVazioClicado.dataset.filled;

        spanVazioClicado.textContent = '_';
        delete spanVazioClicado.dataset.filled;

        const botao = Array.from(containerBancoDeLetras.children).find(
            btn => btn.textContent === letra && btn.disabled
        );

        if (botao) {
            botao.disabled = false;
            botao.style.visibility = 'visible';
        }
    }

    function verificarPalavra() {
        const todosOsVazios = containerPalavra.querySelectorAll('.blank');
        const vaziosPreenchidos = containerPalavra.querySelectorAll('.blank[data-filled]');

        if (vaziosPreenchidos.length !== todosOsVazios.length) {
            showToast("Por favor, preencha todos os espaços!", 'warning', 2500);
            return;
        }

        let estaCorreto = true;
        vaziosPreenchidos.forEach(spanVazio => {
            if (spanVazio.dataset.filled !== spanVazio.dataset.letter) {
                estaCorreto = false;
            }
        });

        if (estaCorreto) {
            audioManager.play('correct');
            showToast("Parabéns, você acertou! +" + (10 + tempoRestante) + " pontos", 'success', 2500);
            clearInterval(intervaloTimer);
            pontuacao += 10 + tempoRestante;
            palavrasCompletadas++;
            valorPontuacao.textContent = pontuacao;
            carregarNovaPalavra();
        } else {
            audioManager.play('wrong');
            showToast("Incorreto. Tente novamente!", 'error', 2500);
            vaziosPreenchidos.forEach(spanVazio => {
                devolverLetraAoBanco({ target: spanVazio });
            });
        }
    }

    function pularPalavra() {
        audioManager.play('skip');
        const penalidade = pontuacao > 2 ? 2 : 0;
        showToast(penalidade > 0 ? "Palavra pulada. -2 pontos" : "Palavra pulada.", 'info', 2000);
        if (pontuacao > 2) {
            pontuacao -= 2;
        }
        palavrasPuladas++;
        valorPontuacao.textContent = pontuacao;
        carregarNovaPalavra();
    }

    function revelarDica() {
        textoDica.classList.add('revealed');
        btnDica.disabled = true;

        // Penalidade por usar a dica
        if (pontuacao >= 5) {
            pontuacao -= 5;
            valorPontuacao.textContent = pontuacao;
        }
    }

    // Inicializar controles de áudio
    function initAudioControls() {
        const muteToggle = document.getElementById('mute-toggle');
        const volumeSlider = document.getElementById('volume-slider');

        if (muteToggle) {
            muteToggle.addEventListener('click', () => {
                const muted = audioManager.toggleMute();
                const icon = muteToggle.querySelector('i');
                icon.className = muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
            });
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                audioManager.setVolume(volume);

                // Atualizar background do slider
                const percentage = e.target.value;
                e.target.style.background = `linear-gradient(to right, #7c3aed 0%, #7c3aed ${percentage}%, #ddd ${percentage}%, #ddd 100%)`;
            });

            // Definir background inicial
            const percentage = volumeSlider.value;
            volumeSlider.style.background = `linear-gradient(to right, #7c3aed 0%, #7c3aed ${percentage}%, #ddd ${percentage}%, #ddd 100%)`;
        }
    }

    // Botão sair - salvar pontuação antes
    if (btnSair) {
        btnSair.addEventListener('click', async (e) => {
            e.preventDefault();
            clearInterval(intervaloTimer);

            if (pontuacao > 0) {
                await salvarPontuacao();
            }

            window.location.href = '../dashboard/';
        });
    }

    btnVerificar.addEventListener('click', verificarPalavra);
    btnPular.addEventListener('click', pularPalavra);
    btnDica.addEventListener('click', revelarDica);

    initAudioControls();
    carregarNovaPalavra();
});
