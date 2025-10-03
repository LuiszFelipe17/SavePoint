<?php
include('db.php');
start_session_once();
if (!isset($_SESSION['user_id'])) {
  json_out(['ok' => true, 'authenticated' => false]);
}
json_out(['ok' => true, 'authenticated' => true, 'user_id' => (int)$_SESSION['user_id']]);
