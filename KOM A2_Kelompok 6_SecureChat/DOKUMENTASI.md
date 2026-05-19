# SecureChat: End-to-End Encrypted Chat Application with Perfect Forward Secrecy

## Informasi Kelompok
**Nama Kelompok:** Kelompok 6

**Anggota:**
1. Kabul Manik (241712023)
2. Kezia Arneta Patricia Manurung (241712035)
3. Ferlita Kristiani Hulu (241712025)
4. Michael Deryl Aaron Matthew (241712042)

---

## 1. Penjelasan Proyek
Proyek ini bertujuan untuk membangun sebuah aplikasi *chat* berbasis web yang menerapkan enkripsi ujung ke ujung (*End-to-End Encryption*) dengan mekanisme *Perfect Forward Secrecy*. Sistem dirancang untuk memastikan bahwa setiap pesan yang dikirimkan antar pengguna tidak dapat dibaca oleh pihak ketiga, termasuk server yang digunakan sebagai perantara komunikasi.

Dalam komunikasi digital sehari-hari, pesan yang dikirim melalui jaringan rentan terhadap berbagai ancaman seperti penyadapan, pemalsuan identitas pengirim, dan manipulasi konten oleh pihak yang tidak bertanggung jawab. Oleh karena itu, proyek ini mengembangkan sistem yang mampu menjamin kerahasiaan, integritas, dan keaslian pesan secara bersamaan menggunakan kombinasi algoritma kriptografi modern yang juga menjadi fondasi dari aplikasi perpesanan aman seperti Signal dan WhatsApp.

Sistem akan menerima input berupa pesan teks dari dua pengguna yang berkomunikasi melalui server relay. Sebelum dikirimkan, setiap pesan akan melalui proses penandatanganan digital menggunakan kunci privat RSA pengirim, kemudian dienkripsi menggunakan kunci sesi AES-256-GCM yang diturunkan dari proses pertukaran kunci Diffie-Hellman. Di sisi penerima, pesan didekripsi terlebih dahulu kemudian tanda tangan diverifikasi untuk memastikan keaslian dan integritas pesan.

Tahapan dalam pengembangan sistem ini meliputi:
1. Implementasi algoritma Diffie-Hellman untuk pertukaran kunci sesi tanpa mengirimkan kunci secara langsung melalui jaringan.
2. Implementasi enkripsi dan dekripsi pesan menggunakan AES-256-GCM dengan *authenticated encryption*.
3. Implementasi *digital signature* RSA untuk autentikasi identitas pengirim pada setiap pesan.
4. Pembangunan infrastruktur jaringan berbasis WebSocket untuk pengiriman pesan antar pengguna secara *real-time*.
5. Integrasi seluruh modul kriptografi ke dalam antarmuka web yang dapat diakses melalui browser secara lokal.
6. Pengujian sistem meliputi simulasi serangan *Man-in-the-Middle* dan pemalsuan identitas pengirim.

Output dari sistem ini berupa aplikasi web lokal yang dapat dijalankan melalui browser, dilengkapi dengan log sesi yang menampilkan perubahan kunci tiap sesi baru, demonstrasi perbandingan komunikasi tanpa enkripsi versus dengan enkripsi, serta simulasi serangan untuk membuktikan ketangguhan sistem yang dibangun.

---

## 2. Rincian Tugas secara Spesifik

### Kabul Manik (241712023) : Core Cryptography Engineer
Bertanggung jawab atas implementasi algoritma pertukaran kunci sebagai fondasi keamanan seluruh sistem. Tugasnya meliputi:
1. Mengimplementasikan algoritma Diffie-Hellman untuk menghasilkan pasangan kunci (kunci privat dan kunci publik) setiap sesi percakapan baru dimulai.
2. Melakukan komputasi *shared secret* dari kunci publik lawan bicara tanpa perlu mengirimkan kunci tersebut secara langsung.
3. Mengimplementasikan derivasi kunci sesi 256-bit menggunakan fungsi HKDF (HMAC-based Key Derivation Function) dari *shared secret* yang diperoleh.
4. Mengimplementasikan mekanisme *key rotation* sebagai realisasi *Perfect Forward Secrecy* sehingga setiap sesi menggunakan kunci yang berbeda dan independen.
5. Menyiapkan modul kunci final untuk diintegrasikan ke dalam sistem pengiriman pesan berbasis web.

### Kezia Arneta Patricia Manurung (241712035) : Encryption & Message Handler
Bertanggung jawab atas implementasi mekanisme enkripsi dan dekripsi pesan serta pengelolaan format pesan terenkripsi. Tugasnya meliputi:
1. Mengimplementasikan enkripsi dan dekripsi pesan menggunakan algoritma AES-256 dalam mode GCM (Galois/Counter Mode).
2. Menghasilkan *Initialization Vector (IV)* secara acak pada setiap pesan untuk mencegah pola berulang pada *ciphertext*.
3. Menyusun format pesan terenkripsi yang terdiri dari *ciphertext*, IV, dan *authentication tag* dalam bentuk yang siap dikirimkan melalui jaringan.
4. Mengintegrasikan modul enkripsi dengan kunci sesi yang dihasilkan oleh modul Diffie-Hellman.
5. Menangani deteksi dan penolakan pesan yang telah mengalami modifikasi selama proses pengiriman.

