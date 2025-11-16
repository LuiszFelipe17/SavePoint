<?php
include('config.php');

// Definir timezone padrão para São Paulo/Brasil
date_default_timezone_set('America/Sao_Paulo');

function get_pdo(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;

  $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
  $opt = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ];
  $pdo = new PDO($dsn, DB_USER, DB_PASS, $opt);
  return $pdo;
}

/**
 * Inicia sessão PHP com suporte a "Lembrar-me"
 *
 * @param bool $remember Se true, session dura 30 dias; se false, dura até fechar navegador
 */
function start_session_once(bool $remember = false): void {
  if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);

    // Configuração de duração da sessão
    $lifetime = $remember ? (30 * 24 * 60 * 60) : 0; // 30 dias ou até fechar navegador

    // Define configurações de cookie antes de iniciar a sessão
    if ($remember) {
      ini_set('session.gc_maxlifetime', (string)$lifetime);
    }

    session_start([
      'cookie_lifetime' => $lifetime,
      'cookie_httponly' => true,
      'cookie_samesite' => 'Lax',
      'cookie_secure' => SECURE_COOKIES, // true em produção com HTTPS
    ]);
  }
}

function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}
