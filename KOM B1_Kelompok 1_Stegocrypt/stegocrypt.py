"""
╔══════════════════════════════════════════════════════════════╗
║                      STEGOCRYPT                              ║
║  Steganografi + Kriptografi: Sembunyikan Pesan Terenkripsi   ║
║  di Dalam Pixel Gambar                                       ║
║                                                              ║
║  Kelompok Pepografi — Mata Kuliah Kriptografi 2026           ║
╚══════════════════════════════════════════════════════════════╝

Algoritma:
  - Enkripsi  : AES-256-CBC dengan PBKDF2 key derivation
  - Steganografi : Least Significant Bit (LSB) pada pixel RGB
  
Alur Encode: Pesan → Enkripsi AES (kunci) → Sisipkan ke Pixel (LSB) → Stego Image
Alur Decode: Stego Image → Ekstrak Bit (LSB) → Dekripsi AES (kunci) → Pesan Asli
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk, ImageDraw, ImageFilter
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes
import struct
import os
import threading


# ══════════════════════════════════════════════════════════════
#   CORE ENGINE — Kriptografi & Steganografi
# ══════════════════════════════════════════════════════════════

class CryptoEngine:
    """Enkripsi dan dekripsi pesan menggunakan AES-256-CBC."""
    
    SALT_SIZE = 16
    IV_SIZE = 16
    KEY_SIZE = 32  # 256 bit
    PBKDF2_ITERATIONS = 100_000
    
    @staticmethod
    def derive_key(password: str, salt: bytes = None) -> tuple:
        """
        Derivasi kunci AES-256 dari password menggunakan PBKDF2.
        
        PBKDF2 (Password-Based Key Derivation Function 2) mengubah password
        yang mudah diingat menjadi kunci kriptografi yang aman dengan
        menerapkan fungsi hash berulang kali (100.000 iterasi).
        
        Args:
            password: Password dari pengguna
            salt: Salt acak 16 byte (akan di-generate jika None)
            
        Returns:
            Tuple (key, salt) — kunci AES 32 byte dan salt yang digunakan
        """
        if salt is None:
            salt = get_random_bytes(CryptoEngine.SALT_SIZE)
        key = PBKDF2(
            password.encode('utf-8'),
            salt,
            dkLen=CryptoEngine.KEY_SIZE,
            count=CryptoEngine.PBKDF2_ITERATIONS
        )
        return key, salt
    
    @staticmethod
    def encrypt(message: str, password: str) -> bytes:
        """
        Enkripsi pesan menggunakan AES-256-CBC.
        
        Proses:
        1. Derive kunci dari password via PBKDF2
        2. Generate IV (Initialization Vector) acak
        3. Pad pesan ke kelipatan 16 byte (PKCS7)
        4. Enkripsi dengan AES-256-CBC
        5. Gabungkan: salt + IV + ciphertext
        
        Args:
            message: Pesan plaintext yang akan dienkripsi
            password: Password/kunci dari pengguna
            
        Returns:
            bytes: salt(16) + iv(16) + ciphertext
        """
        key, salt = CryptoEngine.derive_key(password)
        iv = get_random_bytes(CryptoEngine.IV_SIZE)
        cipher = AES.new(key, AES.MODE_CBC, iv)
        
        # PKCS7 Padding
        message_bytes = message.encode('utf-8')
        padding_length = 16 - (len(message_bytes) % 16)
        padded = message_bytes + bytes([padding_length]) * padding_length
        
        ciphertext = cipher.encrypt(padded)
        return salt + iv + ciphertext
    
    @staticmethod
    def decrypt(data: bytes, password: str) -> str:
        """
        Dekripsi data menggunakan AES-256-CBC.
        
        Proses kebalikan dari encrypt():
        1. Pisahkan salt, IV, dan ciphertext
        2. Derive kunci dari password + salt via PBKDF2
        3. Dekripsi dengan AES-256-CBC
        4. Hapus padding PKCS7
        
        Args:
            data: Data terenkripsi (salt + IV + ciphertext) 
            password: Password/kunci yang benar
            
        Returns:
            str: Pesan asli (plaintext)
            
        Raises:
            ValueError: Jika password salah atau data rusak
        """
        if len(data) < 33:  # minimal salt(16) + iv(16) + 1 block
            raise ValueError("Data terenkripsi tidak valid (terlalu pendek)")
        
        salt = data[:CryptoEngine.SALT_SIZE]
        iv = data[CryptoEngine.SALT_SIZE:CryptoEngine.SALT_SIZE + CryptoEngine.IV_SIZE]
        ciphertext = data[CryptoEngine.SALT_SIZE + CryptoEngine.IV_SIZE:]
        
        key, _ = CryptoEngine.derive_key(password, salt)
        cipher = AES.new(key, AES.MODE_CBC, iv)
        
        padded = cipher.decrypt(ciphertext)
        
        # Validasi dan hapus PKCS7 padding
        padding_length = padded[-1]
        if padding_length > 16 or padding_length == 0:
            raise ValueError("Password salah atau data rusak!")
        if padded[-padding_length:] != bytes([padding_length]) * padding_length:
            raise ValueError("Password salah atau data rusak!")
        
        return padded[:-padding_length].decode('utf-8')


class StegoEngine:
    """Steganografi LSB — menyisipkan/mengekstrak data di pixel gambar."""
    
    # Magic header untuk identifikasi stego image
    MAGIC = b'SC01'  # StegoCrypt v01
    
    @staticmethod
    def get_capacity(image_path: str) -> int:
        """
        Hitung kapasitas maksimum data (dalam byte) yang bisa disembunyikan.
        
        Setiap pixel punya 3 channel (R,G,B), masing-masing bisa menyimpan
        1 bit. Jadi 1 pixel = 3 bit. Dikurangi overhead header (8 byte).
        
        Args:
            image_path: Path ke file gambar
            
        Returns:
            int: Kapasitas dalam byte
        """
        img = Image.open(image_path)
        w, h = img.size
        total_bits = w * h * 3  # 3 channel RGB per pixel
        total_bytes = total_bits // 8
        overhead = len(StegoEngine.MAGIC) + 4  # magic(4) + length(4) = 8 byte
        return max(0, total_bytes - overhead)
    
    @staticmethod
    def encode(image_path: str, data: bytes) -> Image.Image:
        """
        Sisipkan data ke dalam pixel gambar menggunakan metode LSB.
        
        Format data yang disisipkan:
        [MAGIC 4 byte] [LENGTH 4 byte] [DATA n byte]
        
        Setiap bit dari data menggantikan bit paling rendah (LSB) 
        dari komponen R, G, atau B setiap pixel.
        
        Contoh:
          Pixel asli:  R=11010110, G=10101011, B=01100100
          Bit pesan:   1, 0, 1
          Pixel baru:  R=11010111, G=10101010, B=01100101
                              ↑              ↑              ↑
                        (LSB diubah)   (LSB diubah)   (LSB diubah)
        
        Args:
            image_path: Path ke gambar cover
            data: Data (ciphertext) yang akan disisipkan
            
        Returns:
            Image: Gambar stego yang berisi pesan tersembunyi
            
        Raises:
            ValueError: Jika gambar terlalu kecil untuk data
        """
        img = Image.open(image_path).convert('RGB')
        pixels = list(img.getdata())
        
        # Buat payload: MAGIC + LENGTH + DATA
        payload = StegoEngine.MAGIC + struct.pack('>I', len(data)) + data
        
        # Konversi ke bit array
        bits = []
        for byte in payload:
            for i in range(7, -1, -1):
                bits.append((byte >> i) & 1)
        
        # Cek kapasitas
        max_bits = len(pixels) * 3
        if len(bits) > max_bits:
            needed_px = (len(bits) + 2) // 3
            raise ValueError(
                f"Gambar terlalu kecil!\n"
                f"Butuh: {needed_px:,} pixel\n"
                f"Tersedia: {len(pixels):,} pixel\n"
                f"Coba gunakan gambar yang lebih besar."
            )
        
        # Sisipkan bit ke LSB setiap channel RGB
        new_pixels = []
        bit_idx = 0
        for pixel in pixels:
            r, g, b = pixel
            if bit_idx < len(bits):
                r = (r & 0xFE) | bits[bit_idx]; bit_idx += 1
            if bit_idx < len(bits):
                g = (g & 0xFE) | bits[bit_idx]; bit_idx += 1
            if bit_idx < len(bits):
                b = (b & 0xFE) | bits[bit_idx]; bit_idx += 1
            new_pixels.append((r, g, b))
        
        # Buat gambar output
        stego = Image.new('RGB', img.size)
        stego.putdata(new_pixels)
        return stego
    
    @staticmethod
    def decode(image_path: str) -> bytes:
        """
        Ekstrak data tersembunyi dari gambar stego menggunakan LSB.
        
        Proses:
        1. Baca semua LSB dari setiap channel RGB
        2. Cek magic header (4 byte pertama)
        3. Baca panjang data (4 byte berikutnya)
        4. Ekstrak data sebanyak panjang yang tertulis
        
        Args:
            image_path: Path ke gambar stego
            
        Returns:
            bytes: Data yang tersembunyi (ciphertext)
            
        Raises:
            ValueError: Jika gambar tidak mengandung stego data
        """
        img = Image.open(image_path).convert('RGB')
        pixels = list(img.getdata())
        
        # Ekstrak semua LSB
        bits = []
        for pixel in pixels:
            for channel in range(3):
                bits.append(pixel[channel] & 1)
        
        def bits_to_bytes(bit_list):
            result = bytearray()
            for i in range(0, len(bit_list), 8):
                byte = 0
                for j in range(8):
                    if i + j < len(bit_list):
                        byte = (byte << 1) | bit_list[i + j]
                result.append(byte)
            return bytes(result)
        
        # Baca dan validasi magic header (4 byte = 32 bit)
        if len(bits) < 64:  # minimal magic(32) + length(32)
            raise ValueError("Gambar tidak mengandung pesan tersembunyi!")
        
        magic = bits_to_bytes(bits[:32])
        if magic != StegoEngine.MAGIC:
            raise ValueError(
                "Gambar ini tidak mengandung pesan StegoCrypt!\n"
                "Pastikan gambar benar dan belum dikompresi (harus PNG)."
            )
        
        # Baca panjang data (4 byte = 32 bit)
        length_bytes = bits_to_bytes(bits[32:64])
        data_length = struct.unpack('>I', length_bytes)[0]
        
        # Validasi
        available = (len(bits) - 64) // 8
        if data_length > available or data_length > 100_000_000:
            raise ValueError("Data rusak atau gambar telah dimodifikasi!")
        
        # Ekstrak data
        data_bits = bits[64:64 + data_length * 8]
        return bits_to_bytes(data_bits)


# ══════════════════════════════════════════════════════════════
#   GUI APPLICATION — Antarmuka Pengguna
# ══════════════════════════════════════════════════════════════

class StegoCryptApp:
    """Aplikasi GUI StegoCrypt menggunakan Tkinter."""
    
    # Warna tema
    BG_DARK = "#0f172a"
    BG_CARD = "#1e293b"
    BG_INPUT = "#334155"
    BG_HOVER = "#475569"
    ACCENT_CYAN = "#06b6d4"
    ACCENT_TEAL = "#14b8a6"
    ACCENT_GREEN = "#10b981"
    ACCENT_RED = "#ef4444"
    ACCENT_AMBER = "#f59e0b"
    TEXT_PRIMARY = "#f1f5f9"
    TEXT_SECONDARY = "#94a3b8"
    TEXT_MUTED = "#64748b"
    BORDER = "#334155"
    
    def __init__(self, root):
        self.root = root
        self.root.title("StegoCrypt — Steganografi + Kriptografi")
        self.root.geometry("1000x720")
        self.root.minsize(900, 650)
        self.root.configure(bg=self.BG_DARK)
        
        # State
        self.encode_image_path = None
        self.decode_image_path = None
        self.stego_result = None  # Hasil encode (PIL Image)
        
        # Konfigurasi style
        self._setup_styles()
        
        # Build UI
        self._build_header()
        self._build_tabs()
        self._build_status_bar()
        
        # Center window
        self.root.update_idletasks()
        x = (self.root.winfo_screenwidth() - 1000) // 2
        y = (self.root.winfo_screenheight() - 720) // 2 - 30
        self.root.geometry(f"+{x}+{y}")
    
    def _setup_styles(self):
        """Konfigurasi tema dan style ttk."""
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Notebook (tabs)
        self.style.configure('Custom.TNotebook', background=self.BG_DARK, borderwidth=0)
        self.style.configure('Custom.TNotebook.Tab', 
                           background=self.BG_CARD, 
                           foreground=self.TEXT_SECONDARY,
                           padding=[24, 12],
                           font=('Segoe UI', 11, 'bold'),
                           borderwidth=0)
        self.style.map('Custom.TNotebook.Tab',
                      background=[('selected', self.BG_DARK)],
                      foreground=[('selected', self.ACCENT_CYAN)])
        
        # Progress bar
        self.style.configure('Cyan.Horizontal.TProgressbar',
                           troughcolor=self.BG_INPUT,
                           background=self.ACCENT_CYAN,
                           thickness=4)
    
    def _build_header(self):
        """Buat header aplikasi."""
        header = tk.Frame(self.root, bg=self.BG_DARK, pady=16)
        header.pack(fill='x', padx=30)
        
        # Title
        title_frame = tk.Frame(header, bg=self.BG_DARK)
        title_frame.pack(anchor='w')
        
        tk.Label(title_frame, text="🖼️🔐", font=('Segoe UI', 24),
                bg=self.BG_DARK, fg=self.TEXT_PRIMARY).pack(side='left', padx=(0, 12))
        
        text_frame = tk.Frame(title_frame, bg=self.BG_DARK)
        text_frame.pack(side='left')
        
        tk.Label(text_frame, text="StegoCrypt", 
                font=('Segoe UI', 22, 'bold'),
                bg=self.BG_DARK, fg=self.TEXT_PRIMARY).pack(anchor='w')
        
        tk.Label(text_frame, text="Sembunyikan pesan terenkripsi di dalam pixel gambar",
                font=('Segoe UI', 10),
                bg=self.BG_DARK, fg=self.TEXT_SECONDARY).pack(anchor='w')
        
        # Separator
        sep = tk.Frame(self.root, bg=self.ACCENT_CYAN, height=2)
        sep.pack(fill='x', padx=30)
    
    def _build_tabs(self):
        """Buat tab Encode dan Decode."""
        self.notebook = ttk.Notebook(self.root, style='Custom.TNotebook')
        self.notebook.pack(fill='both', expand=True, padx=30, pady=(8, 0))
        
        # Tab Encode
        encode_frame = tk.Frame(self.notebook, bg=self.BG_DARK)
        self.notebook.add(encode_frame, text="  🔒  ENCODE — Sembunyikan Pesan  ")
        self._build_encode_tab(encode_frame)
        
        # Tab Decode
        decode_frame = tk.Frame(self.notebook, bg=self.BG_DARK)
        self.notebook.add(decode_frame, text="  🔓  DECODE — Ungkap Pesan  ")
        self._build_decode_tab(decode_frame)
    
    def _create_card(self, parent, title, icon=""):
        """Buat card container dengan judul."""
        card = tk.Frame(parent, bg=self.BG_CARD, 
                       highlightbackground=self.BORDER, 
                       highlightthickness=1,
                       padx=20, pady=16)
        
        if title:
            header = tk.Frame(card, bg=self.BG_CARD)
            header.pack(fill='x', pady=(0, 12))
            tk.Label(header, text=f"{icon}  {title}" if icon else title,
                    font=('Segoe UI', 12, 'bold'),
                    bg=self.BG_CARD, fg=self.TEXT_PRIMARY).pack(anchor='w')
            
            sep = tk.Frame(header, bg=self.BORDER, height=1)
            sep.pack(fill='x', pady=(8, 0))
        
        return card
    
    def _create_button(self, parent, text, command, color=None, width=None):
        """Buat tombol custom."""
        if color is None:
            color = self.ACCENT_CYAN
        
        btn = tk.Button(parent, text=text, command=command,
                       font=('Segoe UI', 11, 'bold'),
                       bg=color, fg='white',
                       activebackground=color, activeforeground='white',
                       relief='flat', cursor='hand2',
                       padx=20, pady=10,
                       borderwidth=0)
        if width:
            btn.configure(width=width)
        
        # Hover effect
        def on_enter(e):
            btn.configure(bg=self._lighten(color))
        def on_leave(e):
            btn.configure(bg=color)
        btn.bind('<Enter>', on_enter)
        btn.bind('<Leave>', on_leave)
        
        return btn
    
    def _lighten(self, hex_color, factor=0.15):
        """Lighten a hex color."""
        r = int(hex_color[1:3], 16)
        g = int(hex_color[3:5], 16)
        b = int(hex_color[5:7], 16)
        r = min(255, int(r + (255 - r) * factor))
        g = min(255, int(g + (255 - g) * factor))
        b = min(255, int(b + (255 - b) * factor))
        return f"#{r:02x}{g:02x}{b:02x}"
    
    # ──────── ENCODE TAB ────────
    
    def _build_encode_tab(self, parent):
        """Buat UI tab Encode."""
        container = tk.Frame(parent, bg=self.BG_DARK)
        container.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Left column
        left = tk.Frame(container, bg=self.BG_DARK)
        left.pack(side='left', fill='both', expand=True, padx=(0, 8))
        
        # Card: Pilih Gambar
        img_card = self._create_card(left, "Gambar Cover", "🖼️")
        img_card.pack(fill='x', pady=(0, 8))
        
        self.encode_img_label = tk.Label(img_card, text="Belum ada gambar dipilih",
                                         font=('Segoe UI', 9),
                                         bg=self.BG_CARD, fg=self.TEXT_MUTED)
        self.encode_img_label.pack(anchor='w', pady=(0, 8))
        
        # Image preview area
        self.encode_preview_frame = tk.Frame(img_card, bg=self.BG_INPUT,
                                             width=300, height=180,
                                             highlightbackground=self.BORDER,
                                             highlightthickness=1)
        self.encode_preview_frame.pack(fill='x', pady=(0, 10))
        self.encode_preview_frame.pack_propagate(False)
        
        self.encode_preview_label = tk.Label(self.encode_preview_frame,
                                              text="📂\nKlik tombol di bawah\nuntuk memilih gambar",
                                              font=('Segoe UI', 10),
                                              bg=self.BG_INPUT, fg=self.TEXT_MUTED,
                                              justify='center')
        self.encode_preview_label.pack(expand=True)
        
        self._create_button(img_card, "📂  Pilih Gambar", 
                           self._select_encode_image).pack(fill='x')
        
        # Capacity info
        self.capacity_label = tk.Label(img_card, text="",
                                        font=('Segoe UI', 9),
                                        bg=self.BG_CARD, fg=self.TEXT_MUTED)
        self.capacity_label.pack(anchor='w', pady=(8, 0))
        
        # Right column
        right = tk.Frame(container, bg=self.BG_DARK)
        right.pack(side='right', fill='both', expand=True, padx=(8, 0))
        
        # Card: Pesan
        msg_card = self._create_card(right, "Pesan Rahasia", "📝")
        msg_card.pack(fill='both', expand=True, pady=(0, 8))
        
        self.encode_text = tk.Text(msg_card, font=('Consolas', 11),
                                    bg=self.BG_INPUT, fg=self.TEXT_PRIMARY,
                                    insertbackground=self.ACCENT_CYAN,
                                    selectbackground=self.ACCENT_CYAN,
                                    relief='flat', wrap='word',
                                    padx=12, pady=10,
                                    height=6,
                                    highlightbackground=self.BORDER,
                                    highlightthickness=1)
        self.encode_text.pack(fill='both', expand=True, pady=(0, 4))
        
        self.char_count_label = tk.Label(msg_card, text="0 karakter",
                                         font=('Segoe UI', 9),
                                         bg=self.BG_CARD, fg=self.TEXT_MUTED)
        self.char_count_label.pack(anchor='e')
        self.encode_text.bind('<KeyRelease>', self._update_char_count)
        
        # Card: Password (Kunci)
        key_card = self._create_card(right, "Kunci Enkripsi (Password)", "🔑")
        key_card.pack(fill='x', pady=(0, 8))
        
        pw_frame = tk.Frame(key_card, bg=self.BG_CARD)
        pw_frame.pack(fill='x')
        
        self.encode_password = tk.Entry(pw_frame, font=('Consolas', 12),
                                         bg=self.BG_INPUT, fg=self.TEXT_PRIMARY,
                                         insertbackground=self.ACCENT_CYAN,
                                         relief='flat', show='●',
                                         highlightbackground=self.BORDER,
                                         highlightthickness=1)
        self.encode_password.pack(side='left', fill='x', expand=True, ipady=8, padx=(0, 8))
        
        self.show_pw_var = tk.BooleanVar(value=False)
        show_btn = tk.Checkbutton(pw_frame, text="👁", 
                                   variable=self.show_pw_var,
                                   command=self._toggle_encode_pw,
                                   font=('Segoe UI', 14),
                                   bg=self.BG_CARD, fg=self.TEXT_SECONDARY,
                                   selectcolor=self.BG_CARD,
                                   activebackground=self.BG_CARD,
                                   relief='flat', borderwidth=0,
                                   cursor='hand2')
        show_btn.pack(side='right')
        
        tk.Label(key_card, text="⚠ Kunci ini dibutuhkan untuk membuka pesan. Jangan sampai lupa!",
                font=('Segoe UI', 9), bg=self.BG_CARD, fg=self.ACCENT_AMBER,
                wraplength=350, justify='left').pack(anchor='w', pady=(8, 0))
        
        # Encode button
        self.encode_btn = self._create_button(right, "🔒  ENCODE — Enkripsi & Sembunyikan",
                                               self._do_encode, self.ACCENT_TEAL)
        self.encode_btn.pack(fill='x')
    
    # ──────── DECODE TAB ────────
    
    def _build_decode_tab(self, parent):
        """Buat UI tab Decode."""
        container = tk.Frame(parent, bg=self.BG_DARK)
        container.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Left column
        left = tk.Frame(container, bg=self.BG_DARK)
        left.pack(side='left', fill='both', expand=True, padx=(0, 8))
        
        # Card: Pilih Stego Image
        img_card = self._create_card(left, "Gambar Stego", "🖼️")
        img_card.pack(fill='x', pady=(0, 8))
        
        self.decode_img_label = tk.Label(img_card, text="Belum ada gambar dipilih",
                                          font=('Segoe UI', 9),
                                          bg=self.BG_CARD, fg=self.TEXT_MUTED)
        self.decode_img_label.pack(anchor='w', pady=(0, 8))
        
        # Image preview
        self.decode_preview_frame = tk.Frame(img_card, bg=self.BG_INPUT,
                                              width=300, height=180,
                                              highlightbackground=self.BORDER,
                                              highlightthickness=1)
        self.decode_preview_frame.pack(fill='x', pady=(0, 10))
        self.decode_preview_frame.pack_propagate(False)
        
        self.decode_preview_label = tk.Label(self.decode_preview_frame,
                                              text="📂\nKlik tombol di bawah\nuntuk memilih stego image",
                                              font=('Segoe UI', 10),
                                              bg=self.BG_INPUT, fg=self.TEXT_MUTED,
                                              justify='center')
        self.decode_preview_label.pack(expand=True)
        
        self._create_button(img_card, "📂  Pilih Stego Image",
                           self._select_decode_image).pack(fill='x')
        
        # Card: Password
        key_card = self._create_card(left, "Kunci Dekripsi (Password)", "🔑")
        key_card.pack(fill='x', pady=(8, 8))
        
        pw_frame = tk.Frame(key_card, bg=self.BG_CARD)
        pw_frame.pack(fill='x')
        
        self.decode_password = tk.Entry(pw_frame, font=('Consolas', 12),
                                         bg=self.BG_INPUT, fg=self.TEXT_PRIMARY,
                                         insertbackground=self.ACCENT_CYAN,
                                         relief='flat', show='●',
                                         highlightbackground=self.BORDER,
                                         highlightthickness=1)
        self.decode_password.pack(side='left', fill='x', expand=True, ipady=8, padx=(0, 8))
        
        self.show_dpw_var = tk.BooleanVar(value=False)
        show_btn = tk.Checkbutton(pw_frame, text="👁",
                                   variable=self.show_dpw_var,
                                   command=self._toggle_decode_pw,
                                   font=('Segoe UI', 14),
                                   bg=self.BG_CARD, fg=self.TEXT_SECONDARY,
                                   selectcolor=self.BG_CARD,
                                   activebackground=self.BG_CARD,
                                   relief='flat', borderwidth=0,
                                   cursor='hand2')
        show_btn.pack(side='right')
        
        # Decode button
        self.decode_btn = self._create_button(left, "🔓  DECODE — Ekstrak & Dekripsi",
                                               self._do_decode, self.ACCENT_GREEN)
        self.decode_btn.pack(fill='x', pady=(0, 0))
        
        # Right column — Result
        right = tk.Frame(container, bg=self.BG_DARK)
        right.pack(side='right', fill='both', expand=True, padx=(8, 0))
        
        result_card = self._create_card(right, "Pesan Terungkap", "📝")
        result_card.pack(fill='both', expand=True)
        
        self.decode_result = tk.Text(result_card, font=('Consolas', 12),
                                      bg=self.BG_INPUT, fg=self.ACCENT_GREEN,
                                      insertbackground=self.ACCENT_GREEN,
                                      relief='flat', wrap='word',
                                      padx=12, pady=10,
                                      state='disabled',
                                      highlightbackground=self.BORDER,
                                      highlightthickness=1)
        self.decode_result.pack(fill='both', expand=True, pady=(0, 10))
        
        self._create_button(result_card, "📋  Salin ke Clipboard",
                           self._copy_result, self.BG_HOVER).pack(fill='x')
    
    # ──────── STATUS BAR ────────
    
    def _build_status_bar(self):
        """Buat status bar di bagian bawah."""
        self.status_frame = tk.Frame(self.root, bg=self.BG_CARD, pady=8)
        self.status_frame.pack(fill='x', padx=30, pady=(4, 12))
        
        self.status_label = tk.Label(self.status_frame, 
                                      text="✨ Siap digunakan — Pilih gambar dan masukkan pesan untuk memulai",
                                      font=('Segoe UI', 9),
                                      bg=self.BG_CARD, fg=self.TEXT_SECONDARY)
        self.status_label.pack(side='left', padx=12)
        
        tk.Label(self.status_frame, text="Kelompok Pepografi © 2026",
                font=('Segoe UI', 9),
                bg=self.BG_CARD, fg=self.TEXT_MUTED).pack(side='right', padx=12)
    
    def _set_status(self, text, color=None):
        """Update status bar."""
        if color is None:
            color = self.TEXT_SECONDARY
        self.status_label.configure(text=text, fg=color)
        self.root.update_idletasks()
    
    # ──────── EVENT HANDLERS ────────
    
    def _toggle_encode_pw(self):
        self.encode_password.configure(show='' if self.show_pw_var.get() else '●')
    
    def _toggle_decode_pw(self):
        self.decode_password.configure(show='' if self.show_dpw_var.get() else '●')
    
    def _update_char_count(self, event=None):
        text = self.encode_text.get('1.0', 'end-1c')
        count = len(text)
        self.char_count_label.configure(text=f"{count:,} karakter")
    
    def _show_image_preview(self, image_path, preview_label, max_size=(280, 170)):
        """Tampilkan preview gambar di label."""
        try:
            img = Image.open(image_path)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            photo = ImageTk.PhotoImage(img)
            preview_label.configure(image=photo, text='')
            preview_label.image = photo  # keep reference
        except Exception:
            preview_label.configure(text="❌ Gagal memuat preview", image='')
    
    def _select_encode_image(self):
        """Pilih gambar untuk encode."""
        path = filedialog.askopenfilename(
            title="Pilih Gambar Cover",
            filetypes=[
                ("Image Files", "*.png *.jpg *.jpeg *.bmp *.tiff"),
                ("PNG", "*.png"),
                ("JPEG", "*.jpg *.jpeg"),
                ("All Files", "*.*")
            ]
        )
        if path:
            self.encode_image_path = path
            filename = os.path.basename(path)
            img = Image.open(path)
            w, h = img.size
            self.encode_img_label.configure(
                text=f"📁 {filename}  ({w}×{h} px)",
                fg=self.TEXT_PRIMARY
            )
            
            # Show preview
            self._show_image_preview(path, self.encode_preview_label)
            
            # Show capacity
            cap = StegoEngine.get_capacity(path)
            cap_chars = cap - 48  # dikurangi overhead AES (salt+iv+padding)
            if cap_chars < 0:
                cap_chars = 0
            self.capacity_label.configure(
                text=f"📐 Kapasitas: ~{cap:,} byte ({cap_chars:,} karakter max)",
                fg=self.ACCENT_CYAN
            )
            self._set_status(f"✅ Gambar dipilih: {filename} ({w}×{h})")
    
    def _select_decode_image(self):
        """Pilih stego image untuk decode."""
        path = filedialog.askopenfilename(
            title="Pilih Stego Image",
            filetypes=[
                ("PNG Files", "*.png"),
                ("Image Files", "*.png *.bmp *.tiff"),
                ("All Files", "*.*")
            ]
        )
        if path:
            self.decode_image_path = path
            filename = os.path.basename(path)
            img = Image.open(path)
            w, h = img.size
            self.decode_img_label.configure(
                text=f"📁 {filename}  ({w}×{h} px)",
                fg=self.TEXT_PRIMARY
            )
            self._show_image_preview(path, self.decode_preview_label)
            self._set_status(f"✅ Stego image dipilih: {filename} ({w}×{h})")
    
    def _do_encode(self):
        """Proses encode: enkripsi pesan + sisipkan ke gambar."""
        # Validasi input
        if not self.encode_image_path:
            messagebox.showwarning("⚠ Peringatan", "Silakan pilih gambar terlebih dahulu!")
            return
        
        message = self.encode_text.get('1.0', 'end-1c').strip()
        if not message:
            messagebox.showwarning("⚠ Peringatan", "Pesan tidak boleh kosong!")
            return
        
        password = self.encode_password.get().strip()
        if not password:
            messagebox.showwarning("⚠ Peringatan", "Kunci/password tidak boleh kosong!")
            return
        
        if len(password) < 4:
            messagebox.showwarning("⚠ Peringatan", "Password minimal 4 karakter untuk keamanan!")
            return
        
        self._set_status("⏳ Mengenkripsi pesan dengan AES-256...", self.ACCENT_AMBER)
        self.encode_btn.configure(state='disabled')
        
        def process():
            try:
                # Step 1: Enkripsi pesan
                self._set_status("🔐 [1/3] Mengenkripsi pesan dengan AES-256-CBC...", self.ACCENT_AMBER)
                ciphertext = CryptoEngine.encrypt(message, password)
                
                # Step 2: Sisipkan ke gambar
                self._set_status(f"🖼️ [2/3] Menyisipkan {len(ciphertext)} byte ke pixel gambar (LSB)...", self.ACCENT_AMBER)
                stego_image = StegoEngine.encode(self.encode_image_path, ciphertext)
                self.stego_result = stego_image
                
                # Step 3: Simpan
                self._set_status("💾 [3/3] Menyimpan stego image...", self.ACCENT_AMBER)
                save_path = filedialog.asksaveasfilename(
                    title="Simpan Stego Image",
                    defaultextension=".png",
                    filetypes=[("PNG Files", "*.png")],
                    initialfile="stego_output.png"
                )
                
                if save_path:
                    stego_image.save(save_path, 'PNG')
                    self._set_status(
                        f"✅ Berhasil! Pesan tersembunyi disimpan ke: {os.path.basename(save_path)}  "
                        f"({len(ciphertext)} byte terenkripsi)",
                        self.ACCENT_GREEN
                    )
                    messagebox.showinfo(
                        "✅ Berhasil!",
                        f"Pesan berhasil dienkripsi dan disembunyikan!\n\n"
                        f"📝 Pesan: {len(message)} karakter\n"
                        f"🔐 Ciphertext: {len(ciphertext)} byte\n"
                        f"🖼️ Stego image: {os.path.basename(save_path)}\n\n"
                        f"⚠ Jangan lupa kunci/password-nya!"
                    )
                else:
                    self._set_status("⚠ Penyimpanan dibatalkan", self.ACCENT_AMBER)
                    
            except ValueError as e:
                self._set_status(f"❌ Gagal: {str(e)}", self.ACCENT_RED)
                messagebox.showerror("❌ Error", str(e))
            except Exception as e:
                self._set_status(f"❌ Error: {str(e)}", self.ACCENT_RED)
                messagebox.showerror("❌ Error", f"Terjadi kesalahan:\n{str(e)}")
            finally:
                self.encode_btn.configure(state='normal')
        
        threading.Thread(target=process, daemon=True).start()
    
    def _do_decode(self):
        """Proses decode: ekstrak dari gambar + dekripsi pesan."""
        # Validasi
        if not self.decode_image_path:
            messagebox.showwarning("⚠ Peringatan", "Silakan pilih stego image terlebih dahulu!")
            return
        
        password = self.decode_password.get().strip()
        if not password:
            messagebox.showwarning("⚠ Peringatan", "Kunci/password tidak boleh kosong!")
            return
        
        self._set_status("⏳ Mengekstrak data dari gambar...", self.ACCENT_AMBER)
        self.decode_btn.configure(state='disabled')
        
        def process():
            try:
                # Step 1: Ekstrak data dari gambar
                self._set_status("🖼️ [1/2] Mengekstrak bit tersembunyi dari pixel gambar...", self.ACCENT_AMBER)
                encrypted_data = StegoEngine.decode(self.decode_image_path)
                
                # Step 2: Dekripsi
                self._set_status("🔓 [2/2] Mendekripsi pesan dengan AES-256-CBC...", self.ACCENT_AMBER)
                plaintext = CryptoEngine.decrypt(encrypted_data, password)
                
                # Tampilkan hasil
                self.decode_result.configure(state='normal')
                self.decode_result.delete('1.0', 'end')
                self.decode_result.insert('1.0', plaintext)
                self.decode_result.configure(state='disabled')
                
                self._set_status(
                    f"✅ Pesan berhasil diungkap! ({len(plaintext)} karakter)",
                    self.ACCENT_GREEN
                )
                
            except ValueError as e:
                self._set_status(f"❌ Gagal: {str(e)}", self.ACCENT_RED)
                messagebox.showerror("❌ Decode Gagal", str(e))
            except UnicodeDecodeError:
                self._set_status("❌ Password salah!", self.ACCENT_RED)
                messagebox.showerror("❌ Decode Gagal", 
                                    "Password salah atau gambar bukan stego image yang valid!")
            except Exception as e:
                self._set_status(f"❌ Error: {str(e)}", self.ACCENT_RED)
                messagebox.showerror("❌ Error", f"Terjadi kesalahan:\n{str(e)}")
            finally:
                self.decode_btn.configure(state='normal')
        
        threading.Thread(target=process, daemon=True).start()
    
    def _copy_result(self):
        """Salin hasil decode ke clipboard."""
        self.decode_result.configure(state='normal')
        text = self.decode_result.get('1.0', 'end-1c')
        self.decode_result.configure(state='disabled')
        
        if text:
            self.root.clipboard_clear()
            self.root.clipboard_append(text)
            self._set_status("📋 Pesan berhasil disalin ke clipboard!", self.ACCENT_GREEN)
        else:
            self._set_status("⚠ Tidak ada pesan untuk disalin", self.ACCENT_AMBER)


# ══════════════════════════════════════════════════════════════
#   MAIN
# ══════════════════════════════════════════════════════════════

if __name__ == '__main__':
    root = tk.Tk()
    
    # Set icon (use default if custom icon not available)
    try:
        root.iconbitmap(default='')
    except Exception:
        pass
    
    app = StegoCryptApp(root)
    root.mainloop()
