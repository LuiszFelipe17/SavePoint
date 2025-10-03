<?php
include('db.php');

start_session_once();
if (!isset($_SESSION['user_id'])) { json_out(['ok'=>false,'error'=>'unauthorized'],401); }
$pdo = get_pdo();
$stmt = $pdo->prepare('
  SELECT u.id, u.username, u.email, p.display_name, p.avatar_url
  FROM users u
  LEFT JOIN user_profile p ON p.user_id = u.id
  WHERE u.id = ?
  LIMIT 1
');
$stmt->execute([$_SESSION['user_id']]);
$row = $stmt->fetch();
if (!$row) { json_out(['ok'=>false,'error'=>'not_found'],404); }
json_out(['ok'=>true,'profile'=>[
  'id'=>(int)$row['id'],
  'username'=>$row['username'],
  'email'=>$row['email'],
  'display_name'=>$row['display_name'],
  'avatar_url'=>$row['avatar_url']
]]);
