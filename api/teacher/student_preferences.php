<?php
/**
 * API: Preferências e Padrões do Aluno
 *
 * Retorna análise detalhada de preferências, performance por dificuldade e recomendações
 * Acesso: Apenas professores da turma do aluno
 */

include('../db.php');
include('../helpers.php');

start_session_once();

// Verificar autenticação
if (!isset($_SESSION['user_id'])) {
    json_out(['ok' => false, 'error' => 'Não autenticado']);
}

$pdo = get_pdo();

// Verificar se é professor
$stmt = $pdo->prepare('SELECT is_teacher FROM users WHERE id = ?');
$stmt->execute([$_SESSION['user_id']]);
$teacher = $stmt->fetch();

if (!$teacher || !$teacher['is_teacher']) {
    json_out(['ok' => false, 'error' => 'Acesso negado. Apenas professores.']);
}

// Obter parâmetros
$student_id = isset($_GET['student_id']) ? intval($_GET['student_id']) : 0;
$class_id = isset($_GET['class_id']) ? intval($_GET['class_id']) : 0;

if (!$student_id || !$class_id) {
    json_out(['ok' => false, 'error' => 'student_id e class_id são obrigatórios']);
}

// Verificar se o professor é dono da turma e o aluno está na turma
$stmt = $pdo->prepare('
    SELECT cs.id
    FROM class_students cs
    INNER JOIN classes c ON c.id = cs.class_id
    WHERE cs.class_id = ?
      AND cs.student_id = ?
      AND c.teacher_id = ?
      AND cs.status = "active"
    LIMIT 1
');
$stmt->execute([$class_id, $student_id, $_SESSION['user_id']]);

if (!$stmt->fetch()) {
    json_out(['ok' => false, 'error' => 'Aluno não encontrado nesta turma ou você não tem permissão']);
}

// 1. Performance por dificuldade (com porcentagem)
$stmt = $pdo->prepare('
    SELECT
        difficulty,
        COUNT(*) as games_played,
        AVG(score) as avg_score,
        MAX(score) as max_score,
        MIN(score) as min_score,
        SUM(duration_seconds) as total_duration
    FROM game_session
    WHERE user_id = ?
      AND status = "completed"
      AND difficulty IS NOT NULL
      AND difficulty != ""
    GROUP BY difficulty
    ORDER BY
        CASE difficulty
            WHEN "easy" THEN 1
            WHEN "medium" THEN 2
            WHEN "hard" THEN 3
            WHEN "expert" THEN 4
            ELSE 5
        END
');
$stmt->execute([$student_id]);
$by_difficulty = $stmt->fetchAll();

$total_games_with_difficulty = array_sum(array_column($by_difficulty, 'games_played'));

// 2. Performance por jogo e dificuldade
$stmt = $pdo->prepare('
    SELECT
        g.name as game_name,
        gs.difficulty,
        COUNT(*) as games_played,
        AVG(gs.score) as avg_score,
        MAX(gs.score) as max_score
    FROM game_session gs
    INNER JOIN games g ON g.id = gs.game_id
    WHERE gs.user_id = ?
      AND gs.status = "completed"
      AND gs.difficulty IS NOT NULL
      AND gs.difficulty != ""
    GROUP BY g.name, gs.difficulty
    ORDER BY g.id,
        CASE gs.difficulty
            WHEN "easy" THEN 1
            WHEN "medium" THEN 2
            WHEN "hard" THEN 3
            WHEN "expert" THEN 4
            ELSE 5
        END
');
$stmt->execute([$student_id]);
$performance_matrix = $stmt->fetchAll();

// 3. Temas favoritos (Jogo da Memória)
$stmt = $pdo->prepare('
    SELECT
        theme,
        COUNT(*) as games_played,
        AVG(score) as avg_score,
        MAX(score) as max_score
    FROM game_session
    WHERE user_id = ?
      AND status = "completed"
      AND game_id = 1
      AND theme IS NOT NULL
      AND theme != ""
    GROUP BY theme
    ORDER BY games_played DESC
    LIMIT 10
');
$stmt->execute([$student_id]);
$favorite_themes = $stmt->fetchAll();

// 4. Operações favoritas (Balão Matemático)
$stmt = $pdo->prepare('
    SELECT
        operation_type,
        COUNT(*) as games_played,
        AVG(score) as avg_score,
        MAX(score) as max_score
    FROM game_session
    WHERE user_id = ?
      AND status = "completed"
      AND game_id = 2
      AND operation_type IS NOT NULL
      AND operation_type != ""
    GROUP BY operation_type
    ORDER BY games_played DESC
    LIMIT 10
');
$stmt->execute([$student_id]);
$favorite_operations = $stmt->fetchAll();

// 5. Análise de tendência de dificuldade (últimos 30 dias)
$stmt = $pdo->prepare('
    SELECT
        difficulty,
        DATE(ended_at) as play_date,
        COUNT(*) as games_played
    FROM game_session
    WHERE user_id = ?
      AND status = "completed"
      AND difficulty IS NOT NULL
      AND difficulty != ""
      AND ended_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY difficulty, play_date
    ORDER BY play_date DESC
');
$stmt->execute([$student_id]);
$difficulty_trend = $stmt->fetchAll();

// 6. Horários preferidos para jogar
$stmt = $pdo->prepare('
    SELECT
        HOUR(started_at) as hour,
        COUNT(*) as games_played,
        AVG(score) as avg_score
    FROM game_session
    WHERE user_id = ?
      AND status = "completed"
      AND started_at IS NOT NULL
    GROUP BY hour
    ORDER BY games_played DESC
    LIMIT 5
');
$stmt->execute([$student_id]);
$preferred_hours = $stmt->fetchAll();

// Gerar recomendações
$recommendations = generate_recommendations($by_difficulty, $performance_matrix);

json_out([
    'ok' => true,
    'by_difficulty' => array_map(function($diff) use ($total_games_with_difficulty) {
        $percentage = $total_games_with_difficulty > 0
            ? round(($diff['games_played'] / $total_games_with_difficulty) * 100, 1)
            : 0;

        return [
            'difficulty' => $diff['difficulty'],
            'games_played' => (int)$diff['games_played'],
            'percentage' => $percentage,
            'avg_score' => round((float)$diff['avg_score'], 2),
            'max_score' => (int)$diff['max_score'],
            'min_score' => (int)$diff['min_score'],
            'total_duration' => (int)$diff['total_duration']
        ];
    }, $by_difficulty),
    'performance_matrix' => array_map(function($row) {
        return [
            'game_name' => $row['game_name'],
            'difficulty' => $row['difficulty'],
            'games_played' => (int)$row['games_played'],
            'avg_score' => round((float)$row['avg_score'], 2),
            'max_score' => (int)$row['max_score']
        ];
    }, $performance_matrix),
    'favorite_themes' => array_map(function($theme) {
        return [
            'theme' => $theme['theme'],
            'games_played' => (int)$theme['games_played'],
            'avg_score' => round((float)$theme['avg_score'], 2),
            'max_score' => (int)$theme['max_score']
        ];
    }, $favorite_themes),
    'favorite_operations' => array_map(function($op) {
        return [
            'operation' => $op['operation_type'],
            'games_played' => (int)$op['games_played'],
            'avg_score' => round((float)$op['avg_score'], 2),
            'max_score' => (int)$op['max_score']
        ];
    }, $favorite_operations),
    'difficulty_trend' => array_map(function($trend) {
        return [
            'difficulty' => $trend['difficulty'],
            'date' => $trend['play_date'],
            'games_played' => (int)$trend['games_played']
        ];
    }, $difficulty_trend),
    'preferred_hours' => array_map(function($hour) {
        return [
            'hour' => (int)$hour['hour'],
            'hour_label' => sprintf('%02d:00', $hour['hour']),
            'games_played' => (int)$hour['games_played'],
            'avg_score' => round((float)$hour['avg_score'], 2)
        ];
    }, $preferred_hours),
    'recommendations' => $recommendations
]);

/**
 * Gerar recomendações baseadas nos dados
 */
function generate_recommendations($by_difficulty, $performance_matrix) {
    $recommendations = [];

    // Analisar distribuição de dificuldades
    $total = array_sum(array_column($by_difficulty, 'games_played'));
    $difficulty_distribution = [];

    foreach ($by_difficulty as $diff) {
        $difficulty_distribution[$diff['difficulty']] = [
            'count' => (int)$diff['games_played'],
            'percentage' => $total > 0 ? ($diff['games_played'] / $total) * 100 : 0,
            'avg_score' => (float)$diff['avg_score']
        ];
    }

    // Recomendação 1: Se jogar muito fácil, sugerir aumentar dificuldade
    if (isset($difficulty_distribution['easy']) && $difficulty_distribution['easy']['percentage'] > 60) {
        $recommendations[] = [
            'type' => 'challenge',
            'priority' => 'high',
            'message' => 'Aluno está dominando o nível fácil! Incentive-o a experimentar níveis mais desafiadores.'
        ];
    }

    // Recomendação 2: Se nunca jogou hard/expert, sugerir
    $has_hard = isset($difficulty_distribution['hard']) || isset($difficulty_distribution['expert']);
    if (!$has_hard && $total > 10) {
        $recommendations[] = [
            'type' => 'growth',
            'priority' => 'medium',
            'message' => 'Aluno ainda não experimentou níveis avançados. Que tal um desafio?'
        ];
    }

    // Recomendação 3: Identificar jogo menos jogado
    $games_count = [];
    foreach ($performance_matrix as $perf) {
        if (!isset($games_count[$perf['game_name']])) {
            $games_count[$perf['game_name']] = 0;
        }
        $games_count[$perf['game_name']] += $perf['games_played'];
    }

    if (count($games_count) > 0) {
        $min_game = array_keys($games_count, min($games_count))[0];
        $max_game = array_keys($games_count, max($games_count))[0];

        if (min($games_count) < max($games_count) * 0.3) {
            $recommendations[] = [
                'type' => 'variety',
                'priority' => 'low',
                'message' => "Aluno prefere '{$max_game}'. Incentive a variedade com '{$min_game}'."
            ];
        }
    }

    // Se não houver recomendações específicas, dar uma genérica positiva
    if (empty($recommendations) && $total > 0) {
        $recommendations[] = [
            'type' => 'positive',
            'priority' => 'info',
            'message' => 'Aluno está explorando bem as opções disponíveis. Continue incentivando!'
        ];
    }

    return $recommendations;
}
