const telaInicial = document.querySelector('#tela-inicial');
const telaDificuldade = document.querySelector('#tela-dificuldade');
const telaJogo = document.querySelector('#tela-jogo');
const telaFimTempo = document.querySelector('#tela-fim-tempo');
const telaVitoria = document.querySelector('#tela-vitoria');

const tabuleiroJogo = document.querySelector('.tabuleiro-jogo');
const timerDisplay = document.querySelector('#timer');

const botoesTema = document.querySelectorAll('.botao-tema');
const botoesDificuldade = document.querySelectorAll('.botao-dificuldade');
const botaoVoltarTema = document.querySelector('#botao-voltar-tema');
const botaoVoltarJogo = document.querySelector('#botao-voltar-jogo');
const botaoReiniciarTempo = document.querySelector('#botao-reiniciar-tempo');
const botaoReiniciarVitoria = document.querySelector('#botao-reiniciar-vitoria');

let temCartaVirada = false;
let travarTabuleiro = false;
let primeiraCarta, segundaCarta;
let paresEncontrados = 0;
let totalPares = 0;

let temaSelecionado;
let dificuldadeAtual;
let timerInterval;
let tempoRestante;
let tempoInicial;
let usuarioLogado = null;

// FASE 4: Sistema de Desafios (usando challengeHelper global)

// Gerenciador de áudio
const audioManager = new AudioManager();

// Carregar sons
audioManager.loadSound('flip', '../assets/sounds/card-flip.mp3');
audioManager.loadSound('match', '../assets/sounds/match-success.mp3');
audioManager.loadSound('fail', '../assets/sounds/match-fail.mp3');
audioManager.loadSound('victory', '../assets/sounds/victory.mp3');
audioManager.loadSound('warning', '../assets/sounds/time-warning.mp3');
audioManager.loadSound('timeout', '../assets/sounds/timeout.mp3');

const temas = {
    geometria: [
        { id: 'dodecaedro', img: '../assets/img/dodecaedro.png', texto: 'Dodecaedro' },
        { id: 'octogono', img: '../assets/img/octogono.png', texto: 'Octógono' },
        { id: 'cilindro', img: '../assets/img/cilindro.png', texto: 'Cilindro' },
        { id: 'hexagono', img: '../assets/img/hexagono.png', texto: 'Hexágono' },
        { id: 'pentagono', img: '../assets/img/pentagono.png', texto: 'Pentágono' },
        { id: 'paralelepipedo', img: '../assets/img/paralelepipedo.png', texto: 'Paralelepípedo' },
        { id: 'cone', img: '../assets/img/cone.png', texto: 'Cone' },
        { id: 'cubo', img: '../assets/img/cubo.png', texto: 'Cubo' }
    ],
    animais: [
        { id: 'leao', img: '../assets/img/leao.png', texto: 'Leão' },
        { id: 'macaco', img: '../assets/img/macaco.png', texto: 'Macaco' },
        { id: 'elefante', img: '../assets/img/elefante.png', texto: 'Elefante' },
        { id: 'girafa', img: '../assets/img/girafa.png', texto: 'Girafa' },
        { id: 'cachorro', img: '../assets/img/cachorro.png', texto: 'cachorro' },
        { id: 'gato', img: '../assets/img/gato.png', texto: 'Gato' },
        { id: 'capivara', img: '../assets/img/capivara.png', texto: 'Capivara' },
        { id: 'cavalo', img: '../assets/img/cavalo.png', texto: 'Cavalo' }
    ],
    espaco: [
        { id: 'saturno', img: '../assets/img/saturno.png', texto: 'Saturno' },
        { id: 'jupiter', img: '../assets/img/jupiter.png', texto: 'Júpiter' },
        { id: 'urano', img: '../assets/img/urano.png', texto: 'Urano' },
        { id: 'netuno', img: '../assets/img/netuno.png', texto: 'Netuno' },
        { id: 'terra', img: '../assets/img/terra.png', texto: 'Terra' },
        { id: 'marte', img: '../assets/img/marte.png', texto: 'Marte' },
        { id: 'venus', img: '../assets/img/venus.png', texto: 'Vênus' },
        { id: 'mercurio', img: '../assets/img/mercurio.png', texto: 'Mercúrio' }
    ]
};

