import hashlib
from database import get_password_hash, save_password_hash


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def is_user_exists(username: str) -> bool:
    return get_password_hash(username) is not None


def register(username: str, password: str, confirm: str) -> tuple:
    if not username.strip():
        return (False, "Username tidak boleh kosong!")
    if is_user_exists(username):
        return (False, "Username sudah digunakan!")
    if not password.strip():
        return (False, "Password tidak boleh kosong!")

    alpha_count = sum(1 for c in password if c.isalpha())
    if alpha_count < 3:
        return (False, "Password minimal mengandung 3 huruf alfabet!")

    if password != confirm:
        return (False, "Password dan konfirmasi tidak cocok!")

    hashed = hash_password(password)
    save_password_hash(username, hashed)
    return (True, "Akun berhasil dibuat! Silakan masuk.")


def login(username: str, password: str) -> tuple:
    if not username.strip() or not password.strip():
        return (False, "Username dan password tidak boleh kosong!")

    stored_hash = get_password_hash(username)
    if stored_hash is None:
        return (False, "Username tidak ditemukan.")

    hashed = hash_password(password)
    if hashed == stored_hash:
        return (True, username)
    else:
        return (False, "Password salah!")

if __name__ == "__main__":
    import os
    import tempfile
    import database

    test_db = os.path.join(tempfile.gettempdir(), 'test_auth.db')
    if os.path.exists(test_db):
        os.remove(test_db)
    database.DB_PATH = test_db
    database.init_db()

    print("Testing auth.py...")

    assert not is_registered()
    result = login("test")
    assert result[0] is False
    print("  ✓ Login sebelum register ditolak")

    ok, msg = register("", "")
    assert ok is False
    ok, msg = register("ab", "ab")
    assert ok is False  
    ok, msg = register("secret", "wrong")
    assert ok is False
    ok, msg = register("secret", "secret")
    assert ok is True
    print("  ✓ Register berhasil")

    assert is_registered()
    ok, key = login("wrong")
    assert ok is False
    ok, key = login("secret")
    assert ok is True and key == "secret"
    print("  ✓ Login berhasil")

    os.remove(test_db)
    print("\n  Semua test auth selesai.")
