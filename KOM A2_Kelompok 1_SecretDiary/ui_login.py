import customtkinter as ctk

COLORS = {
    "bg_main":    "#1a1410",
    "bg_card":    "#2d2520",
    "bg_input":   "#1a1410",
    "gold":       "#b8960c",
    "gold_light": "#f0cc5a",
    "text_main":  "#f5f0e8",
    "text_muted": "#7a7068",
    "text_fade":  "#5a524a",
    "seal_red":   "#6b1a1a",
    "border":     "#2e2820",
}


class LoginFrame(ctk.CTkFrame):

    def __init__(self, parent, app):
        super().__init__(parent, fg_color=COLORS["bg_main"])
        self.app = app
        self._is_register = False
        self._build_ui()

    def _build_ui(self):
        center = ctk.CTkFrame(self, fg_color="transparent")
        center.place(relx=0.5, rely=0.5, anchor="center")

        seal_frame = ctk.CTkFrame(center, fg_color="transparent")
        seal_frame.pack(pady=(0, 20))

        icon_frame = ctk.CTkFrame(seal_frame, width=60, height=60,
                                  corner_radius=30, fg_color=COLORS["seal_red"])
        icon_frame.pack(pady=(0, 12))
        icon_frame.pack_propagate(False)
        icon_label = ctk.CTkLabel(icon_frame, text="🔒", font=("Segoe UI Emoji", 22),
                                  text_color=COLORS["text_main"])
        icon_label.place(relx=0.5, rely=0.5, anchor="center")

        title = ctk.CTkLabel(seal_frame, text="Buku Harian Rahasia",
                             font=("Georgia", 24, "bold"), text_color=COLORS["text_main"])
        title.pack()

        subtitle = ctk.CTkLabel(seal_frame, text="Vigenere Cipher · A=1 Standard",
                                font=("Courier", 11), text_color=COLORS["text_muted"])
        subtitle.pack(pady=(4, 0))

        card = ctk.CTkFrame(center, fg_color=COLORS["bg_card"], corner_radius=8,
                            border_width=1, border_color=COLORS["border"], width=360)
        card.pack(padx=20, pady=10)

        ornament = ctk.CTkLabel(card, text="— ✦ —", font=("Georgia", 13),
                                text_color=COLORS["text_fade"])
        ornament.pack(pady=(18, 14))

        lbl_user = ctk.CTkLabel(card, text="USERNAME",
                                font=("Courier", 10), text_color=COLORS["gold"])
        lbl_user.pack(anchor="w", padx=30)

        self.entry_username = ctk.CTkEntry(
            card, width=300, height=38,
            font=("Georgia", 13), text_color=COLORS["text_main"],
            fg_color=COLORS["bg_input"], border_color=COLORS["border"],
            border_width=1, corner_radius=4,
            placeholder_text="Masukkan username"
        )
        self.entry_username.pack(padx=30, pady=(4, 12))
        self.entry_username.bind("<FocusIn>", lambda e: self.entry_username.configure(border_color=COLORS["gold"]))
        self.entry_username.bind("<FocusOut>", lambda e: self.entry_username.configure(border_color=COLORS["border"]))

        lbl_pass = ctk.CTkLabel(card, text="PASSWORD",
                                font=("Courier", 10), text_color=COLORS["gold"])
        lbl_pass.pack(anchor="w", padx=30)

        self.entry_password = ctk.CTkEntry(
            card, show="*", width=300, height=38,
            font=("Georgia", 13), text_color=COLORS["text_main"],
            fg_color=COLORS["bg_input"], border_color=COLORS["border"],
            border_width=1, corner_radius=4,
            placeholder_text="Masukkan password"
        )
        self.entry_password.pack(padx=30, pady=(4, 12))
        self.entry_password.bind("<Return>", lambda e: self._on_submit())
        self.entry_password.bind("<FocusIn>", lambda e: self.entry_password.configure(border_color=COLORS["gold"]))
        self.entry_password.bind("<FocusOut>", lambda e: self.entry_password.configure(border_color=COLORS["border"]))

        self.confirm_frame = ctk.CTkFrame(card, fg_color="transparent")

        lbl_confirm = ctk.CTkLabel(self.confirm_frame, text="KONFIRMASI PASSWORD",
                                   font=("Courier", 10), text_color=COLORS["gold"])
        lbl_confirm.pack(anchor="w", padx=30)

        self.entry_confirm = ctk.CTkEntry(
            self.confirm_frame, show="*", width=300, height=38,
            font=("Georgia", 13), text_color=COLORS["text_main"],
            fg_color=COLORS["bg_input"], border_color=COLORS["border"],
            border_width=1, corner_radius=4,
            placeholder_text="Ulangi password..."
        )
        self.entry_confirm.pack(padx=30, pady=(4, 12))
        self.entry_confirm.bind("<Return>", lambda e: self._on_submit())
        self.entry_confirm.bind("<FocusIn>", lambda e: self.entry_confirm.configure(border_color=COLORS["gold"]))
        self.entry_confirm.bind("<FocusOut>", lambda e: self.entry_confirm.configure(border_color=COLORS["border"]))

        self.btn_submit = ctk.CTkButton(
            card, text="Buka Catatan", width=300, height=40,
            font=("Georgia", 14), text_color=COLORS["text_main"],
            fg_color="transparent", border_color=COLORS["gold"],
            border_width=1, corner_radius=4,
            hover_color=COLORS["bg_input"],
            command=self._on_submit
        )
        self.btn_submit.pack(padx=30, pady=(4, 8))

        self.lbl_error = ctk.CTkLabel(card, text="", font=("Georgia", 11),
                                      text_color="#cc4444", wraplength=280)
        self.lbl_error.pack(padx=30, pady=(0, 4))

        toggle_frame = ctk.CTkFrame(card, fg_color="transparent")
        toggle_frame.pack(pady=(4, 18))

        self.lbl_toggle_text = ctk.CTkLabel(toggle_frame, text="Belum punya akun?",
                                            font=("Georgia", 11),
                                            text_color=COLORS["text_muted"])
        self.lbl_toggle_text.pack(side="left")

        self.lbl_toggle_link = ctk.CTkLabel(toggle_frame, text="Daftar di sini",
                                            font=("Georgia", 11),
                                            text_color=COLORS["gold"], cursor="hand2")
        self.lbl_toggle_link.pack(side="left", padx=(6, 0))
        self.lbl_toggle_link.bind("<Button-1>", lambda e: self._toggle_mode())

    def _toggle_mode(self):
        self._is_register = not self._is_register
        self.lbl_error.configure(text="")
        if self._is_register:
            self.confirm_frame.pack(before=self.btn_submit, fill="x")
            self.btn_submit.configure(text="Buat Akun")
            self.lbl_toggle_text.configure(text="Sudah punya akun?")
            self.lbl_toggle_link.configure(text="Masuk di sini")
        else:
            self.confirm_frame.pack_forget()
            self.btn_submit.configure(text="Buka Catatan")
            self.lbl_toggle_text.configure(text="Belum punya akun?")
            self.lbl_toggle_link.configure(text="Daftar di sini")

    def _on_submit(self):
        from auth import register, login

        username = self.entry_username.get().strip()
        password = self.entry_password.get().strip()
        self.lbl_error.configure(text="")

        if self._is_register:
            confirm = self.entry_confirm.get().strip()
            ok, msg = register(username, password, confirm)
            if ok:
                self.app.current_user = username
                self.app.show_list()
            else:
                self.lbl_error.configure(text=msg)
        else:
            ok, result = login(username, password)
            if ok:
                self.app.current_user = result
                self.app.show_list()
            else:
                self.lbl_error.configure(text=result)

    def reset(self):
        self.entry_username.delete(0, "end")
        self.entry_password.delete(0, "end")
        self.entry_confirm.delete(0, "end")
        self.lbl_error.configure(text="")
        if self._is_register:
            self._toggle_mode()
