<?php
/**
 * API: Ativar Modo Professor
 *
 * Permite que um usuário autenticado se torne professor
 * Atualiza flag is_teacher para 1
 */

include('../db.php');
include('../helpers.php');

start_session_once();

// Verificar autenticação
if (!isset($_SESSION['user_id'])) {
    json_out(['ok' => false, 'error' => 'Não autenticado']);
}

$user_id = (int)$_SESSION['user_id'];

try {
    $pdo = get_pdo();

    // Verificar se já é professor
    $stmt = $pdo->prepare('SELECT is_teacher FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    if (!$user) {
        json_out(['ok' => false, 'error' => 'Usuário não encontrado'], 404);
    }

    if ($user['is_teacher'] == 1) {
        json_out(['ok' => true, 'message' => 'Você já é professor', 'is_teacher' => true]);
    }

    // Ativar modo professor
    $stmt = $pdo->prepare('UPDATE users SET is_teacher = 1 WHERE id = ?');
    $stmt->execute([$user_id]);

    json_out([
        'ok' => true,
        'message' => 'Modo professor ativado com sucesso!',
        'is_teacher' => true
    ]);

} catch (PDOException $e) {
    error_log('Erro em become_teacher.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao ativar modo professor'], 500);
}
