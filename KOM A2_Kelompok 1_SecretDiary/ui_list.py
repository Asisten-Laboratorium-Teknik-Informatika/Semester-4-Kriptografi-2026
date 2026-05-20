import customtkinter as ctk
from tkinter import messagebox

COLORS = {
    "bg_main": "#1a1410", "bg_card": "#2d2520", "bg_input": "#1a1410",
    "gold": "#b8960c", "gold_light": "#f0cc5a", "text_main": "#f5f0e8",
    "text_muted": "#7a7068", "text_fade": "#5a524a", "seal_red": "#6b1a1a",
    "border": "#2e2820",
}
MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

def format_date(date_str):
    try:
        y, m, d = date_str.split('-')
        return f"{int(d)} {MONTHS_ID[int(m)-1]} {y}"
    except Exception:
        return date_str


class ListFrame(ctk.CTkFrame):
    def __init__(self, parent, app):
        super().__init__(parent, fg_color=COLORS["bg_main"])
        self.app = app
        self._build_ui()

    def _build_ui(self):
        topbar = ctk.CTkFrame(self, fg_color=COLORS["bg_card"], height=50, corner_radius=0)
        topbar.pack(fill="x", side="top")
        topbar.pack_propagate(False)

        brand = ctk.CTkFrame(topbar, fg_color="transparent")
        brand.pack(side="left", padx=16)
        ctk.CTkLabel(brand, text="🔒", font=("Segoe UI Emoji", 14),
                     text_color=COLORS["text_main"]).pack(side="left", padx=(0,8))
        ctk.CTkLabel(brand, text="Buku Harian Rahasia", font=("Georgia", 13),
                     text_color=COLORS["text_main"]).pack(side="left")

        right = ctk.CTkFrame(topbar, fg_color="transparent")
        right.pack(side="right", padx=16)

        ctk.CTkButton(right, text="Keluar", width=70, height=30, font=("Georgia", 11),
                      text_color=COLORS["text_muted"], fg_color="transparent",
                      border_color=COLORS["border"], border_width=1, corner_radius=4,
                      hover_color=COLORS["bg_input"],
                      command=lambda: self.app.do_logout()).pack(side="left")

        content = ctk.CTkFrame(self, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=24, pady=16)

        header = ctk.CTkFrame(content, fg_color="transparent")
        header.pack(fill="x", pady=(0,12))

        tf = ctk.CTkFrame(header, fg_color="transparent")
        tf.pack(side="left")
        ctk.CTkLabel(tf, text="Catatan Harianmu", font=("Georgia", 18, "bold"),
                     text_color=COLORS["text_main"]).pack(anchor="w")
        self.lbl_count = ctk.CTkLabel(tf, text="0 catatan · terenkripsi",
                                      font=("Courier", 10), text_color=COLORS["text_muted"])
        self.lbl_count.pack(anchor="w", pady=(2,0))

        ctk.CTkButton(header, text="+ Catatan Baru", width=140, height=36,
                      font=("Georgia", 12), text_color=COLORS["text_main"],
                      fg_color="transparent", border_color=COLORS["gold"],
                      border_width=1, corner_radius=4, hover_color=COLORS["bg_card"],
                      command=lambda: self.app.show_editor(None)).pack(side="right")

        ctk.CTkFrame(content, fg_color=COLORS["border"], height=1).pack(fill="x", pady=(0,12))

        self.scroll = ctk.CTkScrollableFrame(content, fg_color="transparent",
                                             scrollbar_button_color=COLORS["border"],
                                             scrollbar_button_hover_color=COLORS["text_fade"])
        self.scroll.pack(fill="both", expand=True)
        self.scroll.grid_columnconfigure(0, weight=1)
        self.scroll.grid_columnconfigure(1, weight=1)

    def refresh(self):
        from database import load_entries

        for w in self.scroll.winfo_children():
            w.destroy()

        entries = load_entries(self.app.current_user)
        self.lbl_count.configure(text=f"{len(entries)} catatan tersimpan · terenkripsi")

        if not entries:
            ctk.CTkLabel(self.scroll, text="Belum ada catatan.\nKlik '+ Catatan Baru' untuk mulai.",
                         font=("Georgia", 13), text_color=COLORS["text_muted"],
                         justify="center").grid(row=0, column=0, columnspan=2, pady=80)
            return

        for i, entry in enumerate(entries):
            r, c = i // 2, i % 2
            dt, dc = entry['title'], entry['content']
            preview = dc[:100] + ("..." if len(dc) > 100 else "")
            self._card(r, c, entry, dt, preview)

    def _card(self, row, col, entry, dt, preview):
        eid = entry['id']
        card = ctk.CTkFrame(self.scroll, fg_color=COLORS["bg_card"], corner_radius=6,
                            border_width=1, border_color=COLORS["border"])
        card.grid(row=row, column=col, padx=6, pady=6, sticky="nsew")

        df = ctk.CTkFrame(card, fg_color="transparent")
        df.pack(fill="x", padx=14, pady=(12,4))
        ctk.CTkLabel(df, text="●", font=("Georgia", 6),
                     text_color=COLORS["gold"]).pack(side="left", padx=(0,6))
        ctk.CTkLabel(df, text=format_date(entry['date']), font=("Courier", 10),
                     text_color=COLORS["text_muted"]).pack(side="left")
        if entry.get('mood'):
            ctk.CTkLabel(df, text=entry['mood'], font=("Segoe UI Emoji", 13)).pack(side="right")

        tl = ctk.CTkLabel(card, text=dt, font=("Georgia", 14, "bold"),
                          text_color=COLORS["text_main"], anchor="w", wraplength=350)
        tl.pack(fill="x", padx=14, pady=(4,2))

        pl = ctk.CTkLabel(card, text=preview, font=("Georgia", 11),
                          text_color=COLORS["text_muted"], anchor="w",
                          wraplength=350, justify="left")
        pl.pack(fill="x", padx=14, pady=(0,8))

        ft = ctk.CTkFrame(card, fg_color="transparent")
        ft.pack(fill="x", padx=14, pady=(0,12))
        ctk.CTkLabel(ft, text="ENCRYPTED" if entry['encrypted'] else "PLAINTEXT",
                     font=("Courier", 9), text_color=COLORS["gold"]).pack(side="left")

        ctk.CTkButton(ft, text="✕", width=28, height=28, font=("Georgia", 13),
                      text_color=COLORS["text_muted"], fg_color="transparent",
                      hover_color=COLORS["seal_red"], corner_radius=4,
                      command=lambda e=eid: self._del(e)).pack(side="right", padx=(4,0))
        ctk.CTkButton(ft, text="✎", width=28, height=28, font=("Georgia", 13),
                      text_color=COLORS["text_muted"], fg_color="transparent",
                      hover_color=COLORS["bg_input"], corner_radius=4,
                      command=lambda e=eid: self.app.show_editor(e)).pack(side="right")

        for w in [card, tl, pl]:
            w.bind("<Button-1>", lambda ev, e=eid: self.app.show_editor(e))
            w.configure(cursor="hand2")

    def _del(self, eid):
        from database import delete_entry
        if messagebox.askyesno("Hapus Catatan", "Yakin ingin menghapus catatan ini?"):
            delete_entry(eid)
            self.refresh()