// Verificar autenticação
async function verificarAutenticacao() {
    try {
        const res = await fetch('../api/game_auth.php', { credentials: 'same-origin' });
        const data = await res.json();

        if (!data || !data.authenticated) {
            window.location.href = '../login/';
            return null;
        }

        return data;
    } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
        window.location.href = '../login/';
        return null;
    }
}

// Calcular pontos baseado em dificuldade e tempo
function calcularPontos(dificuldade, tempoGasto) {
    const pontosPorDificuldade = {
        facil: 50,
        medio: 100,
        dificil: 200
    };

    const pontos = pontosPorDificuldade[dificuldade] || 50;

    // Bônus de tempo (quanto mais rápido, mais pontos)
    const limitesTempo = { facil: 180, medio: 120, dificil: 60 };
    const tempoRestanteAtual = limitesTempo[dificuldade] - tempoGasto;
    const bonus = Math.max(0, Math.floor(tempoRestanteAtual * 0.5));

    return pontos + bonus;
}

// Calcular duração da partida
function calcularDuracao() {
    const limitesTempo = { facil: 180, medio: 120, dificil: 60 };
    return limitesTempo[dificuldadeAtual] - tempoRestante;
}

// Salvar pontuação no backend
async function salvarPontuacao(pontos, duracao, status) {
    try {
        const res = await fetch('../api/game_save_score.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                game_code: 'memory',
                score: pontos,
                duration_seconds: duracao,
                difficulty: dificuldadeAtual,
                theme: temaSelecionado,
                status: status,
                metadata: {
                    pairs_found: paresEncontrados,
                    total_pairs: totalPares,
                    time_remaining: tempoRestante
                }
            })
        });

        const data = await res.json();
        console.log('Pontuação salva:', data);

        // FASE 4: Se for um desafio, enviar também para a API de desafios
        if (window.challengeHelper && window.challengeHelper.isActive() && status === 'completed') {
            await window.challengeHelper.submitScore(pontos, duracao, data.session_id);
        }

        return data;
    } catch (err) {
        console.error('Erro ao salvar pontuação:', err);
        return null;
    }
}

// FASE 4: Detectar modo desafio (usando challengeHelper global)
function detectarDesafioAtivo() {
    if (!window.challengeHelper) return;

    // Usar o challengeHelper global para detectar e mostrar indicador
    const challenge = window.challengeHelper.detectActiveChallenge();

    if (challenge) {
        // Lógica específica do Memory: pular telas e ir direto para o jogo
        telaInicial.classList.add('oculto');

        // Se dificuldade foi especificada, selecionar automaticamente
        if (challenge.difficulty && challenge.difficulty !== 'free') {
            // Pular tela de tema e ir direto para jogo com tema padrão
            temaSelecionado = 'geometria'; // tema padrão
            dificuldadeAtual = challenge.difficulty;
            telaDificuldade.classList.add('oculto');
            telaJogo.classList.remove('oculto');
            iniciarJogo(temaSelecionado, dificuldadeAtual);
        } else {
            // Mostrar tela de seleção de tema
            telaDificuldade.classList.remove('oculto');
        }
    }
}

function mostrarTelaDificuldade(tema) {
    temaSelecionado = tema;
    telaInicial.classList.add('oculto');
    telaDificuldade.classList.remove('oculto');
}

function mostrarTelaJogo(dificuldade) {
    dificuldadeAtual = dificuldade; // Salvar dificuldade selecionada
    telaDificuldade.classList.add('oculto');
    telaJogo.classList.remove('oculto');
    iniciarJogo(temaSelecionado, dificuldade);
}

function mostrarTelaInicial() {
    clearInterval(timerInterval);
    telaJogo.classList.add('oculto');
    telaDificuldade.classList.add('oculto');
    telaFimTempo.classList.add('oculto');
    telaVitoria.classList.add('oculto');
    telaInicial.classList.remove('oculto');
    tabuleiroJogo.innerHTML = '';
}

// Funções do Timer
function iniciarTimer(dificuldade) {
    const tempos = { facil: 180, medio: 120, dificil: 60 };
    tempoRestante = tempos[dificuldade];

    timerInterval = setInterval(() => {
        tempoRestante--;
        atualizarTimerDisplay();

        // Som de alerta quando restar 1 minuto
        if (tempoRestante === 60) {
            audioManager.play('warning');
        }

        if (tempoRestante < 0) {
            clearInterval(timerInterval);
            audioManager.play('timeout'); // Som ao esgotar o tempo
            telaJogo.classList.add('oculto');
            telaFimTempo.classList.remove('oculto');
        }
    }, 1000);

    atualizarTimerDisplay();
}

