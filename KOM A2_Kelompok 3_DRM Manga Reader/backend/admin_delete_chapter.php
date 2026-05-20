<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
apply_cors_headers();

try {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail('POST required.', 405);
    }

    $body = request_json();
    $token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ($body['admin_token'] ?? '');
    if (!hash_equals(ADMIN_UPLOAD_TOKEN, (string) $token)) {
        fail('Invalid admin token.', 403);
    }

    $chapterId = (int) ($body['chapter_id'] ?? 0);
    if ($chapterId <= 0) {
        fail('Invalid chapter ID.');
    }

    $pdo = pdo();
    $pdo->beginTransaction();

    // The ON DELETE CASCADE in MySQL will automatically delete the chapter_pages rows.
    // However, we should also try to delete the actual encrypted files from the filesystem.
    // The encrypted files are stored in STORAGE_DIR . '/encrypted/chapter-' . $chapterId
    $dir = ENCRYPTED_DIR . '/chapter-' . $chapterId;
    
    // Delete from DB
    $stmt = $pdo->prepare('DELETE FROM chapters WHERE id = :id');
    $stmt->execute([':id' => $chapterId]);

    // Delete folder from filesystem
    if (is_dir($dir)) {
        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            if (is_file($path)) {
                @unlink($path);
            }
        }
        @rmdir($dir);
    }

    $pdo->commit();
    ok(['deleted' => true]);

} catch (Throwable $e) {
    if (pdo()->inTransaction()) {
        pdo()->rollBack();
    }
    error_log($e->getMessage());
    fail('Failed to delete chapter.', 500);
}
