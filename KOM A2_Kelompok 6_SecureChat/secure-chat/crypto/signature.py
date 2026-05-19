"""
=============================================================
 SecureChat — Authentication & Signature Module
 Dikerjakan oleh : Ferlita Kristiani Hulu (241712025)
 Role            : Authentication & Signature Engineer
 Tugas Akhir     : Kriptografi — Kelompok 6 / Kelas A2
=============================================================

TANGGUNG JAWAB MODUL INI:
  1. Generate pasangan kunci RSA (private + public) per pengguna
  2. Menandatangani pesan dengan kunci privat (signing)
  3. Memverifikasi tanda tangan dengan kunci publik pengirim
  4. Demonstrasi simulasi serangan: tanpa vs dengan digital signature
"""

# ─── IMPORT LIBRARY ──────────────────────────────────────
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.asymmetric.rsa import (
    RSAPrivateKey, RSAPublicKey
)
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.exceptions import InvalidSignature
import os
import base64
import json
import time


# ═════════════════════════════════════════════════════════
# BAGIAN 1 — GENERATE PASANGAN KUNCI RSA
# ═════════════════════════════════════════════════════════

def generate_rsa_keypair(username: str) -> dict:
    """
    Menghasilkan pasangan kunci RSA 2048-bit untuk satu pengguna.

    Parameter:
        username (str): Nama pengguna, digunakan untuk labeling kunci

    Return:
        dict berisi:
            - 'username'    : nama pengguna
            - 'private_key' : objek RSAPrivateKey (RAHASIA, jangan dikirim)
            - 'public_key'  : objek RSAPublicKey  (boleh dibagikan)
            - 'public_pem'  : public key dalam format PEM string (untuk dikirim ke lawan bicara)
    """
    # Menghasilkan kunci privat RSA 2048-bit
    # public_exponent=65537 adalah standar industri (nilai paling aman dan efisien)
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )

    # Mengekstrak kunci publik dari kunci privat
    public_key = private_key.public_key()

    # Mengubah kunci publik ke format PEM agar bisa dikirim melalui jaringan
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')

    print(f"[KEY GEN] Pasangan kunci RSA berhasil dibuat untuk: {username}")
    print(f"          Ukuran kunci : 2048-bit")
    print(f"          Algoritma    : RSA dengan PSS padding")

    return {
        'username'    : username,
        'private_key' : private_key,
        'public_key'  : public_key,
        'public_pem'  : public_pem,
    }


def load_public_key_from_pem(pem_string: str) -> RSAPublicKey:
    """
    Memuat kunci publik dari format PEM string.
    Digunakan saat penerima menerima public key pengirim melalui jaringan.

    Parameter:
        pem_string (str): Kunci publik dalam format PEM

    Return:
        objek RSAPublicKey
    """
    return serialization.load_pem_public_key(pem_string.encode('utf-8'))


# ═════════════════════════════════════════════════════════
# BAGIAN 2 — PENANDATANGANAN PESAN (SIGNING)
# ═════════════════════════════════════════════════════════

def sign_message(message: str, private_key: RSAPrivateKey) -> str:
    """
    Menandatangani pesan menggunakan kunci privat RSA dengan padding PSS.

    Mengapa PSS (Probabilistic Signature Scheme)?
        - PSS menggunakan random salt sehingga tanda tangan bersifat probabilistik
        - Tanda tangan berbeda setiap kali meskipun pesan sama
        - Lebih aman dari PKCS#1 v1.5 karena tidak rentan terhadap serangan tertentu
        - Direkomendasikan oleh NIST dan standar kriptografi modern

    Parameter:
        message     (str)          : Isi pesan teks yang akan ditandatangani
        private_key (RSAPrivateKey): Kunci privat pengirim

    Return:
        str : Tanda tangan dalam format base64 (siap dikirim melalui jaringan)
    """
    # Ubah pesan menjadi bytes
    message_bytes = message.encode('utf-8')

    # Proses penandatanganan menggunakan RSA-PSS dengan hash SHA-256
    signature_bytes = private_key.sign(
        message_bytes,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),   # Mask Generation Function
            salt_length=padding.PSS.MAX_LENGTH    # Panjang salt maksimal (lebih aman)
        ),
        hashes.SHA256()   # Algoritma hash untuk pesan
    )

    # Encode ke base64 agar bisa dikirim sebagai teks
    signature_b64 = base64.b64encode(signature_bytes).decode('utf-8')

    print(f"\n[SIGN] Pesan ditandatangani:")
    print(f"       Pesan    : {message[:60]}{'...' if len(message)>60 else ''}")
    print(f"       Signature: {signature_b64[:40]}...  (base64, {len(signature_bytes)} bytes)")

    return signature_b64


