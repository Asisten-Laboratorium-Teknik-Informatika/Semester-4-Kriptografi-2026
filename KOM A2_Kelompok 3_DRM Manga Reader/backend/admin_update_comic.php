<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
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

    $id = (int) ($_POST['id'] ?? 0);
    if ($id <= 0) {
        fail('Invalid comic ID.');
    }

    $title = trim((string) ($_POST['title'] ?? ''));
    $description = trim((string) ($_POST['description'] ?? ''));
    $author = trim((string) ($_POST['author'] ?? ''));
    $status = (string) ($_POST['status'] ?? 'ongoing');
    $rating = (float) ($_POST['rating'] ?? 0);
    $genres = array_filter(array_map('trim', explode(',', (string) ($_POST['genres'] ?? ''))));

    if ($title === '' || $description === '' || $author === '') {
        fail('title, description, and author are required.');
    }

    $pdo = pdo();
    $pdo->beginTransaction();

    $sql = 'UPDATE comics SET title = :title, description = :description, author = :author, status = :status, rating = :rating';
    $params = [
        ':id' => $id,
        ':title' => $title,
        ':description' => $description,
        ':author' => $author,
        ':status' => $status,
        ':rating' => $rating,
    ];

    if (isset($_FILES['cover']) && is_uploaded_file($_FILES['cover']['tmp_name'])) {
        $mime = detect_upload_mime_update($_FILES['cover']['tmp_name']);
        $extension = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'bin',
        };

        $name = 'cover-' . bin2hex(random_bytes(12)) . '.' . $extension;
        $target = COVER_DIR . '/' . $name;
        if (!move_uploaded_file($_FILES['cover']['tmp_name'], $target)) {
            fail('Unable to store cover image.');
        }
        $coverPath = 'storage/covers/' . $name;
        
        $sql .= ', cover_path = :cover_path';
        $params[':cover_path'] = $coverPath;
    }

    $sql .= ' WHERE id = :id';
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // Update genres (delete old, insert new)
    $pdo->prepare('DELETE FROM comic_genres WHERE comic_id = :id')->execute([':id' => $id]);
    foreach ($genres as $genre) {
        $genreId = find_or_create_genre_update($genre);
        $stmt = $pdo->prepare('INSERT IGNORE INTO comic_genres (comic_id, genre_id) VALUES (:comic_id, :genre_id)');
        $stmt->execute([':comic_id' => $id, ':genre_id' => $genreId]);
    }

    $pdo->commit();
    ok(['updated' => true]);
} catch (Throwable $e) {
    if (pdo()->inTransaction()) {
        pdo()->rollBack();
    }
    error_log($e->getMessage());
    fail('Update failed.', 500);
}

function detect_upload_mime_update(string $tmpName): string
{
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($tmpName);
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        fail('Only JPEG, PNG, and WEBP images are allowed.');
    }
    return $mime;
}

function find_or_create_genre_update(string $name): int
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
    return (int) $row['id'];
}
