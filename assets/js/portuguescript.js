document.addEventListener('DOMContentLoaded', () => {

    let dadosPalavraAtual = null;
    let pontuacao = 0;
    let tempoRestante = 60;
    let intervaloTimer = null;

    const containerPalavra = document.getElementById('word-container');
    const textoDica = document.getElementById('hint-text');
    const containerBancoDeLetras = document.getElementById('letter-bank-container');
    const valorPontuacao = document.getElementById('score-value');
    const valorTempo = document.getElementById('timer-value');

    const btnVerificar = document.querySelector('.btn-verify');
    const btnPular = document.querySelector('.btn-skip');
    const btnDica = document.querySelector('.btn-hint');

    async function carregarNovaPalavra() {

        clearInterval(intervaloTimer);

        try {
            const resposta = await fetch('/api/get-palavra'); 
            
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
        valorTempo.textContent = tempoRestante;
        if (tempoRestante <= 0) {
            clearInterval(intervaloTimer);
            alert("Tempo esgotado! Palavra pulada.");
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
            alert("Parabéns, você acertou!");
            clearInterval(intervaloTimer);
            pontuacao += 10 + tempoRestante; 
            valorPontuacao.textContent = pontuacao;
            carregarNovaPalavra();
        } else {
            alert("Incorreto. Tente novamente!");
            vaziosPreenchidos.forEach(spanVazio => {
                devolverLetraAoBanco({ target: spanVazio });
            });
        }
    }

    function pularPalavra() {
        alert("Palavra pulada.");
        if (pontuacao > 2) {
            pontuacao -= 2;
        }
        carregarNovaPalavra();
    } 

    function revelarDica() {
        textoDica.classList.add('revealed');
        btnDica.disabled = true;

        // Ideia: Penalidade por usar a dica
        if (pontuacao >= 5) {
            pontuacao -= 5;
            valorPontuacao.textContent = pontuacao;
        }
    }

    btnVerificar.addEventListener('click', verificarPalavra);
    btnPular.addEventListener('click', pularPalavra);
    btnDica.addEventListener('click', revelarDica);
    
    carregarNovaPalavra();
});
