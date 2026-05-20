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

    $comicId = (int) ($body['comic_id'] ?? 0);
    if ($comicId <= 0) {
        fail('Invalid comic ID.');
    }

    $pdo = pdo();
    $pdo->beginTransaction();

    // Fetch chapters for this comic to delete their files
    $stmtChapters = $pdo->prepare('SELECT id FROM chapters WHERE comic_id = :comic_id');
    $stmtChapters->execute([':comic_id' => $comicId]);
    $chapters = $stmtChapters->fetchAll(PDO::FETCH_ASSOC);

    foreach ($chapters as $ch) {
        $chapterId = $ch['id'];
        $dir = ENCRYPTED_DIR . '/chapter-' . $chapterId;
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
    }

    // Delete comic from DB (this cascades to chapters and pages if foreign keys are set up correctly, 
    // but even if not we manually handle file deletion and the DB delete below will work or fail based on constraints)
    $stmtDelete = $pdo->prepare('DELETE FROM comics WHERE id = :id');
    $stmtDelete->execute([':id' => $comicId]);

    // Note: If there is a cover image for the comic stored, we could delete it here.
    // Assuming covers are stored in STORAGE_DIR . '/covers' or similar, but the schema doesn't specify if we have local covers.
    // We'll leave it simple for now.

    $pdo->commit();
    ok(['deleted' => true]);

} catch (Throwable $e) {
    if (pdo()->inTransaction()) {
        pdo()->rollBack();
    }
    error_log($e->getMessage());
    fail('Failed to delete comic.', 500);
}
