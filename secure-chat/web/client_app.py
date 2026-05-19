import eventlet
eventlet.monkey_patch()

import sys
import os
import json
import socketio as client_socketio
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
import requests

# Supaya bisa import modul crypto
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from crypto.dh import DHSession
from crypto.aes_handler import MessageEncryptor
from crypto.signature import SignatureHandler

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['SECRET_KEY'] = 'local_client_secret'
# SocketIO untuk hubungan Browser <-> Local Server
local_sio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# SocketIO Client untuk hubungan Local Server <-> Central Server
sio_client = client_socketio.Client()

# Central server URL
CENTRAL_URL = "http://127.0.0.1:9999"

# Status Kripto User
class ClientState:
    def __init__(self):
        self.username = None
        self.dh = DHSession()
        self.dh.generate_parameters()
        self.dh.generate_keypair()
        self.aes = None
        self.sig = None
        self.peer_public_keys = {} # key: sender_username, value: { 'dh': pk, 'rsa': pk }

state = ClientState()

@app.route('/')
def index():
    return render_template('login.html')

@app.route('/chat')
def chat():
    if not state.username:
        return "<script>window.location.href='/';</script>"
    return render_template('chat.html', username=state.username)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    res = requests.post(f"{CENTRAL_URL}/api/login", json=data)
    if res.status_code == 200:
        state.username = data['username']
        state.sig = SignatureHandler(state.username)
        # Konek ke central via sio_client
        if not sio_client.connected:
            sio_client.connect(CENTRAL_URL)
            sio_client.emit('register_socket', {'username': state.username})
        return jsonify(res.json()), 200
    return jsonify(res.json()), res.status_code

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    res = requests.post(f"{CENTRAL_URL}/api/register", json=data)
    return jsonify(res.json()), res.status_code


# ==========================================
# KOMUNIKASI CENTRAL SERVER -> LOCAL SERVER
# ==========================================
@sio_client.on('handshake')
def on_handshake(data):
    sender = data.get('username')
    if sender == state.username:
        return
        
    print(f"\n[CRYPTO] Menerima public key dari {sender}")
    local_sio.emit('crypto_log', {'type': 'handshake', 'msg': f'Menerima public key dari {sender}'})
    state.peer_public_keys[sender] = {
        'dh': data.get('dh_public_key'),
        'rsa': data.get('rsa_public_key')
    }
    
    # Hitung session key menggunakan DH public key teman
    peer_dh_bytes = bytes.fromhex(data.get('dh_public_key'))
    session_key = state.dh.compute_session_key(peer_dh_bytes)
    # Inisialisasi AES dengan session key ini
    state.aes = MessageEncryptor(session_key)
    print(f"[CRYPTO] Session key AES berhasil dihitung (32 bytes).")
    local_sio.emit('crypto_log', {'type': 'verify', 'msg': 'Session key AES-GCM (32 bytes) berhasil disepakati.'})
    
    # Kirim ke UI untuk menampilkan info bahwa aman
    local_sio.emit('system_message', {'msg': f"Terhubung secara aman (E2E) dengan {sender}."})
    
    # Jika kita yang menerima, kita harus kirim balik public key kita (balas handshake)
    # Gunakan flag is_reply agar tidak infinite loop
    if not data.get('is_reply'):
        reply_data = {
            'username': state.username,
            'dh_public_key': state.dh.get_public_key_bytes().hex(),
            'rsa_public_key': state.sig.get_public_pem(),
            'is_reply': True
        }
        sio_client.emit('handshake', reply_data)


@sio_client.on('chat_message')
def on_chat_message(data):
    sender = data.get('sender')
    if sender == state.username:
        return
        
    encrypted_data = data.get('data')
    if not state.aes:
        print("[ERROR] Menerima pesan tapi session key belum diset!")
        return
        
    # Dekripsi
    local_sio.emit('crypto_log', {'type': 'decrypt', 'msg': f'Mendekripsi AES-GCM pesan dari {sender}...'})
    try:
        decrypted_json = state.aes.decrypt(encrypted_data)
        packet = json.loads(decrypted_json)
        
        message_text = packet['message']
        
        # Verifikasi signature RSA
        result = state.sig.verify(packet)
        is_valid = result['valid']
        
        if is_valid:
            print(f"[CRYPTO] Pesan dari {sender} terverifikasi dan didekripsi sukses.")
            local_sio.emit('crypto_log', {'type': 'verify', 'msg': f'Signature RSA dari {sender} valid.'})
            # Kirim ke UI
            local_sio.emit('new_message', {
                'sender': sender,
                'message': message_text,
                'is_verified': True
            })
        else:
            print(f"[CRYPTO-ALERT] Pesan dari {sender} gagal diverifikasi (Kemungkinan dipalsukan!).")
            local_sio.emit('crypto_log', {'type': 'error', 'msg': f'Signature RSA TIDAK VALID!'})
            local_sio.emit('new_message', {
                'sender': sender,
                'message': "[PESAN TIDAK VALID - GAGAL VERIFIKASI RSA]",
                'is_verified': False
            })
            
    except Exception as e:
        print(f"[CRYPTO-ALERT] Gagal mendekripsi pesan dari {sender}. Data mungkin diubah (AES-GCM gagal). Error: {e}")
        local_sio.emit('crypto_log', {'type': 'error', 'msg': f'Gagal mendekripsi: Authentication tag tidak valid!'})


@sio_client.on('user_online')
def on_user_online(data):
    user = data.get('username')
    if user != state.username:
        local_sio.emit('system_message', {'msg': f"{user} baru saja online."})


# ==========================================
# KOMUNIKASI BROWSER UI -> LOCAL SERVER
# ==========================================
@local_sio.on('initiate_handshake')
def on_local_initiate_handshake():
    """Browser meminta untuk memulai E2E handshake"""
    if not state.username: return
    data = {
        'username': state.username,
        'dh_public_key': state.dh.get_public_key_bytes().hex(),
        'rsa_public_key': state.sig.get_public_pem(),
        'is_reply': False
    }
    sio_client.emit('handshake', data)
    print("[CRYPTO] Mengirim permintaan Handshake ke Central Server...")
    local_sio.emit('crypto_log', {'type': 'handshake', 'msg': 'Mengirim public key (DH & RSA) ke jaringan...'})

@local_sio.on('send_message')
def on_local_send_message(data):
    """Browser mengirim teks biasa, Python mengenkripsinya"""
    message_text = data.get('message')
    if not message_text or not state.aes:
        return
        
    print(f"[CRYPTO] Menyiapkan pengiriman pesan: {message_text}")
    local_sio.emit('crypto_log', {'type': 'encrypt', 'msg': 'Menandatangani (RSA) & mengenkripsi (AES-GCM) pesan...'})
    # 1. Sign
    packet = state.sig.sign(message_text)
    # 2. Bundle
    payload = json.dumps(packet)
    # 3. Encrypt
    encrypted = state.aes.encrypt(payload)
    
    # 4. Kirim ke central
    network_payload = {
        "sender": state.username,
        "data": encrypted
    }
    sio_client.emit('chat_message', network_payload)

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5000
    print(f"[LOCAL CLIENT] Starting local client server for Web UI on port {port}...")
    local_sio.run(app, host='127.0.0.1', port=port, debug=False)
