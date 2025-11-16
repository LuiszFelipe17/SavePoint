<?php
/**
 * API: Aceitar Convite para Desafio
 * Endpoint: POST /api/student/accept_challenge.php
 *
 * Aluno aceita convite para participar de um desafio
 *
 * Parâmetros (JSON):
 * - challenge_id (obrigatório): ID do desafio
 *
 * Retorna:
 * - ok: true se aceito com sucesso
 * - challenge: Dados do desafio
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
        SELECT cp.id, cp.status, c.status as challenge_status, c.starts_at, c.title
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
        $status_messages = [
            'accepted' => 'Você já aceitou este desafio',
            'declined' => 'Você já recusou este desafio',
            'playing' => 'Você já está jogando este desafio',
            'completed' => 'Você já completou este desafio'
        ];
        $message = $status_messages[$participant['status']] ?? 'Convite já respondido';
        json_out(['ok' => false, 'error' => $message]);
    }

    // Verificar se o desafio foi cancelado
    if ($participant['challenge_status'] === 'cancelled') {
        json_out(['ok' => false, 'error' => 'Este desafio foi cancelado']);
    }

    // Verificar se o desafio já começou
    $now = new DateTime();
    $starts_at = new DateTime($participant['starts_at']);

    // Aceitar convite
    $stmt = $pdo->prepare('
        UPDATE challenge_participants
        SET status = "accepted", responded_at = NOW()
        WHERE id = ?
    ');
    $stmt->execute([$participant['id']]);

    // Buscar dados completos do desafio
    $stmt = $pdo->prepare('
        SELECT
            c.*,
            g.name as game_name,
            g.code as game_code
        FROM challenges c
        JOIN games g ON g.id = c.game_id
        WHERE c.id = ?
    ');
    $stmt->execute([$challenge_id]);
    $challenge = $stmt->fetch(PDO::FETCH_ASSOC);

    // Calcular tempo até início
    $seconds_until_start = max(0, $starts_at->getTimestamp() - $now->getTimestamp());

    json_out([
        'ok' => true,
        'message' => 'Convite aceito! Prepare-se para o desafio.',
        'challenge' => [
            'id' => $challenge['id'],
            'title' => $challenge['title'],
            'description' => $challenge['description'],
            'game_id' => $challenge['game_id'],
            'game_name' => $challenge['game_name'],
            'game_code' => $challenge['game_code'],
            'difficulty' => $challenge['difficulty'],
            'duration_minutes' => $challenge['duration_minutes'],
            'starts_at' => $challenge['starts_at'],
            'ends_at' => $challenge['ends_at'],
            'status' => $challenge['status'],
            'seconds_until_start' => $seconds_until_start
        ]
    ]);

} catch (PDOException $e) {
    error_log('Erro em accept_challenge.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao aceitar convite'], 500);
}
