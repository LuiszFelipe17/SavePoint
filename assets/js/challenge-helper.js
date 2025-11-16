/**
 * SavePoint - Challenge Helper
 * Funções compartilhadas para integração de desafios nos jogos
 * FASE 4: Sistema de Desafios
 */

class ChallengeHelper {
    constructor() {
        this.activeChallenge = null;
        this.sessionId = null;
        this.timerInterval = null;
        this.timeExpired = false;
    }

    /**
     * Detectar se há um desafio ativo
     */
    detectActiveChallenge() {
        try {
            // Primeiro tentar ler da URL (método novo - vindo da sala de espera)
            const urlParams = new URLSearchParams(window.location.search);
            const challengeId = urlParams.get('challenge_id');
            const challengeMode = urlParams.get('challenge_mode');

            if (challengeId && challengeMode === 'true') {
                this.activeChallenge = {
                    id: parseInt(challengeId),
                    difficulty: urlParams.get('difficulty') || 'free',
                    duration: parseInt(urlParams.get('duration')) || 600,
                    title: urlParams.get('title') || 'Desafio em andamento',
                    ends_at: urlParams.get('ends_at') || null
                };

                console.log('[Challenge] Modo desafio ativo (URL):', this.activeChallenge);
                this.showIndicator();
                this.startChallengeTimer(); // BUG FIX #3: Iniciar timer de limite
                return this.activeChallenge;
            }

            // Fallback: tentar localStorage (método antigo - compatibilidade)
            const challengeData = localStorage.getItem('active_challenge');
            if (challengeData) {
                this.activeChallenge = JSON.parse(challengeData);
                console.log('[Challenge] Modo desafio ativo (localStorage):', this.activeChallenge);
                this.showIndicator();
                this.startChallengeTimer(); // BUG FIX #3: Iniciar timer de limite
                return this.activeChallenge;
            }
        } catch (err) {
            console.error('[Challenge] Erro ao detectar desafio:', err);
            localStorage.removeItem('active_challenge');
        }
        return null;
    }

