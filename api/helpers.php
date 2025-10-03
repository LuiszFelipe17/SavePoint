<?php
function body_params(): array {
  $raw = file_get_contents('php://input');
  $ct = $_SERVER['CONTENT_TYPE'] ?? '';
  if (stripos($ct, 'application/json') !== false) {
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
  }
  return $_POST ?: [];
}

function is_valid_username(string $u): bool {
  return preg_match('/^[a-zA-Z0-9_-]{3,30}$/', $u) === 1;
}

function normalize_identifier(string $s): string {
  return trim($s);
}
