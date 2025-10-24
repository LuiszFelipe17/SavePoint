<?php
/**
 * API de Login
 *
 * Funcionalidades:
 * - Rate limiting (proteção anti-brute force)
 * - Validação de credenciais
 * - "Lembrar-me" (sessão de 30 dias)
 * - Registro de último login
 * - Bloqueio temporário após falhas
 */

include('db.php');
include('helpers.php');
require_once('RateLimiter.php');

// Não inicia session ainda - será iniciada depois com ou sem "remember me"

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_out(['error' => 'Método não permitido'], 405);
}

$p = body_params();
$identifier = normalize_identifier($p['identifier'] ?? '');
$password   = $p['password'] ?? '';
$remember   = isset($p['remember']) && $p['remember'] === true;

// Validação básica
if ($identifier === '' || $password === '') {
  json_out(['ok' => false, 'error' => 'Preencha todos os campos.'], 422);
}

$pdo = get_pdo();
$rateLimiter = new RateLimiter($pdo);
$clientIp = get_client_ip();

// 1. Verificar se IP está bloqueado
if ($rateLimiter->isIpBlocked($clientIp)) {
  $remaining = $rateLimiter->getRemainingAttempts($clientIp);
  json_out([
    'ok' => false,
    'error' => 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  ], 429);
}

// 2. Verificar se conta está bloqueada por tentativas
if ($rateLimiter->isAccountBlocked($identifier)) {
  json_out([
    'ok' => false,
    'error' => 'Esta conta está temporariamente bloqueada. Tente novamente em 15 minutos.'
  ], 429);
}

// 3. Buscar usuário
$isEmail = filter_var($identifier, FILTER_VALIDATE_EMAIL);
$sql = $isEmail
  ? 'SELECT id, username, email, password_hash, login_attempts, locked_until FROM users WHERE email = ? LIMIT 1'
  : 'SELECT id, username, email, password_hash, login_attempts, locked_until FROM users WHERE username = ? LIMIT 1';

$stmt = $pdo->prepare($sql);
$stmt->execute([$identifier]);
$user = $stmt->fetch();

// 4. Verificar se usuário está bloqueado no banco
if ($user) {
  $lockStatus = $rateLimiter->isUserLocked($identifier);
  if ($lockStatus['blocked']) {
    $timeRemaining = RateLimiter::formatLockoutTime($lockStatus['until']);
    json_out([
      'ok' => false,
      'error' => "Conta bloqueada. Tente novamente em {$timeRemaining}."
    ], 429);
  }
}

// 5. Validar credenciais
if (!$user || !password_verify($password, $user['password_hash'])) {
  // Registrar tentativa falha
  $rateLimiter->recordAttempt($clientIp, $identifier, false);

  // Se usuário existe, incrementar contador e possivelmente bloquear
  if ($user) {
    $rateLimiter->incrementUserAttempts((int)$user['id']);

    // Bloquear após 5 tentativas falhas
    if ((int)$user['login_attempts'] + 1 >= 5) {
      $rateLimiter->lockAccount((int)$user['id']);
    }
  }

  // Mensagem genérica para não revelar se usuário existe
  json_out(['ok' => false, 'error' => 'Credenciais inválidas.'], 401);
}

// 6. Login bem-sucedido!

// Inicia sessão com ou sem "lembrar-me"
start_session_once($remember);

// Registrar tentativa bem-sucedida
$rateLimiter->recordAttempt($clientIp, $identifier, true);

// Resetar contador de tentativas
$rateLimiter->resetAttempts((int)$user['id']);

// Atualizar último login
$stmt = $pdo->prepare('UPDATE users SET last_login = NOW() WHERE id = ?');
$stmt->execute([(int)$user['id']]);

// Salvar na sessão
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['username'] = $user['username'];
$_SESSION['remember'] = $remember;

json_out([
  'ok' => true,
  'user' => [
    'id' => (int)$user['id'],
    'username' => $user['username'],
    'email' => $user['email']
  ],
  'remember' => $remember
]);
