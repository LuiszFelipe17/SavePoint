<?php
/**
 * Endpoint para verificar autenticação do jogador
 * Retorna dados do usuário se autenticado
 */

include('db.php');

start_session_once();

if (!isset($_SESSION['user_id'])) {
    json_out(['ok' => true, 'authenticated' => false]);
}

$pdo = get_pdo();

// Buscar dados do usuário
$stmt = $pdo->prepare('
    SELECT u.id, u.username, u.email, p.display_name, p.avatar_url
    FROM users u
    LEFT JOIN user_profile p ON p.user_id = u.id
    WHERE u.id = ?
    LIMIT 1
');
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    // Sessão inválida, usuário não existe mais
    session_unset();
    session_destroy();
    json_out(['ok' => true, 'authenticated' => false]);
}

json_out([
    'ok' => true,
    'authenticated' => true,
    'user_id' => (int)$user['id'],
    'username' => $user['username'],
    'email' => $user['email'],
    'display_name' => $user['display_name'],
    'avatar_url' => $user['avatar_url']
]);
