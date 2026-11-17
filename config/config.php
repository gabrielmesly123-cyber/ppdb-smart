<?php
declare(strict_types=1);

return [
    'db' => [
        'host' => getenv('PPDB_DB_HOST') ?: '127.0.0.1',
        'port' => getenv('PPDB_DB_PORT') ?: '3306',
        'name' => getenv('PPDB_DB_NAME') ?: 'ppdb_smart',
        'user' => getenv('PPDB_DB_USER') ?: 'root',
        'pass' => getenv('PPDB_DB_PASS') ?: '',
        'charset' => 'utf8mb4',
    ],
    'upload_dir' => dirname(__DIR__) . '/storage/uploads',
    'max_upload_bytes' => 5 * 1024 * 1024,
    'email_api_url' => getenv('PPDB_EMAIL_API_URL') ?: '',
    'email_api_key' => getenv('PPDB_EMAIL_API_KEY') ?: '',
];
