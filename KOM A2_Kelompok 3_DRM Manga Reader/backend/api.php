<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

assert_runtime_secrets_configured();
apply_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    ensure_storage_dirs();
    $action = $_GET['action'] ?? 'comics';

    match ($action) {
        'comics' => list_comics(),
        'search' => search_comics(),
        'comic' => get_comic(),
        'chapters' => list_chapters(),
        'chapter' => get_chapter(),
        'page_stream' => stream_page_image(),
        'page_bin' => stream_page_bin(),
        'login' => login_user(),
        'register' => register_user(),
        'profile' => profile(),
        'favorites' => favorites(),
        'favorite' => favorite(),
        'history' => history(),
        'download_grant' => download_grant(),
        default => fail('Unknown action.', 404),
    };
} catch (Throwable $e) {
    error_log($e->getMessage());
    fail('Server error.', 500);
}

function comic_select_sql(): string
{
    return "
        SELECT
            c.id,
            c.title,
            c.description,
            c.author,
            c.cover_path,
            c.status,
            c.rating,
            c.created_at,
            COALESCE(GROUP_CONCAT(g.name ORDER BY g.name SEPARATOR ','), '') AS genres
        FROM comics c
        LEFT JOIN comic_genres cg ON cg.comic_id = c.id
        LEFT JOIN genres g ON g.id = cg.genre_id
    ";
}

function map_comic(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'title' => $row['title'],
        'description' => $row['description'],
        'author' => $row['author'],
        'genres' => $row['genres'] === '' ? [] : explode(',', $row['genres']),
        'coverUrl' => absolute_public_url($row['cover_path']),
        'status' => $row['status'],
        'rating' => (float) $row['rating'],
        'createdAt' => $row['created_at'],
    ];
}

function map_chapter(array $row, array $pages = []): array
{
    return [
        'id' => (string) $row['id'],
        'comicId' => (string) $row['comic_id'],
        'number' => (float) $row['number'],
        'title' => $row['title'],
        'createdAt' => $row['created_at'],
        'pages' => $pages,
        'images' => array_map(static fn(array $page): string => $page['streamUrl'], $pages),
    ];
}

function list_comics(): never
{
    $stmt = pdo()->query(comic_select_sql() . " GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100");
    ok(array_map('map_comic', $stmt->fetchAll()));
}

function search_comics(): never
{
    $q = trim((string) ($_GET['q'] ?? ''));
    $genres = array_filter(array_map('trim', explode(',', (string) ($_GET['genres'] ?? ''))));

    $sql = comic_select_sql();
    $where = [];
    $params = [];

    if ($q !== '') {
        $where[] = '(c.title LIKE :q OR c.author LIKE :q)';
        $params[':q'] = '%' . $q . '%';
    }

    if ($genres !== []) {
        $placeholders = [];
        foreach (array_values($genres) as $i => $genre) {
            $key = ':genre' . $i;
            $placeholders[] = $key;
            $params[$key] = $genre;
        }
        $where[] = 'c.id IN (
            SELECT cg2.comic_id
            FROM comic_genres cg2
            JOIN genres g2 ON g2.id = cg2.genre_id
            WHERE g2.name IN (' . implode(',', $placeholders) . ')
            GROUP BY cg2.comic_id
            HAVING COUNT(DISTINCT g2.name) = ' . count($genres) . '
        )';
    }

    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100';
    $stmt = pdo()->prepare($sql);
    $stmt->execute($params);
    ok(array_map('map_comic', $stmt->fetchAll()));
}

function get_comic(): never
{
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        fail('Invalid comic id.');
    }

    $stmt = pdo()->prepare(comic_select_sql() . " WHERE c.id = :id GROUP BY c.id");
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        fail('Comic not found.', 404);
    }

    ok(map_comic($row));
}

function list_chapters(): never
{
    $comicId = (int) ($_GET['comic_id'] ?? 0);
    if ($comicId <= 0) {
        fail('Invalid comic id.');
    }

    $stmt = pdo()->prepare('SELECT * FROM chapters WHERE comic_id = :comic_id ORDER BY number DESC');
    $stmt->execute([':comic_id' => $comicId]);
    ok(array_map(static fn(array $row): array => map_chapter($row), $stmt->fetchAll()));
}