### Ferlita Kristiani Hulu (241712025) : Authentication & Signature
Bertanggung jawab atas implementasi mekanisme autentikasi pengirim menggunakan *digital signature*. Tugasnya meliputi:
1. Mengimplementasikan *digital signature* menggunakan algoritma RSA dengan padding PSS (Probabilistic Signature Scheme).
2. Menghasilkan pasangan kunci RSA untuk setiap pengguna yang digunakan sepanjang sesi aplikasi berjalan.
3. Melakukan proses penandatanganan pesan menggunakan kunci privat sebelum pesan dikirimkan ke jaringan.
4. Melakukan proses verifikasi tanda tangan di sisi penerima menggunakan kunci publik pengirim.
5. Menyiapkan demonstrasi simulasi serangan untuk menunjukkan perbedaan keamanan sistem antara kondisi tanpa tanda tangan digital dan dengan tanda tangan digital.

### Michael Deryl Aaron Matthew (241712042) : Web Development, Integration & Testing
Bertanggung jawab atas pembangunan antarmuka web, integrasi seluruh modul kriptografi ke dalam aplikasi, dan pengujian sistem secara menyeluruh. Tugasnya meliputi:
1. Mendesain dan membangun antarmuka web menggunakan Flask sebagai *backend framework* yang dapat diakses melalui browser secara lokal.
2. Membangun server WebSocket untuk pengiriman pesan antar pengguna secara *real-time* melalui antarmuka web.
3. Mengintegrasikan modul kriptografi (Diffie-Hellman, AES-256-GCM, dan RSA Signature) ke dalam sistem web secara terpadu.
4. Mengimplementasikan fitur tampilan log sesi yang menampilkan perubahan kunci, status enkripsi, dan hasil verifikasi tanda tangan secara langsung di antarmuka web.
5. Melakukan pengujian sistem meliputi *unit test* setiap modul, *integration test* alur komunikasi *end-to-end*, serta simulasi serangan *Man-in-the-Middle*.
6. Menyusun laporan akhir, dokumentasi teknis, dan menyiapkan materi presentasi proyek.

---

## 3. Bentuk Implementasi & Arsitektur
Proyek ini diimplementasikan dalam bentuk aplikasi web lokal yang dapat diakses melalui browser. Pengguna dapat membuka halaman web dari perangkat masing-masing, melakukan *handshake* otomatis untuk membentuk kunci sesi, kemudian saling berkirim pesan secara aman melalui server *relay* berbasis WebSocket.

Aplikasi ini dikembangkan menggunakan bahasa pemrograman Python dengan **Flask** sebagai *backend framework*, memanfaatkan *library cryptography* untuk implementasi algoritma kriptografi, serta HTML, CSS, dan JavaScript untuk antarmuka pengguna di sisi browser.

### Arsitektur Jaringan
Aplikasi ini memiliki 2 komponen server utama untuk menyimulasikan lingkungan internet terbuka yang rentan:
1. **Central Server (`web/server.py`)**: 
   Bertindak sebagai server relai (jembatan) di jaringan publik (layaknya server WhatsApp). Server ini bertugas meneruskan data JSON berisikan *ciphertext* ke pengguna tujuan. Server ini **TIDAK** dapat membaca isi pesan karena tidak memiliki kunci rahasia (*Session Key*).
2. **Local Client Server (`web/client_app.py`)**:
   Server Flask lokal yang berjalan di perangkat masing-masing pengguna. Server lokal ini memegang semua modul kriptografi (men-*generate* kunci, enkripsi, dekripsi, *sign*, *verify*) serta menjembatani UI web di browser ke Central Server menggunakan *Socket.IO*.

### Penjelasan Eksekusi Kode
1. **Login/Register:** Pengguna membuat akun lokal di aplikasinya.
2. **Auto Handshake:** Begitu pengguna masuk ke layar obrolan `/chat`, frontend (JavaScript) memerintahkan server lokal untuk menginisiasi proses *Handshake* dengan menyebarkan Kunci Publik Diffie-Hellman serta Kunci Publik RSA.
3. **Key Agreement:** Pengguna lain (lawan bicara) yang menangkap *Handshake* tersebut akan menghitung *Shared Secret* menggunakan modul `DHSession`. Kedua belah pihak otomatis akan memiliki kunci sesi AES-256 (32 bytes) yang sama secara matematis.
4. **Alur Enkripsi Pesan Baru:**
   * Pesan ditandatangani (*Sign*) menggunakan RSA Private Key.
   * Pesan (dan signature) dienkripsi dengan AES-256-GCM.
   * Dikirim ke Central Server dalam format JSON (`iv`, `ciphertext`, `tag`, `signature`).
5. **Alur Dekripsi Pesan Masuk:**
   * Mendekripsi AES-256-GCM. Jika *tag* korup atau salah (pesan diubah), pesan langsung ditolak.
   * Tanda tangan (*Signature*) RSA diverifikasi dengan Public Key pengirim untuk membuktikan keaslian pengirim.
   * Pesan yang sah akan diteruskan ke antarmuka web.

---

## 4. Cara Menjalankan Aplikasi

Aplikasi harus dijalankan di terminal dengan menjalankan 1 central server dan minimal 2 klien obrolan lokal yang berbeda *port*.

1. **Jalankan Central Server**
   ```cmd
   cd secure-chat
   python web/server.py
   ```
2. **Jalankan Klien Pertama (Contoh: Pengirim)**
   Buka terminal/CMD baru:
   ```cmd
   cd secure-chat
   python web/client_app.py 5000
   ```
   *Buka di browser: http://localhost:5000*
3. **Jalankan Klien Kedua (Contoh: Penerima)**
   Buka terminal/CMD baru:
   ```cmd
   cd secure-chat
   python web/client_app.py 5001
   ```
   *Buka di browser: http://localhost:5001*

Aplikasi kini siap digunakan dengan tingkat keamanan berlapis *End-to-End Encryption*.