    /**
     * Mostrar indicador visual de modo desafio
     */
    showIndicator() {
        if (!this.activeChallenge) return;

        // Remover indicador anterior se existir
        const existing = document.getElementById('challenge-indicator');
        if (existing) existing.remove();

        const indicador = document.createElement('div');
        indicador.id = 'challenge-indicator';
        indicador.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 12px 25px;
            border-radius: 25px;
            font-weight: 700;
            font-size: 16px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
            animation: challengePulse 2s ease-in-out infinite;
        `;
        indicador.innerHTML = `🎯 MODO DESAFIO: ${this.activeChallenge.title}`;

        // Adicionar animação
        if (!document.getElementById('challenge-pulse-animation')) {
            const style = document.createElement('style');
            style.id = 'challenge-pulse-animation';
            style.textContent = `
                @keyframes challengePulse {
                    0%, 100% { transform: translateX(-50%) scale(1); }
                    50% { transform: translateX(-50%) scale(1.05); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(indicador);
    }

    /**
     * BUG FIX #3: Timer de limite do desafio
     * Mostrar countdown até ends_at e forçar submissão quando expirar
     */
    startChallengeTimer() {
        if (!this.activeChallenge || !this.activeChallenge.ends_at) {
            console.warn('[Challenge] Timer não iniciado: ends_at não definido');
            return;
        }

        // Remover timer anterior se existir
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        const timerElement = document.getElementById('challenge-timer');
        if (timerElement) timerElement.remove();

        // Criar elemento de timer
        const timer = document.createElement('div');
        timer.id = 'challenge-timer';
        timer.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
        `;
        document.body.appendChild(timer);

        // Atualizar timer a cada segundo
        const updateTimer = () => {
            try {
                const now = new Date();
                const endsAt = new Date(this.activeChallenge.ends_at);
                const timeLeft = endsAt - now;

                if (timeLeft <= 0) {
                    // Tempo esgotado!
                    timer.innerHTML = '⏰ TEMPO ESGOTADO!';
                    timer.style.background = 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)';
                    clearInterval(this.timerInterval);
                    this.timeExpired = true;

                    // Notificar o jogo (via evento customizado)
                    window.dispatchEvent(new CustomEvent('challengeTimeExpired', {
                        detail: { challengeId: this.activeChallenge.id }
                    }));

                    console.log('[Challenge] TEMPO ESGOTADO! Evento disparado.');

                    // Mostrar alerta após 500ms
                    setTimeout(() => {
                        alert('⏰ O tempo do desafio acabou!\n\nSua pontuação será enviada automaticamente.');
                    }, 500);

                } else {
                    // Calcular horas, minutos e segundos
                    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

                    // Formatar com zero à esquerda
                    const hoursStr = String(hours).padStart(2, '0');
                    const minutesStr = String(minutes).padStart(2, '0');
                    const secondsStr = String(seconds).padStart(2, '0');

                    // Alterar cor quando faltarem menos de 5 minutos
                    if (timeLeft < 5 * 60 * 1000) {
                        timer.style.background = 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)';
                        timer.style.animation = 'challengeTimerPulse 1s ease-in-out infinite';
                    }

                    // Mostrar apenas minutos e segundos se < 1 hora
                    if (hours > 0) {
                        timer.innerHTML = `⏰ Tempo restante: ${hoursStr}:${minutesStr}:${secondsStr}`;
                    } else {
                        timer.innerHTML = `⏰ Tempo restante: ${minutesStr}:${secondsStr}`;
                    }
                }
            } catch (err) {
                console.error('[Challenge] Erro ao atualizar timer:', err);
                clearInterval(this.timerInterval);
            }
        };

        // Adicionar animação de pulso
        if (!document.getElementById('challenge-timer-pulse-animation')) {
            const style = document.createElement('style');
            style.id = 'challenge-timer-pulse-animation';
            style.textContent = `
                @keyframes challengeTimerPulse {
                    0%, 100% { transform: translateX(-50%) scale(1); }
                    50% { transform: translateX(-50%) scale(1.08); }
                }
            `;
            document.head.appendChild(style);
        }

        // Executar imediatamente e depois a cada segundo
        updateTimer();
        this.timerInterval = setInterval(updateTimer, 1000);

        console.log('[Challenge] Timer iniciado. Expira em:', this.activeChallenge.ends_at);
    }

    /**
     * Enviar pontuação do desafio
     */
    async submitScore(score, durationSeconds, sessionId) {
        if (!this.activeChallenge) {
            console.log('[Challenge] Não há desafio ativo');
            return null;
        }

        this.sessionId = sessionId;

        try {
            const res = await fetch('../api/student/submit_challenge_score.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    challenge_id: this.activeChallenge.id,
                    score: score,
                    duration_seconds: durationSeconds,
                    game_session_id: sessionId
                })
            });

            const data = await res.json();
            console.log('[Challenge] Score enviado:', data);

            if (data.ok) {
                // Mostrar modal de resultado
                this.showResultModal(data);
            } else {
                console.error('[Challenge] Erro ao enviar score:', data.error);
                alert('Erro ao enviar pontuação: ' + (data.error || 'Erro desconhecido'));
            }

            return data;
        } catch (err) {
            console.error('[Challenge] Erro ao enviar score do desafio:', err);
            return null;
        }
    }

    /**
     * Mostrar modal de resultado do desafio
     */
    showResultModal(data) {
        const modal = document.createElement('div');
        modal.id = 'challenge-result-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            animation: fadeIn 0.3s ease;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.4s ease;
        `;

        // Escolher emoji baseado no rank
        let rankEmoji = '🏅';
        if (data.rank === 1) rankEmoji = '🥇';
        else if (data.rank === 2) rankEmoji = '🥈';
        else if (data.rank === 3) rankEmoji = '🥉';

        content.innerHTML = `
            <div style="font-size: 80px; margin-bottom: 20px; animation: bounce 0.6s ease;">${rankEmoji}</div>
            <h2 style="font-size: 32px; color: #1f2937; margin-bottom: 10px; font-family: 'Fredoka', sans-serif;">Desafio Concluído!</h2>
            <p style="font-size: 18px; color: #6b7280; margin-bottom: 30px; font-family: 'Fredoka', sans-serif;">${this.activeChallenge.title}</p>

            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 15px; margin-bottom: 25px;">
                <div style="font-size: 52px; font-weight: 700; color: white; margin-bottom: 8px; font-family: 'Fredoka', sans-serif;">#${data.rank}</div>
                <div style="color: rgba(255,255,255,0.95); font-size: 16px; font-weight: 500; font-family: 'Fredoka', sans-serif;">Posição no Ranking</div>
            </div>

            <div style="display: flex; gap: 25px; justify-content: center; margin-bottom: 30px;">
                <div style="background: #f9fafb; padding: 15px 25px; border-radius: 12px;">
                    <div style="font-size: 32px; font-weight: 700; color: #667eea; font-family: 'Fredoka', sans-serif;">${data.score}</div>
                    <div style="font-size: 13px; color: #6b7280; font-weight: 500; font-family: 'Fredoka', sans-serif;">Pontos</div>
                </div>
                <div style="background: #f9fafb; padding: 15px 25px; border-radius: 12px;">
                    <div style="font-size: 32px; font-weight: 700; color: #10b981; font-family: 'Fredoka', sans-serif;">${data.total_completed}</div>
                    <div style="font-size: 13px; color: #6b7280; font-weight: 500; font-family: 'Fredoka', sans-serif;">Completaram</div>
                </div>
            </div>

            <button id="close-challenge-result" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 15px 40px;
                border-radius: 12px;
                font-size: 18px;
                font-weight: 700;
                cursor: pointer;
                font-family: 'Fredoka', sans-serif;
                transition: transform 0.2s ease;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                Voltar ao Dashboard
            </button>
        `;

        // Adicionar animações
        if (!document.getElementById('challenge-animations')) {
            const style = document.createElement('style');
            style.id = 'challenge-animations';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes bounce {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            `;
            document.head.appendChild(style);
        }

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Event listener para fechar
        document.getElementById('close-challenge-result').addEventListener('click', () => {
            modal.remove();
            window.location.href = '../dashboard/';
        });

        // Tocar som de sucesso se disponível
        if (typeof audioManager !== 'undefined') {
            try {
                audioManager.play('victory');
            } catch (e) {
                // Ignora se não houver som disponível
            }
        }
    }

    /**
     * Verificar se está em modo desafio
     */
    isActive() {
        return this.activeChallenge !== null;
    }

    /**
     * Obter dados do desafio ativo
     */
    getChallenge() {
        return this.activeChallenge;
    }
}

// Instância global
window.challengeHelper = new ChallengeHelper();