function page_descriptors(int $chapterId): array
{
    $stmt = pdo()->prepare('SELECT id, chapter_id, page_index, mime_type FROM chapter_pages WHERE chapter_id = :chapter_id ORDER BY page_index ASC');
    $stmt->execute([':chapter_id' => $chapterId]);

    return array_map(static function (array $row): array {
        $pageId = (int) $row['id'];
        $chapterId = (int) $row['chapter_id'];
        $token = page_token($pageId, $chapterId);
        return [
            'id' => (string) $pageId,
            'pageIndex' => (int) $row['page_index'],
            'mimeType' => $row['mime_type'],
            'streamUrl' => absolute_public_url('api.php?action=page_stream&page_id=' . $pageId . '&token=' . $token),
        ];
    }, $stmt->fetchAll());
}

function get_chapter(): never
{
    $comicId = (int) ($_GET['comic_id'] ?? 0);
    $chapterId = (int) ($_GET['chapter_id'] ?? 0);
    if ($comicId <= 0 || $chapterId <= 0) {
        fail('Invalid chapter request.');
    }

    $stmt = pdo()->prepare('SELECT * FROM chapters WHERE id = :id AND comic_id = :comic_id');
    $stmt->execute([':id' => $chapterId, ':comic_id' => $comicId]);
    $row = $stmt->fetch();
    if (!$row) {
        fail('Chapter not found.', 404);
    }

    ok(map_chapter($row, page_descriptors($chapterId)));
}

function stream_page_bin(): never
{
    $pageId = (int) ($_GET['page_id'] ?? 0);
    $grant = (string) ($_GET['grant'] ?? '');
    if ($pageId <= 0) {
        fail('Invalid page id.');
    }

    $stmt = pdo()->prepare('SELECT id, chapter_id, encrypted_path FROM chapter_pages WHERE id = :id');
    $stmt->execute([':id' => $pageId]);
    $page = $stmt->fetch();
    if (!$page) {
        fail('Page not found.', 404);
    }

    require_download_grant((int) $page['chapter_id'], $grant);

    $file = __DIR__ . '/' . ltrim($page['encrypted_path'], '/');
    if (!is_file($file)) {
        fail('Encrypted page missing.', 404);
    }

    header('Content-Type: application/octet-stream');
    header('Content-Length: ' . filesize($file));
    header('Content-Disposition: inline; filename="page-' . $pageId . '.bin"');
    readfile($file);
    exit;
}

function require_download_grant(int $chapterId, string $grant): void
{
    if ($grant === '') {
        fail('Download grant required.', 403);
    }

    $stmt = pdo()->prepare('SELECT id FROM download_grants
        WHERE chapter_id = :chapter_id
          AND token_hash = :token_hash
          AND expires_at > CURRENT_TIMESTAMP
        LIMIT 1');
    $stmt->execute([
        ':chapter_id' => $chapterId,
        ':token_hash' => hash('sha256', $grant),
    ]);

    if (!$stmt->fetch()) {
        fail('Invalid or expired download grant.', 403);
    }
}

function stream_page_image(): never
{
    $pageId = (int) ($_GET['page_id'] ?? 0);
    $token = (string) ($_GET['token'] ?? '');
    if ($pageId <= 0) {
        fail('Invalid page id.');
    }

    $stmt = pdo()->prepare('SELECT id, chapter_id, encrypted_path, mime_type, key_base64, iv_base64 FROM chapter_pages WHERE id = :id');
    $stmt->execute([':id' => $pageId]);
    $page = $stmt->fetch();
    if (!$page) {
        fail('Page not found.', 404);
    }

    $expected = page_token((int) $page['id'], (int) $page['chapter_id']);
    if (!hash_equals($expected, $token)) {
        fail('Invalid page token.', 403);
    }

    $file = __DIR__ . '/' . ltrim($page['encrypted_path'], '/');
    if (!is_file($file)) {
        fail('Encrypted page missing.', 404);
    }

    $cipher = file_get_contents($file);
    if ($cipher === false) {
        fail('Unable to read encrypted page.', 500);
    }

    $key = base64_decode($page['key_base64'], true);
    $iv = base64_decode($page['iv_base64'], true);
    if ($key === false || $iv === false) {
        fail('Invalid page key material.', 500);
    }

    $plain = openssl_decrypt($cipher, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
    if ($plain === false) {
        fail('Unable to decrypt page.', 500);
    }

    header('Content-Type: ' . $page['mime_type']);
    header('Content-Length: ' . strlen($plain));
    header('Cache-Control: private, max-age=300');
    echo $plain;
    exit;
}

function login_user(): never
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail('POST required.', 405);
    }

    $body = request_json();
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');

    if ($email === '' || $password === '') {
        fail('Email and password are required.');
    }

    $stmt = pdo()->prepare('SELECT * FROM users WHERE email = :email');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        fail('Invalid email or password.');
    }

    ok(map_user($user));
}