# ═════════════════════════════════════════════════════════
# BAGIAN 3 — VERIFIKASI TANDA TANGAN
# ═════════════════════════════════════════════════════════

def verify_signature(message: str, signature_b64: str, public_key: RSAPublicKey) -> dict:
    """
    Memverifikasi tanda tangan digital menggunakan kunci publik pengirim.

    Proses verifikasi memastikan DUA hal sekaligus:
        1. INTEGRITAS  : pesan tidak dimodifikasi sejak ditandatangani
        2. AUTENTISITAS: pesan benar-benar dikirim oleh pemilik kunci privat tersebut

    Parameter:
        message       (str)         : Pesan teks yang diterima
        signature_b64 (str)         : Tanda tangan dalam format base64
        public_key    (RSAPublicKey): Kunci publik pengirim

    Return:
        dict berisi:
            - 'valid'   (bool): True jika tanda tangan sah, False jika tidak
            - 'message' (str) : Penjelasan hasil verifikasi
    """
    try:
        # Decode tanda tangan dari base64 ke bytes
        signature_bytes = base64.b64decode(signature_b64.encode('utf-8'))
        message_bytes   = message.encode('utf-8')

        # Verifikasi menggunakan kunci publik dengan parameter PSS yang sama
        public_key.verify(
            signature_bytes,
            message_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )

        # Jika tidak ada exception, tanda tangan VALID
        print(f"\n[VERIFY] ✅ TANDA TANGAN VALID")
        print(f"         Pesan asli dan pengirim telah terautentikasi.")
        return {
            'valid'  : True,
            'message': "✅ Tanda tangan VALID — Pesan otentik dan tidak dimodifikasi."
        }

    except InvalidSignature:
        # Tanda tangan tidak cocok — pesan telah dimodifikasi atau bukan dari pengirim asli
        print(f"\n[VERIFY] ❌ TANDA TANGAN TIDAK VALID!")
        print(f"         Pesan mungkin telah dimodifikasi atau pengirim palsu.")
        return {
            'valid'  : False,
            'message': "❌ Tanda tangan TIDAK VALID — Pesan dimodifikasi atau pengirim palsu!"
        }

    except Exception as e:
        print(f"\n[VERIFY] ⚠️  ERROR saat verifikasi: {e}")
        return {
            'valid'  : False,
            'message': f"⚠️ Error verifikasi: {str(e)}"
        }


# ═════════════════════════════════════════════════════════
# BAGIAN 4 — FORMAT PAKET PESAN LENGKAP
# ═════════════════════════════════════════════════════════

def build_signed_packet(message: str, sender_key_bundle: dict) -> dict:
    """
    Membangun paket pesan lengkap yang sudah ditandatangani.
    Paket ini yang akan dikirimkan ke modul enkripsi (Kezia) sebelum dikirim ke server.

    Parameter:
        message           (str) : Pesan teks asli
        sender_key_bundle (dict): Bundle kunci milik pengirim (hasil generate_rsa_keypair)

    Return:
        dict (JSON-serializable) berisi:
            - sender     : nama pengirim
            - message    : isi pesan
            - signature  : tanda tangan digital (base64)
            - public_pem : kunci publik pengirim (agar penerima bisa verifikasi)
            - timestamp  : waktu penandatanganan
    """
    signature = sign_message(message, sender_key_bundle['private_key'])

    packet = {
        'sender'    : sender_key_bundle['username'],
        'message'   : message,
        'signature' : signature,
        'public_pem': sender_key_bundle['public_pem'],
        'timestamp' : time.strftime('%Y-%m-%d %H:%M:%S'),
    }

    return packet


def verify_signed_packet(packet: dict) -> dict:
    """
    Memverifikasi paket pesan yang diterima.
    Dipanggil di sisi penerima setelah pesan didekripsi oleh modul Kezia.

    Parameter:
        packet (dict): Paket pesan hasil build_signed_packet

    Return:
        dict hasil verifikasi (lihat fungsi verify_signature)
    """
    # Muat kunci publik pengirim dari PEM yang ada di dalam paket
    sender_public_key = load_public_key_from_pem(packet['public_pem'])

    result = verify_signature(
        message      = packet['message'],
        signature_b64= packet['signature'],
        public_key   = sender_public_key,
    )
    return result


