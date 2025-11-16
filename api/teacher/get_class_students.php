<?php
/**
 * API: Listar Alunos de uma Turma
 *
 * Retorna todos os alunos de uma turma (ativos e pendentes)
 * GET: ?class_id=X
 * Retorna: {ok, students: [{...}]}
 */

include('../db.php');
include('../helpers.php');

start_session_once();
header('Content-Type: application/json; charset=utf-8');

// Verificar autenticação
if (!isset($_SESSION['user_id'])) {
    json_out(['ok' => false, 'error' => 'Não autenticado'], 401);
}

$user_id = (int)$_SESSION['user_id'];

try {
    $pdo = get_pdo();

    // Verificar se é professor
    $stmt = $pdo->prepare('SELECT is_teacher FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $teacher = $stmt->fetch();

    if (!$teacher || $teacher['is_teacher'] != 1) {
        json_out(['ok' => false, 'error' => 'Apenas professores podem acessar'], 403);
    }

    // Obter class_id
    if (empty($_GET['class_id'])) {
        json_out(['ok' => false, 'error' => 'class_id é obrigatório'], 422);
    }

    $class_id = (int)$_GET['class_id'];

    // Verificar se turma pertence ao professor
    $stmt = $pdo->prepare('SELECT id, name FROM classes WHERE id = ? AND teacher_id = ?');
    $stmt->execute([$class_id, $user_id]);
    $class = $stmt->fetch();

    if (!$class) {
        json_out(['ok' => false, 'error' => 'Turma não encontrada'], 404);
    }

    // Buscar alunos da turma
    $stmt = $pdo->prepare('
        SELECT
            u.id as student_id,
            u.username,
            p.display_name,
            p.avatar_url,
            cs.status,
            cs.invited_at,
            cs.responded_at,
            (SELECT COUNT(*) FROM game_session WHERE user_id = u.id) as total_games,
            (SELECT SUM(score) FROM game_session WHERE user_id = u.id) as total_score,
            u.last_login
        FROM class_students cs
        JOIN users u ON cs.student_id = u.id
        LEFT JOIN user_profile p ON u.id = p.user_id
        WHERE cs.class_id = ? AND cs.status IN ("pending", "active")
        ORDER BY
            CASE cs.status
                WHEN "active" THEN 1
                WHEN "pending" THEN 2
            END,
            cs.invited_at DESC
    ');

    $stmt->execute([$class_id]);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Converter campos numéricos
    foreach ($students as &$student) {
        $student['student_id'] = (int)$student['student_id'];
        $student['total_games'] = (int)$student['total_games'];
        $student['total_score'] = (int)($student['total_score'] ?: 0);
    }

    json_out([
        'ok' => true,
        'class' => [
            'id' => (int)$class['id'],
            'name' => $class['name']
        ],
        'students' => $students,
        'total' => count($students)
    ]);

} catch (PDOException $e) {
    error_log('Erro em get_class_students.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao buscar alunos'], 500);
}
