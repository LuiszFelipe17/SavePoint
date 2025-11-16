<?php
/**
 * API: Buscar Notificações
 *
 * Retorna notificações do usuário
 * GET: ?unread_only=1 (opcional)
 * Retorna: {ok, notifications: [...], unread_count}
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

    // Verificar se quer apenas não lidas
    $unread_only = isset($_GET['unread_only']) && $_GET['unread_only'] == '1';

    // Construir query
    $where_clause = 'user_id = ?';
    $params = [$user_id];

    if ($unread_only) {
        $where_clause .= ' AND is_read = 0';
    }

    // Buscar notificações (últimas 50)
    // Filtrar convites de desafios cancelados/completados
    $stmt = $pdo->prepare('
        SELECT
            n.id,
            n.type,
            n.title,
            n.message,
            n.data,
            n.is_read,
            n.created_at,
            n.expires_at
        FROM notifications n
        LEFT JOIN challenges c ON (
            n.type = "challenge_invite"
            AND JSON_EXTRACT(n.data, "$.challenge_id") = c.id
        )
        WHERE ' . $where_clause . '
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (
            n.type != "challenge_invite"
            OR (c.id IS NOT NULL AND c.status IN ("pending", "active"))
        )
        ORDER BY n.created_at DESC
        LIMIT 50
    ');

    $stmt->execute($params);
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Decodificar JSON do campo data
    foreach ($notifications as &$notif) {
        $notif['id'] = (int)$notif['id'];
        $notif['is_read'] = (bool)$notif['is_read'];
        $notif['data'] = $notif['data'] ? json_decode($notif['data'], true) : null;
    }

    // Contar não lidas (excluindo convites de desafios cancelados/completados)
    $stmt = $pdo->prepare('
        SELECT COUNT(*) as count
        FROM notifications n
        LEFT JOIN challenges c ON (
            n.type = "challenge_invite"
            AND JSON_EXTRACT(n.data, "$.challenge_id") = c.id
        )
        WHERE n.user_id = ?
        AND n.is_read = 0
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        AND (
            n.type != "challenge_invite"
            OR (c.id IS NOT NULL AND c.status IN ("pending", "active"))
        )
    ');
    $stmt->execute([$user_id]);
    $unread_count = (int)$stmt->fetchColumn();

    json_out([
        'ok' => true,
        'notifications' => $notifications,
        'total' => count($notifications),
        'unread_count' => $unread_count
    ]);

} catch (PDOException $e) {
    error_log('Erro em notifications/get.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao buscar notificações'], 500);
}
