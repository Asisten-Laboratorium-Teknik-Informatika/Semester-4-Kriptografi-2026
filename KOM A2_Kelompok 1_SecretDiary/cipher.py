def vigenere_encrypt(text: str, key: str) -> str:
    k = ''.join([c for c in key.upper() if c.isalpha()])
    if not k or not text:
        return text
    result = []
    ki = 0
    for ch in text:
        if ch.isalpha():
            is_upper = ch.isupper()
            p = ord(ch.upper()) - 64
            kc = ord(k[ki % len(k)]) - 64
            c = ((p + kc - 2) % 26) + 1
            enc = chr(c + 64)
            result.append(enc if is_upper else enc.lower())
            ki += 1
        else:
            result.append(ch)
    return ''.join(result)


def vigenere_decrypt(text: str, key: str) -> str:
    k = ''.join([c for c in key.upper() if c.isalpha()])
    if not k or not text:
        return text
    result = []
    ki = 0
    for ch in text:
        if ch.isalpha():
            is_upper = ch.isupper()
            c = ord(ch.upper()) - 64
            kc = ord(k[ki % len(k)]) - 64
            p = ((c - kc + 26) % 26) + 1
            dec = chr(p + 64)
            result.append(dec if is_upper else dec.lower())
            ki += 1
        else:
            result.append(ch)
    return ''.join(result)


def get_math_steps(text: str, key: str, max_chars: int = 8) -> list:
    k = ''.join([c for c in key.upper() if c.isalpha()])
    if not k:
        return []
    steps = []
    ki = 0
    for ch in text:
        if len(steps) >= max_chars:
            break
        if ch.isalpha():
            p = ord(ch.upper()) - 64
            kc_char = k[ki % len(k)]
            kc = ord(kc_char) - 64
            c = ((p + kc - 2) % 26) + 1
            steps.append({
                'plain':       ch.upper(),
                'p_val':       p,
                'key_char':    kc_char,
                'k_val':       kc,
                'formula_str': f"({p}+{kc}-2)%26+1",
                'c_val':       c,
                'cipher':      chr(c + 64)
            })
            ki += 1
    return steps

if __name__ == "__main__":
    print("Menjalankan self-test 676 kombinasi roundtrip...")
    errors = 0
    for p_code in range(1, 27):
        for k_code in range(1, 27):
            plain_char = chr(p_code + 64)
            key_char = chr(k_code + 64)
            encrypted = vigenere_encrypt(plain_char, key_char)
            decrypted = vigenere_decrypt(encrypted, key_char)
            if decrypted != plain_char:
                print(f"  GAGAL: P={plain_char} K={key_char} -> E={encrypted} -> D={decrypted}")
                errors += 1
    if errors == 0:
        print(f"  [OK] Semua 676 kombinasi roundtrip BERHASIL")
    else:
        print(f"  [FAIL] {errors} kombinasi GAGAL")

    test = "Hello World 123!"
    key = "SECRET"
    enc = vigenere_encrypt(test, key)
    dec = vigenere_decrypt(enc, key)
    print(f"\n  Plaintext:  {test}")
    print(f"  Encrypted:  {enc}")
    print(f"  Decrypted:  {dec}")
    assert dec == test, "Case preservation test GAGAL!"
    print("  [OK] Case preservation test BERHASIL")

    steps = get_math_steps("Hello", "KEY", max_chars=5)
    print(f"\n  Math steps untuk 'Hello' dengan kunci 'KEY':")
    for s in steps:
        print(f"    {s['plain']} (P={s['p_val']}) + {s['key_char']} (K={s['k_val']}) "
              f"= {s['formula_str']} = {s['c_val']} -> {s['cipher']}")
    print("\n  Semua test selesai.")
