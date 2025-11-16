<?php
/**
 * API: Criar Desafio/Gincana
 * Endpoint: POST /api/teacher/create_challenge.php
 *
 * Cria um novo desafio que inicia automaticamente em 1 minuto
 *
 * Parâmetros:
 * - game_id (obrigatório): ID do jogo
 * - title (obrigatório): Título do desafio
 * - description (opcional): Descrição
 * - type (obrigatório): 'individual' ou 'class'
 * - class_id (obrigatório se type=class): ID da turma
 * - student_ids (obrigatório se type=individual): Array de IDs dos alunos
 * - duration_minutes (opcional): Duração em minutos (padrão: 10)
 * - difficulty (opcional): easy, medium, hard, expert
 *
 * Retorna:
 * - challenge: Dados do desafio criado
 * - participants_count: Quantidade de participantes convidados
 */

include('../db.php');
include('../helpers.php');

start_session_once();

// Verificar autenticação
if (!isset($_SESSION['user_id'])) {
    json_out(['ok' => false, 'error' => 'Não autenticado'], 401);
}

// Verificar se é professor
$user_id = (int)$_SESSION['user_id'];

try {
    $pdo = get_pdo();

    // Verificar se usuário é professor
    $stmt = $pdo->prepare('SELECT is_teacher FROM users WHERE id = ?');
    $stmt->execute([$user_id]);
    $user = $stmt->fetch();

    if (!$user || $user['is_teacher'] != 1) {
        json_out(['ok' => false, 'error' => 'Apenas professores podem criar desafios'], 403);
    }

    // Pegar dados do POST
    $input = json_decode(file_get_contents('php://input'), true);

    $game_id = isset($input['game_id']) ? (int)$input['game_id'] : 0;
    $title = isset($input['title']) ? trim($input['title']) : '';
    $description = isset($input['description']) ? trim($input['description']) : null;
    $type = isset($input['type']) ? $input['type'] : 'class';
    $class_id = isset($input['class_id']) ? (int)$input['class_id'] : null;
    $student_ids = isset($input['student_ids']) ? $input['student_ids'] : [];
    $duration_minutes = isset($input['duration_minutes']) ? (int)$input['duration_minutes'] : 10;
    $difficulty = isset($input['difficulty']) ? $input['difficulty'] : null;

    // Validações
    if ($game_id <= 0) {
        json_out(['ok' => false, 'error' => 'game_id inválido']);
    }

    if (empty($title)) {
        json_out(['ok' => false, 'error' => 'Título é obrigatório']);
    }

    if (!in_array($type, ['individual', 'class'])) {
        json_out(['ok' => false, 'error' => 'Tipo deve ser "individual" ou "class"']);
    }

    if ($type === 'class' && !$class_id) {
        json_out(['ok' => false, 'error' => 'class_id é obrigatório para desafios de turma']);
    }

    if ($type === 'individual' && empty($student_ids)) {
        json_out(['ok' => false, 'error' => 'student_ids é obrigatório para desafios individuais']);
    }

    if ($duration_minutes < 3 || $duration_minutes > 60) {
        json_out(['ok' => false, 'error' => 'Duração deve ser entre 3 e 60 minutos']);
    }

    $valid_difficulties = ['easy', 'medium', 'hard', 'expert'];
    if ($difficulty && !in_array($difficulty, $valid_difficulties)) {
        json_out(['ok' => false, 'error' => 'Dificuldade inválida']);
    }

    // Verificar se o jogo existe
    $stmt = $pdo->prepare('SELECT id, name FROM games WHERE id = ?');
    $stmt->execute([$game_id]);
    $game = $stmt->fetch();

    if (!$game) {
        json_out(['ok' => false, 'error' => 'Jogo não encontrado']);
    }

    // Se type=class, verificar se a turma pertence ao professor
    if ($type === 'class') {
        $stmt = $pdo->prepare('SELECT id, name FROM classes WHERE id = ? AND teacher_id = ?');
        $stmt->execute([$class_id, $user_id]);
        $class = $stmt->fetch();

        if (!$class) {
            json_out(['ok' => false, 'error' => 'Turma não encontrada ou você não tem permissão']);
        }
    }

    // Calcular horários
    // starts_at = agora + 1 minuto
    // ends_at = starts_at + duration_minutes
    $now = new DateTime();
    $starts_at = clone $now;
    $starts_at->modify('+1 minute');

    $ends_at = clone $starts_at;
    $ends_at->modify("+{$duration_minutes} minutes");

    // Criar desafio
    $stmt = $pdo->prepare('
        INSERT INTO challenges (
            teacher_id, class_id, game_id, title, description,
            type, duration_minutes, difficulty, starts_at, ends_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending")
    ');

    $stmt->execute([
        $user_id,
        $type === 'class' ? $class_id : null,
        $game_id,
        $title,
        $description,
        $type,
        $duration_minutes,
        $difficulty,
        $starts_at->format('Y-m-d H:i:s'),
        $ends_at->format('Y-m-d H:i:s')
    ]);

    $challenge_id = $pdo->lastInsertId();

    // Determinar participantes
    $participants = [];

    if ($type === 'class') {
        // Buscar todos alunos ativos da turma
        $stmt = $pdo->prepare('
            SELECT cs.student_id, u.username, p.display_name
            FROM class_students cs
            JOIN users u ON u.id = cs.student_id
            LEFT JOIN user_profile p ON u.id = p.user_id
            WHERE cs.class_id = ? AND cs.status = "active"
        ');
        $stmt->execute([$class_id]);
        $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        // Desafio individual: usar lista de student_ids fornecida
        if (!is_array($student_ids)) {
            $student_ids = [$student_ids];
        }

        // Validar que todos os IDs são válidos
        $placeholders = implode(',', array_fill(0, count($student_ids), '?'));
        $stmt = $pdo->prepare("
            SELECT u.id as student_id, u.username, p.display_name
            FROM users u
            LEFT JOIN user_profile p ON u.id = p.user_id
            WHERE u.id IN ($placeholders) AND u.is_active = 1
        ");
        $stmt->execute($student_ids);
        $participants = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($participants) !== count($student_ids)) {
            json_out(['ok' => false, 'error' => 'Alguns alunos não foram encontrados']);
        }
    }

    // Criar registros de participantes e notificações
    $stmt_participant = $pdo->prepare('
        INSERT INTO challenge_participants (challenge_id, user_id, status)
        VALUES (?, ?, "invited")
    ');

    $stmt_notification = $pdo->prepare('
        INSERT INTO notifications (user_id, type, title, message, data, expires_at)
        VALUES (?, "challenge_invite", ?, ?, ?, ?)
    ');

    // Pegar username do professor
    $stmt = $pdo->prepare('
        SELECT u.username, p.display_name
        FROM users u
        LEFT JOIN user_profile p ON u.id = p.user_id
        WHERE u.id = ?
    ');
    $stmt->execute([$user_id]);
    $teacher = $stmt->fetch();
    $teacher_name = $teacher['display_name'] ?: $teacher['username'];

    foreach ($participants as $participant) {
        $student_id = $participant['student_id'];

        // Criar participante
        $stmt_participant->execute([$challenge_id, $student_id]);

        // Criar notificação
        $notification_title = "Novo Desafio: {$title}";
        $notification_message = "{$teacher_name} convidou você para um desafio de {$game['name']}! Inicia em 1 minuto.";
        $notification_data = json_encode([
            'challenge_id' => $challenge_id,
            'game_id' => $game_id,
            'game_name' => $game['name'],
            'teacher_id' => $user_id,
            'teacher_name' => $teacher_name,
            'starts_at' => $starts_at->format('Y-m-d H:i:s'),
            'duration_minutes' => $duration_minutes
        ]);

        $stmt_notification->execute([
            $student_id,
            $notification_title,
            $notification_message,
            $notification_data,
            $starts_at->format('Y-m-d H:i:s')  // Convite expira quando desafio inicia
        ]);
    }

    // Retornar sucesso
    json_out([
        'ok' => true,
        'challenge' => [
            'id' => $challenge_id,
            'title' => $title,
            'description' => $description,
            'type' => $type,
            'game_id' => $game_id,
            'game_name' => $game['name'],
            'class_id' => $class_id,
            'duration_minutes' => $duration_minutes,
            'difficulty' => $difficulty,
            'starts_at' => $starts_at->format('Y-m-d H:i:s'),
            'ends_at' => $ends_at->format('Y-m-d H:i:s'),
            'status' => 'pending',
            'participants_count' => count($participants)
        ],
        'message' => 'Desafio criado! Inicia automaticamente em 1 minuto.'
    ]);

} catch (PDOException $e) {
    error_log('Erro em create_challenge.php: ' . $e->getMessage());
    json_out(['ok' => false, 'error' => 'Erro ao criar desafio'], 500);
}
