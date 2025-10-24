<?php
/**
 * Configurações do SavePoint
 *
 * Este arquivo carrega as variáveis de ambiente do .env
 * NUNCA coloque credenciais diretamente aqui!
 */

// Carrega o EnvLoader
require_once __DIR__ . '/EnvLoader.php';

// Carrega o arquivo .env do diretório raiz
$envPath = __DIR__ . '/../.env';
try {
    EnvLoader::load($envPath);
} catch (RuntimeException $e) {
    die('ERRO: Arquivo .env não encontrado. Copie .env.example para .env e configure suas credenciais.');
}

// Define as constantes usando valores do .env
define('DB_HOST', EnvLoader::get('DB_HOST', 'localhost'));
define('DB_NAME', EnvLoader::get('DB_NAME', 'savepoint'));
define('DB_USER', EnvLoader::get('DB_USER'));
define('DB_PASS', EnvLoader::get('DB_PASS'));
define('SESSION_NAME', EnvLoader::get('SESSION_NAME', 'savepoint_sess'));
define('APP_URL', EnvLoader::get('APP_URL', 'http://localhost'));
define('SECURE_COOKIES', filter_var(EnvLoader::get('SECURE_COOKIES', 'false'), FILTER_VALIDATE_BOOLEAN));
