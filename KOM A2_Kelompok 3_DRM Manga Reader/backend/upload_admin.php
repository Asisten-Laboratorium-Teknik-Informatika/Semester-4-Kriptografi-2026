<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
assert_runtime_secrets_configured();
apply_cors_headers();

try {
    ensure_storage_dirs();

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail('POST required.', 405);
    }

    $token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ($_POST['admin_token'] ?? '');
    if (!hash_equals(ADMIN_UPLOAD_TOKEN, (string) $token)) {
        fail('Invalid admin token.', 403);
    }

    $title = trim((string) ($_POST['title'] ?? ''));
    $description = trim((string) ($_POST['description'] ?? ''));
    $author = trim((string) ($_POST['author'] ?? ''));
    $status = (string) ($_POST['status'] ?? 'ongoing');
    $rating = (float) ($_POST['rating'] ?? 0);
    $chapterNumber = (float) ($_POST['chapter_number'] ?? 1);
    $chapterTitle = trim((string) ($_POST['chapter_title'] ?? 'Chapter ' . $chapterNumber));
    $genres = array_filter(array_map('trim', explode(',', (string) ($_POST['genres'] ?? ''))));

    if ($title === '' || $description === '' || $author === '') {
        fail('title, description, and author are required.');
    }
    if (!in_array($status, ['ongoing', 'completed'], true)) {
        fail('Invalid status.');
    }
    if (!isset($_FILES['cover']) || !is_uploaded_file($_FILES['cover']['tmp_name'])) {
        fail('Cover image is required.');
    }
    if (!isset($_FILES['pages']) || !is_array($_FILES['pages']['tmp_name'])) {
        fail('At least one page image is required.');
    }

    $pdo = pdo();
    $pdo->beginTransaction();

    $slug = unique_slug($title);
    $coverPath = save_cover($_FILES['cover']);

    $stmt = $pdo->prepare('INSERT INTO comics (title, slug, description, author, cover_path, status, rating)
        VALUES (:title, :slug, :description, :author, :cover_path, :status, :rating)');
    $stmt->execute([
        ':title' => $title,
        ':slug' => $slug,
        ':description' => $description,
        ':author' => $author,
        ':cover_path' => $coverPath,
        ':status' => $status,
        ':rating' => $rating,
    ]);
    $comicId = (int) $pdo->lastInsertId();

    foreach ($genres as $genre) {
        $genreId = find_or_create_genre($genre);
        $stmt = $pdo->prepare('INSERT IGNORE INTO comic_genres (comic_id, genre_id) VALUES (:comic_id, :genre_id)');
        $stmt->execute([':comic_id' => $comicId, ':genre_id' => $genreId]);
    }

    $stmt = $pdo->prepare('INSERT INTO chapters (comic_id, number, title) VALUES (:comic_id, :number, :title)');
    $stmt->execute([':comic_id' => $comicId, ':number' => $chapterNumber, ':title' => $chapterTitle]);
    $chapterId = (int) $pdo->lastInsertId();

    $pageCount = count($_FILES['pages']['tmp_name']);
    for ($i = 0; $i < $pageCount; $i++) {
        if (!is_uploaded_file($_FILES['pages']['tmp_name'][$i])) {
            continue;
        }
        encrypt_page_upload($_FILES['pages'], $i, $chapterId, $i);
    }

    $pdo->commit();
    ok([
        'comicId' => (string) $comicId,
        'chapterId' => (string) $chapterId,
        'pageCount' => $pageCount,
    ]);
} catch (Throwable $e) {
    if (pdo()->inTransaction()) {
        pdo()->rollBack();
    }
    error_log($e->getMessage());
    fail('Upload failed.', 500);
}

function unique_slug(string $title): string
{
    $base = slugify($title);
    $slug = $base;
    $i = 2;
    while (true) {
        $stmt = pdo()->prepare('SELECT id FROM comics WHERE slug = :slug LIMIT 1');
        $stmt->execute([':slug' => $slug]);
        if (!$stmt->fetch()) {
            return $slug;
        }
        $slug = $base . '-' . $i;
        $i++;
    }
}

function detect_upload_mime(string $tmpName): string
{
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmpName);
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        fail('Only JPEG, PNG, and WEBP images are allowed.');
    }

    return $mime;
}

function save_cover(array $file): string
{
    $mime = detect_upload_mime($file['tmp_name']);
    $extension = match ($mime) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        default => 'bin',
    };

    $name = 'cover-' . bin2hex(random_bytes(12)) . '.' . $extension;
    $target = COVER_DIR . '/' . $name;
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        fail('Unable to store cover image.');
    }

    return 'storage/covers/' . $name;
}

function find_or_create_genre(string $name): int
{
    $name = trim($name);
    if ($name === '') {
        fail('Invalid genre.');
    }

    $stmt = pdo()->prepare('INSERT IGNORE INTO genres (name) VALUES (:name)');
    $stmt->execute([':name' => $name]);

    $stmt = pdo()->prepare('SELECT id FROM genres WHERE name = :name');
    $stmt->execute([':name' => $name]);
    $row = $stmt->fetch();
    if (!$row) {
        fail('Unable to create genre.');
    }

    return (int) $row['id'];
}

function encrypt_page_upload(array $files, int $fileIndex, int $chapterId, int $pageIndex): void
{
    $tmpName = $files['tmp_name'][$fileIndex];
    $mime = detect_upload_mime($tmpName);
    $plain = file_get_contents($tmpName);
    if ($plain === false) {
        fail('Unable to read uploaded page.');
    }

    $key = random_bytes(32);
    $iv = random_bytes(16);
    $cipher = openssl_encrypt($plain, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
    if ($cipher === false) {
        fail('Page encryption failed.');
    }

    $dir = ENCRYPTED_DIR . '/chapter-' . $chapterId;
    if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
        fail('Unable to create chapter storage.');
    }

    $fileName = 'page-' . str_pad((string) $pageIndex, 4, '0', STR_PAD_LEFT) . '-' . bin2hex(random_bytes(8)) . '.bin';
    $absolutePath = $dir . '/' . $fileName;
    if (file_put_contents($absolutePath, $cipher, LOCK_EX) === false) {
        fail('Unable to write encrypted page.');
    }

    $relativePath = 'storage/encrypted/chapter-' . $chapterId . '/' . $fileName;
    $stmt = pdo()->prepare('INSERT INTO chapter_pages
        (chapter_id, page_index, encrypted_path, mime_type, byte_size, sha256, key_base64, iv_base64)
        VALUES (:chapter_id, :page_index, :encrypted_path, :mime_type, :byte_size, :sha256, :key_base64, :iv_base64)');
    $stmt->execute([
        ':chapter_id' => $chapterId,
        ':page_index' => $pageIndex,
        ':encrypted_path' => $relativePath,
        ':mime_type' => $mime,
        ':byte_size' => strlen($cipher),
        ':sha256' => hash('sha256', $cipher),
        ':key_base64' => base64_encode($key),
        ':iv_base64' => base64_encode($iv),
    ]);
}
