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

function startGame() {
  telaInicial.classList.add('hidden');
  telaGameOver.classList.add('hidden');
  telaNivel.classList.add('hidden');
  areaJogo.classList.remove('hidden');
  
  isGameOver = false;
  score = 0;
  placarElemento.textContent = `Pontos: ${score}`;
  document.querySelectorAll('.balao').forEach(b => b.remove());
  
  iniciarRodada();
}

function gameOver() {
  if (isGameOver) return; 
  isGameOver = true;
  
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
  if (nivelSelecionado === "soma") {
    num1 = Math.floor(Math.random() * 20) + 1;
    num2 = Math.floor(Math.random() * 20) + 1;
    respostaCorreta = num1 + num2;
    problemaContainer.textContent = `${num1} + ${num2} = ?`;
  } else if (nivelSelecionado === "subtracao") {
    num1 = Math.floor(Math.random() * 20) + 10;
    num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
    respostaCorreta = num1 - num2;
    problemaContainer.textContent = `${num1} - ${num2} = ?`;
  } else if (nivelSelecionado === "multiplicacao") {
    num1 = Math.floor(Math.random() * 10) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    respostaCorreta = num1 * num2;
    problemaContainer.textContent = `${num1} × ${num2} = ?`;
  } else if (nivelSelecionado === "divisao") {
    const divisor = Math.floor(Math.random() * 9) + 2;
    const quociente = Math.floor(Math.random() * 10) + 1;
    num1 = divisor * quociente;
    num2 = divisor;
    respostaCorreta = quociente;
    problemaContainer.textContent = `${num1} ÷ ${num2} = ?`;
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
      if (nivelSelecionado === "soma") {
        maxRandom = 40;
      } else if (nivelSelecionado === "subtracao") {
        maxRandom = 30;
      } else if (nivelSelecionado === "multiplicacao") {
        maxRandom = 100;
      } else if (nivelSelecionado === "divisao") {
        maxRandom = 20;
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

botaoTentarNovamente.addEventListener('click', () => {
  telaGameOver.classList.add('hidden');
  telaNivel.classList.remove('hidden');
});
