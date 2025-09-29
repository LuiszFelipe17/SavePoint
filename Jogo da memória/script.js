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
let timerInterval;
let tempoRestante;

const temas = {
    geometria: [
        { id: 'dodecaedro', img: 'assets/dodecaedro.png', texto: 'Dodecaedro' },
        { id: 'octogono', img: 'assets/octogono.png', texto: 'Octógono' },
        { id: 'cilindro', img: 'assets/cilindro.png', texto: 'Cilindro' },
        { id: 'hexagono', img: 'assets/hexagono.png', texto: 'Hexágono' },
        { id: 'pentagono', img: 'assets/pentagono.png', texto: 'Pentágono' },
        { id: 'paralelepipedo', img: 'assets/paralelepipedo.png', texto: 'Paralelepípedo' },
        { id: 'cone', img: 'assets/cone.png', texto: 'Cone' },
        { id: 'cubo', img: 'assets/cubo.png', texto: 'Cubo' }
    ],
    animais: [
        { id: 'leao', img: 'assets/leao.png', texto: 'Leão' },
        { id: 'macaco', img: 'assets/macaco.png', texto: 'Macaco' },
        { id: 'elefante', img: 'assets/elefante.png', texto: 'Elefante' },
        { id: 'girafa', img: 'assets/girafa.png', texto: 'Girafa' },
        { id: 'cachorro', img: 'assets/cachorro.png', texto: 'cachorro' },
        { id: 'gato', img: 'assets/gato.png', texto: 'Gato' },
        { id: 'capivara', img: 'assets/capivara.png', texto: 'Capivara' },
        { id: 'cavalo', img: 'assets/cavalo.png', texto: 'Cavalo' }
    ],
    espaco: [
        { id: 'saturno', img: 'assets/saturno.png', texto: 'Saturno' },
        { id: 'jupiter', img: 'assets/jupiter.png', texto: 'Júpiter' },
        { id: 'urano', img: 'assets/urano.png', texto: 'Urano' },
        { id: 'netuno', img: 'assets/netuno.png', texto: 'Netuno' },
        { id: 'terra', img: 'assets/terra.png', texto: 'Terra' },
        { id: 'marte', img: 'assets/marte.png', texto: 'Marte' },
        { id: 'venus', img: 'assets/venus.png', texto: 'Vênus' },
        { id: 'mercurio', img: 'assets/mercurio.png', texto: 'Mercúrio' }
    ]
};

function mostrarTelaDificuldade(tema) {
    temaSelecionado = tema;
    telaInicial.classList.add('oculto');
    telaDificuldade.classList.remove('oculto');
}

function mostrarTelaJogo(dificuldade) {
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

        if (tempoRestante < 0) {
            clearInterval(timerInterval);
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

function desabilitarCartas() {
    primeiraCarta.removeEventListener('click', virarCarta);
    segundaCarta.removeEventListener('click', virarCarta);

    paresEncontrados++;
    if (paresEncontrados === totalPares) {
        clearInterval(timerInterval);
        setTimeout(() => {
            telaJogo.classList.add('oculto');
            telaVitoria.classList.remove('oculto');
        }, 500);
    }

    resetarTabuleiro();
}

function desvirarCartas() {
    travarTabuleiro = true;
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