function register_user(): never
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail('POST required.', 405);
    }

    $body = request_json();
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $password = (string) ($body['password'] ?? '');
    $displayName = trim((string) ($body['displayName'] ?? ''));

    if ($email === '' || $password === '' || $displayName === '') {
        fail('All fields are required.');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fail('Invalid email format.');
    }

    if (strlen($password) < 6) {
        fail('Password must be at least 6 characters.');
    }

    $stmt = pdo()->prepare('SELECT id FROM users WHERE email = :email');
    $stmt->execute([':email' => $email]);
    if ($stmt->fetch()) {
        fail('Email already registered.');
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = pdo()->prepare('INSERT INTO users (email, password_hash, display_name) VALUES (:email, :password_hash, :display_name)');
    $stmt->execute([
        ':email' => $email,
        ':password_hash' => $hash,
        ':display_name' => $displayName
    ]);

    $userId = pdo()->lastInsertId();
    $stmt = pdo()->prepare('SELECT * FROM users WHERE id = :id');
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();

    ok(map_user($user));
}

function map_user(array $row): array
{
    return [
        'uid' => (string) $row['id'],
        'email' => $row['email'],
        'displayName' => $row['display_name'],
        'photoURL' => $row['photo_url'] ?? '',
        'createdAt' => $row['created_at'],
    ];
}

function profile(): never
{
    $userId = require_user_id();
    $stmt = pdo()->prepare('SELECT * FROM users WHERE id = :id');
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();
    if (!$user) {
        fail('User not found.', 404);
    }

    ok(map_user($user));
}

function favorites(): never
{
    $userId = require_user_id();
    $stmt = pdo()->prepare(comic_select_sql() . "
        JOIN favorites f ON f.comic_id = c.id
        WHERE f.user_id = :user_id
        GROUP BY c.id
        ORDER BY f.added_at DESC
    ");
    $stmt->execute([':user_id' => $userId]);
    ok(array_map('map_comic', $stmt->fetchAll()));
}

function favorite(): never
{
    $userId = require_user_id();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST') {
        $body = request_json();
        $comicId = (int) ($body['comicId'] ?? 0);
        if ($comicId <= 0) {
            fail('Invalid comic id.');
        }

        $stmt = pdo()->prepare('INSERT IGNORE INTO favorites (user_id, comic_id) VALUES (:user_id, :comic_id)');
        $stmt->execute([':user_id' => $userId, ':comic_id' => $comicId]);
        ok(['favorite' => true]);
    }

    if ($method === 'DELETE') {
        $comicId = (int) ($_GET['comic_id'] ?? 0);
        if ($comicId <= 0) {
            fail('Invalid comic id.');
        }

        $stmt = pdo()->prepare('DELETE FROM favorites WHERE user_id = :user_id AND comic_id = :comic_id');
        $stmt->execute([':user_id' => $userId, ':comic_id' => $comicId]);
        ok(['favorite' => false]);
    }

    fail('Unsupported method.', 405);
}

