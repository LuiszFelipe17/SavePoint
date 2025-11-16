<?php
/**
 * API: Recusar Convite para Desafio
 * Endpoint: POST /api/student/decline_challenge.php
 *
 * Aluno recusa convite para participar de um desafio
 *
 * Parâmetros (JSON):
 * - challenge_id (obrigatório): ID do desafio
 *
 * Retorna:
 * - ok: true se recusado com sucesso
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

    // Pegar dados do POST
    $input = json_decode(file_get_contents('php://input'), true);
    $challenge_id = isset($input['challenge_id']) ? (int)$input['challenge_id'] : 0;

    if ($challenge_id <= 0) {
        json_out(['ok' => false, 'error' => 'challenge_id é obrigatório']);
    }

    // Buscar participação
    $stmt = $pdo->prepare('
        SELECT cp.id, cp.status, c.status as challenge_status
        FROM challenge_participants cp
        JOIN challenges c ON c.id = cp.challenge_id
        WHERE cp.challenge_id = ? AND cp.user_id = ?
    ');
    $stmt->execute([$challenge_id, $user_id]);
    $participant = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$participant) {
        json_out(['ok' => false, 'error' => 'Você não foi convidado para este desafio']);
    }

    // Verificar se já respondeu
    if ($participant['status'] !== 'invited') {
        json_out(['ok' => false, 'error' => 'Convite já respondido']);
    }

    // Verificar se o desafio foi cancelado
    if ($participant['challenge_status'] === 'cancelled') {
        json_out(['ok' => false, 'error' => 'Este desafio foi cancelado']);
    }

    // Recusar convite
    $stmt = $pdo->prepare('
        UPDATE challenge_participants
        SET status = "declined", responded_at = NOW()
        WHERE id = ?
    ');
    $stmt->execute([$participant['id']]);

    json_out([
        'ok' => true,
        'message' => 'Convite recusado'
    ]);

} catch (PDOException $e) {
    error_log('Erro em decline_challenge.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao recusar convite'], 500);
}
