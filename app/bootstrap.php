<?php
declare(strict_types=1);

$config = require dirname(__DIR__) . '/config/config.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Lax',
    ]);
    session_start();
}

function db(): PDO
{
    global $config;
    static $pdo;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $settings = $config['db'];
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $settings['host'],
        $settings['port'],
        $settings['name'],
        $settings['charset']
    );
    $pdo = new PDO($dsn, $settings['user'], $settings['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function request_data(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($data) ? $data : $_POST;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function require_csrf(): void
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($token) || !hash_equals(csrf_token(), $token)) {
        json_response(['error' => 'Sesi keamanan tidak valid. Muat ulang halaman dan coba lagi.'], 419);
    }
}

function current_user(): ?array
{
    return isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;
}

function require_user(?string $role = null): array
{
    $user = current_user();
    if (!$user) {
        json_response(['error' => 'Silakan masuk terlebih dahulu.'], 401);
    }
    if ($role !== null && $user['role'] !== $role) {
        json_response(['error' => 'Anda tidak memiliki izin untuk melakukan tindakan ini.'], 403);
    }
    return $user;
}

function active_period(PDO $pdo): ?array
{
    $query = $pdo->query(
        "SELECT * FROM periode_pendaftaran
         WHERE status = 'aktif' AND mulai <= NOW() AND selesai >= NOW()
         ORDER BY mulai DESC LIMIT 1"
    );
    $period = $query->fetch();
    return $period ?: null;
}

function notify(PDO $pdo, int $userId, string $title, string $message): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO notifikasi (user_id, judul, pesan) VALUES (?, ?, ?)'
    );
    $stmt->execute([$userId, $title, $message]);
}

function send_registration_email(string $email, string $name): void
{
    global $config;
    if ($config['email_api_url'] === '') {
        return;
    }

    $headers = "Content-Type: application/json\r\n";
    if ($config['email_api_key'] !== '') {
        $headers .= 'Authorization: Bearer ' . $config['email_api_key'] . "\r\n";
    }
    $body = json_encode([
        'to' => $email,
        'subject' => 'Akun PPDB Smart berhasil dibuat',
        'text' => "Halo {$name}, akun PPDB Smart Anda berhasil dibuat. Silakan masuk untuk melengkapi pendaftaran.",
    ], JSON_UNESCAPED_UNICODE);
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => $headers,
            'content' => $body,
            'timeout' => 8,
            'ignore_errors' => true,
        ],
    ]);
    $response = @file_get_contents($config['email_api_url'], false, $context);
    $statusLine = $http_response_header[0] ?? '';
    if ($response === false || !preg_match('/\s2\d\d\s/', $statusLine)) {
        error_log('PPDB email API request failed with status: ' . ($statusLine ?: 'connection error'));
    }
}

function record_status(PDO $pdo, int $studentId, ?int $actorId, string $status, string $note = ''): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO riwayat_status (calon_siswa_id, user_id, status, catatan) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$studentId, $actorId, $status, $note]);
}
