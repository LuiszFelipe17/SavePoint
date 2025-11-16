<?php
/**
 * API: Estatísticas Gerais do Aluno
 *
 * Retorna estatísticas detalhadas de um aluno específico
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

// Buscar informações do aluno
$stmt = $pdo->prepare('
    SELECT u.username, p.display_name, p.avatar_url, u.last_login
    FROM users u
    LEFT JOIN user_profile p ON u.id = p.user_id
    WHERE u.id = ?
');
$stmt->execute([$student_id]);
$student = $stmt->fetch();

if (!$student) {
    json_out(['ok' => false, 'error' => 'Aluno não encontrado']);
}

// Estatísticas gerais
$stmt = $pdo->prepare('
    SELECT
        COUNT(*) as total_games,
        SUM(score) as total_score,
        AVG(score) as avg_score,
        MAX(score) as best_score,
        SUM(duration_seconds) as total_duration,
        MAX(ended_at) as last_played
    FROM game_session
    WHERE user_id = ? AND status = "completed"
');
$stmt->execute([$student_id]);
$general = $stmt->fetch();

// Estatísticas por jogo
$stmt = $pdo->prepare('
    SELECT
        g.id as game_id,
        g.code as game_code,
        g.name as game_name,
        COUNT(*) as games_played,
        SUM(gs.score) as total_score,
        AVG(gs.score) as avg_score,
        MAX(gs.score) as best_score,
        SUM(gs.duration_seconds) as total_duration
    FROM game_session gs
    INNER JOIN games g ON g.id = gs.game_id
    WHERE gs.user_id = ? AND gs.status = "completed"
    GROUP BY g.id, g.code, g.name
    ORDER BY g.id
');
$stmt->execute([$student_id]);
$by_game = $stmt->fetchAll();

// Dificuldades mais jogadas
$stmt = $pdo->prepare('
    SELECT
        difficulty,
        COUNT(*) as count,
        AVG(score) as avg_score
    FROM game_session
    WHERE user_id = ?
      AND status = "completed"
      AND difficulty IS NOT NULL
      AND difficulty != ""
    GROUP BY difficulty
    ORDER BY count DESC
    LIMIT 5
');
$stmt->execute([$student_id]);
$difficulties = $stmt->fetchAll();

// Temas mais jogados (para jogo da memória)
$stmt = $pdo->prepare('
    SELECT
        theme,
        COUNT(*) as count,
        AVG(score) as avg_score
    FROM game_session
    WHERE user_id = ?
      AND status = "completed"
      AND theme IS NOT NULL
      AND theme != ""
    GROUP BY theme
    ORDER BY count DESC
    LIMIT 5
');
$stmt->execute([$student_id]);
$themes = $stmt->fetchAll();

// Operações mais jogadas (para balão matemático)
$stmt = $pdo->prepare('
    SELECT
        operation_type,
        COUNT(*) as count,
        AVG(score) as avg_score
    FROM game_session
    WHERE user_id = ?
      AND status = "completed"
      AND operation_type IS NOT NULL
      AND operation_type != ""
    GROUP BY operation_type
    ORDER BY count DESC
    LIMIT 5
');
$stmt->execute([$student_id]);
$operations = $stmt->fetchAll();

json_out([
    'ok' => true,
    'student' => [
        'id' => (int)$student_id,
        'username' => $student['username'],
        'display_name' => $student['display_name'],
        'avatar_url' => $student['avatar_url'],
        'last_login' => $student['last_login']
    ],
    'general' => [
        'total_games' => (int)$general['total_games'],
        'total_score' => (int)$general['total_score'],
        'avg_score' => round((float)$general['avg_score'], 2),
        'best_score' => (int)$general['best_score'],
        'total_duration_seconds' => (int)$general['total_duration'],
        'total_duration_formatted' => format_duration((int)$general['total_duration']),
        'last_played' => $general['last_played']
    ],
    'by_game' => array_map(function($game) {
        return [
            'game_id' => (int)$game['game_id'],
            'game_code' => $game['game_code'],
            'game_name' => $game['game_name'],
            'games_played' => (int)$game['games_played'],
            'total_score' => (int)$game['total_score'],
            'avg_score' => round((float)$game['avg_score'], 2),
            'best_score' => (int)$game['best_score'],
            'total_duration' => (int)$game['total_duration']
        ];
    }, $by_game),
    'difficulties' => array_map(function($diff) {
        return [
            'difficulty' => $diff['difficulty'],
            'count' => (int)$diff['count'],
            'avg_score' => round((float)$diff['avg_score'], 2)
        ];
    }, $difficulties),
    'themes' => array_map(function($theme) {
        return [
            'theme' => $theme['theme'],
            'count' => (int)$theme['count'],
            'avg_score' => round((float)$theme['avg_score'], 2)
        ];
    }, $themes),
    'operations' => array_map(function($op) {
        return [
            'operation' => $op['operation_type'],
            'count' => (int)$op['count'],
            'avg_score' => round((float)$op['avg_score'], 2)
        ];
    }, $operations)
]);

/**
 * Formatar duração em segundos para formato legível
 */
function format_duration($seconds) {
    if ($seconds < 60) {
        return $seconds . 's';
    } elseif ($seconds < 3600) {
        $minutes = floor($seconds / 60);
        $secs = $seconds % 60;
        return $minutes . 'min ' . $secs . 's';
    } else {
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        return $hours . 'h ' . $minutes . 'min';
    }
}
