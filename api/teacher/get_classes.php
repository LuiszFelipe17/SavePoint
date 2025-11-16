<?php
/**
 * API: Listar Turmas do Professor
 *
 * Retorna todas as turmas criadas pelo professor
 * GET
 * Retorna: {ok, classes: [{id, name, code, student_count, ...}]}
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
    $user = $stmt->fetch();

    if (!$user || $user['is_teacher'] != 1) {
        json_out(['ok' => false, 'error' => 'Apenas professores podem acessar'], 403);
    }

    // Buscar turmas do professor com contagem de alunos
    $stmt = $pdo->prepare('
        SELECT
            c.id,
            c.name,
            c.description,
            c.code,
            c.school_year,
            c.created_at,
            COUNT(CASE WHEN cs.status = "active" THEN 1 END) as student_count,
            COUNT(CASE WHEN cs.status = "pending" THEN 1 END) as pending_count
        FROM classes c
        LEFT JOIN class_students cs ON c.id = cs.class_id
        WHERE c.teacher_id = ?
        GROUP BY c.id
        ORDER BY c.created_at DESC
    ');

    $stmt->execute([$user_id]);
    $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Converter campos numéricos
    foreach ($classes as &$class) {
        $class['id'] = (int)$class['id'];
        $class['student_count'] = (int)$class['student_count'];
        $class['pending_count'] = (int)$class['pending_count'];
    }

    json_out([
        'ok' => true,
        'classes' => $classes,
        'total' => count($classes)
    ]);

} catch (PDOException $e) {
    error_log('Erro em get_classes.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao buscar turmas'], 500);
}
