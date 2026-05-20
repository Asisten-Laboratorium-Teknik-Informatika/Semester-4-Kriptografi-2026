// ── helpers ──
        function mod(a, n) {
            return ((a % n) + n) % n;
        }

        function gcd(a, b) {
            while (b) {
                [a, b] = [b, a % b];
            }
            return a;
        }

        function isPrime(n) {
            if (n < 2) return false;

            const limit = Math.sqrt(n);

            for (let i = 2; i <= limit; i++) {
                if (n % i === 0) return false;
            }

            return true;
        }

        function extGCD(a, b) {
            if (b === 0) return [1, 0];
            const [x, y] = extGCD(b, a % b);
            return [y, x - Math.floor(a / b) * y];
        }

        function modInverse(e, phi) {
            const [x] = extGCD(e, phi);
            return mod(x, phi);
        }

        function modPow(base, exp, m) {
            let r = 1n;
            let b = BigInt(base) % BigInt(m);
            let e = BigInt(exp);
            let M = BigInt(m);

            while (e > 0n) {
                if (e % 2n === 1n) {
                    r = (r * b) % M;
                }

                e /= 2n;
                b = (b * b) % M;
            }

            return r.toString();
        }

        // ── nav ──
        function switchPanel(name, btn) {
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('panel-' + name).classList.add('active');
            btn.classList.add('active');
        }

        // ── caesar ──
        let cTab = 'enc';

        function caesarTab(t, btn) {
            cTab = t;
            document.getElementById('c-enc').style.display = t === 'enc' ? 'block' : 'none';
            document.getElementById('c-dec').style.display = t === 'dec' ? 'block' : 'none';
            document.getElementById('c-brute').style.display = t === 'brute' ? 'block' : 'none';
            document.querySelectorAll('#panel-caesar .tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }

        function caesarProc(text, shift, enc) {
            const steps = [];
            let result = '';
            const s = enc ? shift : -shift;
            for (let i = 0; i < text.length; i++) {
                const c = text[i];
                if (/[a-zA-Z]/.test(c)) {
                    const base = c <= 'Z' ? 65 : 97;
                    const p = c.charCodeAt(0) - base;
                    const r = mod(p + s, 26);
                    const out = String.fromCharCode(r + base);
                    steps.push({
                        c,
                        p,
                        s,
                        r,
                        out
                    });
                    result += out;
                } else result += c;
            }
            return {
                result,
                steps
            };
        }

        function caesarDo(enc) {
            const text = document.getElementById('c-plain').value;
            const key = parseInt(document.getElementById('c-key').value) || 3;
            if (!text.trim()) return;
            const {
                result,
                steps
            } = caesarProc(text, key, enc);
            document.getElementById('c-out').textContent = result;
            document.getElementById('c-result').style.display = 'block';
            const shown = steps.slice(0, 8);
            const formula = enc ? 'C = (P + k) mod 26' : 'P = (C − k) mod 26';
            document.getElementById('c-steps-body').innerHTML =
                `<div class="step-item">Rumus: <span class="accent">${formula}</span></div>` +
                shown.map(s => `<div class="step-item">'<span class="hi">${s.c}</span>'(${s.p}) ${enc?'+':'−'} ${Math.abs(s.s)} mod 26 = <span class="accent">${s.r}</span> → '<span class="hi">${s.out}</span>'</div>`).join('') +
                (steps.length > 8 ? `<div class="step-item" style="color:#475569">...dan ${steps.length-8} karakter lagi</div>` : '');
            document.getElementById('c-steps').style.display = 'block';
            renderAlpha(key);
        }

        function caesarDecPanel() {
            const text = document.getElementById('c-dec-in').value;
            const key = parseInt(document.getElementById('c-dec-key').value) || 3;
            if (!text.trim()) return;
            const {
                result,
                steps
            } = caesarProc(text, key, false);
            document.getElementById('c-dec-out').textContent = result;
            document.getElementById('c-dec-result').style.display = 'block';
            const shown = steps.slice(0, 8);
            document.getElementById('c-dec-steps-body').innerHTML =
                `<div class="step-item">Rumus: <span class="accent">P = (C − k) mod 26</span></div>` +
                shown.map(s => `<div class="step-item">'<span class="hi">${s.c}</span>'(${s.p}) − ${Math.abs(s.s)} mod 26 = <span class="accent">${s.r}</span> → '<span class="hi">${s.out}</span>'</div>`).join('') +
                (steps.length > 8 ? `<div class="step-item" style="color:#475569">...dan ${steps.length-8} karakter lagi</div>` : '');
            document.getElementById('c-dec-steps').style.display = 'block';
        }

        function caesarBrute() {
            const text = document.getElementById('c-brute-in').value;
            if (!text.trim()) return;
            let html = '';
            for (let k = 1; k <= 25; k++) {
                const {
                    result
                } = caesarProc(text, k, false);
                html += `<div class="brute-item"><span class="k">k=${String(k).padStart(2,'0')}</span><span class="v">${result}</span></div>`;
            }
            document.getElementById('c-brute-body').innerHTML = html;
            document.getElementById('c-brute-result').style.display = 'block';
        }

        function renderAlpha(shift) {
            const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const plain = document.getElementById('alpha-plain');
            const cipher = document.getElementById('alpha-cipher');
            document.getElementById('shift-label').textContent = shift;
            plain.innerHTML = A.split('').map(c => `<div class="mono-cell">${c}</div>`).join('');
            cipher.innerHTML = A.split('').map((_, i) => `<div class="mono-cell active">${A[mod(i+shift,26)]}</div>`).join('');
        }
        renderAlpha(3);

        // ── hashing ──
// ── hashing ──
        let selAlgo = 'MD5';
        const hashInfo = {
            'MD5': {
                bits: '128 bit / 32 hex',
                status: '⚠ Rentan collision',
                statusColor: '#fbbf24',
                use: 'Checksum file, legacy system'
            },
            'SHA-1': {
                bits: '160 bit / 40 hex',
                status: '⚠ Tidak disarankan',
                statusColor: '#fbbf24',
                use: 'Git commit, legacy'
            },
            'SHA-256': {
                bits: '256 bit / 64 hex',
                status: '✓ Aman',
                statusColor: '#34d399',
                use: 'Blockchain, TLS, password hashing'
            },
            'SHA-512': {
                bits: '512 bit / 128 hex',
                status: '✓ Sangat aman',
                statusColor: '#34d399',
                use: 'High-security applications'
            },
        };

        function selectAlgo(btn) {
            selAlgo = btn.dataset.algo;
            document.querySelectorAll('#h-chips .chip').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            updateHashInfo();
        }

        function updateHashInfo() {
            const d = hashInfo[selAlgo];
            document.getElementById('h-info').innerHTML = `
    <div class="kv"><span>Algoritma</span><span>${selAlgo}</span></div>
    <div class="kv"><span>Output</span><span>${d.bits}</span></div>
    <div class="kv"><span>Keamanan</span><span style="color:${d.statusColor}">${d.status}</span></div>
    <div class="kv"><span>Kegunaan</span><span>${d.use}</span></div>`;
        }
        updateHashInfo();
        async function hashText(text, algo) {
            if (algo === 'MD5') return md5(text);
            const enc = new TextEncoder();
            const buf = await crypto.subtle.digest(algo, enc.encode(text));
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        async function doHash() {
            const text = document.getElementById('h-in').value;
            if (!text.trim()) return;
            const h = await hashText(text, selAlgo);
            document.getElementById('h-result').innerHTML = `
    <div class="result-box">
      <div class="result-label">${selAlgo} hash</div>
      <div class="result-value" style="font-size:12px">${h}</div>
      <div style="margin-top:8px;font-size:11px;color:#475569">${h.length} karakter hex · ${h.length*4} bit · input: "${text.substring(0,30)}${text.length>30?'...':''}"</div>
    </div>`;
        }
        async function hashAll() {
            const text = document.getElementById('h-in').value;
            if (!text.trim()) return;
            const algos = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];
            const hashes = await Promise.all(algos.map(a => hashText(text, a)));
            document.getElementById('h-result').innerHTML = algos.map((a, i) => `
    <div class="result-box" style="margin-bottom:8px">
      <div class="result-label">${a}</div>
      <div class="result-value" style="font-size:11px">${hashes[i]}</div>
    </div>`).join('');
        }

        // MD5 implementation
        function md5(str) {
            function safeAdd(x, y) {
                const l = (x & 0xFFFF) + (y & 0xFFFF);
                return ((x >> 16) + (y >> 16) + (l >> 16) << 16) | (l & 0xFFFF);
            }

            function rol(n, c) {
                return (n << c) | (n >>> (32 - c));
            }

            function cmn(q, a, b, x, s, t) {
                return safeAdd(rol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
            }

            function ff(a, b, c, d, x, s, t) {
                return cmn((b & c) | ((~b) & d), a, b, x, s, t);
            }

            function gg(a, b, c, d, x, s, t) {
                return cmn((b & d) | (c & (~d)), a, b, x, s, t);
            }

            function hh(a, b, c, d, x, s, t) {
                return cmn(b ^ c ^ d, a, b, x, s, t);
            }

            function ii(a, b, c, d, x, s, t) {
                return cmn(c ^ (b | (~d)), a, b, x, s, t);
            }
            let s = '';
            for (let i = 0; i < str.length; i++) {
                const c = str.charCodeAt(i);
                if (c < 128) s += String.fromCharCode(c);
                else if (c < 2048) s += String.fromCharCode((c >> 6) | 192, (c & 63) | 128);
                else s += String.fromCharCode((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128);
            }
            str = s;
            const len = str.length;
            const W = [];
            for (let i = 0; i < len; i += 4) W.push(str.charCodeAt(i) | (str.charCodeAt(i + 1) << 8) | (str.charCodeAt(i + 2) << 16) | (str.charCodeAt(i + 3) << 24));
            W[len >> 2] |= 0x80 << ((len % 4) * 8);
            W[(((len + 8) >> 6) << 4) + 14] = len * 8;
            let a = 1732584193,
                b = -271733879,
                c = -1732584194,
                d = 271733878;
            for (let i = 0; i < W.length; i += 16) {
                const [A, B, C, D] = [a, b, c, d];
                a = ff(a, b, c, d, W[i], 7, -680876936);
                d = ff(d, a, b, c, W[i + 1], 12, -389564586);
                c = ff(c, d, a, b, W[i + 2], 17, 606105819);
                b = ff(b, c, d, a, W[i + 3], 22, -1044525330);
                a = ff(a, b, c, d, W[i + 4], 7, -176418897);
                d = ff(d, a, b, c, W[i + 5], 12, 1200080426);
                c = ff(c, d, a, b, W[i + 6], 17, -1473231341);
                b = ff(b, c, d, a, W[i + 7], 22, -45705983);
                a = ff(a, b, c, d, W[i + 8], 7, 1770035416);
                d = ff(d, a, b, c, W[i + 9], 12, -1958414417);
                c = ff(c, d, a, b, W[i + 10], 17, -42063);
                b = ff(b, c, d, a, W[i + 11], 22, -1990404162);
                a = ff(a, b, c, d, W[i + 12], 7, 1804603682);
                d = ff(d, a, b, c, W[i + 13], 12, -40341101);
                c = ff(c, d, a, b, W[i + 14], 17, -1502002290);
                b = ff(b, c, d, a, W[i + 15], 22, 1236535329);
                a = gg(a, b, c, d, W[i + 1], 5, -165796510);
                d = gg(d, a, b, c, W[i + 6], 9, -1069501632);
                c = gg(c, d, a, b, W[i + 11], 14, 643717713);
                b = gg(b, c, d, a, W[i], 20, -373897302);
                a = gg(a, b, c, d, W[i + 5], 5, -701558691);
                d = gg(d, a, b, c, W[i + 10], 9, 38016083);
                c = gg(c, d, a, b, W[i + 15], 14, -660478335);
                b = gg(b, c, d, a, W[i + 4], 20, -405537848);
                a = gg(a, b, c, d, W[i + 9], 5, 568446438);
                d = gg(d, a, b, c, W[i + 14], 9, -1019803690);
                c = gg(c, d, a, b, W[i + 3], 14, -187363961);
                b = gg(b, c, d, a, W[i + 8], 20, 1163531501);
                a = gg(a, b, c, d, W[i + 13], 5, -1444681467);
                d = gg(d, a, b, c, W[i + 2], 9, -51403784);
                c = gg(c, d, a, b, W[i + 7], 14, 1735328473);
                b = gg(b, c, d, a, W[i + 12], 20, -1926607734);
                a = hh(a, b, c, d, W[i + 5], 4, -378558);
                d = hh(d, a, b, c, W[i + 8], 11, -2022574463);
                c = hh(c, d, a, b, W[i + 11], 16, 1839030562);
                b = hh(b, c, d, a, W[i + 14], 23, -35309556);
                a = hh(a, b, c, d, W[i + 1], 4, -1530992060);
                d = hh(d, a, b, c, W[i + 4], 11, 1272893353);
                c = hh(c, d, a, b, W[i + 7], 16, -155497632);
                b = hh(b, c, d, a, W[i + 10], 23, -1094730640);
                a = hh(a, b, c, d, W[i + 13], 4, 681279174);
                d = hh(d, a, b, c, W[i], 11, -358537222);
                c = hh(c, d, a, b, W[i + 3], 16, -722521979);
                b = hh(b, c, d, a, W[i + 6], 23, 76029189);
                a = hh(a, b, c, d, W[i + 9], 4, -640364487);
                d = hh(d, a, b, c, W[i + 12], 11, -421815835);
                c = hh(c, d, a, b, W[i + 15], 16, 530742520);
                b = hh(b, c, d, a, W[i + 2], 23, -995338651);
                a = ii(a, b, c, d, W[i], 6, -198630844);
                d = ii(d, a, b, c, W[i + 7], 10, 1126891415);
                c = ii(c, d, a, b, W[i + 14], 15, -1416354905);
                b = ii(b, c, d, a, W[i + 5], 21, -57434055);
                a = ii(a, b, c, d, W[i + 12], 6, 1700485571);
                d = ii(d, a, b, c, W[i + 3], 10, -1894986606);
                c = ii(c, d, a, b, W[i + 10], 15, -1051523);
                b = ii(b, c, d, a, W[i + 1], 21, -2054922799);
                a = ii(a, b, c, d, W[i + 8], 6, 1873313359);
                d = ii(d, a, b, c, W[i + 15], 10, -30611744);
                c = ii(c, d, a, b, W[i + 6], 15, -1560198380);
                b = ii(b, c, d, a, W[i + 13], 21, 1309151649);
                a = ii(a, b, c, d, W[i + 4], 6, -145523070);
                d = ii(d, a, b, c, W[i + 11], 10, -1120210379);
                c = ii(c, d, a, b, W[i + 2], 15, 718787259);
                b = ii(b, c, d, a, W[i + 9], 21, -343485551);
                a = safeAdd(a, A);
                b = safeAdd(b, B);
                c = safeAdd(c, C);
                d = safeAdd(d, D);
            }
            return [a, b, c, d].map(n => Array.from({
                length: 4
            }, (_, i) => ((n >> (i * 8)) & 0xFF).toString(16).padStart(2, '0')).join('')).join('');
        }

        // ── RSA ──
        const PRIMES = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

        function rndPrime() {
            let p = PRIMES[Math.floor(Math.random() * PRIMES.length)],
                q;
            do {
                q = PRIMES[Math.floor(Math.random() * PRIMES.length)];
            } while (q === p);
            document.getElementById('r-p').value = p;
            document.getElementById('r-q').value = q;
        }

        function genRSA() {
            const p = parseInt(document.getElementById('r-p').value);
            const q = parseInt(document.getElementById('r-q').value);
            const keys = document.getElementById('r-keys');
            if (!isPrime(p) || !isPrime(q)) {
                keys.style.display = 'block';
                document.getElementById('r-gen-steps').innerHTML = '<div class="step-item"><span class="err">⚠ p dan q harus bilangan prima!</span></div>';
                document.getElementById('r-pub').innerHTML = '';
                document.getElementById('r-priv').innerHTML = '';
                return;
            }
            if (p === q) {
                keys.style.display = 'block';
                document.getElementById('r-gen-steps').innerHTML = '<div class="step-item"><span class="err">⚠ p dan q harus berbeda!</span></div>';
                return;
            }
            const n = p * q,
                phi = (p - 1) * (q - 1);
            let e = 2;
            while (e < phi && gcd(e, phi) !== 1) e++;
            const d = modInverse(e, phi);
            document.getElementById('r-pub').innerHTML = `<div class="kv"><span>e</span><span>${e}</span></div><div class="kv"><span>n</span><span>${n}</span></div><div style="margin-top:6px;font-size:11px;color:#34d399">Kunci publik: (e=${e}, n=${n})</div>`;
            document.getElementById('r-priv').innerHTML = `<div class="kv"><span>d</span><span>${d}</span></div><div class="kv"><span>n</span><span>${n}</span></div><div style="margin-top:6px;font-size:11px;color:#fbbf24">Kunci privat: (d=${d}, n=${n})</div>`;
            document.getElementById('r-e').value = e;
            document.getElementById('r-n-e').value = n;
            document.getElementById('r-d').value = d;
            document.getElementById('r-n-d').value = n;
            keys.style.display = 'block';
            document.getElementById('r-gen-steps').innerHTML = `
    <div class="step-item">1. p = <span class="hi">${p}</span>, q = <span class="hi">${q}</span> <span class="accent">(prima ✓)</span></div>
    <div class="step-item">2. n = p × q = ${p} × ${q} = <span class="accent">${n}</span></div>
    <div class="step-item">3. φ(n) = (p−1)(q−1) = ${p-1} × ${q-1} = <span class="accent">${phi}</span></div>
    <div class="step-item">4. e = <span class="accent">${e}</span> &nbsp;→ gcd(${e}, ${phi}) = <span class="accent">${gcd(e,phi)}</span> <span class="accent">✓ relatif prima</span></div>
    <div class="step-item">5. d = e⁻¹ mod φ(n) = ${e}⁻¹ mod ${phi} = <span class="accent">${d}</span> <span style="color:#475569">(Extended Euclidean)</span></div>
    <div class="step-item">Verifikasi: (e×d) mod φ(n) = (${e}×${d}) mod ${phi} = <span class="accent">${(e*d)%phi}</span> ✓</div>`;
        }

        function rsaEnc() {
            const m = parseInt(document.getElementById('r-m').value);
            const e = parseInt(document.getElementById('r-e').value);
            const n = parseInt(document.getElementById('r-n-e').value);
            if (isNaN(m) || isNaN(e) || isNaN(n)) return;
            if (m >= n) {
                document.getElementById('r-enc-out').textContent = '⚠ m harus < n (' + n + ')';
                document.getElementById('r-enc-result').style.display = 'block';
                return;
            }
            const c = modPow(m, e, n);
            document.getElementById('r-enc-out').textContent = c;
            document.getElementById('r-enc-result').style.display = 'block';
            document.getElementById('r-enc-steps').style.display = 'block';
            document.getElementById('r-enc-steps-body').innerHTML = `
    <div class="step-item">Rumus: <span class="accent">c = m^e mod n</span></div>
    <div class="step-item">c = <span class="hi">${m}</span>^<span class="hi">${e}</span> mod <span class="hi">${n}</span></div>
    <div class="step-item">c = <span class="accent">${c}</span> <span style="color:#475569">(fast modular exponentiation)</span></div>`;
        }

        function rsaDec() {
            const c = parseInt(document.getElementById('r-c').value);
            const d = parseInt(document.getElementById('r-d').value);
            const n = parseInt(document.getElementById('r-n-d').value);
            if (isNaN(c) || isNaN(d) || isNaN(n)) return;
            const m = modPow(c, d, n);
            document.getElementById('r-dec-out').textContent = m;
            document.getElementById('r-dec-result').style.display = 'block';
            document.getElementById('r-dec-steps').style.display = 'block';
            document.getElementById('r-dec-steps-body').innerHTML = `
    <div class="step-item">Rumus: <span class="accent">m = c^d mod n</span></div>
    <div class="step-item">m = <span class="hi">${c}</span>^<span class="hi">${d}</span> mod <span class="hi">${n}</span></div>
    <div class="step-item">m = <span class="accent">${m}</span> <span style="color:#475569">(pesan asli berhasil dipulihkan)</span></div>`;
        }
        let rTab = 'gen';

        function rsaTab(t, btn) {
            rTab = t;
            ['gen', 'enc', 'dec', 'teori'].forEach(id => {
                document.getElementById('r-' + id).style.display = id === t ? 'block' : 'none';
            });
            document.querySelectorAll('#panel-rsa .tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }