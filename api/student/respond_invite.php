<?php
/**
 * API: Responder Convite de Turma
 *
 * Aluno aceita ou recusa convite de turma
 * POST: {class_id, action: 'accept' | 'decline'}
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

    // Obter dados
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['class_id']) || empty($data['action'])) {
        json_out(['ok' => false, 'error' => 'class_id e action são obrigatórios'], 422);
    }

    $class_id = (int)$data['class_id'];
    $action = $data['action'];

    if (!in_array($action, ['accept', 'decline'])) {
        json_out(['ok' => false, 'error' => 'action deve ser "accept" ou "decline"'], 422);
    }

    // Verificar se existe convite pendente
    $stmt = $pdo->prepare('
        SELECT cs.id, cs.status, c.name as class_name
        FROM class_students cs
        JOIN classes c ON cs.class_id = c.id
        WHERE cs.class_id = ? AND cs.student_id = ? AND cs.status = "pending"
    ');
    $stmt->execute([$class_id, $user_id]);
    $invite = $stmt->fetch();

    if (!$invite) {
        json_out(['ok' => false, 'error' => 'Convite não encontrado'], 404);
    }

    // Atualizar status
    $new_status = ($action === 'accept') ? 'active' : 'rejected';

    $stmt = $pdo->prepare('
        UPDATE class_students
        SET status = ?, responded_at = NOW()
        WHERE class_id = ? AND student_id = ?
    ');
    $stmt->execute([$new_status, $class_id, $user_id]);

    // Marcar notificação como lida
    $stmt = $pdo->prepare('
        UPDATE notifications
        SET is_read = 1
        WHERE user_id = ? AND type = "class_invite" AND JSON_EXTRACT(data, "$.class_id") = ?
    ');
    $stmt->execute([$user_id, $class_id]);

    $message = ($action === 'accept')
        ? 'Você entrou na turma "' . $invite['class_name'] . '"!'
        : 'Convite recusado';

    json_out([
        'ok' => true,
        'message' => $message,
        'action' => $action,
        'status' => $new_status
    ]);

} catch (PDOException $e) {
    error_log('Erro em respond_invite.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao responder convite'], 500);
}