function atualizarTimerDisplay() {
    const minutos = Math.floor(tempoRestante / 60);
    let segundos = tempoRestante % 60;
    segundos = segundos < 10 ? '0' + segundos : segundos;
    timerDisplay.textContent = `Tempo: ${minutos}:${segundos}`;
}

// Lógica principal do jogo
function iniciarJogo(tema, dificuldade) {
    paresEncontrados = 0;
    const dadosTema = temas[tema];
    
    if (!dadosTema) {
        tabuleiroJogo.innerHTML = '<p>Tema não encontrado!</p>';
        return;
    }

    // --- INÍCIO DA ALTERAÇÃO ---
    // Define a quantidade de pares com base na dificuldade
    const paresPorDificuldade = { facil: 4, medio: 6, dificil: 8 };
    totalPares = paresPorDificuldade[dificuldade];
    
    // Seleciona apenas o número de cartas necessárias para a dificuldade
    const dadosParaJogo = dadosTema.slice(0, totalPares);
    // --- FIM DA ALTERAÇÃO ---

    const totalCartas = totalPares * 2;

    tabuleiroJogo.className = 'tabuleiro-jogo'; // Reseta as classes de grid
    if (totalCartas <= 8) {
        tabuleiroJogo.classList.add('grid-4x2');
    } else if (totalCartas <= 12) {
        tabuleiroJogo.classList.add('grid-4x3');
    } else if (totalCartas <= 16) {
        tabuleiroJogo.classList.add('grid-4x4');
    }

    gerarCartas(dadosParaJogo); // Gera as cartas com base nos dados selecionados

    const cartas = document.querySelectorAll('.carta');
    embaralhar(cartas);
    cartas.forEach(carta => carta.addEventListener('click', virarCarta));

    // Trava o tabuleiro e vira todas as cartas para a pré-visualização
    travarTabuleiro = true;
    cartas.forEach(carta => carta.classList.add('virada'));

    setTimeout(() => {
        // Desvira todas as cartas
        cartas.forEach(carta => carta.classList.remove('virada'));
        
        // Libera o tabuleiro para o jogador
        travarTabuleiro = false;

        // Inicia o timer APÓS a pré-visualização
        iniciarTimer(dificuldade);
    }, 2000); // 2 segundos de tempo de visualização
}


function gerarCartas(dados) {
    let htmlCartas = '';
    dados.forEach(item => {
        htmlCartas += `
            <div class="carta" data-card="${item.id}">
                <div class="lado-carta frente-carta"><img src="${item.img}" alt="${item.texto}"></div>
                <div class="lado-carta verso-carta">?</div>
            </div>
        `;
        htmlCartas += `
            <div class="carta" data-card="${item.id}">
                <div class="lado-carta frente-carta texto-frente">${item.texto}</div>
                <div class="lado-carta verso-carta">?</div>
            </div>
        `;
    });
    tabuleiroJogo.innerHTML = htmlCartas;
}

function embaralhar(cartas) {
    cartas.forEach(carta => {
        let posicaoAleatoria = Math.floor(Math.random() * cartas.length);
        carta.style.order = posicaoAleatoria;
    });
}

function virarCarta() {
    if (travarTabuleiro || this === primeiraCarta) return;
    this.classList.add('virada');
    audioManager.play('flip'); // Som ao virar carta

    if (!temCartaVirada) {
        temCartaVirada = true;
        primeiraCarta = this;
        return;
    }
    segundaCarta = this;
    verificarCombinacao();
}

function verificarCombinacao() {
    let ehCombinacao = primeiraCarta.dataset.card === segundaCarta.dataset.card;
    ehCombinacao ? desabilitarCartas() : desvirarCartas();
}

