const telaInicial = document.getElementById('tela-inicial');
const telaGameOver = document.getElementById('tela-game-over');
const areaJogo = document.getElementById('area-jogo');
const botaoIniciar = document.getElementById('botao-iniciar');
const botaoTentarNovamente = document.getElementById('botao-tentar-novamente');
const placarElemento = document.getElementById('placar');
const pontuacaoFinalElemento = document.getElementById('pontuacao-final');

const problemaContainer = document.createElement('div');
problemaContainer.style.position = 'absolute';
problemaContainer.style.top = '20px';
problemaContainer.style.left = '50%';
problemaContainer.style.transform = 'translateX(-50%)';
problemaContainer.style.fontSize = '48px';
problemaContainer.style.fontFamily = 'Arial, sans-serif';
problemaContainer.style.color = '#fff';
problemaContainer.style.textShadow = '2px 2px 4px rgba(0,0,0,0.7)';
problemaContainer.style.zIndex = '100';
areaJogo.appendChild(problemaContainer);

let respostaCorreta;
let balaoCorretoElemento = null;
let isGameOver = false;
let score = 0;

function startGame() {
  telaInicial.classList.add('hidden');
  telaGameOver.classList.add('hidden');
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
  const num1 = Math.floor(Math.random() * 20) + 1;
  const num2 = Math.floor(Math.random() * 20) + 1;
  respostaCorreta = num1 + num2;
  problemaContainer.textContent = `${num1} + ${num2} = ?`;
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

  balao.style.display = 'flex';
  balao.style.justifyContent = 'center';
  balao.style.alignItems = 'center';
  balao.style.fontSize = '24px';
  balao.style.color = 'white';
  balao.style.fontWeight = 'bold';
  balao.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';

  balao.style.background = `hsl(${Math.random() * 360}, 80%, 60%)`;
  balao.style.left = Math.random() * 90 + "vw";
  
  const duracaoBase = calcularDuracaoAnimacao();
  const duracaoAnimacao = duracaoBase + Math.random() * 2; 
  balao.style.animationDuration = `${duracaoAnimacao}s, 3s`;

  if (numero === respostaCorreta) {
    balaoCorretoElemento = balao;
  }

  areaJogo.appendChild(balao);

  balao.addEventListener("click", () => {
    if (isGameOver) return;

    if (parseInt(balao.textContent) === respostaCorreta) {
      score++;
      placarElemento.textContent = `Pontos: ${score}`;
      balaoCorretoElemento = null;
      iniciarRodada(); 
    }

    balao.style.animation = "explodir 0.4s forwards";
    for (let i = 0; i < 10; i++) {
      const p = document.createElement("div");
      p.classList.add("particula");
      p.style.background = balao.style.background;
      const offsetX = (Math.random() - 0.5) * 80;
      const offsetY = (Math.random() - 0.5) * 80;
      p.style.left = (balao.offsetLeft + balao.offsetWidth / 2 + offsetX) + "px";
      p.style.top = (balao.offsetTop + balao.offsetHeight / 2 + offsetY) + "px";
      areaJogo.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
    setTimeout(() => balao.remove(), 400);
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
      const numeroAleatorio = Math.floor(Math.random() * 40) + 1;
      if (numeroAleatorio > 0) {
        opcoesDeResposta.add(numeroAleatorio);
      }
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

botaoIniciar.addEventListener('click', startGame);
botaoTentarNovamente.addEventListener('click', startGame);