<?php
/**
 * API: Marcar Notificação como Lida
 *
 * Marca uma ou mais notificações como lidas
 * POST: {notification_id: X} ou {all: true}
 * Retorna: {ok, message}
 */

include('../db.php');
include('../helpers.php');

start_session_once();
header('Content-Type: application/json; charset=utf-8');

// Verificar autenticação
if (!isset($_SESSION['user_id'])) {
    json_out(['ok' => false, 'error' => 'Não autenticado'], 401);
}

$user_id = (int)$_SESSION['user_id'];

try {
    $pdo = get_pdo();

    // Obter dados
    $data = json_decode(file_get_contents('php://input'), true);

    // Marcar todas como lidas
    if (isset($data['all']) && $data['all'] === true) {
        $stmt = $pdo->prepare('
            UPDATE notifications
            SET is_read = 1
            WHERE user_id = ? AND is_read = 0
        ');
        $stmt->execute([$user_id]);

        json_out([
            'ok' => true,
            'message' => 'Todas as notificações foram marcadas como lidas',
            'affected' => $stmt->rowCount()
        ]);
    }

    // Marcar notificação específica
    if (empty($data['notification_id'])) {
        json_out(['ok' => false, 'error' => 'notification_id é obrigatório'], 422);
    }

    $notification_id = (int)$data['notification_id'];

    // Verificar se notificação pertence ao usuário
    $stmt = $pdo->prepare('
        SELECT id FROM notifications
        WHERE id = ? AND user_id = ?
    ');
    $stmt->execute([$notification_id, $user_id]);

    if (!$stmt->fetch()) {
        json_out(['ok' => false, 'error' => 'Notificação não encontrada'], 404);
    }

    // Marcar como lida
    $stmt = $pdo->prepare('
        UPDATE notifications
        SET is_read = 1
        WHERE id = ? AND user_id = ?
    ');
    $stmt->execute([$notification_id, $user_id]);

    json_out([
        'ok' => true,
        'message' => 'Notificação marcada como lida'
    ]);

} catch (PDOException $e) {
    error_log('Erro em notifications/mark_read.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao marcar notificação'], 500);
}
