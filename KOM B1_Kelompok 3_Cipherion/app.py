from flask import Flask, request, jsonify, render_template, send_file
import io
import os
from ghostmark_core.aes_cipher import encrypt_message, decrypt_message
from ghostmark_core.stegano import encode_image, decode_image

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # Maksimal 10MB


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'webp', 'tiff'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def welcome():
    return render_template('welcome.html')

@app.route('/app')
def index():
    return render_template('index.html')


@app.route('/encode', methods=['POST'])
def encode():
    """
    Terima gambar + pesan + key dari frontend.
    Enkripsi pesan dengan AES, lalu sisipkan ke gambar menggunakan DCT steganography.
    Kirimkan gambar hasil (JPEG) ke pengguna.

    Catatan: Output adalah JPEG — kirim sebagai file/dokumen di WhatsApp
    (bukan sebagai foto) agar pesan tidak rusak akibat re-kompresi.
    Modul DCT tetap tahan kompresi hingga JPEG Q=50 sebagai safety net.
    """
    if 'image' not in request.files:
        return jsonify({'error': 'Tidak ada file gambar yang dikirim.'}), 400

    file    = request.files['image']
    message = request.form.get('message', '').strip()
    key     = request.form.get('key', '').strip()

    if file.filename == '':
        return jsonify({'error': 'Silakan pilih file gambar terlebih dahulu.'}), 400
    if not allowed_file(file.filename):
        return jsonify({
            'error': 'Format file tidak didukung. Gunakan PNG, JPG, JPEG, BMP, WEBP, atau TIFF.'
        }), 400
    if not message:
        return jsonify({'error': 'Pesan tidak boleh kosong.'}), 400
    if not key:
        return jsonify({'error': 'Key tidak boleh kosong.'}), 400

    try:
        image_bytes = file.read()

        #enkripsi pesan menggunakan AES
        encrypted = encrypt_message(message, key)

        #sisipkan pesan terenkripsi ke gambar menggunakan DCT steganography
        result_bytes = encode_image(image_bytes, encrypted)

        return send_file(
            io.BytesIO(result_bytes),
            mimetype='image/jpeg',
            as_attachment=True,
            download_name='ghostmark_encoded.jpg'
        )

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Terjadi kesalahan: {str(e)}'}), 500


@app.route('/decode', methods=['POST'])
def decode():
    """
    Terima gambar + key dari frontend.
    Ekstrak pesan tersembunyi menggunakan DCT steganography, lalu dekripsi dengan AES.
    Kirimkan pesan asli ke frontend.
    """
    if 'image' not in request.files:
        return jsonify({'error': 'Tidak ada file gambar yang dikirim.'}), 400

    file = request.files['image']
    key  = request.form.get('key', '').strip()

    if file.filename == '':
        return jsonify({'error': 'Silakan pilih file gambar terlebih dahulu.'}), 400
    if not allowed_file(file.filename):
        return jsonify({
            'error': 'Format file tidak didukung. Gunakan PNG, JPG, JPEG, BMP, WEBP, atau TIFF.'
        }), 400
    if not key:
        return jsonify({'error': 'Key tidak boleh kosong.'}), 400

    try:
        image_bytes = file.read()

        # ekstrak pesan terenkripsi dari gambar menggunakan DCT steganography
        extracted = decode_image(image_bytes)

        # dekripsi pesan menggunakan AES
        original_message = decrypt_message(extracted, key)

        return jsonify({'message': original_message})

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception:
        return jsonify({
            'error': 'Key salah atau gambar tidak mengandung pesan GhostMark.'
        }), 400


if __name__ == '__main__':
    app.run(debug=True)