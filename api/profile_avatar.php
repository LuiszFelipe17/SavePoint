<?php
include('db.php');
include('helpers.php');

start_session_once();

if (!isset($_SESSION['user_id'])) {
  json_out(['ok'=>false,'error'=>'unauthorized'],401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_out(['ok'=>false,'error'=>'method_not_allowed'],405);
}

if (!isset($_FILES['avatar'])) {
  json_out(['ok'=>false,'error'=>'arquivo não enviado'],422);
}

if ($_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
  $errorMsg = 'Erro no upload: ';
  switch($_FILES['avatar']['error']) {
    case UPLOAD_ERR_INI_SIZE:
      $errorMsg .= 'arquivo maior que upload_max_filesize';
      break;
    case UPLOAD_ERR_FORM_SIZE:
      $errorMsg .= 'arquivo maior que MAX_FILE_SIZE';
      break;
    case UPLOAD_ERR_PARTIAL:
      $errorMsg .= 'upload parcial';
      break;
    case UPLOAD_ERR_NO_FILE:
      $errorMsg .= 'nenhum arquivo';
      break;
    default:
      $errorMsg .= 'código ' . $_FILES['avatar']['error'];
  }
  json_out(['ok'=>false,'error'=>$errorMsg],422);
}

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
$publicUrl = '/uploads/avatars/' . $fname;

try {
  $pdo = get_pdo();
  $stmt = $pdo->prepare('INSERT INTO user_profile (user_id, avatar_url) VALUES (?, ?) ON DUPLICATE KEY UPDATE avatar_url = ?');
  $stmt->execute([$uid, $publicUrl, $publicUrl]);
  json_out(['ok'=>true,'avatar_url'=>$publicUrl]);
} catch (PDOException $e) {
  error_log('Erro ao salvar avatar: ' . $e->getMessage());
  json_out(['ok'=>false,'error'=>'Erro ao salvar no banco: ' . $e->getMessage()],500);
}
