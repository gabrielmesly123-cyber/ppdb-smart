<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require dirname(__DIR__) . '/app/bootstrap.php';

if ($argc < 4) {
    fwrite(STDERR, "Pemakaian: php database/create_admin.php \"Nama Admin\" email password\n");
    exit(1);
}
$name = trim($argv[1]);
$email = strtolower(trim($argv[2]));
$password = $argv[3];
if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12) {
    fwrite(STDERR, "Nama/email harus valid dan password admin minimal 12 karakter.\n");
    exit(1);
}
$stmt = db()->prepare("INSERT INTO users (nama, email, password, role) VALUES (?, ?, ?, 'admin')");
$stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
fwrite(STDOUT, "Akun admin berhasil dibuat untuk {$email}.\n");