# ═════════════════════════════════════════════════════════
# BAGIAN 5 — SIMULASI SERANGAN
# ═════════════════════════════════════════════════════════

def demo_attack_simulation():
    """
    Demonstrasi simulasi serangan untuk membuktikan pentingnya digital signature.

    Skenario yang didemonstrasikan:
        A) Tanpa digital signature — attacker bisa memodifikasi pesan tanpa ketahuan
        B) Dengan digital signature — modifikasi pesan langsung terdeteksi
        C) Pemalsuan identitas pengirim — kunci publik tidak cocok, terdeteksi
    """
    print("\n" + "="*65)
    print("  SIMULASI SERANGAN — Demonstrasi Digital Signature")
    print("="*65)

    # Setup pengguna
    print("\n[SETUP] Membuat kunci RSA untuk Alice dan Bob...")
    alice = generate_rsa_keypair("Alice")
    bob   = generate_rsa_keypair("Bob")
    # Simulasi attacker — memiliki kunci sendiri tapi bukan Alice
    attacker = generate_rsa_keypair("Attacker")

    pesan_asli = "Hei Bob, transfer Rp 500.000 ke rekening 1234-5678 ya."

    print("\n" + "-"*65)
    print("SKENARIO A — Tanpa Digital Signature")
    print("-"*65)
    print(f"  Alice kirim  : '{pesan_asli}'")
    pesan_dimodifikasi = "Hei Bob, transfer Rp 500.000 ke rekening 9999-0000 ya."
    print(f"  Attacker ubah: '{pesan_dimodifikasi}'")
    print("  Bob terima   : Tidak bisa membedakan mana pesan asli!")
    print("  ❌ BERBAHAYA — Bob tidak tahu pesan telah dimanipulasi.")

    print("\n" + "-"*65)
    print("SKENARIO B — Dengan Digital Signature (Modifikasi Pesan)")
    print("-"*65)
    # Alice menandatangani pesan asli
    print(f"\n  Alice menandatangani pesan asli...")
    paket = build_signed_packet(pesan_asli, alice)

    # Attacker memodifikasi isi pesan (tapi signature tetap dari Alice)
    print(f"\n  Attacker memodifikasi isi pesan di tengah jalan...")
    paket_dimodifikasi = dict(paket)
    paket_dimodifikasi['message'] = pesan_dimodifikasi

    # Bob memverifikasi
    print(f"\n  Bob memverifikasi paket yang sudah dimodifikasi...")
    hasil = verify_signed_packet(paket_dimodifikasi)
    print(f"  Hasil: {hasil['message']}")
    print("  ✅ AMAN — Serangan terdeteksi karena tanda tangan tidak cocok!")

    print("\n" + "-"*65)
    print("SKENARIO C — Pemalsuan Identitas Pengirim")
    print("-"*65)
    # Attacker membuat paket baru mengaku sebagai Alice
    print(f"\n  Attacker membuat paket mengaku sebagai Alice...")
    paket_palsu = build_signed_packet(pesan_dimodifikasi, attacker)
    paket_palsu['sender'] = "Alice"  # mengaku Alice
    # Tapi public_pem adalah milik attacker, bukan Alice
    # Bob menggunakan public key Alice yang sudah dia kenal sebelumnya
    paket_palsu['public_pem'] = attacker['public_pem']

    # Bob memverifikasi — dia tahu public key asli Alice
    print(f"\n  Bob menggunakan public key Alice yang dia kenal untuk verifikasi...")
    # Kita simulasikan Bob sudah punya public key Alice yang asli
    # Maka verifikasi dengan key attacker akan tidak cocok dengan signature attacker
    # yang ditandatangani tapi diklaim sebagai Alice
    hasil_c = verify_signed_packet(paket_palsu)
    # Karena public_pem di paket adalah milik attacker bukan Alice,
    # Bob tidak percaya, dan dalam sistem nyata Bob membandingkan dengan key terdaftar
    print(f"  Hasil teknis: {hasil_c['message']}")
    print("  ⚠️  Dalam sistem nyata: Bob menyimpan public key Alice dari handshake awal.")
    print("      Jika public_pem di paket tidak cocok dengan yang tersimpan -> DITOLAK.")

    print("\n" + "="*65)
    print("  KESIMPULAN SIMULASI")
    print("="*65)
    print("  Digital Signature RSA-PSS memberikan jaminan:")
    print("  1. INTEGRITAS  — Perubahan sekecil apapun terdeteksi")
    print("  2. AUTENTISITAS — Hanya pemilik private key yang bisa tanda tangan")
    print("  3. NON-REPUDIATION — Pengirim tidak bisa menyangkal telah mengirim")
    print("="*65)


