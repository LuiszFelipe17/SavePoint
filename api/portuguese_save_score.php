<?php
/**
 * API: Salvar Pontuação do Jogo "Complete a Palavra"
 * Salva a pontuação final do jogador na tabela game_session
 */

include('db.php');
start_session_once();

// Verificar autenticação
if (!isset($_SESSION['user_id'])) {
    json_out(['ok' => false, 'error' => 'Não autenticado'], 401);
}

// Apenas POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['ok' => false, 'error' => 'Método não permitido'], 405);
}

// Obter dados JSON
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    json_out(['ok' => false, 'error' => 'JSON inválido'], 400);
}

// Validar campos obrigatórios
$score = $data['score'] ?? null;
$palavras_completadas = $data['palavras_completadas'] ?? 0;
$palavras_puladas = $data['palavras_puladas'] ?? 0;
$tempo_total = $data['tempo_total'] ?? 0;

if (!is_numeric($score) || $score < 0) {
    json_out(['ok' => false, 'error' => 'Pontuação inválida'], 400);
}

try {
    $pdo = get_pdo();

    // Buscar ID do jogo 'portuguese'
    $stmt = $pdo->prepare("SELECT id FROM games WHERE code = 'portuguese' LIMIT 1");
    $stmt->execute();
    $game = $stmt->fetch();

    if (!$game) {
        json_out(['ok' => false, 'error' => 'Jogo não encontrado'], 500);
    }

    $game_id = $game['id'];
    $user_id = $_SESSION['user_id'];

    // Preparar metadata
    $metadata = [
        'palavras_completadas' => (int)$palavras_completadas,
        'palavras_puladas' => (int)$palavras_puladas,
        'tempo_total' => (int)$tempo_total,
        'taxa_acerto' => $palavras_completadas > 0
            ? round(($palavras_completadas / ($palavras_completadas + $palavras_puladas)) * 100, 2)
            : 0
    ];

    // Inserir pontuação
    $stmt = $pdo->prepare("
        INSERT INTO game_session (
            user_id,
            game_id,
            score,
            duration_seconds,
            status,
            metadata,
            started_at,
            ended_at
        ) VALUES (
            :user_id,
            :game_id,
            :score,
            :duration,
            'completed',
            :metadata,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        ':user_id' => $user_id,
        ':game_id' => $game_id,
        ':score' => (int)$score,
        ':duration' => (int)$tempo_total,
        ':metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE)
    ]);

    json_out([
        'ok' => true,
        'message' => 'Pontuação salva com sucesso',
        'session_id' => $pdo->lastInsertId(),
        'score' => (int)$score,
        'palavras_completadas' => (int)$palavras_completadas
    ]);

} catch (PDOException $e) {
    error_log("Erro ao salvar pontuação do jogo português: " . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao salvar pontuação'], 500);
}
