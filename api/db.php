<?php
include('config.php');

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

function start_session_once(): void {
  if (session_status() === PHP_SESSION_NONE) {
    session_name(SESSION_NAME);
    session_start([
      'cookie_httponly' => true,
      'cookie_samesite' => 'Lax',
    ]);
  }
}

function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}
