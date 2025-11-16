<?php
/**
 * Endpoint para buscar ranking/leaderboard dos jogos
 * Parâmetros GET:
 * - game_code: 'memory' ou 'math' (obrigatório)
 * - page: número da página (opcional, default=1)
 * - limit: itens por página (opcional, default=50, max=100)
 */

include('db.php');

start_session_once();

// Verificar autenticação
if (!isset($_SESSION['user_id'])) {
    json_out(['ok' => false, 'error' => 'Não autenticado'], 401);
}

// Apenas GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_out(['ok' => false, 'error' => 'Método não permitido'], 405);
}

$game_code = isset($_GET['game_code']) ? trim($_GET['game_code']) : '';
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;

// Validações
if (empty($game_code)) {
    json_out(['ok' => false, 'error' => 'Código do jogo obrigatório'], 422);
}

if (!in_array($game_code, ['memory', 'math', 'portugues'])) {
    json_out(['ok' => false, 'error' => 'Código de jogo inválido'], 422);
}

if ($page < 1) {
    $page = 1;
}

if ($limit < 1 || $limit > 100) {
    $limit = 50;
}

$pdo = get_pdo();

// Buscar game_id e nome
$stmt = $pdo->prepare('SELECT id, name FROM games WHERE code = ? LIMIT 1');
$stmt->execute([$game_code]);
$game = $stmt->fetch();

if (!$game) {
    json_out(['ok' => false, 'error' => 'Jogo não encontrado'], 404);
}

$game_id = (int)$game['id'];
$game_name = $game['name'];

// Calcular offset para paginação
$offset = ($page - 1) * $limit;

// Query para ranking:
// - Agrupa por user_id
// - Soma todas as pontuações do jogo
// - Ordena por pontuação total DESC
// - JOIN com users e user_profile para buscar dados do usuário
$query = '
    SELECT
        u.id AS user_id,
        u.username,
        p.display_name,
        p.avatar_url,
        SUM(gs.score) AS total_score
    FROM game_session gs
    INNER JOIN users u ON u.id = gs.user_id
    LEFT JOIN user_profile p ON p.user_id = u.id
    WHERE gs.game_id = ?
      AND u.is_active = 1
    GROUP BY u.id, u.username, p.display_name, p.avatar_url
    ORDER BY total_score DESC
    LIMIT ? OFFSET ?
';

$stmt = $pdo->prepare($query);
$stmt->execute([$game_id, $limit, $offset]);
$rankings = $stmt->fetchAll();

// Contar total de jogadores únicos
$count_query = '
    SELECT COUNT(DISTINCT user_id) AS total
    FROM game_session
    WHERE game_id = ?
';
$stmt = $pdo->prepare($count_query);
$stmt->execute([$game_id]);
$count_result = $stmt->fetch();
$total_players = (int)$count_result['total'];

// Calcular total de páginas
$total_pages = ceil($total_players / $limit);

// Formatar dados do ranking
$formatted_rankings = [];
$position = $offset + 1;

foreach ($rankings as $row) {
    $formatted_rankings[] = [
        'position' => $position++,
        'user_id' => (int)$row['user_id'],
        'username' => $row['username'],
        'display_name' => $row['display_name'],
        'avatar_url' => $row['avatar_url'],
        'total_score' => (int)$row['total_score']
    ];
}

json_out([
    'ok' => true,
    'game_code' => $game_code,
    'game_name' => $game_name,
    'total_players' => $total_players,
    'current_page' => $page,
    'total_pages' => $total_pages,
    'per_page' => $limit,
    'rankings' => $formatted_rankings
]);
