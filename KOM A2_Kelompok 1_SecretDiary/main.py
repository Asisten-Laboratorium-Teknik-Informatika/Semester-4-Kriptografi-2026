import customtkinter as ctk
from database import init_db
from ui_login import LoginFrame
from ui_list import ListFrame
from ui_editor import EditorFrame


class App(ctk.CTk):

    def __init__(self):
        super().__init__()

        self.title("Buku Harian Rahasia")
        self.state('zoomed')

        self.current_user = ""
        self.current_entry_id = None

        init_db()

        self._build_frames()

        self._check_first_run()

    def _build_frames(self):
        self.container = ctk.CTkFrame(self, fg_color="#1a1410")
        self.container.pack(fill="both", expand=True)
        self.container.grid_rowconfigure(0, weight=1)
        self.container.grid_columnconfigure(0, weight=1)

        self.login_frame = LoginFrame(self.container, self)
        self.list_frame = ListFrame(self.container, self)
        self.editor_frame = EditorFrame(self.container, self)

        for frame in (self.login_frame, self.list_frame, self.editor_frame):
            frame.grid(row=0, column=0, sticky="nsew")

        self.login_frame.tkraise()

    def _check_first_run(self):
        self.login_frame.reset()

    def show_login(self):
        self.login_frame.reset()
        self.login_frame.tkraise()

    def show_list(self):
        self.list_frame.refresh()
        self.list_frame.tkraise()

    def show_editor(self, entry_id=None):
        self.current_entry_id = entry_id
        self.editor_frame.load_entry(entry_id)
        self.editor_frame.tkraise()

    def do_logout(self):
        self.current_user = ""
        self.show_login()


if __name__ == "__main__":
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("dark-blue")
    app = App()
    app.mainloop()
