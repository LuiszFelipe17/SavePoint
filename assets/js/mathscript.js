const telaInicial = document.getElementById('tela-inicial');
const telaNivel = document.getElementById('tela-nivel');
const telaGameOver = document.getElementById('tela-game-over');
const areaJogo = document.getElementById('area-jogo');
const botaoIniciar = document.getElementById('botao-iniciar');
const botaoTentarNovamente = document.getElementById('botao-tentar-novamente');
const placarElemento = document.getElementById('placar');
const pontuacaoFinalElemento = document.getElementById('pontuacao-final');
const botaoNivelSoma = document.getElementById('nivel-soma');
const botaoNivelSubtracao = document.getElementById('nivel-subtracao');
const botaoNivelMultiplicacao = document.getElementById('nivel-multiplicacao');
const botaoNivelDivisao = document.getElementById('nivel-divisao');
const botaoNivelExtremo = document.getElementById('nivel-extremo');

const problemaContainer = document.createElement('div');
problemaContainer.style.position = 'absolute';
problemaContainer.style.top = '20px';
problemaContainer.style.left = '50%';
problemaContainer.style.transform = 'translateX(-50%)';
problemaContainer.style.fontSize = '48px';
problemaContainer.style.fontFamily = 'Arial, sans-serif';
problemaContainer.style.color = '#fff';
problemaContainer.style.textShadow = '2px 2px 4px rgba(0,0,0,0.7)';
problemaContainer.style.zIndex = '110';
areaJogo.appendChild(problemaContainer);

let respostaCorreta;
let balaoCorretoElemento = null;
let isGameOver = false;
let score = 0;
let nivelSelecionado = "soma";
let currentRoundOperation = "";
let usuarioLogado = null;

const SCORE_TO_UNLOCK_EXTREME = 25;

// Gerenciador de áudio
const audioManager = new AudioManager();

// Carregar sons
audioManager.loadSound('pop', '../assets/sounds/balloon-pop.mp3');
audioManager.loadSound('correct', '../assets/sounds/correct-answer.mp3');
audioManager.loadSound('gameover', '../assets/sounds/game-over.mp3');

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

// Salvar pontuação no backend
async function salvarPontuacao(pontos, status) {
    try {
        const res = await fetch('../api/game_save_score.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                game_code: 'math',
                score: pontos,
                duration_seconds: null,
                operation_type: nivelSelecionado,
                status: status,
                metadata: {
                    final_score: pontos,
                    operation: nivelSelecionado
                }
            })
        });

        const data = await res.json();
        console.log('Pontuação salva:', data);
        return data;
    } catch (err) {
        console.error('Erro ao salvar pontuação:', err);
        return null;
    }
}

// Buscar pontuação total do banco de dados
async function buscarPontuacaoTotal() {
    if (!usuarioLogado) return 0;
    try {
        const res = await fetch('../api/game_get_total_score.php?game_code=math', {
            credentials: 'same-origin'
        });
        const data = await res.json();
        if (data && typeof data.total_score !== 'undefined') {
            return data.total_score;
        }
        return 0;
    } catch (err) {
        console.error('Erro ao buscar pontuação total:', err);
        return 0;
    }
}

// ATUALIZADO: gerencia a classe do body
function startGame() {
  telaInicial.classList.add('hidden');
  telaGameOver.classList.add('hidden');
  telaNivel.classList.add('hidden');
  areaJogo.classList.remove('hidden');
  
  // Adiciona ou remove a classe para o fundo noturno
  if (nivelSelecionado === 'extremo') {
      document.body.classList.add('extreme-mode');
  } else {
      document.body.classList.remove('extreme-mode');
  }

  isGameOver = false;
  score = 0;
  placarElemento.textContent = `Pontos: ${score}`;
  document.querySelectorAll('.balao').forEach(b => b.remove());
  
  iniciarRodada();
}

// Recebe a pontuação total como argumento
function checkAndUnlockExtremeLevel(totalScore) {
    if (totalScore >= SCORE_TO_UNLOCK_EXTREME) {
        botaoNivelExtremo.classList.remove('hidden');
    }
}

