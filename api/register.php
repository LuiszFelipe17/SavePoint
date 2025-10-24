<?php
/**
 * API de Registro
 *
 * Funcionalidades:
 * - Validação robusta de senha (mínimo 8 caracteres, letras + números)
 * - Sanitização de inputs
 * - Proteção contra duplicatas
 * - Criação automática de perfil
 */

include('db.php');
include('helpers.php');

start_session_once();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_out(['error' => 'Método não permitido'], 405);
}

$p = body_params();

$username = isset($p['username']) ? sanitize_input(trim($p['username'])) : '';
$email    = isset($p['email']) ? sanitize_input(trim($p['email'])) : '';
$password = $p['password'] ?? '';
$confirm  = $p['confirm'] ?? '';

// 1. Validar username
if (!is_valid_username($username)) {
  json_out([
    'ok' => false,
    'error' => 'Usuário inválido. Use apenas letras, números, _ e - (3-30 caracteres).'
  ], 422);
}

// 2. Validar email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  json_out(['ok' => false, 'error' => 'E-mail inválido.'], 422);
}

// 3. Validar força da senha (mínimo 8 caracteres, letras + números)
$passwordValidation = validate_password_strength($password);
if (!$passwordValidation['valid']) {
  json_out([
    'ok' => false,
    'error' => 'Senha fraca',
    'details' => $passwordValidation['errors']
  ], 422);
}

// 4. Validar confirmação de senha
if ($password !== $confirm) {
  json_out(['ok' => false, 'error' => 'As senhas não coincidem.'], 422);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$pdo = get_pdo();
try {
  $pdo->beginTransaction();

  // Inserir usuário
  $stmt = $pdo->prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
  $stmt->execute([$username, $email, $hash]);
  $userId = (int)$pdo->lastInsertId();

  // Criar perfil automaticamente
  $stmt2 = $pdo->prepare('INSERT INTO user_profile (user_id, display_name, avatar_url) VALUES (?, ?, NULL)');
  $stmt2->execute([$userId, $username]);

  $pdo->commit();

  // Fazer login automático após registro
  $_SESSION['user_id'] = $userId;
  $_SESSION['username'] = $username;

  json_out([
    'ok' => true,
    'user' => [
      'id' => $userId,
      'username' => $username,
      'email' => $email
    ],
    'password_strength' => $passwordValidation['strength']
  ]);
} catch (PDOException $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();

  // Erro de duplicata (username ou email já existe)
  if ($e->getCode() === '23000') {
    // Mensagem genérica para não revelar o que existe
    json_out(['ok' => false, 'error' => 'Usuário ou e-mail já cadastrado.'], 409);
  }

  // Erro genérico
  json_out(['ok' => false, 'error' => 'Erro ao cadastrar. Tente novamente.'], 500);
}
