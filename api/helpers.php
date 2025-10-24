<?php
/**
 * Funções auxiliares do SavePoint
 */

/**
 * Obtém parâmetros do corpo da requisição
 */
function body_params(): array {
  $raw = file_get_contents('php://input');
  $ct = $_SERVER['CONTENT_TYPE'] ?? '';
  if (stripos($ct, 'application/json') !== false) {
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
  }
  return $_POST ?: [];
}

/**
 * Valida username
 */
function is_valid_username(string $u): bool {
  return preg_match('/^[a-zA-Z0-9_-]{3,30}$/', $u) === 1;
}

/**
 * Normaliza identificador (username ou email)
 */
function normalize_identifier(string $s): string {
  return trim($s);
}

/**
 * Valida força da senha
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Pelo menos uma letra
 * - Pelo menos um número
 *
 * @param string $password Senha a validar
 * @return array ['valid' => bool, 'errors' => string[], 'strength' => string]
 */
function validate_password_strength(string $password): array {
  $errors = [];
  $strength = 'weak';

  // Comprimento mínimo
  if (strlen($password) < 8) {
    $errors[] = 'A senha deve ter no mínimo 8 caracteres.';
  }

  // Deve conter pelo menos uma letra
  if (!preg_match('/[a-zA-Z]/', $password)) {
    $errors[] = 'A senha deve conter pelo menos uma letra.';
  }

  // Deve conter pelo menos um número
  if (!preg_match('/[0-9]/', $password)) {
    $errors[] = 'A senha deve conter pelo menos um número.';
  }

  $valid = empty($errors);

  // Calcular força
  if ($valid) {
    $score = 0;
    if (strlen($password) >= 8) $score++;
    if (strlen($password) >= 12) $score++;
    if (preg_match('/[a-z]/', $password) && preg_match('/[A-Z]/', $password)) $score++;
    if (preg_match('/[0-9]/', $password)) $score++;
    if (preg_match('/[^a-zA-Z0-9]/', $password)) $score++;

    if ($score >= 4) $strength = 'strong';
    elseif ($score >= 3) $strength = 'good';
    elseif ($score >= 2) $strength = 'medium';
    else $strength = 'weak';
  }

  return [
    'valid' => $valid,
    'errors' => $errors,
    'strength' => $strength
  ];
}

/**
 * Gera token seguro
 *
 * @param int $length Tamanho do token
 * @return string Token hexadecimal
 */
function generate_secure_token(int $length = 32): string {
  return bin2hex(random_bytes($length));
}

/**
 * Obtém endereço IP real do cliente
 * Considera proxies e load balancers
 *
 * @return string Endereço IP
 */
function get_client_ip(): string {
  $headers = [
    'HTTP_CF_CONNECTING_IP',  // Cloudflare
    'HTTP_X_FORWARDED_FOR',   // Proxy/Load Balancer
    'HTTP_X_REAL_IP',         // Nginx
    'REMOTE_ADDR'             // Padrão
  ];

  foreach ($headers as $header) {
    if (!empty($_SERVER[$header])) {
      $ip = $_SERVER[$header];
      // Se múltiplos IPs (X-Forwarded-For), pega o primeiro
      if (strpos($ip, ',') !== false) {
        $ips = explode(',', $ip);
        $ip = trim($ips[0]);
      }
      // Valida se é um IP válido
      if (filter_var($ip, FILTER_VALIDATE_IP)) {
        return $ip;
      }
    }
  }

  return '0.0.0.0';
}

/**
 * Hash de token para armazenamento seguro
 *
 * @param string $token Token em texto plano
 * @return string Hash SHA256
 */
function hash_token(string $token): string {
  return hash('sha256', $token);
}

/**
 * Sanitiza string removendo caracteres perigosos
 *
 * @param string $input String a sanitizar
 * @return string String sanitizada
 */
function sanitize_input(string $input): string {
  // Remove tags HTML e PHP
  $input = strip_tags($input);
  // Remove espaços extras
  $input = trim($input);
  return $input;
}