function history(): never
{
    $userId = require_user_id();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $stmt = pdo()->prepare("
            SELECT
                h.id AS history_id,
                h.user_id,
                h.comic_id,
                h.chapter_id,
                h.last_read_at,
                c.title,
                c.description,
                c.author,
                c.cover_path,
                c.status,
                c.rating,
                c.created_at AS comic_created_at,
                ch.number,
                ch.title AS chapter_title,
                ch.created_at AS chapter_created_at,
                COALESCE(GROUP_CONCAT(g.name ORDER BY g.name SEPARATOR ','), '') AS genres
            FROM reading_history h
            JOIN comics c ON c.id = h.comic_id
            JOIN chapters ch ON ch.id = h.chapter_id
            LEFT JOIN comic_genres cg ON cg.comic_id = c.id
            LEFT JOIN genres g ON g.id = cg.genre_id
            WHERE h.user_id = :user_id
            GROUP BY h.id
            ORDER BY h.last_read_at DESC
            LIMIT 100
        ");
        $stmt->execute([':user_id' => $userId]);
        $rows = $stmt->fetchAll();
        ok(array_map(static function (array $row): array {
            return [
                'id' => (string) $row['history_id'],
                'userId' => (string) $row['user_id'],
                'comicId' => (string) $row['comic_id'],
                'chapterId' => (string) $row['chapter_id'],
                'lastReadAt' => $row['last_read_at'],
                'comic' => map_comic([
                    'id' => $row['comic_id'],
                    'title' => $row['title'],
                    'description' => $row['description'],
                    'author' => $row['author'],
                    'cover_path' => $row['cover_path'],
                    'status' => $row['status'],
                    'rating' => $row['rating'],
                    'created_at' => $row['comic_created_at'],
                    'genres' => $row['genres'],
                ]),
                'chapter' => [
                    'id' => (string) $row['chapter_id'],
                    'comicId' => (string) $row['comic_id'],
                    'number' => (float) $row['number'],
                    'title' => $row['chapter_title'],
                    'createdAt' => $row['chapter_created_at'],
                    'pages' => [],
                    'images' => [],
                ],
            ];
        }, $rows));
    }

    if ($method === 'POST') {
        $body = request_json();
        $comicId = (int) ($body['comicId'] ?? 0);
        $chapterId = (int) ($body['chapterId'] ?? 0);
        if ($comicId <= 0 || $chapterId <= 0) {
            fail('Invalid history payload.');
        }

        $stmt = pdo()->prepare('INSERT INTO reading_history (user_id, comic_id, chapter_id, last_read_at)
            VALUES (:user_id, :comic_id, :chapter_id, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE chapter_id = VALUES(chapter_id), last_read_at = CURRENT_TIMESTAMP');
        $stmt->execute([':user_id' => $userId, ':comic_id' => $comicId, ':chapter_id' => $chapterId]);
        ok(['saved' => true]);
    }

    if ($method === 'DELETE') {
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) {
            fail('Invalid history id.');
        }
        $stmt = pdo()->prepare('DELETE FROM reading_history WHERE id = :id AND user_id = :user_id');
        $stmt->execute([':id' => $id, ':user_id' => $userId]);
        ok(['deleted' => true]);
    }

    fail('Unsupported method.', 405);
}

function download_grant(): never
{
    $userId = require_user_id();
    $body = request_json();
    $chapterId = (int) ($body['chapterId'] ?? ($_GET['chapter_id'] ?? 0));
    if ($chapterId <= 0) {
        fail('Invalid chapter id.');
    }

    $stmt = pdo()->prepare('SELECT ch.*, c.title AS comic_title FROM chapters ch JOIN comics c ON c.id = ch.comic_id WHERE ch.id = :id');
    $stmt->execute([':id' => $chapterId]);
    $chapter = $stmt->fetch();
    if (!$chapter) {
        fail('Chapter not found.', 404);
    }

    $cleanup = pdo()->prepare('DELETE FROM download_grants WHERE expires_at <= CURRENT_TIMESTAMP');
    $cleanup->execute();

    $token = bin2hex(random_bytes(32));
    $stmt = pdo()->prepare('INSERT INTO download_grants (user_id, chapter_id, token_hash, expires_at)
        VALUES (:user_id, :chapter_id, :token_hash, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE))');
    $stmt->execute([
        ':user_id' => $userId,
        ':chapter_id' => $chapterId,
        ':token_hash' => hash('sha256', $token),
    ]);

    $stmt = pdo()->prepare('SELECT id, chapter_id, page_index, mime_type, key_base64, iv_base64 FROM chapter_pages WHERE chapter_id = :chapter_id ORDER BY page_index ASC');
    $stmt->execute([':chapter_id' => $chapterId]);
    $pages = array_map(static function (array $row) use ($token): array {
        $pageId = (int) $row['id'];
        return [
            'id' => (string) $pageId,
            'pageIndex' => (int) $row['page_index'],
            'mimeType' => $row['mime_type'],
            'encryptedUrl' => absolute_public_url('api.php?action=page_bin&page_id=' . $pageId . '&grant=' . rawurlencode($token)),
            'keyBase64' => $row['key_base64'],
            'ivBase64' => $row['iv_base64'],
        ];
    }, $stmt->fetchAll());

    ok([
        'grantToken' => $token,
        'expiresInSeconds' => 900,
        'comicId' => (string) $chapter['comic_id'],
        'chapter' => map_chapter($chapter),
        'pages' => $pages,
    ]);
}
