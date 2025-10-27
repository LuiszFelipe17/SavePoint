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
        }
    } catch (error) {
        console.error('Erro ao salvar pontuação:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação primeiro
    const autenticado = await verificarAutenticacao();
    if (!autenticado) return;

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
            alert('Não foi possível carregar o jogo. Verifique sua conexão ou tente mais tarde.');
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
            alert("Tempo esgotado! Palavra pulada.");
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
            alert("Por favor, preencha todos os espaços!");
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
            alert("Parabéns, você acertou!");
            clearInterval(intervaloTimer);
            pontuacao += 10 + tempoRestante;
            palavrasCompletadas++;
            valorPontuacao.textContent = pontuacao;
            carregarNovaPalavra();
        } else {
            audioManager.play('wrong');
            alert("Incorreto. Tente novamente!");
            vaziosPreenchidos.forEach(spanVazio => {
                devolverLetraAoBanco({ target: spanVazio });
            });
        }
    }

    function pularPalavra() {
        audioManager.play('skip');
        alert("Palavra pulada.");
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
