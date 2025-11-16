<?php
/**
 * API: Criar Turma
 *
 * Permite que professor crie uma nova turma
 * POST: {name, description?, school_year?}
 * Retorna: {ok, class_id, code}
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
        json_out(['ok' => false, 'error' => 'Apenas professores podem criar turmas'], 403);
    }

    // Obter dados da requisição
    $data = json_decode(file_get_contents('php://input'), true);

    // Validar campos obrigatórios
    if (empty($data['name'])) {
        json_out(['ok' => false, 'error' => 'Nome da turma é obrigatório'], 422);
    }

    $name = sanitize_input($data['name']);
    $description = isset($data['description']) ? sanitize_input($data['description']) : null;
    $school_year = isset($data['school_year']) ? sanitize_input($data['school_year']) : null;

    // Validar tamanho do nome
    if (strlen($name) < 3 || strlen($name) > 100) {
        json_out(['ok' => false, 'error' => 'Nome deve ter entre 3 e 100 caracteres'], 422);
    }

    // Gerar código único para turma (6 caracteres alfanuméricos)
    function generate_class_code($pdo) {
        $attempts = 0;
        $max_attempts = 10;

        while ($attempts < $max_attempts) {
            $code = strtoupper(substr(str_shuffle('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'), 0, 6));

            // Verificar se código já existe
            $stmt = $pdo->prepare('SELECT id FROM classes WHERE code = ?');
            $stmt->execute([$code]);

            if (!$stmt->fetch()) {
                return $code;
            }

            $attempts++;
        }

        return false;
    }

    $code = generate_class_code($pdo);

    if (!$code) {
        json_out(['ok' => false, 'error' => 'Erro ao gerar código da turma'], 500);
    }

    // Inserir turma no banco
    $stmt = $pdo->prepare('
        INSERT INTO classes (teacher_id, name, description, code, school_year)
        VALUES (?, ?, ?, ?, ?)
    ');

    $stmt->execute([$user_id, $name, $description, $code, $school_year]);
    $class_id = $pdo->lastInsertId();

    json_out([
        'ok' => true,
        'message' => 'Turma criada com sucesso!',
        'class_id' => (int)$class_id,
        'code' => $code,
        'name' => $name
    ]);

} catch (PDOException $e) {
    error_log('Erro em create_class.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao criar turma'], 500);
}
