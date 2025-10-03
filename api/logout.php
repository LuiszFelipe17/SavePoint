<?php
include('db.php');
start_session_once();
session_unset();
session_destroy();
json_out(['ok' => true]);
