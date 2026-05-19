import socket
import threading
import json

clients = []

def handle_client(client_socket, address):
    print(f"[SERVER] Menerima koneksi dari {address}")
    while True:
        try:
            data = client_socket.recv(4096)
            if not data:
                break
            
            # Broadcast to other clients
            for c in clients:
                if c != client_socket:
                    try:
                        c.send(data)
                    except:
                        pass
        except Exception as e:
            print(f"[SERVER] Error: {e}")
            break
            
    print(f"[SERVER] Koneksi dari {address} terputus.")
    clients.remove(client_socket)
    client_socket.close()

def start_server(host='0.0.0.0', port=9999):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((host, port))
    server.listen(2)
    print(f"[SERVER] Listening on {host}:{port}")

    try:
        while True:
            client_socket, address = server.accept()
            clients.append(client_socket)
            
            client_thread = threading.Thread(target=handle_client, args=(client_socket, address))
            client_thread.start()
    except KeyboardInterrupt:
        print("[SERVER] Server dimatikan.")
        server.close()

if __name__ == "__main__":
    print("=" * 50)
    print("   SecureChat Server (Relay Plaintext/JSON)")
    print("=" * 50)
    start_server()
