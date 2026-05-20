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

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        fail('GET required.', 405);
    }

    // Auth check
    $token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ($_GET['admin_token'] ?? '');
    if (!hash_equals(ADMIN_UPLOAD_TOKEN, (string) $token)) {
        fail('Invalid admin token.', 403);
    }

    $pdo = pdo();

    // Fetch Stats
    $stmtComics = $pdo->query('SELECT COUNT(*) FROM comics');
    $totalComics = (int) $stmtComics->fetchColumn();

    $stmtChapters = $pdo->query('SELECT COUNT(*) FROM chapters');
    $totalChapters = (int) $stmtChapters->fetchColumn();

    $stmtUsers = $pdo->query('SELECT COUNT(*) FROM users');
    $totalUsers = (int) $stmtUsers->fetchColumn();

    // Fetch All Comics for Table
    $stmtRecent = $pdo->query('SELECT id, title, author, rating, status, created_at FROM comics ORDER BY created_at DESC');
    $recentComics = $stmtRecent->fetchAll(PDO::FETCH_ASSOC);

    ok([
        'stats' => [
            'total_comics' => $totalComics,
            'total_chapters' => $totalChapters,
            'total_users' => $totalUsers,
        ],
        'recent_comics' => $recentComics
    ]);

} catch (Throwable $e) {
    error_log($e->getMessage());
    fail('Failed to fetch dashboard data.', 500);
}
