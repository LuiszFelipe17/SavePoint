<?php
/**
 * Endpoint para salvar pontuação de uma partida
 * Recebe dados do jogo e salva em game_session
 */

include('db.php');
include('helpers.php');

start_session_once();

// Verificar autenticação
if (!isset($_SESSION['user_id'])) {
    json_out(['ok' => false, 'error' => 'Não autenticado'], 401);
}

// Apenas POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['ok' => false, 'error' => 'Método não permitido'], 405);
}

$params = body_params();

// Validar parâmetros obrigatórios
$game_code = isset($params['game_code']) ? trim($params['game_code']) : '';
$score = isset($params['score']) ? (int)$params['score'] : 0;
$duration_seconds = isset($params['duration_seconds']) ? (int)$params['duration_seconds'] : null;
$difficulty = isset($params['difficulty']) ? trim($params['difficulty']) : null;
$theme = isset($params['theme']) ? trim($params['theme']) : null;
$operation_type = isset($params['operation_type']) ? trim($params['operation_type']) : null;
$status = isset($params['status']) ? trim($params['status']) : 'completed';
$metadata = isset($params['metadata']) ? $params['metadata'] : null;

// Validações
if (empty($game_code)) {
    json_out(['ok' => false, 'error' => 'Código do jogo obrigatório'], 422);
}

if (!in_array($game_code, ['memory', 'math'])) {
    json_out(['ok' => false, 'error' => 'Código de jogo inválido'], 422);
}

if ($score < 0) {
    json_out(['ok' => false, 'error' => 'Pontuação inválida'], 422);
}

if (!in_array($status, ['completed', 'failed', 'quit'])) {
    $status = 'completed';
}

$pdo = get_pdo();

// Buscar game_id
$stmt = $pdo->prepare('SELECT id FROM games WHERE code = ? LIMIT 1');
$stmt->execute([$game_code]);
$game = $stmt->fetch();

if (!$game) {
    json_out(['ok' => false, 'error' => 'Jogo não encontrado'], 404);
}

$game_id = (int)$game['id'];
$user_id = (int)$_SESSION['user_id'];

// Converter metadata para JSON se for array
$metadata_json = null;
if ($metadata !== null) {
    $metadata_json = is_string($metadata) ? $metadata : json_encode($metadata);
}

// Inserir pontuação
try {
    $stmt = $pdo->prepare('
        INSERT INTO game_session (
            user_id,
            game_id,
            score,
            duration_seconds,
            difficulty,
            theme,
            operation_type,
            status,
            metadata,
            started_at,
            ended_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ');

    $stmt->execute([
        $user_id,
        $game_id,
        $score,
        $duration_seconds,
        $difficulty,
        $theme,
        $operation_type,
        $status,
        $metadata_json
    ]);

    $score_id = $pdo->lastInsertId();

    // Após salvar, busca a nova pontuação total do usuário para este jogo.
    $stmt_total = $pdo->prepare(
        'SELECT SUM(score) as total_score FROM game_session WHERE user_id = ? AND game_id = ?'
    );
    $stmt_total->execute([$user_id, $game_id]);
    $result = $stmt_total->fetch();
    $new_total_score = $result ? (int)$result['total_score'] : 0;
    // --- FIM DO NOVO TRECHO ---


    // Adiciona 'new_total_score' a resposta JSON
    json_out([
        'ok' => true,
        'score_id' => (int)$score_id,
        'score' => $score,
        'new_total_score' => $new_total_score,
        'message' => 'Pontuação salva com sucesso'
    ]);

} catch (PDOException $e) {
    error_log('Erro ao salvar pontuação: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao salvar pontuação'], 500);
}
