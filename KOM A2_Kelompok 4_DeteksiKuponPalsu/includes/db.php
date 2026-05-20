<?php
// =============================================================
// includes/db.php — Koneksi Database MySQL (XAMPP)
// =============================================================
 
define('DB_HOST', 'localhost');
define('DB_USER', 'root');       // Ganti jika berbeda
define('DB_PASS', '');           // Ganti jika pakai password
define('DB_NAME', 'kupon_db');
 
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
 
if ($conn->connect_error) {
    die(json_encode([
        'status'  => 'error',
        'message' => 'Koneksi database gagal: ' . $conn->connect_error
    ]));
}
 
$conn->set_charset('utf8mb4');