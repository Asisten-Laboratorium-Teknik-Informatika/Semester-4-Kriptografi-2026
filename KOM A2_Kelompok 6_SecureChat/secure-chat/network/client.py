import socket
import threading
import json
import sys
import time

import os
import sys
# Pastikan modul crypto bisa diimpor
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from crypto.dh import DHSession
from crypto.aes_handler import MessageEncryptor
from crypto.signature import SignatureHandler

class SecureClient:
    def __init__(self, host, port, username):
        self.host = host
        self.port = port
        self.username = username
        
        self.client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        
        # Crypto modules
        self.dh = DHSession()
        self.dh.generate_parameters()
        self.dh.generate_keypair()
        
        self.signature_handler = SignatureHandler(username)
        self.encryptor = None
        
        self.peer_public_key_pem = None
        
    def connect(self):
        try:
            self.client_socket.connect((self.host, self.port))
            print(f"[CLIENT] Berhasil terhubung ke {self.host}:{self.port}")
            
            # Start receiving thread
            threading.Thread(target=self.receive_messages, daemon=True).start()
            
            # Perform Handshake
            self.send_handshake()
            
        except Exception as e:
            print(f"[CLIENT] Gagal terhubung: {e}")
            sys.exit(1)

    def send_handshake(self):
        handshake_data = {
            "type": "handshake",
            "username": self.username,
            "dh_public_key": self.dh.get_public_key_bytes().hex(),
            "rsa_public_key": self.signature_handler.get_public_pem()
        }
        self.client_socket.send(json.dumps(handshake_data).encode('utf-8'))
        print("[CLIENT] Menunggu handshake dari peer...")

    def handle_handshake(self, data):
        peer_name = data.get("username", "Unknown")
        peer_dh_pub = bytes.fromhex(data["dh_public_key"])
        
        # Hitung session key
        print(f"\n[CLIENT] Menerima handshake dari {peer_name}")
        self.dh.compute_session_key(peer_dh_pub)
        
        # Inisialisasi AES Encryptor dengan session key
        self.encryptor = MessageEncryptor(self.dh.session_key)
        print("[CLIENT] AES-GCM siap digunakan. Chat aman telah dimulai!\n")

    def receive_messages(self):
        while True:
            try:
                data = self.client_socket.recv(4096)
                if not data:
                    print("\n[CLIENT] Terputus dari server.")
                    self.client_socket.close()
                    os._exit(0)
                
                payload = json.loads(data.decode('utf-8'))
                
                if payload["type"] == "handshake":
                    self.handle_handshake(payload)
                elif payload["type"] == "chat":
                    if not self.encryptor:
                        print("[CLIENT] Menerima chat tapi handshake belum selesai.")
                        continue
                    
                    # 1. Dekripsi pesan dengan AES
                    encrypted_dict = payload["data"]
                    try:
                        decrypted_json = self.encryptor.decrypt(encrypted_dict)
                        packet = json.loads(decrypted_json)
                        
                        # 2. Verifikasi Signature dengan RSA
                        result = self.signature_handler.verify(packet)
                        if result["valid"]:
                            sender = packet["sender"]
                            message = packet["message"]
                            print(f"\n[{sender}] {message}")
                        else:
                            print(f"\n[PERINGATAN] Pesan gagal diverifikasi: {result['message']}")
                    except Exception as e:
                        print(f"\n[PERINGATAN] Gagal mendekripsi pesan: {e}")
            except Exception as e:
                pass

    def start_chat(self):
        while True:
            try:
                msg = input()
                if msg.lower() == 'exit':
                    self.client_socket.close()
                    break
                    
                if not self.encryptor:
                    print("[CLIENT] Belum bisa mengirim pesan, menunggu peer...")
                    continue
                
                # 1. Tanda tangani pesan dengan RSA
                packet = self.signature_handler.sign(msg)
                
                # 2. Enkripsi paket dengan AES
                plaintext = json.dumps(packet)
                encrypted_data = self.encryptor.encrypt(plaintext)
                
                # 3. Kirim ke jaringan
                network_payload = {
                    "type": "chat",
                    "data": encrypted_data
                }
                print(f"[DEBUG] Mengirim ciphertext: {encrypted_data['ciphertext'][:50]}...")
                self.client_socket.send(json.dumps(network_payload).encode('utf-8'))
            except KeyboardInterrupt:
                self.client_socket.close()
                break

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Penggunaan: python client.py <username>")
        sys.exit(1)
        
    username = sys.argv[1]
    client = SecureClient('127.0.0.0', 9999, username)
    
    # Supaya bisa connect ke localhost
    client.host = '127.0.0.1' 
    client.connect()
    client.start_chat()
