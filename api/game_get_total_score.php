<?php
/**
 * Endpoint para buscar a pontuação total acumulada de um usuário em um jogo específico.
 */

include('db.php');
include('helpers.php');

start_session_once();

// Verificar autenticação
if (!isset($_SESSION['user_id'])) {
    json_out(['ok' => false, 'error' => 'Não autenticado'], 401);
}

// Apenas GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_out(['ok' => false, 'error' => 'Método não permitido'], 405);
}

// Validar parâmetro
$game_code = isset($_GET['game_code']) ? trim($_GET['game_code']) : '';

if (empty($game_code)) {
    json_out(['ok' => false, 'error' => 'Código do jogo obrigatório'], 422);
}

$pdo = get_pdo();

// Buscar game_id a partir do game_code
$stmt = $pdo->prepare('SELECT id FROM games WHERE code = ? LIMIT 1');
$stmt->execute([$game_code]);
$game = $stmt->fetch();

if (!$game) {
    json_out(['ok' => false, 'error' => 'Jogo não encontrado'], 404);
}

$game_id = (int)$game['id'];
$user_id = (int)$_SESSION['user_id'];

// Calcular a pontuação total
try {
    $stmt_total = $pdo->prepare(
        'SELECT SUM(score) as total_score FROM game_session WHERE user_id = ? AND game_id = ?'
    );
    $stmt_total->execute([$user_id, $game_id]);
    $result = $stmt_total->fetch();

    // Se o usuário nunca jogou, SUM retornará NULL.
    $total_score = $result ? (int)$result['total_score'] : 0;

    json_out([
        'ok' => true,
        'total_score' => $total_score
    ]);

} catch (PDOException $e) {
    error_log('Erro ao buscar pontuação total: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao buscar pontuação total'], 500);
}