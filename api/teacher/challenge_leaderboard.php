<?php
/**
 * API: Placar de Resultados do Desafio
 * Endpoint: GET /api/teacher/challenge_leaderboard.php
 *
 * Retorna o placar de resultados de um desafio específico
 *
 * Parâmetros (query string):
 * - challenge_id (obrigatório): ID do desafio
 *
 * Retorna:
 * - challenge: Dados do desafio
 * - leaderboard: Array de participantes ordenado por pontuação
 * - stats: Estatísticas gerais (média, max, min, participação)
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
        json_out(['ok' => false, 'error' => 'Apenas professores podem acessar'], 403);
    }

    // Pegar challenge_id
    $challenge_id = isset($_GET['challenge_id']) ? (int)$_GET['challenge_id'] : 0;

    if ($challenge_id <= 0) {
        json_out(['ok' => false, 'error' => 'challenge_id é obrigatório']);
    }

    // Buscar dados do desafio
    $stmt = $pdo->prepare('
        SELECT
            c.*,
            g.name as game_name,
            g.code as game_code,
            cl.name as class_name,
            cl.code as class_code
        FROM challenges c
        JOIN games g ON g.id = c.game_id
        LEFT JOIN classes cl ON cl.id = c.class_id
        WHERE c.id = ? AND c.teacher_id = ?
    ');
    $stmt->execute([$challenge_id, $user_id]);
    $challenge = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$challenge) {
        json_out(['ok' => false, 'error' => 'Desafio não encontrado ou você não tem permissão']);
    }

    // Buscar participantes e suas pontuações
    $stmt = $pdo->prepare('
        SELECT
            cp.id as participant_id,
            cp.user_id,
            cp.status,
            cp.score,
            cp.duration_seconds,
            cp.completed_at,
            cp.invited_at,
            cp.responded_at,
            u.username,
            p.display_name,
            p.avatar_url
        FROM challenge_participants cp
        JOIN users u ON u.id = cp.user_id
        LEFT JOIN user_profile p ON u.id = p.user_id
        WHERE cp.challenge_id = ?
        ORDER BY
            CASE
                WHEN cp.score IS NULL THEN 1
                ELSE 0
            END,
            cp.score DESC,
            cp.duration_seconds ASC
    ');
    $stmt->execute([$challenge_id]);
    $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calcular estatísticas
    $completed_participants = array_filter($participants, function($p) {
        return $p['status'] === 'completed' && $p['score'] !== null;
    });

    $scores = array_map(function($p) {
        return (int)$p['score'];
    }, $completed_participants);

    $stats = [
        'total_invited' => count($participants),
        'total_accepted' => count(array_filter($participants, fn($p) => in_array($p['status'], ['accepted', 'playing', 'completed']))),
        'total_declined' => count(array_filter($participants, fn($p) => $p['status'] === 'declined')),
        'total_completed' => count($completed_participants),
        'participation_rate' => count($participants) > 0
            ? round((count(array_filter($participants, fn($p) => in_array($p['status'], ['accepted', 'playing', 'completed']))) / count($participants)) * 100, 1)
            : 0,
        'completion_rate' => count($participants) > 0
            ? round((count($completed_participants) / count($participants)) * 100, 1)
            : 0,
        'avg_score' => count($scores) > 0 ? round(array_sum($scores) / count($scores), 1) : 0,
        'max_score' => count($scores) > 0 ? max($scores) : 0,
        'min_score' => count($scores) > 0 ? min($scores) : 0
    ];

    // Adicionar rank aos participantes
    $rank = 1;
    foreach ($participants as &$participant) {
        if ($participant['status'] === 'completed' && $participant['score'] !== null) {
            $participant['rank'] = $rank;
            $rank++;
        } else {
            $participant['rank'] = null;
        }

        // Formatar display_name
        $participant['display_name'] = $participant['display_name'] ?: $participant['username'];

        // Formatar duração
        if ($participant['duration_seconds']) {
            $minutes = floor($participant['duration_seconds'] / 60);
            $seconds = $participant['duration_seconds'] % 60;
            $participant['duration_formatted'] = sprintf('%dm %02ds', $minutes, $seconds);
        } else {
            $participant['duration_formatted'] = null;
        }

        // Formatar status para exibição
        $status_labels = [
            'invited' => 'Convidado',
            'accepted' => 'Aceitou',
            'declined' => 'Recusou',
            'playing' => 'Jogando',
            'completed' => 'Concluído'
        ];
        $participant['status_label'] = $status_labels[$participant['status']] ?? $participant['status'];
    }

    // Formatar datas do desafio
    $starts_at = new DateTime($challenge['starts_at']);
    $ends_at = new DateTime($challenge['ends_at']);
    $now = new DateTime();

    $challenge['starts_at_formatted'] = $starts_at->format('d/m/Y H:i');
    $challenge['ends_at_formatted'] = $ends_at->format('d/m/Y H:i');
    $challenge['is_active'] = $challenge['status'] === 'active';
    $challenge['is_completed'] = $challenge['status'] === 'completed';
    $challenge['seconds_until_end'] = max(0, $ends_at->getTimestamp() - $now->getTimestamp());

    json_out([
        'ok' => true,
        'challenge' => $challenge,
        'leaderboard' => $participants,
        'stats' => $stats
    ]);

} catch (PDOException $e) {
    error_log('Erro em challenge_leaderboard.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao buscar placar'], 500);
}
