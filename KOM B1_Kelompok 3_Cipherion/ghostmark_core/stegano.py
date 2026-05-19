from PIL import Image
from reedsolo import RSCodec, ReedSolomonError
import numpy as np
import io
import struct


RS_ECC_SYMBOLS = 40
rs             = RSCodec(RS_ECC_SYMBOLS)

MAGIC   = b'\x47\x48\x53\x54'   
VERSION = b'\x02'                

JPEG_EMBED_QUALITY = 95

QIM_STRENGTH = 25.0

EMBED_POSITIONS = [
    (0, 2), (0, 3), (1, 1), (1, 2),
    (2, 0), (2, 1), (3, 0), (0, 4),
    (1, 3), (2, 2),
]
BITS_PER_BLOCK = len(EMBED_POSITIONS)   


#Utilitas bit 
def _bytes_to_bits(data: bytes) -> list:
    bits = []
    for byte in data:
        for i in range(7, -1, -1):
            bits.append((byte >> i) & 1)
    return bits


def _bits_to_bytes(bits: list) -> bytes:
    result = bytearray()
    for i in range(0, len(bits) - 7, 8):
        byte = 0
        for b in bits[i:i + 8]:
            byte = (byte << 1) | b
        result.append(byte)
    return bytes(result)


#DCT helpers 
def _dct2(block: np.ndarray) -> np.ndarray:
    from scipy.fft import dctn
    return dctn(block.astype(np.float64), norm='ortho')


def _idct2(block: np.ndarray) -> np.ndarray:
    from scipy.fft import idctn
    return idctn(block, norm='ortho')


