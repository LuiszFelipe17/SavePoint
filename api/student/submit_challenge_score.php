<?php
/**
 * API: Enviar Pontuação do Desafio
 * Endpoint: POST /api/student/submit_challenge_score.php
 *
 * Aluno envia pontuação após completar um desafio
 *
 * Parâmetros (JSON):
 * - challenge_id (obrigatório): ID do desafio
 * - score (obrigatório): Pontuação obtida
 * - duration_seconds (obrigatório): Tempo que levou para completar
 * - game_session_id (opcional): ID da sessão de jogo associada
 *
 * Retorna:
 * - ok: true se enviado com sucesso
 * - rank: Posição no ranking
 * - total_participants: Total de participantes que completaram
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
    $score = isset($input['score']) ? (int)$input['score'] : 0;
    $duration_seconds = isset($input['duration_seconds']) ? (int)$input['duration_seconds'] : 0;
    $game_session_id = isset($input['game_session_id']) ? (int)$input['game_session_id'] : null;

    // Validações
    if ($challenge_id <= 0) {
        json_out(['ok' => false, 'error' => 'challenge_id é obrigatório']);
    }

    if ($score < 0) {
        json_out(['ok' => false, 'error' => 'score inválido']);
    }

    if ($duration_seconds < 0) {
        json_out(['ok' => false, 'error' => 'duration_seconds inválido']);
    }

    // Buscar participação
    $stmt = $pdo->prepare('
        SELECT
            cp.id,
            cp.status,
            cp.score as current_score,
            c.status as challenge_status,
            c.starts_at,
            c.ends_at,
            c.title
        FROM challenge_participants cp
        JOIN challenges c ON c.id = cp.challenge_id
        WHERE cp.challenge_id = ? AND cp.user_id = ?
    ');
    $stmt->execute([$challenge_id, $user_id]);
    $participant = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$participant) {
        json_out(['ok' => false, 'error' => 'Você não está participando deste desafio']);
    }

    // Verificar se aceitou o convite
    if (!in_array($participant['status'], ['accepted', 'playing', 'completed'])) {
        json_out(['ok' => false, 'error' => 'Você não aceitou este desafio']);
    }

    // Verificar se o desafio foi cancelado
    if ($participant['challenge_status'] === 'cancelled') {
        json_out(['ok' => false, 'error' => 'Este desafio foi cancelado']);
    }

    // Verificar se o desafio ainda não começou
    $now = new DateTime();
    $starts_at = new DateTime($participant['starts_at']);
    $ends_at = new DateTime($participant['ends_at']);

    if ($now < $starts_at) {
        json_out(['ok' => false, 'error' => 'O desafio ainda não começou']);
    }

    // Verificar se o desafio já terminou
    if ($now > $ends_at) {
        json_out(['ok' => false, 'error' => 'O tempo do desafio já expirou']);
    }

    // Verificar se já completou (permitir reenvio se a nova pontuação for maior)
    if ($participant['status'] === 'completed' && $participant['current_score'] !== null) {
        if ($score <= $participant['current_score']) {
            json_out([
                'ok' => false,
                'error' => 'Você já enviou uma pontuação melhor',
                'current_score' => $participant['current_score']
            ]);
        }
    }

    // Salvar pontuação
    $stmt = $pdo->prepare('
        UPDATE challenge_participants
        SET
            status = "completed",
            score = ?,
            duration_seconds = ?,
            completed_at = NOW()
        WHERE id = ?
    ');
    $stmt->execute([$score, $duration_seconds, $participant['id']]);

    // Se foi fornecido game_session_id, associar ao desafio
    if ($game_session_id) {
        $stmt = $pdo->prepare('
            UPDATE game_session
            SET challenge_id = ?
            WHERE id = ? AND user_id = ?
        ');
        $stmt->execute([$challenge_id, $game_session_id, $user_id]);
    }

    // Calcular ranking
    $stmt = $pdo->prepare('
        SELECT COUNT(*) + 1 as rank
        FROM challenge_participants
        WHERE challenge_id = ?
          AND status = "completed"
          AND (
              score > ?
              OR (score = ? AND duration_seconds < ?)
          )
    ');
    $stmt->execute([$challenge_id, $score, $score, $duration_seconds]);
    $rank_data = $stmt->fetch(PDO::FETCH_ASSOC);
    $rank = $rank_data['rank'];

    // Contar total de participantes que completaram
    $stmt = $pdo->prepare('
        SELECT COUNT(*) as total
        FROM challenge_participants
        WHERE challenge_id = ? AND status = "completed"
    ');
    $stmt->execute([$challenge_id]);
    $total_data = $stmt->fetch(PDO::FETCH_ASSOC);
    $total_completed = $total_data['total'];

    json_out([
        'ok' => true,
        'message' => 'Pontuação registrada com sucesso!',
        'score' => $score,
        'rank' => $rank,
        'total_completed' => $total_completed,
        'challenge_title' => $participant['title']
    ]);

} catch (PDOException $e) {
    error_log('Erro em submit_challenge_score.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao enviar pontuação'], 500);
}
