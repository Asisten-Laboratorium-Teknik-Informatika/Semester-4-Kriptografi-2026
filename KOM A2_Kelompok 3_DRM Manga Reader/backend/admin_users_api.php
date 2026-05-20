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

    // Fetch All Users
    $stmtUsers = $pdo->query('
        SELECT 
            id, email, password_hash as password, display_name, photo_url, created_at, updated_at 
        FROM users 
        ORDER BY created_at DESC
    ');
    
    $users = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);

    ok([
        'users' => $users
    ]);

} catch (Throwable $e) {
    error_log($e->getMessage());
    fail('Failed to fetch users.', 500);
}
