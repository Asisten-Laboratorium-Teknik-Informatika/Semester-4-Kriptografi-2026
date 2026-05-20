# Panduan Menyalakan Proyek Komikan (Update Terbaru Ngrok)

Karena proyek ini memiliki arsitektur yang profesional (Backend PHP, Admin Panel React, dan Aplikasi Android Native), dan **sekarang sudah bisa diakses online via Ngrok**, kamu perlu menyalakannya secara berurutan agar semuanya dapat terhubung dengan sempurna.

Jika laptopmu baru saja dihidupkan, ikuti langkah-langkah di bawah ini:

---

## Langkah 1: Nyalakan Server Lokal (XAMPP)
Langkah ini berfungsi untuk mengaktifkan database MySQL dan server Apache yang menjadi jantung proyek ini.

1. Buka aplikasi **XAMPP Control Panel** di laptopmu.
2. Klik tombol **Start** pada baris **Apache**. (Tunggu hingga background tulisan berubah menjadi hijau).
3. Klik tombol **Start** pada baris **MySQL**. (Tunggu hingga berubah hijau).

---

## Langkah 2: Aktifkan Jembatan Online (Ngrok)
Karena HP Android berada di luar jaringan laptop (menggunakan paket data/wifi luar), kita butuh Ngrok sebagai jembatan agar HP bisa mengakses XAMPP di laptopmu.

1. Buka proyek (`C:\Projek kripto\KOM A2_Kelompok 3_DRM Manga Reader`) menggunakan **Visual Studio Code**.
2. Buka terminal baru dengan menekan tombol `` Ctrl + ` `` (backtick).
3. Jalankan perintah ini:
   ```bash
   ngrok http 80
   ```
4. **PENTING: Jangan tutup terminal ini!** 
5. Cari tulisan `Forwarding` dan salin (Copy) link URL yang berwarna biru (Misal: `https://abcd-1234.ngrok-free.app`).

---

## Langkah 3: Update Link API di Android
Karena kamu menggunakan akun Ngrok versi *gratis*, **link URL akan selalu berubah-ubah** setiap kali Ngrok direstart. Jadi kamu WAJIB memasukkan link yang baru tersebut ke aplikasi Android.

1. Buka **Android Studio**.
2. Di sebelah kiri, buka file `AndroidManifest.xml` (berada di folder `android_wrapper/app/src/main/`).
3. Cari *tag* `android:name="api_base_url"`.
4. Ganti isi `android:value` dengan link Ngrok barumu dan **pastikan** ditambah `/manga_api/api.php` di akhir URL.
   - *Contoh yang BENAR:* `https://abcd-1234.ngrok-free.app/manga_api/api.php`
5. Jika sudah diganti, di bagian menu atas Android Studio, klik **Build ➜ Build Bundle(s) / APK(s) ➜ Build APK(s)**.
6. Kirim file `.apk` yang baru jadi tersebut ke teman-temanmu untuk diinstal!

---

## Langkah 4: Nyalakan Web Admin Panel
Langkah terakhir ini untuk menghidupkan website tempat kamu mengelola (Upload/Edit/Hapus) komik.

1. Kembali ke **Visual Studio Code**, buka tab **Terminal Baru** (klik ikon `+` di kanan atas kotak terminal, karena terminal sebelumnya sedang dipakai oleh Ngrok).
2. Pindah ke folder admin dengan mengetik:
   ```bash
   cd admin_panel
   ```
3. Jalankan website dengan mengetik:
   ```bash
   npm run dev
   ```
4. Tunggu hingga muncul tulisan `Local: http://localhost:5173/`.
5. Tahan tombol `Ctrl` lalu klik link tersebut untuk membukanya di browser!

---

**Selesai! 🎉**

**⚠️ CATATAN SUPER PENTING SAAT PRESENTASI:**
1. Pastikan laptop tidak dalam mode Sleep / layarnya tertutup.
2. Pastikan internet di laptop stabil.
3. Pastikan XAMPP dan terminal Ngrok tidak di-close (silang).
Jika salah satu dari 3 hal di atas terjadi, koneksi terputus dan kamu harus mengulang dari **Langkah 2**!
