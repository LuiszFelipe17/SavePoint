<?php
/**
 * API: Remover Aluno da Turma
 *
 * Professor remove aluno de uma turma
 * POST: {class_id, student_id}
 * Retorna: {ok, message}
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
        json_out(['ok' => false, 'error' => 'Apenas professores podem remover alunos'], 403);
    }

    // Obter dados
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['class_id']) || empty($data['student_id'])) {
        json_out(['ok' => false, 'error' => 'class_id e student_id são obrigatórios'], 422);
    }

    $class_id = (int)$data['class_id'];
    $student_id = (int)$data['student_id'];

    // Verificar se turma pertence ao professor
    $stmt = $pdo->prepare('SELECT id FROM classes WHERE id = ? AND teacher_id = ?');
    $stmt->execute([$class_id, $user_id]);

    if (!$stmt->fetch()) {
        json_out(['ok' => false, 'error' => 'Turma não encontrada'], 404);
    }

    // Verificar se aluno está na turma
    $stmt = $pdo->prepare('
        SELECT status FROM class_students
        WHERE class_id = ? AND student_id = ?
    ');
    $stmt->execute([$class_id, $student_id]);
    $link = $stmt->fetch();

    if (!$link) {
        json_out(['ok' => false, 'error' => 'Aluno não está nesta turma'], 404);
    }

    // Atualizar status para 'removed'
    $stmt = $pdo->prepare('
        UPDATE class_students
        SET status = "removed", responded_at = NOW()
        WHERE class_id = ? AND student_id = ?
    ');
    $stmt->execute([$class_id, $student_id]);

    json_out([
        'ok' => true,
        'message' => 'Aluno removido da turma com sucesso'
    ]);

} catch (PDOException $e) {
    error_log('Erro em remove_student.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao remover aluno'], 500);
}
