/**
 * SavePoint - Sistema de Notificações
 *
 * Gerencia exibição e resposta a notificações
 * Polling automático a cada 30 segundos
 */

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.pollingInterval = null;
        this.currentModal = null;
    }

    /**
     * Inicializar sistema
     */
    async init() {
        // Criar elementos necessários no DOM
        this.createModalElements();

        // Buscar notificações iniciais
        await this.fetchNotifications();

        // Iniciar polling
        this.startPolling();

        console.log('[Notifications] Sistema inicializado');
    }

    /**
     * Criar elementos HTML no DOM
     */
    createModalElements() {
        // Overlay
        if (!document.getElementById('notification-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'notification-overlay';
            overlay.className = 'notification-overlay';
            overlay.addEventListener('click', () => this.closeModal());
            document.body.appendChild(overlay);
        }

        // Modal
        if (!document.getElementById('notification-modal')) {
            const modal = document.createElement('div');
            modal.id = 'notification-modal';
            modal.className = 'notification-modal';
            document.body.appendChild(modal);
        }
    }

    /**
     * Buscar notificações do servidor
     */
    async fetchNotifications(unreadOnly = true) {
        try {
            const url = unreadOnly
                ? '../api/notifications/get.php?unread_only=1'
                : '../api/notifications/get.php';

            const res = await fetch(url, {
                credentials: 'same-origin'
            });

            const data = await res.json();

            if (data.ok) {
                this.notifications = data.notifications || [];
                this.unreadCount = data.unread_count || 0;

                // Atualizar badge
                this.updateBadge();

                // Mostrar notificações não lidas
                if (unreadOnly && this.notifications.length > 0) {
                    // Mostrar apenas a primeira notificação não lida
                    this.showNotification(this.notifications[0]);
                }

                return data;
            }
        } catch (err) {
            console.error('[Notifications] Erro ao buscar notificações:', err);
        }

        return { ok: false, notifications: [], unread_count: 0 };
    }

    /**
     * Atualizar badge de contagem
     */
    updateBadge() {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    /**
     * Mostrar notificação em modal
     */
    showNotification(notification) {
        const modal = document.getElementById('notification-modal');
        const overlay = document.getElementById('notification-overlay');

        if (!modal || !overlay) {
            console.error('[Notifications] Elementos do modal não encontrados');
            return;
        }

        // Salvar notificação atual
        this.currentModal = notification;

        // Determinar ícone e tipo
        const icons = {
            'class_invite': '🎓',
            'challenge_invite': '🏆',
            'challenge_result': '🎖️'
        };

        const icon = icons[notification.type] || '📬';

        // Montar HTML do modal
        modal.innerHTML = `
            <div class="notification-card type-${notification.type}">
                <div class="notification-icon">${icon}</div>
                <h2>${notification.title}</h2>
                <p>${notification.message}</p>
                <div class="notification-actions" id="notification-actions">
                    ${this.getActionsHTML(notification)}
                </div>
            </div>
        `;

        // Adicionar event listeners nos botões
        this.attachButtonListeners(notification);

        // Mostrar modal
        overlay.classList.add('active');
        modal.classList.add('active');
    }

    /**
     * Gerar HTML dos botões baseado no tipo
     */
    getActionsHTML(notification) {
        switch (notification.type) {
            case 'class_invite':
                return `
                    <button class="notification-btn btn-accept" data-action="accept">
                        Aceitar
                    </button>
                    <button class="notification-btn btn-decline" data-action="decline">
                        Recusar
                    </button>
                `;

            case 'challenge_invite':
                return `
                    <button class="notification-btn btn-accept" data-action="accept">
                        Participar
                    </button>
                    <button class="notification-btn btn-decline" data-action="decline">
                        Não Participar
                    </button>
                `;

            default:
                return `
                    <button class="notification-btn btn-close" data-action="close">
                        Fechar
                    </button>
                `;
        }
    }

    /**
     * Adicionar event listeners aos botões
     */
    attachButtonListeners(notification) {
        const actions = document.getElementById('notification-actions');
        if (!actions) return;

        actions.addEventListener('click', async (e) => {
            const button = e.target.closest('[data-action]');
            if (!button) return;

            const action = button.dataset.action;

            if (action === 'close') {
                this.closeModal();
                await this.markAsRead(notification.id);
                return;
            }

            // Desabilitar botões durante processamento
            actions.querySelectorAll('button').forEach(btn => btn.disabled = true);

            // Processar ação
            await this.handleAction(notification, action);
        });
    }

    /**
     * Processar ação do usuário
     */
    async handleAction(notification, action) {
        try {
            if (notification.type === 'class_invite') {
                await this.respondClassInvite(notification.data.class_id, action);
            } else if (notification.type === 'challenge_invite') {
                await this.respondChallengeInvite(notification.data.challenge_id, action);
            }

            // Marcar notificação como lida
            await this.markAsRead(notification.id);

            // Fechar modal
            this.closeModal();

            // Remover da lista
            this.notifications = this.notifications.filter(n => n.id !== notification.id);
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.updateBadge();

            // Buscar próxima notificação
            await this.fetchNotifications(true);

        } catch (err) {
            console.error('[Notifications] Erro ao processar ação:', err);
            alert('Erro ao processar ação. Tente novamente.');

            // Reabilitar botões
            const actions = document.getElementById('notification-actions');
            if (actions) {
                actions.querySelectorAll('button').forEach(btn => btn.disabled = false);
            }
        }
    }

    /**
     * Responder convite de turma
     */
    async respondClassInvite(classId, action) {
        const res = await fetch('../api/student/respond_invite.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                class_id: classId,
                action: action
            })
        });

        const data = await res.json();

        if (data.ok) {
            // Mostrar mensagem de sucesso
            this.showToast(data.message, 'success');
        } else {
            throw new Error(data.error || 'Erro ao responder convite');
        }
    }

    /**
     * Responder convite de desafio
     */
    async respondChallengeInvite(challengeId, action) {
        const endpoint = action === 'accept'
            ? '../api/challenge/accept.php'
            : '../api/challenge/decline.php';

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                challenge_id: challengeId
            })
        });

        const data = await res.json();

        if (data.ok) {
            this.showToast(data.message, 'success');

            // Se aceitou, redirecionar para a página de espera do desafio
            if (action === 'accept' && data.challenge) {
                // Aguardar 1.5s para o usuário ver a mensagem
                setTimeout(() => {
                    window.location.href = `../challenge/?id=${challengeId}`;
                }, 1500);
            }
        } else {
            throw new Error(data.error || 'Erro ao responder desafio');
        }
    }

    /**
     * Marcar notificação como lida
     */
    async markAsRead(notificationId) {
        try {
            await fetch('../api/notifications/mark_read.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    notification_id: notificationId
                })
            });
        } catch (err) {
            console.error('[Notifications] Erro ao marcar como lida:', err);
        }
    }

    /**
     * Fechar modal
     */
    closeModal() {
        const modal = document.getElementById('notification-modal');
        const overlay = document.getElementById('notification-overlay');

        if (modal) modal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');

        this.currentModal = null;
    }

    /**
     * Mostrar toast temporário
     */
    showToast(message, type = 'info') {
        // Implementação simples de toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Iniciar polling automático
     */
    startPolling() {
        // Polling a cada 30 segundos
        this.pollingInterval = setInterval(() => {
            this.fetchNotifications(true);
        }, 30000);
    }

    /**
     * Parar polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
}

// Instanciar globalmente
const notificationSystem = new NotificationSystem();

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => notificationSystem.init());
} else {
    notificationSystem.init();
}
