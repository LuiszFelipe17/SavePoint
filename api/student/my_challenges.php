<?php
/**
 * API: Meus Desafios
 * Endpoint: GET /api/student/my_challenges.php
 *
 * Retorna todos os desafios do aluno (convidado, aceito, jogando, completado)
 *
 * Parâmetros (query string):
 * - status (opcional): Filtrar por status (invited, accepted, playing, completed, declined)
 * - limit (opcional): Limite de resultados (padrão: 50)
 *
 * Retorna:
 * - challenges: Array de desafios com dados do professor e do jogo
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

    // Parâmetros de filtro
    $status_filter = isset($_GET['status']) ? $_GET['status'] : null;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

    if ($limit < 1 || $limit > 200) {
        $limit = 50;
    }

    // Montar query
    $sql = '
        SELECT
            c.id,
            c.title,
            c.description,
            c.type,
            c.duration_minutes,
            c.difficulty,
            c.starts_at,
            c.ends_at,
            c.status as challenge_status,
            c.created_at,
            cp.status as participation_status,
            cp.score,
            cp.duration_seconds,
            cp.completed_at,
            cp.invited_at,
            cp.responded_at,
            g.id as game_id,
            g.name as game_name,
            g.code as game_code,
            u.id as teacher_id,
            u.username as teacher_username,
            p.display_name as teacher_display_name,
            cl.name as class_name,
            cl.code as class_code,
            (
                SELECT COUNT(*)
                FROM challenge_participants cp2
                WHERE cp2.challenge_id = c.id AND cp2.status = "completed"
            ) as total_completed,
            (
                SELECT COUNT(*)
                FROM challenge_participants cp3
                WHERE cp3.challenge_id = c.id AND cp3.status IN ("accepted", "playing", "completed")
            ) as total_accepted
        FROM challenge_participants cp
        JOIN challenges c ON c.id = cp.challenge_id
        JOIN games g ON g.id = c.game_id
        JOIN users u ON u.id = c.teacher_id
        LEFT JOIN user_profile p ON u.id = p.user_id
        LEFT JOIN classes cl ON cl.id = c.class_id
        WHERE cp.user_id = ?
    ';

    $params = [$user_id];

    if ($status_filter) {
        $sql .= ' AND cp.status = ?';
        $params[] = $status_filter;
    }

    $sql .= '
        ORDER BY
            CASE c.status
                WHEN "pending" THEN 1
                WHEN "active" THEN 2
                WHEN "completed" THEN 3
                WHEN "cancelled" THEN 4
            END,
            c.starts_at DESC
        LIMIT ?
    ';
    $params[] = $limit;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $challenges = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Formatar dados
    $now = new DateTime();

    foreach ($challenges as &$challenge) {
        $starts_at = new DateTime($challenge['starts_at']);
        $ends_at = new DateTime($challenge['ends_at']);

        // Calcular tempo restante
        $seconds_until_start = $starts_at->getTimestamp() - $now->getTimestamp();
        $seconds_until_end = $ends_at->getTimestamp() - $now->getTimestamp();

        $challenge['seconds_until_start'] = max(0, $seconds_until_start);
        $challenge['seconds_until_end'] = max(0, $seconds_until_end);

        // Determinar se pode jogar agora
        $challenge['can_play_now'] = (
            $challenge['participation_status'] === 'accepted' &&
            $challenge['challenge_status'] === 'active' &&
            $now >= $starts_at &&
            $now <= $ends_at
        );

        // Determinar se pode aceitar/recusar
        $challenge['can_respond'] = (
            $challenge['participation_status'] === 'invited' &&
            $challenge['challenge_status'] === 'pending' &&
            $now < $starts_at
        );

        // Formatar horários
        $challenge['starts_at_formatted'] = $starts_at->format('d/m/Y H:i');
        $challenge['ends_at_formatted'] = $ends_at->format('d/m/Y H:i');

        // Formatar nome do professor
        $challenge['teacher_name'] = $challenge['teacher_display_name'] ?: $challenge['teacher_username'];

        // Formatar duração
        if ($challenge['duration_seconds']) {
            $minutes = floor($challenge['duration_seconds'] / 60);
            $seconds = $challenge['duration_seconds'] % 60;
            $challenge['duration_formatted'] = sprintf('%dm %02ds', $minutes, $seconds);
        } else {
            $challenge['duration_formatted'] = null;
        }

        // Calcular ranking se completou
        if ($challenge['participation_status'] === 'completed' && $challenge['score'] !== null) {
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
            $stmt->execute([
                $challenge['id'],
                $challenge['score'],
                $challenge['score'],
                $challenge['duration_seconds']
            ]);
            $rank_data = $stmt->fetch(PDO::FETCH_ASSOC);
            $challenge['rank'] = $rank_data['rank'];
        } else {
            $challenge['rank'] = null;
        }

        // Labels de status
        $status_labels = [
            'invited' => 'Convidado',
            'accepted' => 'Aceito',
            'declined' => 'Recusado',
            'playing' => 'Jogando',
            'completed' => 'Concluído'
        ];
        $challenge['status_label'] = $status_labels[$challenge['participation_status']] ?? $challenge['participation_status'];

        $challenge_status_labels = [
            'pending' => 'Aguardando',
            'active' => 'Ativo',
            'completed' => 'Finalizado',
            'cancelled' => 'Cancelado'
        ];
        $challenge['challenge_status_label'] = $challenge_status_labels[$challenge['challenge_status']] ?? $challenge['challenge_status'];
    }

    json_out([
        'ok' => true,
        'challenges' => $challenges,
        'count' => count($challenges)
    ]);

} catch (PDOException $e) {
    error_log('Erro em my_challenges.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao buscar desafios'], 500);
}
