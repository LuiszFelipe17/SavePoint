<?php
/**
 * API: Buscar Palavra Aleatória
 * Retorna uma palavra aleatória com letras faltantes para o jogo "Complete a Palavra"
 */

include('db.php');
start_session_once();

// Verificar autenticação
if (!isset($_SESSION['user_id'])) {
    json_out(['ok' => false, 'error' => 'Não autenticado'], 401);
}

try {
    $pdo = get_pdo();

    // Buscar palavra aleatória
    $stmt = $pdo->query("
        SELECT id, palavra, dica, categoria, dificuldade
        FROM palavras_portugues
        ORDER BY RAND()
        LIMIT 1
    ");

    $palavra_data = $stmt->fetch();

    if (!$palavra_data) {
        json_out(['ok' => false, 'error' => 'Nenhuma palavra disponível'], 500);
    }

    $palavra = strtoupper($palavra_data['palavra']);
    $dificuldade = $palavra_data['dificuldade'];
    $tamanho = mb_strlen($palavra);

    // Calcular quantidade de letras faltantes baseado na dificuldade
    $quantidade_faltantes = 0;
    switch ($dificuldade) {
        case 'facil':
            // 25-30% das letras (mínimo 1, máximo 2)
            $quantidade_faltantes = max(1, min(2, (int)ceil($tamanho * 0.30)));
            break;
        case 'medio':
            // 30-40% das letras (mínimo 2, máximo 3)
            $quantidade_faltantes = max(2, min(3, (int)ceil($tamanho * 0.35)));
            break;
        case 'dificil':
            // 40-50% das letras (mínimo 3, máximo 4)
            $quantidade_faltantes = max(3, min(4, (int)ceil($tamanho * 0.45)));
            break;
    }

    // Garantir que não faltem todas as letras
    $quantidade_faltantes = min($quantidade_faltantes, $tamanho - 1);

    // Selecionar índices aleatórios para letras faltantes
    $indices_possiveis = range(0, $tamanho - 1);
    shuffle($indices_possiveis);
    $indices_faltando = array_slice($indices_possiveis, 0, $quantidade_faltantes);
    sort($indices_faltando);

    // Retornar resposta JSON
    json_out([
        'ok' => true,
        'palavra' => $palavra,
        'indicesFaltando' => $indices_faltando,
        'dica' => $palavra_data['dica'],
        'categoria' => $palavra_data['categoria'],
        'dificuldade' => $dificuldade
    ]);

} catch (PDOException $e) {
    error_log("Erro ao buscar palavra: " . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao buscar palavra'], 500);
}
