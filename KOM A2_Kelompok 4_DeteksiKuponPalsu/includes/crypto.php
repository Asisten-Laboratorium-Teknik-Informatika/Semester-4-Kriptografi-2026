<?php
// =============================================================
// includes/crypto.php — Logika Enkripsi & Dekripsi (AES-256-CBC)
// =============================================================
//
// Algoritma : AES-256-CBC (Advanced Encryption Standard)
// Key       : Diinput oleh Admin, 256-bit (32 byte) via PBKDF2
// IV        : Random 16 byte, disimpan bersama ciphertext (prepend)
// Format    : base64( IV + ciphertext )
// =============================================================

define('CIPHER_ALGO',   'AES-256-CBC');
define('HASH_ALGO',     'sha256');
define('PBKDF2_ITER',   100000);          // iterasi PBKDF2
define('KEY_LENGTH',    32);              // 256-bit
define('SALT',          'KriptoLab2025'); // Salt tetap (bisa diubah)

/**
 * Derive 256-bit key dari passphrase menggunakan PBKDF2-SHA256.
 * Ini memastikan key pendek pun tetap aman.
 *
 * @param  string $passphrase  Key/password dari pengguna
 * @return string              Binary key 32 byte
 */
function deriveKey(string $passphrase): string
{
    return hash_pbkdf2(
        HASH_ALGO,
        $passphrase,
        SALT,
        PBKDF2_ITER,
        KEY_LENGTH,
        true   // raw binary output
    );
}

/**
 * Enkripsi plaintext menggunakan AES-256-CBC.
 *
 * Proses:
 * 1. Derive key 256-bit dari passphrase via PBKDF2
 * 2. Generate IV random 16 byte
 * 3. Enkripsi dengan openssl_encrypt (padding PKCS#7 otomatis)
 * 4. Prepend IV ke ciphertext → encode base64
 *
 * @param  string $plaintext   Teks asli yang akan dienkripsi
 * @param  string $passphrase  Kunci rahasia dari Admin
 * @return string|false        Ciphertext (base64) atau false jika gagal
 */
function encrypt(string $plaintext, string $passphrase)
{
    $key = deriveKey($passphrase);
    $iv  = random_bytes(openssl_cipher_iv_length(CIPHER_ALGO)); // 16 byte

    $encrypted = openssl_encrypt(
        $plaintext,
        CIPHER_ALGO,
        $key,
        OPENSSL_RAW_DATA,  // output binary, bukan base64
        $iv
    );

    if ($encrypted === false) {
        return false;
    }

    // Format akhir: base64( IV || ciphertext )
    return base64_encode($iv . $encrypted);
}

/**
 * Dekripsi ciphertext menggunakan AES-256-CBC.
 *
 * Proses:
 * 1. Decode base64
 * 2. Pisahkan IV (16 byte pertama) dan ciphertext (sisanya)
 * 3. Derive key yang sama dari passphrase
 * 4. Dekripsi → kembalikan plaintext
 *
 * @param  string $ciphertext  Ciphertext base64 dari database
 * @param  string $passphrase  Kunci dekripsi yang dimasukkan Kasir
 * @return string|false        Plaintext atau false jika kunci salah/data rusak
 */
function decrypt(string $ciphertext, string $passphrase)
{
    $decoded = base64_decode($ciphertext, true);
    if ($decoded === false) {
        return false;
    }

    $ivLength  = openssl_cipher_iv_length(CIPHER_ALGO); // 16 byte
    $iv        = substr($decoded, 0, $ivLength);
    $encrypted = substr($decoded, $ivLength);

    $key = deriveKey($passphrase);

    $plaintext = openssl_decrypt(
        $encrypted,
        CIPHER_ALGO,
        $key,
        OPENSSL_RAW_DATA,
        $iv
    );

    // openssl_decrypt mengembalikan false jika key salah
    return $plaintext;
}

/**
 * Verifikasi apakah sebuah ciphertext bisa di-dekripsi dengan passphrase
 * dan hasilnya mengandung data kupon yang valid (JSON).
 *
 * @param  string $ciphertext
 * @param  string $passphrase
 * @return array|false  Array data kupon atau false jika tidak valid
 */
function verifyAndDecrypt(string $ciphertext, string $passphrase)
{
    $plaintext = decrypt($ciphertext, $passphrase);

    if ($plaintext === false || $plaintext === '') {
        return false;
    }

    $data = json_decode($plaintext, true);

    // Pastikan hasil decode adalah array JSON kupon yang valid
    if (!is_array($data) || !isset($data['kode_kupon'])) {
        return false;
    }

    return $data;
}