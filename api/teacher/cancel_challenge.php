<?php
/**
 * API: Cancelar Desafio
 * Endpoint: POST /api/teacher/cancel_challenge.php
 *
 * Cancela um desafio que ainda não começou
 *
 * Parâmetros (JSON):
 * - challenge_id (obrigatório): ID do desafio a cancelar
 *
 * Retorna:
 * - ok: true se cancelado com sucesso
 * - message: Mensagem de confirmação
 */

include('../db.php');
include('../helpers.php');

start_session_once();

// Verificar autenticação
if (!isset($_SESSION['user_id'])) {
    json_out(['ok' => false, 'error' => 'Não autenticado'], 401);
}

$user_id = (int)$_SESSION['user_id'];

try {
    $pdo = get_pdo();

    // Verificar se é professor
    $stmt = $pdo->prepare('SELECT is_teacher FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    if (!$user || $user['is_teacher'] != 1) {
        json_out(['ok' => false, 'error' => 'Apenas professores podem cancelar desafios'], 403);
    }

    // Pegar dados do POST
    $input = json_decode(file_get_contents('php://input'), true);
    $challenge_id = isset($input['challenge_id']) ? (int)$input['challenge_id'] : 0;

    if ($challenge_id <= 0) {
        json_out(['ok' => false, 'error' => 'challenge_id é obrigatório']);
    }

    // Buscar desafio
    $stmt = $pdo->prepare('
        SELECT id, title, status, starts_at, teacher_id
        FROM challenges
        WHERE id = ?
    ');
    $stmt->execute([$challenge_id]);
    $challenge = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$challenge) {
        json_out(['ok' => false, 'error' => 'Desafio não encontrado']);
    }

    // Verificar se o professor é dono do desafio
    if ($challenge['teacher_id'] != $user_id) {
        json_out(['ok' => false, 'error' => 'Você não tem permissão para cancelar este desafio']);
    }

    // Verificar se já não está cancelado ou completado
    if ($challenge['status'] === 'cancelled') {
        json_out(['ok' => false, 'error' => 'Este desafio já está cancelado']);
    }

    if ($challenge['status'] === 'completed') {
        json_out(['ok' => false, 'error' => 'Não é possível cancelar um desafio já finalizado']);
    }

    // Cancelar desafio
    $stmt = $pdo->prepare('UPDATE challenges SET status = "cancelled" WHERE id = ?');
    $stmt->execute([$challenge_id]);

    // Buscar participantes para notificar
    $stmt = $pdo->prepare('
        SELECT user_id
        FROM challenge_participants
        WHERE challenge_id = ? AND status IN ("invited", "accepted")
    ');
    $stmt->execute([$challenge_id]);
    $participants = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Marcar notificações antigas do desafio como lidas e expiradas
    $stmt = $pdo->prepare('
        UPDATE notifications
        SET is_read = 1, expires_at = NOW()
        WHERE type = "challenge_invite"
          AND JSON_EXTRACT(data, "$.challenge_id") = ?
          AND is_read = 0
    ');
    $stmt->execute([$challenge_id]);

    // Criar notificações de cancelamento
    if (!empty($participants)) {
        $stmt = $pdo->prepare('
            INSERT INTO notifications (user_id, type, title, message, data)
            VALUES (?, "challenge_result", ?, ?, ?)
        ');

        $notification_title = "Desafio Cancelado";
        $notification_message = "O desafio \"{$challenge['title']}\" foi cancelado pelo professor.";
        $notification_data = json_encode([
            'challenge_id' => $challenge_id,
            'reason' => 'cancelled_by_teacher'
        ]);

        foreach ($participants as $participant_id) {
            $stmt->execute([
                $participant_id,
                $notification_title,
                $notification_message,
                $notification_data
            ]);
        }
    }

    json_out([
        'ok' => true,
        'message' => 'Desafio cancelado com sucesso',
        'challenge_id' => $challenge_id,
        'notifications_sent' => count($participants)
    ]);

} catch (PDOException $e) {
    error_log('Erro em cancel_challenge.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao cancelar desafio'], 500);
}
