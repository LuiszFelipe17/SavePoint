<?php
/**
 * API: Listar Desafios do Professor
 * Endpoint: GET /api/teacher/get_challenges.php
 *
 * Retorna todos os desafios criados pelo professor
 *
 * Parâmetros (query string):
 * - status (opcional): Filtrar por status (pending, active, completed, cancelled)
 * - class_id (opcional): Filtrar por turma
 * - limit (opcional): Limite de resultados (padrão: 50)
 *
 * Retorna:
 * - challenges: Array de desafios com participantes
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

    // Parâmetros de filtro
    $status_filter = isset($_GET['status']) ? $_GET['status'] : null;
    $class_id_filter = isset($_GET['class_id']) ? (int)$_GET['class_id'] : null;
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
            c.status,
            c.created_at,
            g.id as game_id,
            g.name as game_name,
            g.code as game_code,
            cl.id as class_id,
            cl.name as class_name,
            cl.code as class_code,
            COUNT(DISTINCT cp.id) as total_participants,
            COUNT(DISTINCT CASE WHEN cp.status = "accepted" THEN cp.id END) as accepted_count,
            COUNT(DISTINCT CASE WHEN cp.status = "completed" THEN cp.id END) as completed_count
        FROM challenges c
        JOIN games g ON g.id = c.game_id
        LEFT JOIN classes cl ON cl.id = c.class_id
        LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id
        WHERE c.teacher_id = ?
    ';

    $params = [$user_id];

    if ($status_filter) {
        $sql .= ' AND c.status = ?';
        $params[] = $status_filter;
    }

    if ($class_id_filter) {
        $sql .= ' AND c.class_id = ?';
        $params[] = $class_id_filter;
    }

    $sql .= '
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT ?
    ';
    $params[] = $limit;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $challenges = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Formatar datas e adicionar informações úteis
    $now = new DateTime();

    foreach ($challenges as &$challenge) {
        $starts_at = new DateTime($challenge['starts_at']);
        $ends_at = new DateTime($challenge['ends_at']);

        // Calcular tempo restante até início
        $seconds_until_start = $starts_at->getTimestamp() - $now->getTimestamp();
        $challenge['seconds_until_start'] = max(0, $seconds_until_start);

        // Calcular tempo restante até fim
        $seconds_until_end = $ends_at->getTimestamp() - $now->getTimestamp();
        $challenge['seconds_until_end'] = max(0, $seconds_until_end);

        // Atualizar status automaticamente baseado no horário
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
            $stmt_update = $pdo->prepare('UPDATE challenges SET status = ? WHERE id = ?');
            $stmt_update->execute([$new_status, $challenge['id']]);
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
                $stmt_notif->execute([$challenge['id']]);
            }
        }

        // Verificar se pode cancelar (pending ou active, mas não completed)
        $challenge['can_cancel'] = in_array($challenge['status'], ['pending', 'active']) && $challenge['status'] !== 'cancelled';

        // Formatar horários
        $challenge['starts_at_formatted'] = $starts_at->format('d/m/Y H:i');
        $challenge['ends_at_formatted'] = $ends_at->format('d/m/Y H:i');

        // Calcular porcentagem de participação
        $challenge['participation_rate'] = $challenge['total_participants'] > 0
            ? round(($challenge['accepted_count'] / $challenge['total_participants']) * 100)
            : 0;

        $challenge['completion_rate'] = $challenge['total_participants'] > 0
            ? round(($challenge['completed_count'] / $challenge['total_participants']) * 100)
            : 0;
    }

    json_out([
        'ok' => true,
        'challenges' => $challenges,
        'count' => count($challenges)
    ]);

} catch (PDOException $e) {
    error_log('Erro em get_challenges.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao buscar desafios'], 500);
}