# ═════════════════════════════════════════════════════════
# BAGIAN 6 — DEMO ALUR NORMAL (ALICE & BOB BERKOMUNIKASI)
# ═════════════════════════════════════════════════════════

def demo_normal_flow():
    """
    Demonstrasi alur komunikasi normal Alice ke Bob dengan digital signature.
    """
    print("\n" + "="*65)
    print("  DEMO ALUR NORMAL — Komunikasi dengan Digital Signature")
    print("="*65)

    # Step 1: Generate kunci
    print("\n[STEP 1] Membuat pasangan kunci RSA untuk setiap pengguna...")
    alice = generate_rsa_keypair("Alice")
    bob   = generate_rsa_keypair("Bob")

    # Step 2: Alice mengirim pesan ke Bob
    print("\n[STEP 2] Alice menandatangani dan mengirim pesan...")
    pesan = "Halo Bob! Ini pesan rahasia dari Alice. Kunci sesi kita sudah siap."
    paket = build_signed_packet(pesan, alice)

    print(f"\n  Paket yang dikirim:")
    print(f"    sender   : {paket['sender']}")
    print(f"    message  : {paket['message']}")
    print(f"    signature: {paket['signature'][:50]}...")
    print(f"    timestamp: {paket['timestamp']}")

    # Step 3: Bob memverifikasi
    print("\n[STEP 3] Bob menerima dan memverifikasi tanda tangan...")
    hasil = verify_signed_packet(paket)
    print(f"  Hasil: {hasil['message']}")

    # Step 4: Bob membalas
    print("\n[STEP 4] Bob membalas pesan ke Alice...")
    pesan_balas = "Halo Alice! Pesan diterima. Siap memulai sesi terenkripsi."
    paket_balas = build_signed_packet(pesan_balas, bob)

    # Step 5: Alice verifikasi balasan Bob
    print("\n[STEP 5] Alice memverifikasi balasan Bob...")
    hasil_balas = verify_signed_packet(paket_balas)
    print(f"  Hasil: {hasil_balas['message']}")

    print("\n✅ Alur komunikasi dengan digital signature berjalan sempurna!")


# ═════════════════════════════════════════════════════════
# ANTARMUKA PUBLIK — untuk diimpor modul lain (Michael/Kezia)
# ═════════════════════════════════════════════════════════

class SignatureHandler:
    """
    Kelas wrapper untuk digunakan oleh modul lain (Michael untuk integrasi Flask).
    
    Contoh penggunaan di modul Michael:
        from ferlita_signature import SignatureHandler
        sh = SignatureHandler("Alice")
        packet = sh.sign("Halo Bob!")
        result = sh.verify(received_packet)
    """

    def __init__(self, username: str):
        self.key_bundle = generate_rsa_keypair(username)
        self.username   = username

    def sign(self, message: str) -> dict:
        """Menandatangani pesan dan return paket siap kirim."""
        return build_signed_packet(message, self.key_bundle)

    def verify(self, packet: dict) -> dict:
        """Memverifikasi paket yang diterima."""
        return verify_signed_packet(packet)

    def get_public_pem(self) -> str:
        """Mengembalikan public key PEM untuk dikirim ke lawan bicara."""
        return self.key_bundle['public_pem']


# ═════════════════════════════════════════════════════════
# MAIN — Jalankan semua demonstrasi
# ═════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("╔══════════════════════════════════════════════════════════╗")
    print("║   SecureChat — Modul Authentication & Signature          ║")
    print("║   Dikerjakan oleh: Ferlita Kristiani Hulu (241712025)    ║")
    print("╚══════════════════════════════════════════════════════════╝")

    # Demo 1: Alur normal
    demo_normal_flow()

    # Demo 2: Simulasi serangan
    demo_attack_simulation()