async function gameOver() {
  if (isGameOver) return;
  isGameOver = true;

  audioManager.play('gameover');
  
  const saveData = await salvarPontuacao(score, 'failed');

  if (saveData && typeof saveData.new_total_score !== 'undefined') {
      checkAndUnlockExtremeLevel(saveData.new_total_score);
  }

  pontuacaoFinalElemento.textContent = `Sua pontuação: ${score}`;
  telaGameOver.classList.remove('hidden');
  problemaContainer.textContent = '';
  balaoCorretoElemento = null;

  setTimeout(() => {
      document.querySelectorAll('.balao').forEach(b => b.remove());
  }, 1000);
}

function gerarNovaConta() {
  let num1, num2;
  let operationToExecute = nivelSelecionado;

  if (nivelSelecionado === "extremo") {
      const operations = ["soma", "subtracao", "multiplicacao", "divisao"];
      operationToExecute = operations[Math.floor(Math.random() * operations.length)];
  }

  currentRoundOperation = operationToExecute;

  switch (operationToExecute) {
      case "soma":
          num1 = Math.floor(Math.random() * 20) + 1;
          num2 = Math.floor(Math.random() * 20) + 1;
          respostaCorreta = num1 + num2;
          problemaContainer.textContent = `${num1} + ${num2} = ?`;
          break;
      case "subtracao":
          num1 = Math.floor(Math.random() * 20) + 10;
          num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
          respostaCorreta = num1 - num2;
          problemaContainer.textContent = `${num1} - ${num2} = ?`;
          break;
      case "multiplicacao":
          num1 = Math.floor(Math.random() * 10) + 1;
          num2 = Math.floor(Math.random() * 10) + 1;
          respostaCorreta = num1 * num2;
          problemaContainer.textContent = `${num1} × ${num2} = ?`;
          break;
      case "divisao":
          const divisor = Math.floor(Math.random() * 9) + 2;
          const quociente = Math.floor(Math.random() * 10) + 1;
          num1 = divisor * quociente;
          num2 = divisor;
          respostaCorreta = quociente;
          problemaContainer.textContent = `${num1} ÷ ${num2} = ?`;
          break;
  }
}

function calcularDuracaoAnimacao() {
  const duracaoBase = 10;
  const reducaoPorPonto = 0.4; 
  const duracaoMinima = 3.0;
  
  let duracaoCalculada = duracaoBase - (score * reducaoPorPonto);
  return Math.max(duracaoCalculada, duracaoMinima);
}

function criarBalao(numero) {
  const balao = document.createElement("div");
  balao.classList.add("balao");
  balao.textContent = numero;

  balao.style.left = Math.random() * 90 + "vw";
  balao.style.background = `hsl(${Math.random() * 360}, 80%, 60%)`;

  const duracaoBase = calcularDuracaoAnimacao();
  const duracaoAnimacao = duracaoBase + Math.random() * 2; 
  balao.style.animationDuration = `${duracaoAnimacao}s, 3s`;

  if (numero === respostaCorreta) {
    balaoCorretoElemento = balao;
  }

  areaJogo.appendChild(balao);

  balao.addEventListener("click", () => {
    if (isGameOver) return;

    const clickedValue = parseInt(balao.textContent, 10);
    balao.classList.add('explodido');

    audioManager.play('pop');

    const areaRect = areaJogo.getBoundingClientRect();
    const balaoRect = balao.getBoundingClientRect();
    const centerX = balaoRect.left + balaoRect.width / 2 - areaRect.left;
    const centerY = balaoRect.top + balaoRect.height / 2 - areaRect.top;

    for (let i = 0; i < 10; i++) {
      const p = document.createElement("div");
      p.classList.add("particula");
      p.style.background = balao.style.background;
      const offsetX = (Math.random() - 0.5) * 80;
      const offsetY = (Math.random() - 0.5) * 80;
      p.style.left = (centerX + offsetX) + "px";
      p.style.top = (centerY + offsetY) + "px";
      areaJogo.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }

    setTimeout(() => balao.remove(), 400);

    if (clickedValue === respostaCorreta) {
      score++;
      placarElemento.textContent = `Pontos: ${score}`;
      audioManager.play('correct');
      problemaContainer.classList.add("brilho");
      setTimeout(() => problemaContainer.classList.remove("brilho"), 600);
      balaoCorretoElemento = null;
      if (!isGameOver) iniciarRodada();
    }
  });

  setTimeout(() => {
    if (balao.parentElement) {
      if (balao === balaoCorretoElemento) {
        gameOver();
      }
      balao.remove();
    }
  }, duracaoAnimacao * 1000);
}

