<?php
// =============================================================
// kasir/proses_scan.php — Backend: Dekripsi & Verifikasi Kupon
// =============================================================
// Dipanggil oleh kasir/index.html via AJAX (POST)
// Menerima ciphertext + kunci, mendekripsi, memverifikasi,
// mengembalikan JSON berisi data kupon atau pesan error.
// =============================================================

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
    exit;
}

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/crypto.php';

// ── Ambil input ──────────────────────────────────────────────
$ciphertext = trim($_POST['ciphertext'] ?? '');
$dec_key    = $_POST['dec_key']         ?? '';

if (empty($ciphertext)) {
    echo json_encode(['status' => 'error', 'message' => 'Ciphertext tidak boleh kosong.']);
    exit;
}
if (empty($dec_key)) {
    echo json_encode(['status' => 'error', 'message' => 'Kunci dekripsi tidak boleh kosong.']);
    exit;
}

// ── Dekripsi & verifikasi format JSON ───────────────────────
$data = verifyAndDecrypt($ciphertext, $dec_key);

if ($data === false) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Dekripsi gagal. Kunci salah atau data rusak/tidak valid.'
    ]);
    exit;
}

// ── Verifikasi integritas HMAC ───────────────────────────────
// Hitung ulang hash dengan kunci yang sama
$expectedHash = hash_hmac(
    'sha256',
    $data['kode_kupon'] . $data['nama_produk'] . $data['diskon'] . $data['berlaku_hingga'],
    $dec_key
);

$hashValid = isset($data['hash']) && hash_equals($expectedHash, $data['hash']);

// ── Cek apakah kupon ada di database ────────────────────────
$stmt = $conn->prepare('SELECT id, kode_kupon FROM kupon WHERE kode_kupon = ?');
$stmt->bind_param('s', $data['kode_kupon']);
$stmt->execute();
$dbRow = $stmt->get_result()->fetch_assoc();
$stmt->close();
$conn->close();

if (!$dbRow) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Kupon tidak ditemukan di database. Mungkin kupon palsu!'
    ]);
    exit;
}

// ── Kembalikan data kupon ────────────────────────────────────
echo json_encode([
    'status'     => 'success',
    'hash_valid' => $hashValid,
    'data'       => [
        'kode_kupon'    => $data['kode_kupon'],
        'nama_produk'   => $data['nama_produk'],
        'diskon'        => $data['diskon'],
        'berlaku_hingga'=> $data['berlaku_hingga'],
        'issued_at'     => $data['issued_at'] ?? '-',
    ]
]);