def _get_blocks(channel: np.ndarray):
    h, w = channel.shape
    ph   = ((h + 7) // 8) * 8
    pw   = ((w + 7) // 8) * 8
    padded = np.zeros((ph, pw), dtype=np.float64)
    padded[:h, :w] = channel
    n_by = ph // 8
    n_bx = pw // 8
    blocks = [
        [padded[by*8:(by+1)*8, bx*8:(bx+1)*8].copy() for bx in range(n_bx)]
        for by in range(n_by)
    ]
    return blocks, n_by, n_bx, (ph, pw), (h, w)


def _reconstruct(blocks, n_by, n_bx, padded_shape, orig_shape) -> np.ndarray:
    ph, pw = padded_shape
    h, w   = orig_shape
    result = np.zeros((ph, pw), dtype=np.float64)
    for by in range(n_by):
        for bx in range(n_bx):
            result[by*8:(by+1)*8, bx*8:(bx+1)*8] = blocks[by][bx]
    return np.clip(result[:h, :w], 0, 255).astype(np.uint8)


#QIM Embed & Extract
def _embed_dct(channel: np.ndarray, bits: list) -> np.ndarray:
    blocks, n_by, n_bx, padded_shape, orig_shape = _get_blocks(channel)
    bit_idx    = 0
    total_bits = len(bits)
    s          = QIM_STRENGTH

    for by in range(n_by):
        for bx in range(n_bx):
            if bit_idx >= total_bits:
                break
            dct_block = _dct2(blocks[by][bx])
            for (r, c) in EMBED_POSITIONS:
                if bit_idx >= total_bits:
                    break
                coef = dct_block[r, c]
                q    = round(coef / s) * s
                idx  = int(round(q / s))
                if bits[bit_idx] == 1:
                    if idx % 2 == 0:
                        q += s
                else:
                    if idx % 2 != 0:
                        q -= s
                dct_block[r, c] = q
                bit_idx += 1
            blocks[by][bx] = _idct2(dct_block)

    return _reconstruct(blocks, n_by, n_bx, padded_shape, orig_shape)


def _extract_dct(channel: np.ndarray, n_bits: int) -> list:
    blocks, n_by, n_bx, _, _ = _get_blocks(channel)
    bits = []
    s    = QIM_STRENGTH

    for by in range(n_by):
        for bx in range(n_bx):
            if len(bits) >= n_bits:
                break
            dct_block = _dct2(blocks[by][bx])
            for (r, c) in EMBED_POSITIONS:
                if len(bits) >= n_bits:
                    break
                bits.append(int(round(dct_block[r, c] / s)) % 2)

    return bits[:n_bits]


#Kapasitas 
def get_capacity(width: int, height: int) -> int:
    """
    Kapasitas payload maksimum (bytes) untuk gambar W x H.
    Kapasitas usable untuk pesan = hasil ini dikurangi 9 (header) dan RS_ECC overhead.
    """
    n_blocks = (width // 8) * (height // 8)
    return (n_blocks * BITS_PER_BLOCK) // 8


#Public API 
def encode_image(image_bytes: bytes, secret_message: str) -> bytes:
    img      = Image.open(io.BytesIO(image_bytes)).convert('YCbCr')
    img_arr  = np.array(img)
    Y  = img_arr[:, :, 0]
    Cb = img_arr[:, :, 1]
    Cr = img_arr[:, :, 2]
    h, w = Y.shape

    max_bytes = get_capacity(w, h)

    #Reed-Solomon encode
    msg_bytes  = secret_message.encode('utf-8')
    rs_encoded = bytes(rs.encode(msg_bytes))

    #Build payload
    header  = MAGIC + VERSION + struct.pack('>I', len(rs_encoded))
    payload = header + rs_encoded

    if len(payload) > max_bytes:
        usable = max_bytes - 9 - RS_ECC_SYMBOLS
        raise ValueError(
            f"Pesan terlalu panjang! Kapasitas maksimum ~{usable} byte "
            f"untuk gambar {w}x{h}px. Gunakan gambar lebih besar atau persingkat pesan."
        )

    #Embed ke channel Y (luminance)
    Y_stego    = _embed_dct(Y.astype(np.float64), _bytes_to_bits(payload))

    #Rekonstruksi gambar dan simpan sebagai JPEG
    result_arr = np.stack([Y_stego, Cb, Cr], axis=2).astype(np.uint8)
    result_img = Image.fromarray(result_arr, mode='YCbCr').convert('RGB')

    output = io.BytesIO()
    result_img.save(output, format='JPEG', quality=JPEG_EMBED_QUALITY, subsampling=0)
    return output.getvalue()


def decode_image(image_bytes: bytes) -> str:
    img = Image.open(io.BytesIO(image_bytes)).convert('YCbCr')
    Y   = np.array(img)[:, :, 0].astype(np.float64)

    header_bits  = _extract_dct(Y, 72)
    header_bytes = _bits_to_bytes(header_bits)

    if header_bytes[:4] != MAGIC:
        raise ValueError(
            "Gambar ini bukan file GhostMark atau tidak mengandung pesan tersembunyi."
        )

    #versi 1
    version = header_bytes[4:5]
    if version == b'\x01':
        raise ValueError(
            "Gambar ini menggunakan format LSB lama (GhostMark v1). "
            "Gunakan versi aplikasi sebelumnya untuk mendekripsi."
        )
    if version != VERSION:
        raise ValueError(
            f"Versi protokol tidak dikenal: {version.hex()}. Perbarui aplikasi GhostMark."
        )

    # Baca RS payload sesuai panjang di header
    rs_length        = struct.unpack('>I', header_bytes[5:9])[0]
    total_bits       = 72 + (rs_length * 8)
    all_bits         = _extract_dct(Y, total_bits)
    rs_encoded_bytes = _bits_to_bytes(all_bits[72:])

    # Reed-Solomon decode + koreksi error otomatis
    try:
        decoded, _, _ = rs.decode(bytearray(rs_encoded_bytes))
        return bytes(decoded).decode('utf-8')
    except ReedSolomonError:
        raise ValueError(
            "Pesan tidak dapat dipulihkan. Gambar mengalami kompresi yang terlalu berat "
            "(JPEG Q < 40) atau telah dimanipulasi. "
            "Pastikan gambar dikirim sebagai file/dokumen, bukan sebagai foto biasa."
        )