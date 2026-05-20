// Mode UI: Login / Register
let isLoginMode = true;

function toggleAuthMode(e) {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    document.getElementById('auth-title').innerText = isLoginMode ? 'Masuk Akun' : 'Daftar Akun';
    document.getElementById('auth-btn-text').innerText = isLoginMode ? 'Masuk' : 'Daftar';
    document.getElementById('auth-switch-desc').innerText = isLoginMode ? 'Belum punya akun?' : 'Sudah punya akun?';
    document.getElementById('auth-switch-link').innerText = isLoginMode ? 'Daftar sekarang' : 'Masuk sekarang';
    document.getElementById('error-msg').style.display = 'none';

    if (window.animate) {
        window.animate('#auth-container', {
            scale: [0.95, 1],
            duration: 400,
            ease: 'outQuad'
        });
    }
}

async function handleAuth(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errObj = document.getElementById('error-msg');

    const endpoint = isLoginMode ? '/api/login' : '/api/register';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            if (isLoginMode) {
                // Redirect ke /chat
                window.location.href = '/chat';
            } else {
                errObj.style.color = '#27ae60';
                errObj.innerText = 'Pendaftaran berhasil! Silakan masuk.';
                errObj.style.display = 'block';
                setTimeout(() => { toggleAuthMode(new Event('click')); }, 1500);
            }
        } else {
            errObj.style.color = '#e74c3c';
            errObj.innerText = data.error || 'Terjadi kesalahan.';
            errObj.style.display = 'block';
            
            if (window.animate) {
                window.animate('#auth-container', {
                    x: [-10, 10, -10, 10, 0],
                    duration: 400,
                    ease: 'linear'
                });
            }
        }
    } catch (error) {
        console.error(error);
    }
}


// SOCKET.IO (Untuk halaman chat)
let socket;

if (window.location.pathname === '/chat') {
    // Konek ke Local Flask SocketIO
    socket = io();

    const messagesArea = document.getElementById('messages-area');
    const msgInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const connStatus = document.getElementById('conn-status');
    const cryptoLogs = document.getElementById('crypto-logs');

    socket.on('connect', () => {
        console.log('Terhubung ke local server.');
        // Hapus tulisan menunggu koneksi
        if(cryptoLogs) cryptoLogs.innerHTML = '';
        addCryptoLog('Local Server', 'Terhubung. Memulai Handshake otomatis...', 'handshake');
        
        // Auto Initiate Handshake seperti konsep WA web
        socket.emit('initiate_handshake');
    });

    socket.on('crypto_log', (data) => {
        addCryptoLog(data.type, data.msg, data.type);
    });

    socket.on('system_message', (data) => {
        addSystemMessage(data.msg);
        if (data.msg.includes('Terhubung secara aman')) {
            connStatus.innerText = 'E2E Active';
            connStatus.style.backgroundColor = '#27ae60';
            connStatus.style.color = 'white';
            msgInput.disabled = false;
            sendBtn.disabled = false;
        }
    });

    socket.on('new_message', (data) => {
        addMessage(data.sender, data.message, 'received', data.is_verified);
    });

    window.sendMessage = function(e) {
        e.preventDefault();
        const text = msgInput.value.trim();
        if (!text) return;

        socket.emit('send_message', { message: text });
        addMessage('Anda', text, 'sent', true);
        msgInput.value = '';
    }

    function addSystemMessage(msg) {
        const div = document.createElement('div');
        div.className = 'system-message';
        div.innerText = msg;
        messagesArea.appendChild(div);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    function addCryptoLog(type, msg, cssClass) {
        if (!cryptoLogs) return;
        const div = document.createElement('div');
        div.className = `log-entry ${cssClass || ''}`;
        div.innerText = `[${type.toUpperCase()}] ${msg}`;
        cryptoLogs.appendChild(div);
        cryptoLogs.scrollTop = cryptoLogs.scrollHeight;
    }

    function addMessage(sender, text, type, isVerified) {
        const wrapper = document.createElement('div');
        wrapper.className = `message ${type}`;
        
        const senderEl = document.createElement('div');
        senderEl.className = 'sender-name';
        senderEl.innerHTML = sender + (isVerified ? ' <i data-feather="check-circle" style="width: 10px; height:10px; color:#27ae60;"></i>' : ' <i data-feather="x-circle" style="width: 10px; height:10px; color:#e74c3c;"></i>');
        
        const textEl = document.createElement('div');
        textEl.innerText = text;

        wrapper.appendChild(senderEl);
        wrapper.appendChild(textEl);
        messagesArea.appendChild(wrapper);

        feather.replace();

        // Animasikan pesan muncul dengan Anime.js V4
        if (window.animate) {
            window.animate(wrapper, {
                y: [20, 0],
                opacity: [0, 1],
                duration: 500,
                ease: 'outBack'
            });
        } else {
            wrapper.style.opacity = '1';
        }

        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
}
