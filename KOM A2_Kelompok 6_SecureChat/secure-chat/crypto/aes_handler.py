"""
=============================================================
 SecureChat — AES Encryption Module
=============================================================
"""

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os, base64, json

class MessageEncryptor:
    def __init__(self, session_key: bytes = None):
        if session_key is None:
            print("[AES] Mock key aktif. Ganti dengan session key dari DHSession saat integrasi.")
            session_key = os.urandom(32)
        self.key = session_key
        self.aesgcm = AESGCM(self.key)

    def update_key(self, new_key: bytes):
        self.key = new_key
        self.aesgcm = AESGCM(self.key)

    def encrypt(self, plaintext: str) -> dict:
        iv = os.urandom(12)
        ciphertext_with_tag = self.aesgcm.encrypt(iv, plaintext.encode('utf-8'), None)
        ciphertext = ciphertext_with_tag[:-16]
        tag = ciphertext_with_tag[-16:]
        return {
            "iv": base64.b64encode(iv).decode(),
            "ciphertext": base64.b64encode(ciphertext).decode(),
            "tag": base64.b64encode(tag).decode()
        }

    def decrypt(self, encrypted: dict) -> str:
        iv         = base64.b64decode(encrypted["iv"])
        ciphertext = base64.b64decode(encrypted["ciphertext"])
        tag        = base64.b64decode(encrypted["tag"])
        try:
            return self.aesgcm.decrypt(iv, ciphertext + tag, None).decode('utf-8')
        except Exception:
            raise ValueError("❌ Decryption failed: pesan ditamper atau key salah.")

if __name__ == "__main__":
    print("=" * 50)
    print("   TEST: AES-GCM Encrypt & Decrypt")
    print("=" * 50)

    key = os.urandom(32)
    encryptor = MessageEncryptor(key)
    msg = "Halo ini pesan rahasia"
    print(f"[TEST] Plaintext: {msg}")
    
    enc = encryptor.encrypt(msg)
    print(f"[TEST] Encrypted (base64): {enc['ciphertext']}")
    
    dec = encryptor.decrypt(enc)
    print(f"[TEST] Decrypted: {dec}")
    
    assert dec == msg, "GAGAL: Dekripsi tidak sama!"
    print("AES-GCM berhasil!")
