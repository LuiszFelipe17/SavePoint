<?php
include('db.php');
include('helpers.php');

start_session_once();

if (!isset($_SESSION['user_id'])) {
  json_out(['ok' => true, 'authenticated' => false]);
}

$pdo = get_pdo();
$stmt = $pdo->prepare('
  SELECT u.username, p.display_name, p.avatar_url
  FROM users u
  LEFT JOIN user_profile p ON u.id = p.user_id
  WHERE u.id = ? LIMIT 1
');
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user) {
  json_out(['ok' => true, 'authenticated' => false]);
}

json_out([
  'ok' => true,
  'authenticated' => true,
  'user_id' => (int)$_SESSION['user_id'],
  'username' => $user['username'],
  'display_name' => $user['display_name'],
  'avatar_url' => $user['avatar_url']
]);
