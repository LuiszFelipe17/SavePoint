<?php
include('db.php');
start_session_once();
if (!isset($_SESSION['user_id'])) { json_out(['ok'=>false,'error'=>'unauthorized'],401); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_out(['ok'=>false,'error'=>'method_not_allowed'],405); }
if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) { json_out(['ok'=>false,'error'=>'arquivo inválido'],422); }

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($_FILES['avatar']['tmp_name']);
$allowed = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
if (!isset($allowed[$mime])) { json_out(['ok'=>false,'error'=>'formato não suportado'],422); }
$size = filesize($_FILES['avatar']['tmp_name']);
if ($size === false || $size > 2*1024*1024) { json_out(['ok'=>false,'error'=>'arquivo muito grande'],413); }

$ext = $allowed[$mime];
$uid = (int)$_SESSION['user_id'];
$baseDir = dirname(__DIR__) . '/uploads/avatars';
if (!is_dir($baseDir)) { @mkdir($baseDir, 0775, true); }
$fname = 'u' . $uid . '_' . time() . '.' . $ext;
$path = $baseDir . '/' . $fname;
if (!move_uploaded_file($_FILES['avatar']['tmp_name'], $path)) { json_out(['ok'=>false,'error'=>'falha no upload'],500); }
$publicUrl = '../uploads/avatars/' . $fname;

$pdo = get_pdo();
$pdo->prepare('UPDATE user_profile SET avatar_url = ? WHERE user_id = ?')->execute([$publicUrl, $uid]);
json_out(['ok'=>true,'avatar_url'=>$publicUrl]);
