<?php
/**
 * API: Convidar Aluno para Turma
 *
 * Professor busca aluno por username e envia convite
 * POST: {class_id, username}
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
    $stmt = $pdo->prepare('SELECT is_teacher, username FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $teacher = $stmt->fetch();

    if (!$teacher || $teacher['is_teacher'] != 1) {
        json_out(['ok' => false, 'error' => 'Apenas professores podem convidar alunos'], 403);
    }

    // Obter dados
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['class_id']) || empty($data['username'])) {
        json_out(['ok' => false, 'error' => 'class_id e username são obrigatórios'], 422);
    }

    $class_id = (int)$data['class_id'];
    $username = sanitize_input($data['username']);

    // Verificar se turma pertence ao professor
    $stmt = $pdo->prepare('SELECT id, name FROM classes WHERE id = ? AND teacher_id = ?');
    $stmt->execute([$class_id, $user_id]);
    $class = $stmt->fetch();

    if (!$class) {
        json_out(['ok' => false, 'error' => 'Turma não encontrada'], 404);
    }

    // Buscar aluno por username
    $stmt = $pdo->prepare('SELECT id, username, is_teacher FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $student = $stmt->fetch();

    if (!$student) {
        json_out(['ok' => false, 'error' => 'Usuário não encontrado'], 404);
    }

    $student_id = (int)$student['id'];

    // Não permitir convidar a si mesmo
    if ($student_id === $user_id) {
        json_out(['ok' => false, 'error' => 'Você não pode se adicionar como aluno'], 422);
    }

    // Verificar se já existe convite ou vínculo
    $stmt = $pdo->prepare('
        SELECT status FROM class_students
        WHERE class_id = ? AND student_id = ?
    ');
    $stmt->execute([$class_id, $student_id]);
    $existing = $stmt->fetch();

    if ($existing) {
        if ($existing['status'] === 'active') {
            json_out(['ok' => false, 'error' => 'Aluno já está nesta turma'], 422);
        }
        if ($existing['status'] === 'pending') {
            json_out(['ok' => false, 'error' => 'Convite já foi enviado'], 422);
        }
        if ($existing['status'] === 'rejected') {
            // Permitir reenviar se foi rejeitado
            $stmt = $pdo->prepare('
                UPDATE class_students
                SET status = "pending", invited_at = NOW(), responded_at = NULL
                WHERE class_id = ? AND student_id = ?
            ');
            $stmt->execute([$class_id, $student_id]);
        }
    } else {
        // Criar novo convite
        $stmt = $pdo->prepare('
            INSERT INTO class_students (class_id, student_id, status)
            VALUES (?, ?, "pending")
        ');
        $stmt->execute([$class_id, $student_id]);
    }

    // Criar notificação para o aluno
    $notification_data = json_encode([
        'class_id' => $class_id,
        'class_name' => $class['name'],
        'teacher_username' => $teacher['username'],
        'invite_id' => $class_id . '_' . $student_id
    ]);

    $stmt = $pdo->prepare('
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (?, "class_invite", ?, ?, ?)
    ');

    $stmt->execute([
        $student_id,
        'Convite para Turma',
        'Professor ' . $teacher['username'] . ' te convidou para a turma "' . $class['name'] . '"',
        $notification_data
    ]);

    json_out([
        'ok' => true,
        'message' => 'Convite enviado para ' . $student['username'],
        'student' => [
            'id' => $student_id,
            'username' => $student['username']
        ]
    ]);

} catch (PDOException $e) {
    error_log('Erro em invite_student.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao enviar convite'], 500);
}
