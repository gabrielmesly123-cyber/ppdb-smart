<?php
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (preg_match('#^/(config|database|app|storage)(/|$)#', $path)) {
    http_response_code(404);
    exit;
}

return false;
