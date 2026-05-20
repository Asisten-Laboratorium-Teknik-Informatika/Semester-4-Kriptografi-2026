import java.math.BigInteger;
import java.security.*;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.Base64;
import javax.crypto.Cipher;

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    RSALogic.java                             ║
 * ║           Implementasi RSA Enkripsi & Dekripsi               ║
 * ║                                                              ║
 * ║  Alur kerja:                                                 ║
 * ║  1. generate() → buat pasangan kunci publik + privat         ║
 * ║  2. encrypt()  → enkripsi plaintext pakai kunci PUBLIK       ║
 * ║  3. decrypt()  → dekripsi ciphertext pakai kunci PRIVAT      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
public class RSALogic {

    // ── KONSTANTA ──────────────────────────────────────────────
    private static final String ALGORITHM       = "RSA";
    private static final String TRANSFORMATION  = "RSA/ECB/PKCS1Padding";
    private static final int    KEY_SIZE        = 2048;

    // ── PENYIMPANAN KUNCI ─────────────────────────────────────
    private static PublicKey  publicKey;
    private static PrivateKey privateKey;

    // ── INFO TAMPILAN ─────────────────────────────────────────
    private static String publicKeyInfo  = "";
    private static String privateKeyInfo = "";


    // ══════════════════════════════════════════════════════════
    //  1. GENERATE KEY PAIR
    // ══════════════════════════════════════════════════════════
    public static void generateKeyPair() throws NoSuchAlgorithmException {
        System.out.println("Generate RSA Key Pair berjalan");
        KeyPairGenerator generator = KeyPairGenerator.getInstance(ALGORITHM);
        generator.initialize(KEY_SIZE, new SecureRandom());
        KeyPair keyPair = generator.generateKeyPair();

        publicKey  = keyPair.getPublic();
        privateKey = keyPair.getPrivate();

        String pubBase64  = Base64.getEncoder().encodeToString(publicKey.getEncoded());
        String privBase64 = Base64.getEncoder().encodeToString(privateKey.getEncoded());

        BigInteger modulus = ((RSAPublicKey) publicKey).getModulus();

        publicKeyInfo = "RSA-" + KEY_SIZE + " Public Key\n"
            + "Modulus (n): " + modulus.bitLength() + " bit\n"
            + pubBase64.substring(0, 40) + "...";

        privateKeyInfo = "RSA-" + KEY_SIZE + " Private Key\n"
            + "[PRIVATE — tidak ditampilkan]\n"
            + privBase64.substring(0, 20) + "... [tersembunyi]";
    }


    // ══════════════════════════════════════════════════════════
    //  2. ENCRYPT
    //     C = M^e mod n
    // ══════════════════════════════════════════════════════════
    public static String encrypt(String plaintext) throws Exception {
        System.out.println("RSA Encrypt berjalan");
        if (publicKey == null) generateKeyPair();

        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, publicKey);
        byte[] encryptedBytes = cipher.doFinal(plaintext.getBytes("UTF-8"));
        return Base64.getEncoder().encodeToString(encryptedBytes);
    }


    // ══════════════════════════════════════════════════════════
    //  3. DECRYPT
    //     M = C^d mod n
    // ══════════════════════════════════════════════════════════
    public static String decrypt(String ciphertext) throws Exception {
        System.out.println("RSA Decrypt berjalan");
        if (privateKey == null) throw new Exception("Kunci privat belum tersedia!");

        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, privateKey);
        byte[] encryptedBytes = Base64.getDecoder().decode(ciphertext);
        byte[] decryptedBytes = cipher.doFinal(encryptedBytes);
        return new String(decryptedBytes, "UTF-8");
    }


    // ══════════════════════════════════════════════════════════
    //  4. GETTER
    // ══════════════════════════════════════════════════════════
    public static String getPublicKeyInfo() {
        return publicKeyInfo.isEmpty() ? "(belum digenerate)" : publicKeyInfo;
    }

    public static String getPrivateKeyInfo() {
        return privateKeyInfo.isEmpty() ? "(belum digenerate)" : privateKeyInfo;
    }

    public static boolean isReady() {
        return publicKey != null && privateKey != null;
    }

    /** Format ciphertext Base64 agar tampil rapi di UI (potong per 22 karakter) */
    public static String formatCipherForDisplay(String base64cipher) {
        StringBuilder sb = new StringBuilder();
        int chunkSize = 22;
        for (int i = 0; i < base64cipher.length(); i += chunkSize) {
            int end = Math.min(i + chunkSize, base64cipher.length());
            sb.append(base64cipher, i, end);
            if (end < base64cipher.length()) sb.append('\n');
        }
        return sb.toString();
    }
}