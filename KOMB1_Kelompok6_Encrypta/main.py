from flask import Flask, render_template, request, send_file, redirect, url_for, flash
from cryptography.fernet import Fernet, InvalidToken
from werkzeug.utils import secure_filename
import hashlib
import base64
import os

app = Flask(__name__)
app.secret_key = "secret123"

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Generate key dari password user
def generate_key(password):
    hashed = hashlib.sha256(password.encode()).digest()
    return base64.urlsafe_b64encode(hashed)


# LANDING PAGE
@app.route("/")
def home():
    return render_template("home.html")


# HALAMAN ENCRYPT / DECRYPT
@app.route("/secure")
def secure():
    return render_template("secure.html")


# PROCESS ENCRYPT / DECRYPT
@app.route("/process", methods=["POST"])
def process():

    file = request.files.get("file")
    password = request.form.get("password")
    action = request.form.get("action")

    # Validasi input
    if not file or file.filename == "" or not password:
        flash("❌ File dan password wajib diisi!")
        return redirect(url_for("secure"))

    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    file.save(filepath)

    key = generate_key(password)
    cipher = Fernet(key)

    try:

        with open(filepath, "rb") as f:
            data = f.read()

        # ENCRYPT
        if action == "encrypt":

            result = cipher.encrypt(data)
            output_filename = filename + ".enc"

        # DECRYPT
        elif action == "decrypt":

            result = cipher.decrypt(data)

            if filename.endswith(".enc"):
                output_filename = filename.replace(".enc", "")
            else:
                output_filename = filename + "_decrypted"

        else:
            flash("❌ Aksi tidak dikenali!")
            return redirect(url_for("secure"))

        output_path = os.path.join(UPLOAD_FOLDER, output_filename)

        with open(output_path, "wb") as f:
            f.write(result)

        return send_file(output_path, as_attachment=True)

    # PASSWORD SALAH
    except InvalidToken:
        return redirect(url_for("secure", error="wrongkey"))

    # ERROR LAIN
    except Exception:
        flash("❌ Terjadi kesalahan saat memproses file.")
        return redirect(url_for("secure"))


@app.route("/download/<filename>")
def download(filename):

    path = os.path.join(UPLOAD_FOLDER, filename)

    if not os.path.exists(path):
        flash("❌ File tidak ditemukan.")
        return redirect(url_for("secure"))

    return send_file(path, as_attachment=True)


if __name__ == "__main__":
    app.run(debug=True)