<?php
// =============================================================
// admin/get_history.php — Ambil riwayat kupon untuk tabel
// =============================================================
// Dipanggil via AJAX (GET) dari admin/index.html
// Mengembalikan JSON array semua kupon, diurutkan terbaru.
// =============================================================

header('Content-Type: application/json');

require_once __DIR__ . '/../includes/db.php';

$result = $conn->query(
    'SELECT kode_kupon, nama_produk, diskon, berlaku_hingga
     FROM kupon
     ORDER BY id DESC
     LIMIT 100'
);

if (!$result) {
    echo json_encode([]);
    exit;
}

$rows = [];
while ($row = $result->fetch_assoc()) {
    $rows[] = $row;
}

$conn->close();

echo json_encode($rows);