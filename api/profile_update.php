<?php
include('db.php');
include('helpers.php');
start_session_once();
if (!isset($_SESSION['user_id'])) { json_out(['ok'=>false,'error'=>'unauthorized'],401); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_out(['ok'=>false,'error'=>'method_not_allowed'],405); }
$p = body_params();
$display = isset($p['display_name']) ? trim($p['display_name']) : '';
if ($display === '' || mb_strlen($display) > 60) { json_out(['ok'=>false,'error'=>'nome inválido'],422); }
$pdo = get_pdo();
$pdo->prepare('INSERT INTO user_profile (user_id, display_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)')->execute([$_SESSION['user_id'],$display]);
json_out(['ok'=>true]);
