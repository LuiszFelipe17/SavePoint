<?php
include('db.php');
include('helpers.php');

start_session_once();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_out(['error' => 'Método não permitido'], 405);
}

$p = body_params();
$identifier = normalize_identifier($p['identifier'] ?? '');
$password   = $p['password'] ?? '';

if ($identifier === '' || $password === '') {
  json_out(['ok' => false, 'error' => 'Preencha usuário/e-mail e senha.'], 422);
}

$pdo = get_pdo();
$isEmail = filter_var($identifier, FILTER_VALIDATE_EMAIL);
$sql = $isEmail
  ? 'SELECT id, username, email, password_hash FROM users WHERE email = ? LIMIT 1'
  : 'SELECT id, username, email, password_hash FROM users WHERE username = ? LIMIT 1';

$stmt = $pdo->prepare($sql);
$stmt->execute([$identifier]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
  json_out(['ok' => false, 'error' => 'Credenciais inválidas.'], 401);
}

$_SESSION['user_id'] = (int)$user['id'];

json_out([
  'ok' => true,
  'user' => [
    'id' => (int)$user['id'],
    'username' => $user['username'],
    'email' => $user['email']
  ]
]);
