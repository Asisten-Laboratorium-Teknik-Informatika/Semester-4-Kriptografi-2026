import customtkinter as ctk

COLORS = {
    "bg_main": "#1a1410", "bg_card": "#2d2520", "bg_input": "#1a1410",
    "gold": "#b8960c", "gold_light": "#f0cc5a", "text_main": "#f5f0e8",
    "text_muted": "#7a7068", "text_fade": "#5a524a", "border": "#2e2820",
}


class CipherModal(ctk.CTkToplevel):

    def __init__(self, parent, plain_text: str, master_key: str):
        super().__init__(parent)
        self.title("Pratinjau Enkripsi")
        self.geometry("540x520")
        self.resizable(False, False)
        self.configure(fg_color=COLORS["bg_main"])

        self.transient(parent)
        self.grab_set()
        self.focus_force()

        self._build(plain_text, master_key)

    def _build(self, plain_text, master_key):
        from cipher import vigenere_encrypt, vigenere_decrypt, get_math_steps

        preview = plain_text[:50] if plain_text else "—"
        encrypted = vigenere_encrypt(preview, master_key) if master_key else "—"
        decrypted = vigenere_decrypt(encrypted, master_key) if master_key else "—"
        steps = get_math_steps(preview, master_key, max_chars=8) if master_key else []
        key_disp = master_key[:3] + "•" * max(0, len(master_key) - 3) if master_key else "—"

        scroll = ctk.CTkScrollableFrame(self, fg_color="transparent",
                                        scrollbar_button_color=COLORS["border"])
        scroll.pack(fill="both", expand=True, padx=16, pady=(12, 0))

        hdr = ctk.CTkFrame(scroll, fg_color="transparent")
        hdr.pack(fill="x", pady=(0, 10))
        ctk.CTkLabel(hdr, text="Pratinjau Enkripsi", font=("Georgia", 16, "bold"),
                     text_color=COLORS["text_main"]).pack(side="left")

        self._demo_row(scroll, "PLAINTEXT (50 KARAKTER PERTAMA)", preview,
                       COLORS["text_main"])

        ctk.CTkLabel(scroll, text="↓ enkripsi", font=("Courier", 10),
                     text_color=COLORS["text_fade"]).pack(pady=4)

        self._demo_row(scroll, "CIPHERTEXT", encrypted, COLORS["gold"])

        self._demo_row(scroll, "KUNCI YANG DIGUNAKAN", key_disp, COLORS["text_muted"])

        ctk.CTkFrame(scroll, fg_color=COLORS["border"], height=1).pack(fill="x", pady=8)

        ctk.CTkLabel(scroll, text="TABEL VALIDASI MATEMATIS (MAKS 8 KARAKTER)",
                     font=("Courier", 9), text_color=COLORS["text_muted"]).pack(anchor="w",
                                                                                 pady=(4, 6))

        if steps:
            headers = ["Plain", "P", "Key", "K", "Rumus", "C", "Cipher"]
            table = ctk.CTkFrame(scroll, fg_color=COLORS["bg_card"], corner_radius=4,
                                 border_width=1, border_color=COLORS["border"])
            table.pack(fill="x", pady=(0, 8))

            for ci, h in enumerate(headers):
                w = 80 if h == "Rumus" else 50
                lbl = ctk.CTkLabel(table, text=h, font=("Courier", 9),
                                   text_color=COLORS["text_muted"], width=w)
                lbl.grid(row=0, column=ci, padx=2, pady=(6, 2))

            for ri, s in enumerate(steps, start=1):
                vals = [s['plain'], str(s['p_val']), s['key_char'], str(s['k_val']),
                        s['formula_str'], str(s['c_val']), s['cipher']]
                clrs = [COLORS["text_main"], COLORS["text_main"], COLORS["gold"],
                        COLORS["text_main"], COLORS["text_muted"], COLORS["text_main"],
                        COLORS["gold"]]
                for ci, (v, cl) in enumerate(zip(vals, clrs)):
                    w = 80 if ci == 4 else 50
                    ctk.CTkLabel(table, text=v, font=("Courier", 10),
                                 text_color=cl, width=w).grid(row=ri, column=ci,
                                                               padx=2, pady=2)
        else:
            ctk.CTkLabel(scroll, text="— Tidak ada data —", font=("Courier", 10),
                         text_color=COLORS["text_fade"]).pack(pady=4)

        ctk.CTkFrame(scroll, fg_color=COLORS["border"], height=1).pack(fill="x", pady=8)

        ctk.CTkLabel(scroll, text="VERIFIKASI DEKRIPSI", font=("Courier", 9),
                     text_color=COLORS["text_muted"]).pack(anchor="w", pady=(4, 2))

        verify_frame = ctk.CTkFrame(scroll, fg_color=COLORS["bg_card"], corner_radius=4,
                                    border_width=1, border_color=COLORS["border"])
        verify_frame.pack(fill="x", pady=(0, 8))
        ctk.CTkLabel(verify_frame, text=decrypted, font=("Courier", 11),
                     text_color=COLORS["gold_light"], wraplength=480,
                     justify="left").pack(padx=10, pady=8, anchor="w")

        ctk.CTkButton(self, text="Tutup", width=120, height=34,
                      font=("Georgia", 12), text_color=COLORS["text_main"],
                      fg_color="transparent", border_color=COLORS["border"],
                      border_width=1, corner_radius=4, hover_color=COLORS["bg_card"],
                      command=self.destroy).pack(pady=(8, 14))

    def _demo_row(self, parent, label, value, value_color):
        ctk.CTkLabel(parent, text=label, font=("Courier", 9),
                     text_color=COLORS["text_muted"]).pack(anchor="w", pady=(6, 2))
        frame = ctk.CTkFrame(parent, fg_color=COLORS["bg_card"], corner_radius=4,
                             border_width=1, border_color=COLORS["border"])
        frame.pack(fill="x", pady=(0, 2))
        ctk.CTkLabel(frame, text=value, font=("Courier", 11),
                     text_color=value_color, wraplength=480,
                     justify="left").pack(padx=10, pady=8, anchor="w")


if __name__ == "__main__":
    ctk.set_appearance_mode("dark")
    root = ctk.CTk()
    root.geometry("200x100")
    ctk.CTkButton(root, text="Open Modal",
                  command=lambda: CipherModal(root, "Hello World 123!", "SECRET")).pack(pady=20)
    root.mainloop()
