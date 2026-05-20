<?php
declare(strict_types=1);

$localConfig = [];
$localConfigFile = __DIR__ . '/config.local.php';
if (is_file($localConfigFile)) {
    $loadedConfig = require $localConfigFile;
    if (is_array($loadedConfig)) {
        $localConfig = $loadedConfig;
    }
}

function config_value(string $key, string $default): string
{
    global $localConfig;

    if (array_key_exists($key, $localConfig) && (string) $localConfig[$key] !== '') {
        return (string) $localConfig[$key];
    }

    $value = getenv($key);
    return $value !== false && $value !== '' ? $value : $default;
}

define('DB_HOST', config_value('DB_HOST', '127.0.0.1'));
define('DB_NAME', config_value('DB_NAME', 'db_manga'));
define('DB_USER', config_value('DB_USER', 'root'));
define('DB_PASS', config_value('DB_PASS', ''));

define('ADMIN_UPLOAD_TOKEN', config_value('ADMIN_UPLOAD_TOKEN', 'FikriAdminManga2026!'));
define('API_SECRET', config_value('API_SECRET', 'PastelComicsRahasia99'));
define('CORS_ALLOWED_ORIGINS', config_value(
    'CORS_ALLOWED_ORIGINS',
    'null,http://localhost,http://127.0.0.1,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://10.0.2.2,http://10.0.2.2:3000,http://192.168.1.5,http://192.168.1.5:3000'
));

define('PUBLIC_BASE_URL', config_value('PUBLIC_BASE_URL', 'http://localhost/manga_api'));
define('STORAGE_DIR', __DIR__ . '/storage');
define('ENCRYPTED_DIR', STORAGE_DIR . '/encrypted');
define('COVER_DIR', STORAGE_DIR . '/covers');

function assert_runtime_secrets_configured(): void
{
    $defaults = [
        'ADMIN_UPLOAD_TOKEN' => 'change-this-admin-token',
        'API_SECRET' => 'change-this-api-secret',
    ];

    foreach ($defaults as $constant => $defaultValue) {
        if (constant($constant) === $defaultValue) {
            fail($constant . ' must be configured before running the API.', 500);
        }
    }
}

function cors_allowed_origins(): array
{
    return array_values(array_filter(array_map('trim', explode(',', CORS_ALLOWED_ORIGINS))));
}

function apply_cors_headers(): void
{
    header('Access-Control-Allow-Headers: Content-Type, X-User-Id, X-Admin-Token');
    header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return;
    }

    $allowed = cors_allowed_origins();
    if (!in_array('*', $allowed, true) && !in_array($origin, $allowed, true)) {
        fail('CORS origin not allowed.', 403);
    }

    header('Access-Control-Allow-Origin: ' . (in_array('*', $allowed, true) ? '*' : $origin));
    header('Vary: Origin');
}

function pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function ensure_storage_dirs(): void
{
    foreach ([STORAGE_DIR, ENCRYPTED_DIR, COVER_DIR] as $dir) {
        if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new RuntimeException('Unable to create storage directory.');
        }
    }
}

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function ok(mixed $data = null): never
{
    json_response(['ok' => true, 'data' => $data]);
}

function fail(string $message, int $status = 400): never
{
    json_response(['ok' => false, 'error' => $message], $status);
}

function request_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail('Invalid JSON body.', 400);
    }

    return $data;
}

function current_user_id(): ?int
{
    $header = $_SERVER['HTTP_X_USER_ID'] ?? '';
    if (preg_match('/^\d+$/', $header) !== 1) {
        return null;
    }

    return (int) $header;
}

function require_user_id(): int
{
    $userId = current_user_id();
    if ($userId === null || $userId <= 0) {
        fail('Authentication required.', 401);
    }

    return $userId;
}

function absolute_public_url(string $path): string
{
    if (preg_match('/^https?:\/\//i', $path) === 1) {
        return $path;
    }

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? "https://" : "http://";
    $host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? 'localhost';
    
    // Default base path is /manga_api unless we are at root
    $basePath = '/manga_api';
    $baseUrl = $protocol . $host . $basePath;

    return rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
}

function page_token(int $pageId, int $chapterId): string
{
    return hash_hmac('sha256', $pageId . ':' . $chapterId, API_SECRET);
}

function slugify(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    $value = trim($value, '-');
    return $value !== '' ? $value : 'comic';
}
