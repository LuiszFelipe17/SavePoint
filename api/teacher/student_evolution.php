<?php
/**
 * API: Evolução do Aluno ao Longo do Tempo
 *
 * Retorna dados agregados por período para gráficos de evolução
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
$period = isset($_GET['period']) ? $_GET['period'] : 'day'; // day, week, month
$game_id = isset($_GET['game_id']) ? intval($_GET['game_id']) : null;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 30; // Últimos N períodos

if (!$student_id || !$class_id) {
    json_out(['ok' => false, 'error' => 'student_id e class_id são obrigatórios']);
}

if (!in_array($period, ['day', 'week', 'month'])) {
    json_out(['ok' => false, 'error' => 'Período inválido. Use: day, week, month']);
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

// Definir formato de agrupamento baseado no período
$date_format = match($period) {
    'day' => '%Y-%m-%d',
    'week' => '%Y-%u', // Ano-Semana
    'month' => '%Y-%m',
    default => '%Y-%m-%d'
};

// Query base
$sql = '
    SELECT
        DATE_FORMAT(ended_at, ?) as period_label,
        COUNT(*) as games_played,
        SUM(score) as total_score,
        AVG(score) as avg_score,
        MAX(score) as max_score,
        MIN(score) as min_score,
        SUM(duration_seconds) as total_duration,
        AVG(duration_seconds) as avg_duration
    FROM game_session
    WHERE user_id = ?
      AND status = "completed"
      AND ended_at IS NOT NULL
';

$params = [$date_format, $student_id];

// Filtrar por jogo específico se fornecido
if ($game_id) {
    $sql .= ' AND game_id = ?';
    $params[] = $game_id;
}

$sql .= '
    GROUP BY period_label
    ORDER BY period_label DESC
    LIMIT ?
';

$params[] = $limit;

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$evolution_data = $stmt->fetchAll();

// Inverter ordem para ficar cronológica (mais antigo → mais recente)
$evolution_data = array_reverse($evolution_data);

// Formatar dados para o frontend
$formatted_data = array_map(function($row) use ($period) {
    return [
        'period' => format_period_label($row['period_label'], $period),
        'period_raw' => $row['period_label'],
        'games_played' => (int)$row['games_played'],
        'total_score' => (int)$row['total_score'],
        'avg_score' => round((float)$row['avg_score'], 2),
        'max_score' => (int)$row['max_score'],
        'min_score' => (int)$row['min_score'],
        'total_duration' => (int)$row['total_duration'],
        'avg_duration' => round((float)$row['avg_duration'], 2)
    ];
}, $evolution_data);

json_out([
    'ok' => true,
    'period' => $period,
    'game_id' => $game_id,
    'evolution' => $formatted_data
]);

/**
 * Formatar label do período para exibição
 */
function format_period_label($label, $period) {
    switch ($period) {
        case 'day':
            // 2025-11-13 → 13/11
            $date = DateTime::createFromFormat('Y-m-d', $label);
            return $date ? $date->format('d/m') : $label;

        case 'week':
            // 2025-45 → Semana 45
            $parts = explode('-', $label);
            return 'Sem ' . ($parts[1] ?? $label);

        case 'month':
            // 2025-11 → Nov/25
            $date = DateTime::createFromFormat('Y-m', $label);
            return $date ? $date->format('M/y') : $label;

        default:
            return $label;
    }
}
