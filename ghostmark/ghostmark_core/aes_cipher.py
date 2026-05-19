import base64
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes


def make_key(key: str) -> bytes:
    return hashlib.md5(key.encode()).digest()


def encrypt_message(message: str, key: str) -> str:
    key_bytes = make_key(key)
    iv = get_random_bytes(16)
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv)
    padded = pad(message.encode('utf-8'), AES.block_size)
    ciphertext = cipher.encrypt(padded)
    result = base64.b64encode(iv + ciphertext).decode('utf-8')
    return result


def decrypt_message(encrypted_b64: str, key: str) -> str:
    key_bytes = make_key(key)
    raw = base64.b64decode(encrypted_b64)
    iv = raw[:16]
    ciphertext = raw[16:]
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv)
    decrypted = unpad(cipher.decrypt(ciphertext), AES.block_size)
    return decrypted.decode('utf-8')
