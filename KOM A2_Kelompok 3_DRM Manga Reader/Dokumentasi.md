# Dokumentasi Proyek: Aplikasi Komikan DRM (Digital Rights Management)

## 1. Identitas Proyek
- **Mata Kuliah:** Praktikum Kriptografi
- **Kelas:** KOM A2
- **Kelompok:** 3
- **Nama Proyek:** Aplikasi Baca Manga Terenkripsi (DRM)

## 2. Latar Belakang
Pembajakan digital dan pencurian hak cipta merupakan masalah besar dalam industri distribusi komik/manga digital. Banyak platform mengalami kerugian karena halaman komik mereka dengan mudah diunduh, disalin, atau di-screenshot oleh pihak tak bertanggung jawab. Proyek ini bertujuan untuk membangun sebuah purwarupa (prototype) aplikasi pembaca komik digital dengan perlindungan **Digital Rights Management (DRM)** berlapis, menggunakan algoritma kriptografi untuk memastikan gambar hanya dapat dilihat oleh pengguna yang sah melalui aplikasi resmi.

## 3. Arsitektur Sistem
Proyek ini mengadopsi arsitektur terdistribusi yang terdiri dari tiga komponen utama:

1. **Backend & API (PHP & MySQL)**
   - Berfungsi sebagai server pusat untuk menyimpan data komik, mengelola *chapter*, dan melayani *request* dari platform klien.
   - Bertanggung jawab melakukan enkripsi gambar saat diunggah (upload).
2. **Web Admin Panel (React, Vite, TypeScript)**
   - Dashboard pengelolaan konten untuk admin (Content Management System).
   - Digunakan untuk mengunggah komik, menambah *chapter*, serta menghapus konten.
3. **Aplikasi Klien (Android Native Kotlin/Java)**
   - Aplikasi yang digunakan oleh *end-user* untuk membaca komik.
   - Terhubung dengan server melalui jaringan (via Ngrok/Local Network) untuk mengambil data yang terenkripsi dan mendekripsinya secara *real-time*.

## 4. Implementasi Kriptografi (Keamanan Utama)
Proyek ini mengimplementasikan algoritma kriptografi simetris standar industri untuk melindungi aset gambar komik:

- **Algoritma:** AES (Advanced Encryption Standard)
- **Panjang Kunci:** 256-bit (AES-256)
- **Mode Operasi:** CBC (Cipher Block Chaining)

**Alur Kerja Enkripsi - Dekripsi:**
1. **Fase Enkripsi (Server-side):** Ketika admin mengunggah (upload) halaman komik melalui Admin Panel, *script* backend PHP akan membaca file gambar aslinya, lalu mengenkripsinya menggunakan kunci rahasia (Secret Key) dan *Initialization Vector* (IV) dengan algoritma AES-256-CBC. Gambar yang tersimpan di server bukanlah gambar normal (misal `.jpg`/`.png`), melainkan file terenkripsi yang tidak bisa dibuka oleh *image viewer* biasa.
2. **Fase Dekripsi (Client-side):** Saat pengguna membuka *chapter* komik di aplikasi Android, aplikasi akan mengunduh *byte stream* terenkripsi tersebut. Dekripsi dilakukan langsung di dalam memori (RAM - *On-The-Fly Decryption*) menggunakan kunci yang sudah diamankan. Dengan cara ini, gambar asli tidak pernah disimpan (cached) secara permanen di penyimpanan internal HP pengguna.

## 5. Lapisan Keamanan Tambahan (OS-Level)
Selain mengamankan *file* secara kriptografis, aplikasi Android ini juga mengimplementasikan mekanisme pencegahan kebocoran visual:
- **FLAG_SECURE (WindowManager):** Mencegah pengguna melakukan tangkapan layar (*screenshot*) dan perekaman layar (*screen recording*). Jika pengguna mencoba *screenshot*, sistem operasi Android akan memblokirnya secara otomatis (biasanya menghasilkan gambar hitam).

## 6. Teknologi yang Digunakan
- **Frontend Admin:** React.js, TailwindCSS, Vite
- **Backend API:** PHP 8, MySQL (XAMPP)
- **Mobile App:** Android Studio (Kotlin/Java, WebView)
- **Tunneling:** Ngrok (untuk demonstrasi *Live* dari localhost)

## 7. Kesimpulan
Melalui perpaduan algoritma kriptografi AES-256-CBC pada level file dan perlindungan *FLAG_SECURE* pada level Sistem Operasi, proyek ini membuktikan bahwa perlindungan *Digital Rights Management* (DRM) yang efektif dapat diimplementasikan untuk mengamankan aset intelektual digital dari ancaman pembajakan.
