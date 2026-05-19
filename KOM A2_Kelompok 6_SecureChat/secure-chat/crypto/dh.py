from cryptography.hazmat.primitives.asymmetric.dh import DHParameterNumbers
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.hazmat.backends import default_backend
import os

class DHSession:
    def __init__(self):
        self.parameters = None
        self.private_key = None
        self.public_key = None
        self.session_key = None

    def generate_parameters(self):
        print("[DH] Loading standard parameters (RFC 3526 2048-bit MODP Group)...")
        # RFC 3526 2048-bit MODP Group 14
        p = int(
            "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1"
            "29024E088A67CC74020BBEA63B139B22514A08798E3404DD"
            "EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245"
            "E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED"
            "EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D"
            "C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F"
            "83655D23DCA3AD961C62F356208552BB9ED529077096966D"
            "670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B"
            "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9"
            "DE2BCBF6955817183995497CEA956AE515D2261898FA0510"
            "15728E5A8AACAA68FFFFFFFFFFFFFFFF", 16
        )
        g = 2
        self.parameters = DHParameterNumbers(p, g).parameters(default_backend())
        print("[DH] Parameters siap!")

    def generate_keypair(self):
        self.private_key = self.parameters.generate_private_key()
        self.public_key = self.private_key.public_key()
        print("[DH] Key pair berhasil di-generate")

    def get_public_key_bytes(self) -> bytes:
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

    def compute_session_key(self, peer_public_key_bytes: bytes) -> bytes:
        peer_public_key = load_pem_public_key(peer_public_key_bytes)
        shared_secret = self.private_key.exchange(peer_public_key)
        self.session_key = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=b"e2e-chat-session",
            backend=default_backend()
        ).derive(shared_secret)
        print(f"[DH] Session key berhasil dibuat: {self.session_key.hex()[:16]}...")
        return self.session_key

    def new_session(self):
        """Key rotation — dipanggil tiap koneksi baru (Perfect Forward Secrecy)"""
        print(f"\n[DH] Sesi lama diakhiri. Key lama dihapus.")
        self.session_key = None
        self.generate_keypair()
        print(f"[DH] Key pair baru siap untuk sesi berikutnya.\n")

if __name__ == "__main__":
    print("=" * 50)
    print("   TEST: Diffie-Hellman Key Exchange")
    print("=" * 50)

    alice = DHSession()
    bob = DHSession()
    alice.generate_parameters()
    bob.parameters = alice.parameters
    print("\n[TEST] Alice generate key pair...")
    alice.generate_keypair()

    print("[TEST] Bob generate key pair...")
    bob.generate_keypair()
    print("\n[TEST] Menghitung session key...")
    key_alice = alice.compute_session_key(bob.get_public_key_bytes())
    key_bob   = bob.compute_session_key(alice.get_public_key_bytes())

    print("\n--- Hasil ---")
    print(f"Session key Alice : {key_alice.hex()[:32]}...")
    print(f"Session key Bob   : {key_bob.hex()[:32]}...")

    assert key_alice == key_bob, "GAGAL: Keys tidak sama!"
    print("\nKeys match! DH berhasil.")
    print("\n--- Test Perfect Forward Secrecy ---")
    old_key = key_alice
    alice.new_session()
    new_key_alice = alice.compute_session_key(bob.get_public_key_bytes())
    assert old_key != new_key_alice, "GAGAL: Key baru sama dengan key lama!"
    print("Key baru berbeda dari key lama. Perfect Forward Secrecy bekerja!")
    print("\n" + "=" * 50)
