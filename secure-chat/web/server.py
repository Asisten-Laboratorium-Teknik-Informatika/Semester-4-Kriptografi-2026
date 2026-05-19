import eventlet
eventlet.monkey_patch()

import os
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'central_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*")

DB_FILE = 'central_auth.db'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL
                 )''')
    conn.commit()
    conn.close()

init_db()

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400
        
    pw_hash = generate_password_hash(password)
    
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, pw_hash))
        conn.commit()
        conn.close()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 409

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()
    
    if row and check_password_hash(row[0], password):
        return jsonify({"message": "Login successful", "username": username}), 200
    return jsonify({"error": "Invalid credentials"}), 401

# --- SOCKET.IO P2P RELAY ---
clients = {} # sid -> username
usernames = {} # username -> sid

@socketio.on('connect')
def handle_connect():
    print(f"[CENTRAL] Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in clients:
        username = clients.pop(request.sid)
        if username in usernames:
            del usernames[username]
        print(f"[CENTRAL] {username} disconnected.")
        emit('user_offline', {'username': username}, broadcast=True)

@socketio.on('register_socket')
def handle_register(data):
    username = data.get('username')
    clients[request.sid] = username
    usernames[username] = request.sid
    print(f"[CENTRAL] Socket registered for user: {username}")
    
    # Beritahu user yang ada bahwa user ini online
    emit('user_online', {'username': username}, broadcast=True)

@socketio.on('handshake')
def handle_handshake(data):
    """Meneruskan pesan handshake ke target (atau broadcast)"""
    print(f"[CENTRAL] Menerima handshake dari {data.get('username')}...")
    # Dalam skenario simple p2p (2 orang), kita broadcast ke semua kecuali sender
    emit('handshake', data, broadcast=True, include_self=False)

@socketio.on('chat_message')
def handle_chat_message(data):
    """Meneruskan paket ciphertext ke semua klien lain"""
    sender = data.get('sender')
    encrypted_payload = data.get('data')
    print(f"\n[CENTRAL] Menerima pesan dari {sender}")
    print(f"[CENTRAL] ---> BENTUK ASLI (ENKRIPSI): {encrypted_payload}")
    print(f"[CENTRAL] Meneruskan pesan terenkripsi ke jaringan...\n")
    emit('chat_message', data, broadcast=True, include_self=False)

if __name__ == '__main__':
    print("[CENTRAL] Starting Central Server on port 9999...")
    socketio.run(app, host='0.0.0.0', port=9999)
