/**
 * CryptoQuest Storage Utility
 * Multi-user system: each account stores its own progress, hints, hearts, and XP.
 * Structure in localStorage:
 * {
 *   accounts: { username: { ...profileData, ...gameData } },
 *   activeUser: 'username' | null
 * }
 */

const STORAGE_KEY = 'cryptoquest_v2';

/** Default game data for a brand new account */
const AVATARS = {
    '1': 'account_circle',
    '2': 'robot_2',
    '3': 'smart_toy',
    '4': 'emoji_people',
    '5': 'sentiment_satisfied',
    '6': 'psychology',
    '7': 'masks',
    '8': 'face_5'
};

/** Collectible character catalog — order maps to level index (1-based) */
const CHARACTER_CATALOG = [
    { id: 'wiseowl',    name: 'WiseOwl',    rarity: 'Common',    color: '#6B7280', desc: 'Mampu menganalisis pola hash dengan akurasi 99%.', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB8PNxAA6wKtP8m2qOj6Pd3CDrAd_MgXhRd99cgMNva19f9IHlkespMi2kvZTn9VMC4BI1ESwRKYSxH1TlXYfePN3KozzV7CdNHFzh_m5OhHh2EvO9UQC1NRsbfRXPdFtEiHfGISMzo-nj3_H1jTCQOadA8ajTH_RWfCmZtU2l6G94fYWAgsZm1jde7eMGFJZKG2r5vqQQehDDR6Lyf492Abd0Nk_wIHiGqvdj7qh2UR1RS40oe_nfyhaUsF98rHe91l6QMH3kPrQLQ', unlockLevel: 1 },
    { id: 'cyberfox',   name: 'CyberFox',   rarity: 'Rare',      color: '#8B5CF6', desc: 'Penjaga jaringan yang lincah dan sulit dilacak.', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAiatDcg_O6a1-YQjHzZpYI9CB3LC9itRicJ65CDP82t9JRmrmagCV0DsRRtAwrLShmXC1-max3JC7H1tl3LFe5dODYIUKK-FXSRJIMuMrlPjm2Kz07E-8JZraebCW5hBRR491L_cBJ21jjprZGsYULPB91bXcVK_9Rt70Ollx8hrCmnlrg16dYWq5mUZ2pzoQiJEPKl66E1BaqN_8AFGSTcDqgvrCNxpv83930l8emQ4TkcJ_O-uABqUIsDFebBypazIrkOCaK24En', unlockLevel: 2 },
    { id: 'datahound',  name: 'DataHound',  rarity: 'Uncommon',  color: '#059669', desc: 'Anjing pelacak siber yang setia menjaga lalu lintas jaringan.', img: 'img/data_hound.png', unlockLevel: 3 },
    { id: 'cryptoninja',name: 'CryptoNinja',rarity: 'Epic',      color: '#EC4899', desc: 'Ahli menyembunyikan data dalam bayangan digital.', img: 'img/cyber_ninja.png', unlockLevel: 4 },
    { id: 'protocolx',  name: 'Protocol-X', rarity: 'Legendary', color: '#F59E0B', desc: 'Ahli enkripsi asimetris dengan kecepatan cahaya.', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAcZAJCt_7enReo7denw9k_5cpN0X_E-yrpGa4b6aRJoUOU7wHD7ntO5FN3v4_SHZeB8i0Jg9BAwpen6a9tfenstibIebSnmUEK8wLCY1aE49Zp0zL5-ju7LJRXx0-Jlh45wcq43ri6tmNn3-fSSIFFlITSet18_EWKpiKDR0ZY33Eji7gzKcK2yjRozYbKgBqREAYoTOM9m_9fkl9m1WdNc5BY9ra2VpexwTuLl8vA5DugZ3Hd5UUmJ9UTr-wSoh1eS5wjkdR5GVUl', unlockLevel: 5 },
    { id: 'quantumbot', name: 'QuantumBot', rarity: 'Rare',      color: '#3B82F6', desc: 'Robot komputasi kuantum yang mampu memecahkan hash dengan cepat.', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqf5GozAl8SFYX1Oq9EHuAejzfiqyxVLP72ylEGzqskp5LcqIMczLukOcJHYyo1tgXv79ifzG6UZ0AuiCcgkS9l7Z5k7pFwrpY9lzEw6I-Jh2g-NAvOEtVl6uHCkzecG8t7QGvo7Lmkcp7iOAdbZIBLT79G-zbDcX_4qHJL04dkTKQ8mWLdVx2_IGYS6s2wv0gRr6S_Pm-rYdRQqgC44m1Y2H-ynJWLolkjQMw_XFGfo1qAx7zoUEiH4CI1UNg010E54XVzdElsXsN', unlockLevel: 6 },
    { id: 'shadowcat',  name: 'ShadowCat',  rarity: 'Legendary', color: '#6366F1', desc: 'Kucing bayangan yang menguasai teknik steganografi modern.', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWMgGGABK_prKAp0UrBPLwsoZgVQECtI4Ire_BY-8prLoijfrRm_DipNFUa3yptae6286OP2uICh5dSilgFJtJr8dXLUoa-ySk8DBZJMHFfrTj-665oJCdBg3iXmZJCHBZ2a8jFosOQxXIRvuZQQpTUQ3X45SkwApmn6XedVUrQG4dBkoxOB4NVf3xa-LFFiIJ6deRkfJjwxd7D3ZXJXfPGkuQxA2vro8Z7hB_qse2pLYeNBBzUQjCyy_0b42f3qgf3S_VnBtDkIof', unlockLevel: 7 },
    { id: 'cyberdragon',name: 'CyberDragon',rarity: 'Mythic',    color: '#EF4444', desc: 'Legenda terakhir: penguasa seluruh enkripsi di dunia siber.', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHaVudC2f79vgkmu29mfU1jHabAf18o9wi6vHzbRg2dyn0BFpB4QuDr90-8EuXclk8dOHN6vVgh7M5HeZUdiSdqxEzF7ROhD3jsTeYp19268k6SkyUHy6EmWI4Zn4diZDJ3k2AQxJZGMOLY2yRgacb62mJ-t5f-doY7VzpmJMyhushkbc2V5k8kP6dfiUo9BWI85CPHxtpDEcQRE7CE04i1KxYFkF0EbXIAwU9cAuElMYgLp2QGfXJwuA6r8jjOC_ESuiY7A03aLnX', unlockLevel: 8 },
];

const DEFAULT_GAME_DATA = {
    unlockedLevels: [1],
    completedLevels: [],
    highScores: {},
    totalScore: 0,
    totalHints: 3,
    hearts: 5,
    xp: 0,
    avatar: '1', // material-symbol avatar id
    unlockedCharacters: ['wiseowl'], // starter character
    activeCharacter: 'wiseowl',      // character shown on profile & header
    history: [],                     // log of completed attempts [{levelId, score, date, name}]
};

const Storage = {

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    _loadRoot() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { accounts: {}, activeUser: null };
        try { return JSON.parse(raw); } catch { return { accounts: {}, activeUser: null }; }
    },

    _saveRoot(root) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
    },

    // ─── Auth ─────────────────────────────────────────────────────────────────

    /**
     * Register a new account. Returns false if username already taken.
     */
    register(username, password, playerName) {
        const root = this._loadRoot();
        if (root.accounts[username]) return false; // username sudah ada

        root.accounts[username] = {
            // Credentials
            username,
            password,
            playerName,
            hasAccount: true,
            // Game data (fresh defaults)
            ...DEFAULT_GAME_DATA,
        };
        root.activeUser = username;
        this._saveRoot(root);
        return true;
    },

    /**
     * Login an existing account. Returns false if credentials don't match.
     */
    login(username, password) {
        const root = this._loadRoot();
        const acc = root.accounts[username];
        if (!acc) return 'no_account';
        if (acc.password !== password) return 'wrong_password';
        root.activeUser = username;
        this._saveRoot(root);
        return 'ok';
    },

    /**
     * Logout current user (just clears activeUser, data is preserved).
     */
    logout() {
        const root = this._loadRoot();
        root.activeUser = null;
        this._saveRoot(root);
    },

    /**
     * Check if any user is currently logged in.
     */
    isLoggedIn() {
        const root = this._loadRoot();
        return !!root.activeUser && !!root.accounts[root.activeUser];
    },

    /**
     * Check if at least one account exists.
     */
    hasAnyAccount() {
        const root = this._loadRoot();
        return Object.keys(root.accounts).length > 0;
    },

    // ─── Active-User Data ─────────────────────────────────────────────────────

    /**
     * Load the active user's full data object.
     * Returns null if nobody is logged in.
     */
    load() {
        const root = this._loadRoot();
        if (!root.activeUser || !root.accounts[root.activeUser]) {
            // Return a legacy-compatible shell so old code doesn't crash
            return {
                isLoggedIn: false,
                hasAccount: this.hasAnyAccount(),
                playerName: '',
                username: '',
                ...DEFAULT_GAME_DATA,
            };
        }
        const acc = root.accounts[root.activeUser];
        return {
            ...acc,
            isLoggedIn: true,
            hasAccount: true,
        };
    },

    /**
     * Save data back to the active user's account.
     * Only fields that belong to an account are persisted.
     */
    save(data) {
        const root = this._loadRoot();
        if (!root.activeUser) return;
        // Merge only; do not allow changing username/password via save()
        const acc = root.accounts[root.activeUser] || {};
        root.accounts[root.activeUser] = {
            ...acc,
            playerName:      data.playerName      ?? acc.playerName,
            avatar:          data.avatar          ?? acc.avatar,
            unlockedLevels:  data.unlockedLevels  ?? acc.unlockedLevels,
            completedLevels: data.completedLevels ?? acc.completedLevels,
            highScores:      data.highScores       ?? acc.highScores,
            totalScore:      data.totalScore       ?? acc.totalScore,
            totalHints:        data.totalHints           ?? acc.totalHints,
            hearts:            data.hearts               ?? acc.hearts,
            xp:                data.xp                   ?? acc.xp,
            unlockedCharacters: data.unlockedCharacters  ?? acc.unlockedCharacters ?? ['wiseowl'],
            activeCharacter:   data.activeCharacter      ?? acc.activeCharacter    ?? 'wiseowl',
            history:           data.history              ?? acc.history            ?? [],
        };
        this._saveRoot(root);
    },

    /**
     * Update profile info (name, password, avatar) for the active user.
     */
    updateProfile(playerName, newPassword, avatarId) {
        const root = this._loadRoot();
        if (!root.activeUser) return false;
        const acc = root.accounts[root.activeUser];
        if (!acc) return false;
        if (playerName) acc.playerName = playerName;
        if (newPassword) acc.password = newPassword;
        if (avatarId) acc.avatar = avatarId;
        this._saveRoot(root);
        return true;
    },

    /**
     * Update username for the active user. Fails if new username already taken.
     */
    updateUsername(newUsername) {
        const root = this._loadRoot();
        const old = root.activeUser;
        if (!old) return false;
        if (newUsername === old) return true;
        if (root.accounts[newUsername]) return false; // taken

        root.accounts[newUsername] = { ...root.accounts[old], username: newUsername };
        delete root.accounts[old];
        root.activeUser = newUsername;
        this._saveRoot(root);
        return true;
    },

    // ─── Level Helpers ────────────────────────────────────────────────────────

    unlockLevel(level) {
        const data = this.load();
        if (!data.unlockedLevels.includes(level)) {
            data.unlockedLevels.push(level);
            this.save(data);
        }
    },

    completeLevel(level, score) {
        const data = this.load();
        if (!data.completedLevels.includes(level)) {
            data.completedLevels.push(level);
        }
        if (!data.highScores[level] || score > data.highScores[level]) {
            data.highScores[level] = score;
        }
        data.totalScore = Object.values(data.highScores).reduce((a, b) => a + b, 0);
        const next = level + 1;
        if (!data.unlockedLevels.includes(next)) {
            data.unlockedLevels.push(next);
        }
        // Auto-unlock the character mapped to this level
        const charForLevel = CHARACTER_CATALOG.find(c => c.unlockLevel === level);
        if (charForLevel) {
            if (!data.unlockedCharacters) data.unlockedCharacters = ['wiseowl'];
            if (!data.unlockedCharacters.includes(charForLevel.id)) {
                data.unlockedCharacters.push(charForLevel.id);
            }
            // Auto-upgrade active character to the highest unlocked one
            data.activeCharacter = charForLevel.id;
        }

        // Add to history log
        const names = [
            'Caesar Cipher (Easy)', 'Caesar Cipher (Hard)', 'Atbash Cipher',
            'Vigenère (Easy)', 'Vigenère (Hard)', 'RSA (Easy)', 'RSA (Hard)', 'Cryptanalysis'
        ];
        if (!data.history) data.history = [];
        data.history.unshift({
            levelId: level,
            name: names[level - 1] || `Level ${level}`,
            score: score,
            date: new Date().toISOString()
        });

        this.save(data);
    },

    /**
     * Manually set the active (displayed) character. Must be unlocked.
     */
    setActiveCharacter(charId) {
        const data = this.load();
        const unlocked = data.unlockedCharacters || ['wiseowl'];
        if (!unlocked.includes(charId)) return false;
        data.activeCharacter = charId;
        this.save(data);
        return true;
    },

    /**
     * Get the full CHARACTER_CATALOG entry for the active character.
     */
    getActiveCharacter() {
        const data = this.load();
        const id = data.activeCharacter || 'wiseowl';
        return CHARACTER_CATALOG.find(c => c.id === id) || CHARACTER_CATALOG[0];
    },

    /**
     * Get the list of unlocked character IDs for the active user.
     */
    getUnlockedCharacters() {
        return this.load().unlockedCharacters || ['wiseowl'];
    },

    isLevelUnlocked(level) {
        return this.load().unlockedLevels.includes(level);
    },

    isLevelCompleted(level) {
        return this.load().completedLevels.includes(level);
    },

    // ─── Hints ────────────────────────────────────────────────────────────────

    consumeHint() {
        const data = this.load();
        const hints = data.totalHints ?? 3;
        if (hints > 0) {
            data.totalHints = hints - 1;
            this.save(data);
            return true;
        }
        return false;
    },

    addHint(amount = 1) {
        const data = this.load();
        data.totalHints = (data.totalHints ?? 3) + amount;
        this.save(data);
    },

    getHints() {
        return this.load().totalHints ?? 3;
    },

    // ─── Hearts ───────────────────────────────────────────────────────────────

    getHearts() {
        return this.load().hearts ?? 5;
    },

    reduceHeart() {
        const data = this.load();
        if ((data.hearts ?? 5) > 0) {
            data.hearts = (data.hearts ?? 5) - 1;
            this.save(data);
            return true;
        }
        return false;
    },

    // ─── XP ───────────────────────────────────────────────────────────────────

    addXP(amount) {
        const data = this.load();
        data.xp = (data.xp || 0) + amount;
        this.save(data);
    },
};

// Expose globally
window.GameStorage = Storage;
