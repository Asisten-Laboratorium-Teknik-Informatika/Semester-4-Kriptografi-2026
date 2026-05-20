import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'diary.db')

def get_connection():
    return sqlite3.connect(DB_PATH)

def init_db():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                date TEXT NOT NULL,
                mood TEXT DEFAULT '',
                encrypted INTEGER DEFAULT 1
            )
        """)
        conn.commit()
    finally:
        conn.close()


def get_password_hash(username: str):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
        row = cur.fetchone()
        return row[0] if row else None
    finally:
        conn.close()


def save_password_hash(username: str, hashed: str):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users WHERE username = ?", (username,))
        count = cur.fetchone()[0]
        if count == 0:
            cur.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, hashed))
        else:
            cur.execute("UPDATE users SET password_hash = ? WHERE username = ?", (hashed, username))
        conn.commit()
    finally:
        conn.close()


def load_entries(username: str) -> list:
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, title, content, date, mood, encrypted FROM entries WHERE username = ? ORDER BY date DESC", (username,))
        rows = cur.fetchall()
        result = []
        for row in rows:
            result.append({
                'id':        row[0],
                'title':     row[1],
                'content':   row[2],
                'date':      row[3],
                'mood':      row[4] or '',
                'encrypted': bool(row[5])
            })
        return result
    finally:
        conn.close()


def insert_entry(entry: dict):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO entries (id, username, title, content, date, mood, encrypted) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (entry['id'], entry['username'], entry['title'], entry['content'], entry['date'],
             entry.get('mood', ''), 1 if entry.get('encrypted', True) else 0)
        )
        conn.commit()
    finally:
        conn.close()


def update_entry(entry: dict):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE entries SET title=?, content=?, mood=?, encrypted=? WHERE id=?",
            (entry['title'], entry['content'], entry.get('mood', ''),
             1 if entry.get('encrypted', True) else 0, entry['id'])
        )
        conn.commit()
    finally:
        conn.close()


def delete_entry(entry_id: int):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM entries WHERE id=?", (entry_id,))
        conn.commit()
    finally:
        conn.close()

if __name__ == "__main__":
    import tempfile
    _orig = DB_PATH
    DB_PATH_TEST = os.path.join(tempfile.gettempdir(), 'test_diary.db')

    import database
    database.DB_PATH = DB_PATH_TEST

    if os.path.exists(DB_PATH_TEST):
        os.remove(DB_PATH_TEST)

    print("Testing database.py...")
    init_db()
    print("  ✓ init_db() berhasil")

    assert get_password_hash() is None
    save_password_hash("abc123hash")
    assert get_password_hash() == "abc123hash"
    save_password_hash("updated_hash")
    assert get_password_hash() == "updated_hash"
    print("  ✓ password hash CRUD berhasil")

    import time
    test_entry = {
        'id': int(time.time() * 1000),
        'title': 'ENCRYPTED_TITLE',
        'content': 'ENCRYPTED_CONTENT',
        'date': '2025-05-17',
        'mood': '😊',
        'encrypted': True
    }
    insert_entry(test_entry)
    entries = load_entries()
    assert len(entries) == 1
    assert entries[0]['title'] == 'ENCRYPTED_TITLE'
    assert entries[0]['encrypted'] is True
    print("  ✓ insert_entry & load_entries berhasil")

    test_entry['title'] = 'UPDATED_TITLE'
    update_entry(test_entry)
    entries = load_entries()
    assert entries[0]['title'] == 'UPDATED_TITLE'
    print("  ✓ update_entry berhasil")

    delete_entry(test_entry['id'])
    entries = load_entries()
    assert len(entries) == 0
    print("  ✓ delete_entry berhasil")

    os.remove(DB_PATH_TEST)
    print("\n  Semua test database selesai.")