function iniciarRodada() {
  if (isGameOver) return;

  gerarNovaConta();

  const numeroDeBaloes = 5;
  const opcoesDeResposta = new Set([respostaCorreta]);
  while(opcoesDeResposta.size < numeroDeBaloes) {
      let maxRandom;
      switch (currentRoundOperation) {
          case "soma":
              maxRandom = 40;
              break;
          case "subtracao":
              maxRandom = 30;
              break;
          case "multiplicacao":
              maxRandom = 100;
              break;
          case "divisao":
              maxRandom = 20;
              break;
          default:
              maxRandom = 50;
      }
      const numeroAleatorio = Math.floor(Math.random() * maxRandom) + 1;
      opcoesDeResposta.add(numeroAleatorio);
  }

  const opcoesEmbaralhadas = Array.from(opcoesDeResposta).sort(() => Math.random() - 0.5);

  opcoesEmbaralhadas.forEach((numero, i) => {
    setTimeout(() => {
      if (!isGameOver) {
        criarBalao(numero);
      }
    }, i * (18000 / (score + 10)) );
  });
}

botaoIniciar.addEventListener('click', () => {
  telaInicial.classList.add('hidden');
  telaNivel.classList.remove('hidden');
});

botaoNivelSoma.addEventListener('click', () => {
  nivelSelecionado = "soma";
  startGame();
});

botaoNivelSubtracao.addEventListener('click', () => {
  nivelSelecionado = "subtracao";
  startGame();
});

botaoNivelMultiplicacao.addEventListener('click', () => {
  nivelSelecionado = "multiplicacao";
  startGame();
});

botaoNivelDivisao.addEventListener('click', () => {
  nivelSelecionado = "divisao";
  startGame();
});

botaoNivelExtremo.addEventListener('click', () => {
  nivelSelecionado = "extremo";
  startGame();
});

//Garante que o fundo volte ao normal
botaoTentarNovamente.addEventListener('click', () => {
  telaGameOver.classList.add('hidden');
  telaNivel.classList.remove('hidden');
  // Remove a classe de modo extremo ao voltar para a tela de nível
  document.body.classList.remove('extreme-mode');
});

// Controles de Áudio
function initAudioControls() {
    const audioToggle = document.getElementById('audio-toggle');
    const volumeSlider = document.getElementById('volume-slider');

    if (audioToggle) {
        audioToggle.textContent = audioManager.isMuted() ? '🔇' : '🔊';
        audioToggle.addEventListener('click', () => {
            const muted = audioManager.toggleMute();
            audioToggle.textContent = muted ? '🔇' : '🔊';
        });
    }

    if (volumeSlider) {
        volumeSlider.value = audioManager.getVolume() * 100;
        function updateSliderBackground() {
            const value = volumeSlider.value;
            volumeSlider.style.background = `linear-gradient(to right, #ff6347 0%, #ff6347 ${value}%, #ddd ${value}%, #ddd 100%)`;
        }
        updateSliderBackground();
        volumeSlider.addEventListener('input', () => {
            audioManager.setVolume(volumeSlider.value / 100);
            updateSliderBackground();
        });
    }
}

// Botão de sair
function initExitButton() {
    const btnSair = document.getElementById('exit-game-btn');
    if (btnSair) {
        btnSair.addEventListener('click', async (e) => {
            e.preventDefault();
            if (score > 0 && !isGameOver) {
                await salvarPontuacao(score, 'quit');
            }
            window.location.href = '../dashboard/';
        });
    }
}

// Inicialização do jogo
(async function init() {
    usuarioLogado = await verificarAutenticacao();
    if (!usuarioLogado) return;
    console.log('Usuário autenticado:', usuarioLogado.username);
    
    const totalScore = await buscarPontuacaoTotal();
    checkAndUnlockExtremeLevel(totalScore); 
    
    initAudioControls();
    initExitButton();
})();
