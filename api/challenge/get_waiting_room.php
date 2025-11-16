<?php
/**
 * API: Dados da Sala de Espera do Desafio
 * Endpoint: GET /api/challenge/get_waiting_room.php
 *
 * Retorna informações do desafio e lista de participantes para a sala de espera
 *
 * Parâmetros (query string):
 * - challenge_id (obrigatório): ID do desafio
 *
 * Retorna:
 * - challenge: Dados do desafio
 * - participants: Lista de participantes com status
 * - can_play_now: Se o usuário pode jogar agora
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

    // Pegar challenge_id
    $challenge_id = isset($_GET['challenge_id']) ? (int)$_GET['challenge_id'] : 0;

    if ($challenge_id <= 0) {
        json_out(['ok' => false, 'error' => 'challenge_id é obrigatório']);
    }

    // Buscar desafio
    $stmt = $pdo->prepare('
        SELECT
            c.*,
            g.name as game_name,
            g.code as game_code,
            u.username as teacher_username,
            p.display_name as teacher_display_name
        FROM challenges c
        JOIN games g ON g.id = c.game_id
        JOIN users u ON u.id = c.teacher_id
        LEFT JOIN user_profile p ON u.id = p.user_id
        WHERE c.id = ?
    ');
    $stmt->execute([$challenge_id]);
    $challenge = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$challenge) {
        json_out(['ok' => false, 'error' => 'Desafio não encontrado']);
    }

    // Verificar se o usuário é participante
    $stmt = $pdo->prepare('
        SELECT status
        FROM challenge_participants
        WHERE challenge_id = ? AND user_id = ?
    ');
    $stmt->execute([$challenge_id, $user_id]);
    $participant = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$participant) {
        json_out(['ok' => false, 'error' => 'Você não foi convidado para este desafio']);
    }

    // Buscar todos participantes
    $stmt = $pdo->prepare('
        SELECT
            u.id as user_id,
            u.username,
            p.display_name,
            cp.status,
            cp.invited_at,
            cp.responded_at
        FROM challenge_participants cp
        JOIN users u ON u.id = cp.user_id
        LEFT JOIN user_profile p ON u.id = p.user_id
        WHERE cp.challenge_id = ?
        ORDER BY cp.responded_at DESC, u.username ASC
    ');
    $stmt->execute([$challenge_id]);
    $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calcular tempos
    $now = new DateTime();
    $starts_at = new DateTime($challenge['starts_at']);
    $ends_at = new DateTime($challenge['ends_at']);

    $seconds_until_start = max(0, $starts_at->getTimestamp() - $now->getTimestamp());
    $seconds_until_end = max(0, $ends_at->getTimestamp() - $now->getTimestamp());

    // Atualizar status do desafio automaticamente baseado no horário
    $should_update_status = false;
    $new_status = $challenge['status'];

    if ($challenge['status'] === 'pending' && $now >= $starts_at && $now <= $ends_at) {
        // Desafio começou → mudar para active
        $new_status = 'active';
        $should_update_status = true;
    } elseif ($challenge['status'] === 'active' && $now > $ends_at) {
        // Desafio terminou → mudar para completed
        $new_status = 'completed';
        $should_update_status = true;
    }

    if ($should_update_status) {
        $stmt = $pdo->prepare('UPDATE challenges SET status = ? WHERE id = ?');
        $stmt->execute([$new_status, $challenge_id]);
        $challenge['status'] = $new_status;

        // Marcar notificações antigas como lidas e expiradas quando desafio completa
        if ($new_status === 'completed') {
            $stmt_notif = $pdo->prepare('
                UPDATE notifications
                SET is_read = 1, expires_at = NOW()
                WHERE type = "challenge_invite"
                  AND JSON_EXTRACT(data, "$.challenge_id") = ?
                  AND is_read = 0
            ');
            $stmt_notif->execute([$challenge_id]);
        }
    }

    // Determinar se pode jogar agora
    $can_play_now = (
        $participant['status'] === 'accepted' &&
        in_array($challenge['status'], ['pending', 'active']) &&
        $now >= $starts_at &&
        $now <= $ends_at
    );

    // Formatar resposta
    json_out([
        'ok' => true,
        'challenge' => [
            'id' => $challenge['id'],
            'title' => $challenge['title'],
            'description' => $challenge['description'],
            'game_id' => (int)$challenge['game_id'],
            'game_name' => $challenge['game_name'],
            'game_code' => $challenge['game_code'],
            'difficulty' => $challenge['difficulty'],
            'duration_minutes' => (int)$challenge['duration_minutes'],
            'starts_at' => $challenge['starts_at'],
            'ends_at' => $challenge['ends_at'],
            'challenge_status' => $challenge['status'],
            'user_status' => $participant['status'],
            'seconds_until_start' => $seconds_until_start,
            'seconds_until_end' => $seconds_until_end,
            'can_play_now' => $can_play_now,
            'teacher_name' => $challenge['teacher_display_name'] ?: $challenge['teacher_username'],
            'participants' => $participants
        ]
    ]);

} catch (PDOException $e) {
    error_log('Erro em get_waiting_room.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao buscar dados do desafio'], 500);
}
