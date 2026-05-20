import customtkinter as ctk
from tkinter import messagebox
import time
from datetime import datetime

COLORS = {
    "bg_main": "#1a1410", "bg_card": "#2d2520", "bg_input": "#1a1410",
    "bg_sidebar": "#231e1a", "gold": "#b8960c", "gold_light": "#f0cc5a",
    "text_main": "#f5f0e8", "text_muted": "#7a7068", "text_fade": "#5a524a",
    "seal_red": "#6b1a1a", "green_ok": "#4a9a5a", "border": "#2e2820",
}

DAYS_ID = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']
MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni',
             'Juli','Agustus','September','Oktober','November','Desember']


class EditorFrame(ctk.CTkFrame):
    def __init__(self, parent, app):
        super().__init__(parent, fg_color=COLORS["bg_main"])
        self.app = app
        self._entry_id = None
        self._original_title = ""
        self._original_content = ""
        self._saved = False
        self._active_mood = ""
        self._build_ui()

    def _build_ui(self):
        topbar = ctk.CTkFrame(self, fg_color=COLORS["bg_card"], height=45, corner_radius=0)
        topbar.pack(fill="x", side="top")
        topbar.pack_propagate(False)

        left = ctk.CTkFrame(topbar, fg_color="transparent")
        left.pack(side="left", padx=12)

        ctk.CTkButton(left, text="← Kembali", width=90, height=30, font=("Georgia", 11),
                      text_color=COLORS["text_muted"], fg_color="transparent",
                      hover_color=COLORS["bg_input"], corner_radius=4,
                      command=self._confirm_back).pack(side="left")

        self.status_dot = ctk.CTkLabel(left, text="●", font=("Georgia", 8),
                                       text_color=COLORS["text_muted"])
        self.status_dot.pack(side="left", padx=(14, 4))
        self.status_text = ctk.CTkLabel(left, text="Belum disimpan", font=("Courier", 10),
                                        text_color=COLORS["text_muted"])
        self.status_text.pack(side="left")

        right = ctk.CTkFrame(topbar, fg_color="transparent")
        right.pack(side="right", padx=12)

        ctk.CTkButton(right, text="🔓 Dekripsi", width=100, height=30,
                      font=("Georgia", 11), text_color=COLORS["text_main"],
                      fg_color="transparent", border_color=COLORS["border"],
                      border_width=1, corner_radius=4, hover_color=COLORS["bg_input"],
                      command=self._do_decrypt).pack(side="left", padx=(0, 8))

        ctk.CTkButton(right, text="🔒 Lihat Enkripsi", width=130, height=30,
                      font=("Georgia", 11), text_color=COLORS["text_main"],
                      fg_color="transparent", border_color=COLORS["border"],
                      border_width=1, corner_radius=4, hover_color=COLORS["bg_input"],
                      command=self._open_modal).pack(side="left", padx=(0, 8))

        ctk.CTkButton(right, text="Simpan", width=80, height=30,
                      font=("Georgia", 12, "bold"), text_color=COLORS["bg_main"],
                      fg_color=COLORS["gold"], hover_color=COLORS["gold_light"],
                      corner_radius=4, command=self._save_entry).pack(side="left")

        body = ctk.CTkFrame(self, fg_color="transparent")
        body.pack(fill="both", expand=True, padx=0, pady=0)
        body.grid_columnconfigure(0, weight=65)
        body.grid_columnconfigure(1, weight=35)
        body.grid_rowconfigure(0, weight=1)

        main = ctk.CTkFrame(body, fg_color="transparent")
        main.grid(row=0, column=0, sticky="nsew", padx=(20, 10), pady=16)

        date_row = ctk.CTkFrame(main, fg_color="transparent")
        date_row.pack(fill="x", pady=(0, 10))

        self.date_label = ctk.CTkLabel(date_row, text="", font=("Georgia", 12),
                                       text_color=COLORS["text_muted"])
        self.date_label.pack(side="left")

        mood_frame = ctk.CTkFrame(date_row, fg_color="transparent")
        mood_frame.pack(side="right")

        self.mood_btns = []
        for emoji in ["😊", "😢", "😠", "🙏", "🔥"]:
            btn = ctk.CTkButton(mood_frame, text=emoji, width=32, height=32,
                                font=("Segoe UI Emoji", 15), fg_color="transparent",
                                hover_color=COLORS["bg_card"], corner_radius=4,
                                command=lambda e=emoji: self._set_mood(e))
            btn.pack(side="left", padx=2)
            self.mood_btns.append((emoji, btn))

        self.title_entry = ctk.CTkEntry(
            main, height=40, font=("Georgia", 20),
            text_color=COLORS["text_main"], fg_color="transparent",
            border_width=0, placeholder_text="Judul catatan hari ini..."
        )
        self.title_entry.pack(fill="x", pady=(0, 6))

        ctk.CTkFrame(main, fg_color=COLORS["border"], height=1).pack(fill="x", pady=(0, 8))

        self.content_text = ctk.CTkTextbox(
            main, font=("Georgia", 13), text_color=COLORS["text_main"],
            fg_color=COLORS["bg_input"], border_width=1, border_color=COLORS["border"],
            corner_radius=4, wrap="word"
        )
        self.content_text.pack(fill="both", expand=True)
        self.content_text.bind("<KeyRelease>", lambda e: self._update_stats())

        sidebar = ctk.CTkFrame(body, fg_color=COLORS["bg_sidebar"], corner_radius=0)
        sidebar.grid(row=0, column=1, sticky="nsew")

        sb_scroll = ctk.CTkScrollableFrame(sidebar, fg_color="transparent",
                                           scrollbar_button_color=COLORS["border"])
        sb_scroll.pack(fill="both", expand=True, padx=12, pady=16)

        self._section_label(sb_scroll, "Algoritma")
        algo = ctk.CTkFrame(sb_scroll, fg_color=COLORS["bg_card"], corner_radius=4,
                            border_width=1, border_color=COLORS["border"])
        algo.pack(fill="x", pady=(0, 14))

        af = ctk.CTkFrame(algo, fg_color="transparent")
        af.pack(fill="x", padx=10, pady=(10, 4))
        ctk.CTkLabel(af, text="Vigenere Cipher", font=("Georgia", 11),
                     text_color=COLORS["text_main"]).pack(side="left")
        ctk.CTkLabel(af, text="MOD-26", font=("Courier", 9),
                     text_color=COLORS["gold"]).pack(side="right")

        formulas = ctk.CTkFrame(algo, fg_color="transparent")
        formulas.pack(fill="x", padx=10, pady=(0, 10))
        ctk.CTkLabel(formulas, text="Enkripsi:", font=("Courier", 9),
                     text_color=COLORS["text_muted"]).pack(anchor="w")
        ctk.CTkLabel(formulas, text="Ci = ((Pi+Ki-2)%26)+1",
                     font=("Courier", 10), text_color=COLORS["text_main"]).pack(anchor="w")
        ctk.CTkLabel(formulas, text="Dekripsi:", font=("Courier", 9),
                     text_color=COLORS["text_muted"]).pack(anchor="w", pady=(6, 0))
        ctk.CTkLabel(formulas, text="Pi = ((Ci-Ki+26)%26)+1",
                     font=("Courier", 10), text_color=COLORS["text_main"]).pack(anchor="w")
        ctk.CTkLabel(formulas, text="// A=1, Z=26", font=("Courier", 9),
                     text_color=COLORS["text_fade"]).pack(anchor="w", pady=(6, 0))

        self._section_label(sb_scroll, "Statistik")
        stats = ctk.CTkFrame(sb_scroll, fg_color=COLORS["bg_card"], corner_radius=4,
                             border_width=1, border_color=COLORS["border"])
        stats.pack(fill="x", pady=(0, 14))

        self.stat_chars = self._stat_row(stats, "Karakter", "0")
        self.stat_words = self._stat_row(stats, "Kata", "0")
        self.stat_lines = self._stat_row(stats, "Baris", "0")
        self.stat_read  = self._stat_row(stats, "Est. Baca", "0 det")

    def _section_label(self, parent, text):
        ctk.CTkLabel(parent, text=text, font=("Courier", 10),
                     text_color=COLORS["text_muted"]).pack(anchor="w", pady=(0, 4))

    def _stat_row(self, parent, label, value):
        row = ctk.CTkFrame(parent, fg_color="transparent")
        row.pack(fill="x", padx=10, pady=3)
        ctk.CTkLabel(row, text=label, font=("Courier", 10),
                     text_color=COLORS["text_muted"]).pack(side="left")
        val_lbl = ctk.CTkLabel(row, text=value, font=("Courier", 10),
                               text_color=COLORS["text_main"])
        val_lbl.pack(side="right")
        return val_lbl

    def _set_mood(self, emoji):
        self._active_mood = emoji
        for e, btn in self.mood_btns:
            if e == emoji:
                btn.configure(fg_color=COLORS["bg_card"], border_width=1,
                              border_color=COLORS["gold"])
            else:
                btn.configure(fg_color="transparent", border_width=0)

    def _update_stats(self):
        content = self.content_text.get("1.0", "end-1c")
        chars = len(content)
        words = len(content.split()) if content.strip() else 0
        lines = content.count('\n') + 1 if content else 0
        read_sec = round(words / (200 / 60))
        read_str = f"{read_sec} det" if read_sec < 60 else f"{round(read_sec / 60)} min"

        self.stat_chars.configure(text=str(chars))
        self.stat_words.configure(text=str(words))
        self.stat_lines.configure(text=str(lines))
        self.stat_read.configure(text=read_str)

    def load_entry(self, entry_id):
        from database import load_entries

        self._entry_id = entry_id
        self._saved = False
        self._active_mood = ""
        self.status_dot.configure(text_color=COLORS["text_muted"])
        self.status_text.configure(text="Belum disimpan")

        for _, btn in self.mood_btns:
            btn.configure(fg_color="transparent", border_width=0)

        now = datetime.now()
        day_name = DAYS_ID[now.weekday()]
        self.date_label.configure(
            text=f"{day_name}, {now.day} {MONTHS_ID[now.month - 1]} {now.year}"
        )

        self.title_entry.delete(0, "end")
        self.content_text.delete("1.0", "end")

        if entry_id is None:
            self._original_title = ""
            self._original_content = ""
        else:
            entries = load_entries(self.app.current_user)
            entry = None
            for e in entries:
                if e['id'] == entry_id:
                    entry = e
                    break
            if entry:
                dt, dc = entry['title'], entry['content']
                self.title_entry.insert(0, dt)
                self.content_text.insert("1.0", dc)
                self._original_title = dt
                self._original_content = dc
                if entry.get('mood'):
                    self._set_mood(entry['mood'])

        self._update_stats()

    def _do_decrypt(self):
        from cipher import vigenere_decrypt
        dialog = ctk.CTkInputDialog(text="Masukkan Master Password untuk mendekripsi catatan ini:", title="Dekripsi")
        password = dialog.get_input()
        if password:
            title = self.title_entry.get().strip()
            content = self.content_text.get("1.0", "end-1c").strip()
            
            dec_title = vigenere_decrypt(title, password)
            dec_content = vigenere_decrypt(content, password)
            
            self.title_entry.delete(0, "end")
            self.title_entry.insert(0, dec_title)
            self.content_text.delete("1.0", "end")
            self.content_text.insert("1.0", dec_content)
            self._update_stats()

    def _save_entry(self):
        from cipher import vigenere_encrypt
        from database import insert_entry, update_entry

        title = self.title_entry.get().strip()
        content = self.content_text.get("1.0", "end-1c").strip()

        if not title or not content:
            messagebox.showwarning("Peringatan", "Judul dan isi catatan tidak boleh kosong!")
            return
            
        dialog = ctk.CTkInputDialog(text="Masukkan Master Password untuk mengunci catatan ini:", title="Enkripsi")
        password = dialog.get_input()
        if not password:
            return

        enc_title = vigenere_encrypt(title, password)
        enc_content = vigenere_encrypt(content, password)
        today = datetime.now().strftime("%Y-%m-%d")

        if self._entry_id is None:
            new_id = int(time.time() * 1000)
            entry = {
                'id': new_id, 'username': self.app.current_user, 'title': enc_title, 'content': enc_content,
                'date': today, 'mood': self._active_mood, 'encrypted': True
            }
            insert_entry(entry)
            self._entry_id = new_id
        else:
            entry = {
                'id': self._entry_id, 'username': self.app.current_user, 'title': enc_title, 'content': enc_content,
                'mood': self._active_mood, 'encrypted': True
            }
            update_entry(entry)

        self._saved = True
        self._original_title = enc_title
        self._original_content = enc_content
        
        self.title_entry.delete(0, "end")
        self.title_entry.insert(0, enc_title)
        self.content_text.delete("1.0", "end")
        self.content_text.insert("1.0", enc_content)
        self._update_stats()
        
        self.status_dot.configure(text_color=COLORS["green_ok"])
        self.status_text.configure(text="Tersimpan & terenkripsi")

        self.app.show_list()

    def _has_changes(self):
        title = self.title_entry.get().strip()
        content = self.content_text.get("1.0", "end-1c").strip()
        return title != self._original_title or content != self._original_content

    def _confirm_back(self):
        if not self._saved and self._has_changes():
            if not messagebox.askyesno("Keluar?",
                    "Perubahan belum disimpan. Yakin ingin keluar?"):
                return
        self.app.show_list()

    def _open_modal(self):
        from ui_modal import CipherModal
        content = self.content_text.get("1.0", "end-1c")
        
        dialog = ctk.CTkInputDialog(text="Masukkan Master Password simulasi:", title="Simulasi")
        password = dialog.get_input()
        if password:
            CipherModal(parent=self, plain_text=content, master_key=password)
