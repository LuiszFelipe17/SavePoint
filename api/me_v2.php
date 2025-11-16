<?php
/**
 * API: Dados do Usuário (Versão 2 - Sem Cache)
 *
 * INSTRUÇÕES:
 * 1. Envie este arquivo para: public_html/api/me_v2.php
 * 2. Acesse: https://savepoint.click/api/me_v2.php
 * 3. Se funcionar, delete me.php e renomeie me_v2.php → me.php
 */

// Headers anti-cache
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: 0');
header('Content-Type: application/json; charset=utf-8');

// Limpar OPcache ANTES de incluir arquivos
if (function_exists('opcache_reset')) {
    @opcache_reset();
}
if (function_exists('opcache_invalidate')) {
    @opcache_invalidate(__FILE__, true);
    @opcache_invalidate(__DIR__ . '/db.php', true);
    @opcache_invalidate(__DIR__ . '/helpers.php', true);
}

// Versão timestamp para debug
$version = '2.0-' . date('Y-m-d_H-i-s');

include('db.php');
include('helpers.php');

start_session_once();

if (!isset($_SESSION['user_id'])) {
  http_response_code(200);
  echo json_encode([
    'ok' => true,
    'authenticated' => false,
    'version' => $version
  ]);
  exit;
}

$pdo = get_pdo();

// Query com is_teacher
$stmt = $pdo->prepare('
  SELECT u.username, u.is_teacher, p.display_name, p.avatar_url
  FROM users u
  LEFT JOIN user_profile p ON u.id = p.user_id
  WHERE u.id = ? LIMIT 1
');
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user) {
  http_response_code(200);
  echo json_encode([
    'ok' => true,
    'authenticated' => false,
    'version' => $version
  ]);
  exit;
}

// Contar notificações não lidas
$stmt = $pdo->prepare('
  SELECT COUNT(*) as count
  FROM notifications
  WHERE user_id = ? AND is_read = 0 AND (expires_at IS NULL OR expires_at > NOW())
');
$stmt->execute([$_SESSION['user_id']]);
$unread_notifications = (int)$stmt->fetchColumn();

// Resposta JSON
http_response_code(200);
echo json_encode([
  'ok' => true,
  'authenticated' => true,
  'user_id' => (int)$_SESSION['user_id'],
  'username' => $user['username'],
  'display_name' => $user['display_name'],
  'avatar_url' => $user['avatar_url'],
  'is_teacher' => (bool)$user['is_teacher'],  // ← CAMPO CRÍTICO
  'unread_notifications' => $unread_notifications,
  'version' => $version  // Para confirmar que é a versão nova
], JSON_UNESCAPED_UNICODE);
exit;
