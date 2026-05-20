<?php
// =============================================================
// admin/proses_buat.php — Backend: Enkripsi + Generate QR Code
// =============================================================
// Dipanggil oleh admin/index.php via AJAX (POST)
// Menerima data kupon + kunci, mengenkripsi, membuat QR Code,
// menyimpan ke database, mengembalikan JSON.
// =============================================================

header('Content-Type: application/json');

// Hanya terima POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed.']);
    exit;
}

// ── Load dependencies ────────────────────────────────────────
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/crypto.php';

// Library QR Code: phpqrcode (letakkan di /vendor/phpqrcode/qrlib.php)
// Download: https://sourceforge.net/projects/phpqrcode/
$qrLibPath = __DIR__ . '/../vendor/phpqrcode/qrlib.php';
if (!file_exists($qrLibPath)) {
    echo json_encode([
        'status'  => 'error',
        'message' => 'Library QR Code tidak ditemukan. Letakkan phpqrcode di /vendor/phpqrcode/qrlib.php'
    ]);
    exit;
}
require_once $qrLibPath;

// ── Ambil & sanitasi input ───────────────────────────────────
$kode_kupon    = trim(strip_tags($_POST['kode_kupon']    ?? ''));
$nama_produk   = trim(strip_tags($_POST['nama_produk']   ?? ''));
$diskon        = trim(strip_tags($_POST['diskon']         ?? ''));
$berlaku_hingga = trim($_POST['berlaku_hingga']           ?? '');
$enc_key       = $_POST['enc_key']                        ?? '';

// ── Validasi ─────────────────────────────────────────────────
$errors = [];

if (empty($kode_kupon))     $errors[] = 'Kode kupon wajib diisi.';
if (empty($nama_produk))    $errors[] = 'Nama produk wajib diisi.';
if (empty($diskon))         $errors[] = 'Diskon wajib diisi.';
if (empty($berlaku_hingga)) $errors[] = 'Tanggal berlaku wajib diisi.';
if (strlen($enc_key) < 8)  $errors[] = 'Kunci minimal 8 karakter.';

// Validasi format tanggal
if (!empty($berlaku_hingga) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $berlaku_hingga)) {
    $errors[] = 'Format tanggal tidak valid.';
}

// Validasi kode unik
if (empty($errors)) {
    $stmt = $conn->prepare('SELECT id FROM kupon WHERE kode_kupon = ?');
    $stmt->bind_param('s', $kode_kupon);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        $errors[] = "Kode kupon '{$kode_kupon}' sudah ada. Gunakan kode lain.";
    }
    $stmt->close();
}

if (!empty($errors)) {
    echo json_encode(['status' => 'error', 'message' => implode(' ', $errors)]);
    exit;
}

// ── Susun plaintext JSON yang akan dienkripsi ────────────────
//
// Plaintext berisi semua informasi kupon dalam format JSON.
// Format JSON dipilih agar mudah diparse saat dekripsi.
// Field 'hash' berfungsi sebagai checksum integritas data.
//
$plaintext_data = [
    'kode_kupon'    => $kode_kupon,
    'nama_produk'   => $nama_produk,
    'diskon'        => $diskon,
    'berlaku_hingga'=> $berlaku_hingga,
    'issued_at'     => date('Y-m-d H:i:s'),
    // HMAC-SHA256 sebagai checksum integritas — memastikan data tidak dimanipulasi
    'hash'          => hash_hmac('sha256', $kode_kupon . $nama_produk . $diskon . $berlaku_hingga, $enc_key)
];

$plaintext = json_encode($plaintext_data, JSON_UNESCAPED_UNICODE);

// ── Enkripsi dengan AES-256-CBC ──────────────────────────────
$ciphertext = encrypt($plaintext, $enc_key);

if ($ciphertext === false) {
    echo json_encode(['status' => 'error', 'message' => 'Enkripsi gagal. Periksa ekstensi OpenSSL PHP.']);
    exit;
}

// ── Generate QR Code ─────────────────────────────────────────
//
// Yang di-encode ke dalam QR Code adalah CIPHERTEXT (bukan plaintext).
// Sehingga meski QR di-scan dengan aplikasi biasa, hasilnya hanya
// serangkaian karakter acak yang tidak bisa dipahami.
//
$qrDir      = __DIR__ . '/../qrcodes/';
if (!is_dir($qrDir)) {
    mkdir($qrDir, 0755, true);
}
$qrFilename = 'qr_' . preg_replace('/[^a-zA-Z0-9_-]/', '', $kode_kupon) . '_' . time() . '.png';
$qrFullPath = $qrDir . $qrFilename;
$qrWebPath  = '../qrcodes/' . $qrFilename;  // path relatif untuk web

// Pastikan folder ada dan writable
if (!is_dir($qrDir)) {
    mkdir($qrDir, 0755, true);
}

// QRcode::png($data, $file, $level, $size, $margin)
// Level L=7%, M=15%, Q=25%, H=30% error correction
QRcode::png($ciphertext, $qrFullPath, QR_ECLEVEL_M, 8, 2);

if (!file_exists($qrFullPath)) {
    echo json_encode(['status' => 'error', 'message' => 'Gagal membuat file QR Code.']);
    exit;
}

// ── Simpan ke Database ───────────────────────────────────────
$stmt = $conn->prepare(
    'INSERT INTO kupon (kode_kupon, nama_produk, diskon, berlaku_hingga, ciphertext, qr_path)
     VALUES (?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param('ssssss',
    $kode_kupon,
    $nama_produk,
    $diskon,
    $berlaku_hingga,
    $ciphertext,
    $qrFilename
);

if (!$stmt->execute()) {
    // Rollback: hapus file QR jika DB gagal
    @unlink($qrFullPath);
    echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan ke database: ' . $conn->error]);
    exit;
}

$stmt->close();
$conn->close();

// ── Response sukses ──────────────────────────────────────────
echo json_encode([
    'status'     => 'success',
    'message'    => 'Kupon berhasil dibuat.',
    'kode_kupon' => $kode_kupon,
    'qr_path'    => $qrWebPath,
    'ciphertext' => $ciphertext,
]);