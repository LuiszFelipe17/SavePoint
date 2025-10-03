<?php
include('db.php');
include('helpers.php');

start_session_once();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_out(['error' => 'Método não permitido'], 405);
}

$p = body_params();

$username = isset($p['username']) ? trim($p['username']) : '';
$email    = isset($p['email']) ? trim($p['email']) : '';
$password = $p['password'] ?? '';
$confirm  = $p['confirm'] ?? '';

if (!is_valid_username($username)) {
  json_out(['ok' => false, 'error' => 'Usuário inválido'], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  json_out(['ok' => false, 'error' => 'E-mail inválido.'], 422);
}
if (strlen($password) < 6) {
  json_out(['ok' => false, 'error' => 'Senha deve ter pelo menos 6 caracteres.'], 422);
}
if ($password !== $confirm) {
  json_out(['ok' => false, 'error' => 'As senhas não coincidem.'], 422);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$pdo = get_pdo();
try {
  $pdo->beginTransaction();

  $stmt = $pdo->prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
  $stmt->execute([$username, $email, $hash]);
  $userId = (int)$pdo->lastInsertId();

  $stmt2 = $pdo->prepare('INSERT INTO user_profile (user_id, display_name, avatar_url) VALUES (?, ?, NULL)');
  $stmt2->execute([$userId, $username]);

  $pdo->commit();

  $_SESSION['user_id'] = $userId;

  json_out([
    'ok' => true,
    'user' => [
      'id' => $userId,
      'username' => $username,
      'email' => $email
    ]
  ]);
} catch (PDOException $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  if ($e->getCode() === '23000') {
    json_out(['ok' => false, 'error' => 'Usuário ou e-mail já cadastrado.'], 409);
  }
  json_out(['ok' => false, 'error' => 'Erro ao cadastrar.'], 500);
}