async function desabilitarCartas() {
    primeiraCarta.removeEventListener('click', virarCarta);
    segundaCarta.removeEventListener('click', virarCarta);

    audioManager.play('match'); // Som ao encontrar par correto

    paresEncontrados++;
    if (paresEncontrados === totalPares) {
        clearInterval(timerInterval);

        // Salvar pontuação
        const duracaoSegundos = calcularDuracao();
        const pontos = calcularPontos(dificuldadeAtual, duracaoSegundos);
        await salvarPontuacao(pontos, duracaoSegundos, 'completed');

        setTimeout(() => {
            audioManager.play('victory'); // Som de vitória
            telaJogo.classList.add('oculto');
            telaVitoria.classList.remove('oculto');
        }, 500);
    }

    resetarTabuleiro();
}

function desvirarCartas() {
    travarTabuleiro = true;
    audioManager.play('fail'); // Som ao errar
    setTimeout(() => {
        primeiraCarta.classList.remove('virada');
        segundaCarta.classList.remove('virada');
        resetarTabuleiro();
    }, 1500);
}

function resetarTabuleiro() {
    [temCartaVirada, travarTabuleiro] = [false, false];
    [primeiraCarta, segundaCarta] = [null, null];
}

botoesTema.forEach(botao => {
    botao.addEventListener('click', () => {
        const tema = botao.dataset.tema;
        mostrarTelaDificuldade(tema);
    });
});

botoesDificuldade.forEach(botao => {
    botao.addEventListener('click', () => {
        const dificuldade = botao.dataset.dificuldade;
        mostrarTelaJogo(dificuldade);
    });
});

botaoVoltarTema.addEventListener('click', mostrarTelaInicial);
botaoVoltarJogo.addEventListener('click', mostrarTelaInicial);
botaoReiniciarTempo.addEventListener('click', mostrarTelaInicial);
botaoReiniciarVitoria.addEventListener('click', mostrarTelaInicial);

// Controles de Áudio
function initAudioControls() {
    const audioToggle = document.getElementById('audio-toggle');
    const volumeSlider = document.getElementById('volume-slider');

    if (audioToggle) {
        // Restaurar estado do mute
        audioToggle.textContent = audioManager.isMuted() ? '🔇' : '🔊';

        audioToggle.addEventListener('click', () => {
            const muted = audioManager.toggleMute();
            audioToggle.textContent = muted ? '🔇' : '🔊';
        });
    }

    if (volumeSlider) {
        // Restaurar volume
        volumeSlider.value = audioManager.getVolume() * 100;

        // Atualizar gradiente do slider
        function updateSliderBackground() {
            const value = volumeSlider.value;
            volumeSlider.style.background = `linear-gradient(to right, #8A63D2 0%, #8A63D2 ${value}%, #ddd ${value}%, #ddd 100%)`;
        }

        updateSliderBackground();

        volumeSlider.addEventListener('input', () => {
            audioManager.setVolume(volumeSlider.value / 100);
            updateSliderBackground();
        });
    }
}

// Botão de Sair
function initExitButton() {
    const exitBtn = document.getElementById('exit-game-btn');
    if (exitBtn) {
        exitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearInterval(timerInterval);
            window.location.href = '../dashboard/';
        });
    }
}

// BUG FIX #3: Listener para tempo esgotado do desafio
window.addEventListener('challengeTimeExpired', async (event) => {
    console.log('[Memory] Tempo do desafio esgotado!', event.detail);

    // Parar o timer do jogo
    if (timerInterval) clearInterval(timerInterval);

    // Salvar score atual (mesmo que não tenha completado)
    const status = 'completed'; // Forçar completed para salvar
    const pontos = paresEncontrados * 10; // Calcular pontos pelos pares encontrados
    const duracao = Math.floor((Date.now() - startTime) / 1000);

    // Salvar no banco
    const data = await salvarPartida(pontos, duracao, status);

    // Se está em modo desafio, submeter score
    if (window.challengeHelper && window.challengeHelper.isActive() && data && data.session_id) {
        await window.challengeHelper.submitScore(pontos, duracao, data.session_id);
    }

    console.log('[Memory] Score salvo após tempo esgotado:', { pontos, duracao });
});

// Verificar autenticação ao carregar a página
(async function init() {
    usuarioLogado = await verificarAutenticacao();
    if (!usuarioLogado) return;
    console.log('Usuário autenticado:', usuarioLogado.username);
    detectarDesafioAtivo(); // FASE 4: Detectar modo desafio
    initAudioControls();
    initExitButton();
})();