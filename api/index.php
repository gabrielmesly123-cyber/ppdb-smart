<?php
declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = trim((string) ($_GET['action'] ?? ''));
if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
    require_csrf();
}

try {
    $pdo = db();
    $data = request_data();

    switch ($action) {
        case 'meta':
            $period = active_period($pdo);
            $tracks = $pdo->query('SELECT id, nama FROM jalur_pendaftaran ORDER BY nama')->fetchAll();
            json_response([
                'csrf' => csrf_token(),
                'user' => current_user(),
                'period' => $period,
                'tracks' => $tracks,
            ]);

        case 'register':
            if ($method !== 'POST') {
                json_response(['error' => 'Metode tidak diizinkan.'], 405);
            }
            $name = trim((string) ($data['nama'] ?? ''));
            $email = strtolower(trim((string) ($data['email'] ?? '')));
            $password = (string) ($data['password'] ?? '');
            if (strlen($name) < 3 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
                json_response(['error' => 'Nama minimal 3 karakter, email harus valid, dan kata sandi minimal 8 karakter.'], 422);
            }
            $stmt = $pdo->prepare("INSERT INTO users (nama, email, password, role) VALUES (?, ?, ?, 'siswa')");
            try {
                $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
            } catch (PDOException $exception) {
                if ($exception->getCode() === '23000') {
                    json_response(['error' => 'Email tersebut sudah terdaftar.'], 409);
                }
                throw $exception;
            }
            session_regenerate_id(true);
            $_SESSION['user'] = ['id' => (int) $pdo->lastInsertId(), 'name' => $name, 'email' => $email, 'role' => 'siswa'];
            send_registration_email($email, $name);
            json_response(['message' => 'Akun berhasil dibuat.', 'user' => current_user(), 'csrf' => csrf_token()], 201);

        case 'login':
            if ($method !== 'POST') {
                json_response(['error' => 'Metode tidak diizinkan.'], 405);
            }
            $email = strtolower(trim((string) ($data['email'] ?? '')));
            $stmt = $pdo->prepare('SELECT id, nama, email, password, role FROM users WHERE email = ? LIMIT 1');
            $stmt->execute([$email]);
            $account = $stmt->fetch();
            if (!$account || !password_verify((string) ($data['password'] ?? ''), $account['password'])) {
                json_response(['error' => 'Email atau kata sandi tidak sesuai.'], 401);
            }
            session_regenerate_id(true);
            $_SESSION['user'] = [
                'id' => (int) $account['id'],
                'name' => $account['nama'],
                'email' => $account['email'],
                'role' => $account['role'],
            ];
            json_response(['message' => 'Berhasil masuk.', 'user' => current_user(), 'csrf' => csrf_token()]);

        case 'logout':
            require_user();
            $_SESSION = [];
            session_regenerate_id(true);
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            json_response(['message' => 'Anda telah keluar.', 'csrf' => csrf_token()]);

        case 'student/home':
            $user = require_user('siswa');
            $stmt = $pdo->prepare(
                'SELECT cs.*, jp.nama AS jalur_nama, pp.nama AS periode_nama
                 FROM calon_siswa cs
                 JOIN jalur_pendaftaran jp ON jp.id = cs.jalur_id
                 JOIN periode_pendaftaran pp ON pp.id = cs.periode_id
                 WHERE cs.user_id = ? ORDER BY cs.dibuat_pada DESC'
            );
            $stmt->execute([$user['id']]);
            $applications = $stmt->fetchAll();
            $appIds = array_column($applications, 'id');
            $documents = [];
            $results = [];
            if ($appIds) {
                $placeholders = implode(',', array_fill(0, count($appIds), '?'));
                $stmt = $pdo->prepare("SELECT id, calon_siswa_id, jenis, nama_file, status, catatan FROM dokumen_pendaftaran WHERE calon_siswa_id IN ($placeholders)");
                $stmt->execute($appIds);
                $documents = $stmt->fetchAll();
                $stmt = $pdo->prepare("SELECT hs.calon_siswa_id, hs.hasil, hs.diumumkan_pada FROM hasil_seleksi hs WHERE hs.calon_siswa_id IN ($placeholders) AND hs.diumumkan = 1");
                $stmt->execute($appIds);
                $results = $stmt->fetchAll();
            }
            $stmt = $pdo->prepare('SELECT judul, pesan, dibuat_pada, dibaca FROM notifikasi WHERE user_id = ? ORDER BY dibuat_pada DESC LIMIT 8');
            $stmt->execute([$user['id']]);
            json_response([
                'period' => active_period($pdo),
                'tracks' => $pdo->query('SELECT id, nama FROM jalur_pendaftaran ORDER BY nama')->fetchAll(),
                'applications' => $applications,
                'documents' => $documents,
                'results' => $results,
                'notifications' => $stmt->fetchAll(),
            ]);

        case 'student/application':
            $user = require_user('siswa');
            if ($method !== 'POST') {
                json_response(['error' => 'Metode tidak diizinkan.'], 405);
            }
            $period = active_period($pdo);
            if (!$period) {
                json_response(['error' => 'Pendaftaran sedang tidak dibuka.'], 409);
            }
            $required = ['nama_lengkap', 'nisn', 'nik', 'tanggal_lahir', 'jenis_kelamin', 'alamat', 'nama_wali', 'telepon_wali', 'jalur_id'];
            foreach ($required as $field) {
                if (trim((string) ($data[$field] ?? '')) === '') {
                    json_response(['error' => 'Semua data wajib pada formulir harus diisi.'], 422);
                }
            }
            if (!preg_match('/^\d{10}$/', (string) $data['nisn']) || !preg_match('/^\d{16}$/', (string) $data['nik'])) {
                json_response(['error' => 'NISN harus 10 digit dan NIK harus 16 digit.'], 422);
            }
            $birthDate = DateTime::createFromFormat('!Y-m-d', (string) $data['tanggal_lahir']);
            if (
                strlen(trim((string) $data['nama_lengkap'])) < 3
                || !$birthDate
                || $birthDate->format('Y-m-d') !== $data['tanggal_lahir']
                || $birthDate > new DateTime('today')
                || !preg_match('/^[+0-9()\-\s]{8,24}$/', trim((string) $data['telepon_wali']))
            ) {
                json_response(['error' => 'Nama, tanggal lahir, atau nomor telepon wali tidak valid.'], 422);
            }
            if (!in_array($data['jenis_kelamin'], ['L', 'P'], true)) {
                json_response(['error' => 'Jenis kelamin tidak valid.'], 422);
            }
            $trackStmt = $pdo->prepare('SELECT id FROM jalur_pendaftaran WHERE id = ?');
            $trackStmt->execute([(int) $data['jalur_id']]);
            if (!$trackStmt->fetch()) {
                json_response(['error' => 'Jalur pendaftaran tidak ditemukan.'], 422);
            }
            $existingStmt = $pdo->prepare('SELECT id, status FROM calon_siswa WHERE user_id = ? AND periode_id = ? FOR UPDATE');
            $pdo->beginTransaction();
            $existingStmt->execute([$user['id'], $period['id']]);
            $existing = $existingStmt->fetch();
            if ($existing && !in_array($existing['status'], ['draft', 'ditolak'], true)) {
                $pdo->rollBack();
                json_response(['error' => 'Anda sudah mengirim pendaftaran untuk periode ini.'], 409);
            }
            if ($existing) {
                $stmt = $pdo->prepare(
                    "UPDATE calon_siswa SET jalur_id=?, nama_lengkap=?, nisn=?, nik=?, tanggal_lahir=?, jenis_kelamin=?, alamat=?, nama_wali=?, telepon_wali=?, status='draft', diperbarui_pada=NOW() WHERE id=?"
                );
                $stmt->execute([
                    (int) $data['jalur_id'], trim($data['nama_lengkap']), trim($data['nisn']),
                    trim($data['nik']), $data['tanggal_lahir'], $data['jenis_kelamin'],
                    trim($data['alamat']), trim($data['nama_wali']), trim($data['telepon_wali']), $existing['id'],
                ]);
                $studentId = (int) $existing['id'];
                if ($existing['status'] === 'ditolak') {
                    record_status($pdo, $studentId, $user['id'], 'draft', 'Formulir diperbaiki oleh calon siswa.');
                }
            } else {
                $regNo = 'PPDB-' . date('y') . '-' . strtoupper(bin2hex(random_bytes(3)));
                $stmt = $pdo->prepare(
                    "INSERT INTO calon_siswa (user_id, periode_id, jalur_id, nomor_pendaftaran, nama_lengkap, nisn, nik, tanggal_lahir, jenis_kelamin, alamat, nama_wali, telepon_wali, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')"
                );
                $stmt->execute([
                    $user['id'], $period['id'], (int) $data['jalur_id'], $regNo,
                    trim($data['nama_lengkap']), trim($data['nisn']), trim($data['nik']),
                    $data['tanggal_lahir'], $data['jenis_kelamin'], trim($data['alamat']),
                    trim($data['nama_wali']), trim($data['telepon_wali']),
                ]);
                $studentId = (int) $pdo->lastInsertId();
                record_status($pdo, $studentId, $user['id'], 'draft', 'Draft pendaftaran dibuat.');
            }
            if (!empty($data['submit'])) {
                $count = $pdo->prepare("SELECT COUNT(DISTINCT jenis) FROM dokumen_pendaftaran WHERE calon_siswa_id=? AND status <> 'ditolak'");
                $count->execute([$studentId]);
                if ((int) $count->fetchColumn() < 3) {
                    $pdo->rollBack();
                    json_response(['error' => 'Unggah tiga dokumen wajib sebelum mengirim formulir.'], 422);
                }
                $pdo->prepare("UPDATE calon_siswa SET status='dikirim', diperbarui_pada=NOW() WHERE id=?")->execute([$studentId]);
                record_status($pdo, $studentId, $user['id'], 'dikirim', 'Formulir dikirim oleh calon siswa.');
            }
            $pdo->commit();
            json_response(['message' => !empty($data['submit']) ? 'Pendaftaran berhasil dikirim.' : 'Data formulir tersimpan.', 'id' => $studentId], 201);

        case 'student/upload':
            $user = require_user('siswa');
            if ($method !== 'POST') {
                json_response(['error' => 'Metode tidak diizinkan.'], 405);
            }
            $studentStmt = $pdo->prepare(
                "SELECT cs.id, cs.status FROM calon_siswa cs
                 JOIN periode_pendaftaran pp ON pp.id=cs.periode_id
                 WHERE cs.user_id=? AND pp.status='aktif' AND pp.mulai <= NOW() AND pp.selesai >= NOW()
                 ORDER BY cs.id DESC LIMIT 1"
            );
            $studentStmt->execute([$user['id']]);
            $student = $studentStmt->fetch();
            $types = ['akta' => 'Akta kelahiran', 'kk' => 'Kartu keluarga', 'foto' => 'Pas foto'];
            $type = (string) ($_POST['jenis'] ?? '');
            $file = $_FILES['dokumen'] ?? null;
            if (!$student || !in_array($student['status'], ['draft', 'ditolak'], true)) {
                json_response(['error' => 'Lengkapi atau perbaiki formulir sebelum mengunggah dokumen.'], 409);
            }
            if (!isset($types[$type]) || !$file || $file['error'] !== UPLOAD_ERR_OK) {
                json_response(['error' => 'Pilih jenis dan berkas dokumen yang valid.'], 422);
            }
            global $config;
            if ($file['size'] > $config['max_upload_bytes']) {
                json_response(['error' => 'Ukuran berkas maksimal 5 MB.'], 422);
            }
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
            $allowed = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png'];
            if (!isset($allowed[$mime])) {
                json_response(['error' => 'Format dokumen harus PDF, JPG, atau PNG.'], 422);
            }
            $directory = $config['upload_dir'];
            if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
                throw new RuntimeException('Folder penyimpanan dokumen tidak dapat dibuat.');
            }
            $storedName = bin2hex(random_bytes(20)) . '.' . $allowed[$mime];
            if (!move_uploaded_file($file['tmp_name'], $directory . DIRECTORY_SEPARATOR . $storedName)) {
                throw new RuntimeException('Dokumen gagal disimpan.');
            }
            $pdo->beginTransaction();
            try {
                $oldStmt = $pdo->prepare('SELECT id, path_file FROM dokumen_pendaftaran WHERE calon_siswa_id=? AND jenis=?');
                $oldStmt->execute([$student['id'], $type]);
                $old = $oldStmt->fetch();
                if ($old) {
                    $stmt = $pdo->prepare("UPDATE dokumen_pendaftaran SET nama_file=?, path_file=?, mime_type=?, ukuran=?, status='menunggu', catatan=NULL, diunggah_pada=NOW() WHERE id=?");
                    $stmt->execute([$file['name'], $storedName, $mime, $file['size'], $old['id']]);
                } else {
                    $stmt = $pdo->prepare("INSERT INTO dokumen_pendaftaran (calon_siswa_id, jenis, nama_file, path_file, mime_type, ukuran) VALUES (?, ?, ?, ?, ?, ?)");
                    $stmt->execute([$student['id'], $type, $file['name'], $storedName, $mime, $file['size']]);
                }
                $pdo->commit();
            } catch (Throwable $exception) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                if (is_file($directory . DIRECTORY_SEPARATOR . $storedName)) {
                    unlink($directory . DIRECTORY_SEPARATOR . $storedName);
                }
                throw $exception;
            }
            if ($old && is_file($directory . DIRECTORY_SEPARATOR . $old['path_file'])) {
                unlink($directory . DIRECTORY_SEPARATOR . $old['path_file']);
            }
            json_response(['message' => $types[$type] . ' berhasil diunggah.'], 201);

        case 'student/document':
            $user = require_user();
            $docId = (int) ($_GET['id'] ?? 0);
            $stmt = $pdo->prepare(
                "SELECT d.path_file, d.mime_type, d.nama_file FROM dokumen_pendaftaran d
                 JOIN calon_siswa cs ON cs.id=d.calon_siswa_id
                 WHERE d.id=? AND (?='admin' OR cs.user_id=?)"
            );
            $stmt->execute([$docId, $user['role'], $user['id']]);
            $doc = $stmt->fetch();
            if (!$doc) {
                json_response(['error' => 'Dokumen tidak ditemukan.'], 404);
            }
            $path = $config['upload_dir'] . DIRECTORY_SEPARATOR . $doc['path_file'];
            if (!is_file($path)) {
                json_response(['error' => 'Berkas dokumen tidak tersedia.'], 404);
            }
            header('Content-Type: ' . $doc['mime_type']);
            $filename = str_replace(["\r", "\n", '"'], '', basename($doc['nama_file']));
            header('Content-Disposition: inline; filename="' . $filename . '"');
            header('X-Content-Type-Options: nosniff');
            header('Cache-Control: private, no-store');
            readfile($path);
            exit;

        case 'admin/dashboard':
            require_user('admin');
            $stats = $pdo->query(
                "SELECT COUNT(*) AS total,
                 SUM(status='dikirim') AS menunggu,
                 SUM(status='terverifikasi') AS terverifikasi,
                 SUM(status='diterima') AS diterima
                 FROM calon_siswa"
            )->fetch();
            $apps = $pdo->query(
                'SELECT cs.id, cs.nomor_pendaftaran, cs.nama_lengkap, cs.nisn, cs.nik, cs.alamat, cs.nama_wali, cs.telepon_wali,
                        cs.status, cs.dibuat_pada, cs.diperbarui_pada,
                        jp.nama AS jalur_nama, pp.nama AS periode_nama, u.email
                 FROM calon_siswa cs JOIN jalur_pendaftaran jp ON jp.id=cs.jalur_id
                 JOIN periode_pendaftaran pp ON pp.id=cs.periode_id JOIN users u ON u.id=cs.user_id
                 ORDER BY cs.dibuat_pada DESC'
            )->fetchAll();
            $docs = $pdo->query(
                'SELECT d.id, d.calon_siswa_id, d.jenis, d.nama_file, d.status, d.catatan, cs.nama_lengkap
                 FROM dokumen_pendaftaran d JOIN calon_siswa cs ON cs.id=d.calon_siswa_id ORDER BY d.diunggah_pada DESC'
            )->fetchAll();
            $periods = $pdo->query(
                'SELECT pp.*, (SELECT COUNT(*) FROM calon_siswa cs WHERE cs.periode_id=pp.id) AS jumlah_pendaftar
                 FROM periode_pendaftaran pp ORDER BY pp.mulai DESC'
            )->fetchAll();
            $quotas = $pdo->query(
                'SELECT q.id, q.periode_id, q.jalur_id, q.kuota, pp.nama AS periode_nama, jp.nama AS jalur_nama,
                        (SELECT COUNT(*) FROM hasil_seleksi hs JOIN calon_siswa cs ON cs.id=hs.calon_siswa_id WHERE cs.periode_id=q.periode_id AND cs.jalur_id=q.jalur_id AND hs.hasil="diterima") AS terisi
                 FROM kuota_pendaftaran q JOIN periode_pendaftaran pp ON pp.id=q.periode_id
                 JOIN jalur_pendaftaran jp ON jp.id=q.jalur_id'
            )->fetchAll();
            json_response(['stats' => $stats, 'applications' => $apps, 'documents' => $docs, 'periods' => $periods, 'quotas' => $quotas]);

        case 'admin/document':
            $admin = require_user('admin');
            if ($method !== 'POST') {
                json_response(['error' => 'Metode tidak diizinkan.'], 405);
            }
            $decision = $data['status'] ?? '';
            if (!in_array($decision, ['disetujui', 'ditolak'], true)) {
                json_response(['error' => 'Status verifikasi tidak valid.'], 422);
            }
            $documentId = (int) ($data['id'] ?? 0);
            $owner = $pdo->prepare('SELECT cs.id AS calon_siswa_id, cs.user_id, cs.status AS status_pendaftaran FROM dokumen_pendaftaran d JOIN calon_siswa cs ON cs.id=d.calon_siswa_id WHERE d.id=?');
            $owner->execute([$documentId]);
            $documentOwner = $owner->fetch();
            if (!$documentOwner) {
                json_response(['error' => 'Dokumen tidak ditemukan.'], 404);
            }
            $pdo->beginTransaction();
            $stmt = $pdo->prepare(
                'UPDATE dokumen_pendaftaran SET status=?, catatan=? WHERE id=?'
            );
            $stmt->execute([$decision, trim((string) ($data['catatan'] ?? '')), $documentId]);
            if ($decision === 'ditolak' && $documentOwner['status_pendaftaran'] === 'dikirim') {
                $pdo->prepare("UPDATE calon_siswa SET status='ditolak', diperbarui_pada=NOW() WHERE id=?")->execute([$documentOwner['calon_siswa_id']]);
                record_status($pdo, (int) $documentOwner['calon_siswa_id'], $admin['id'], 'ditolak', trim((string) ($data['catatan'] ?? 'Dokumen perlu diperbaiki.')));
            }
            notify($pdo, (int) $documentOwner['user_id'], 'Verifikasi dokumen diperbarui', 'Dokumen Anda telah ' . $decision . '.');
            $pdo->commit();
            json_response(['message' => 'Status dokumen berhasil diperbarui.']);

        case 'admin/verify':
            $admin = require_user('admin');
            if ($method !== 'POST') {
                json_response(['error' => 'Metode tidak diizinkan.'], 405);
            }
            $studentId = (int) ($data['calon_siswa_id'] ?? 0);
            $decision = (string) ($data['status'] ?? '');
            if (!in_array($decision, ['terverifikasi', 'ditolak'], true)) {
                json_response(['error' => 'Keputusan verifikasi tidak valid.'], 422);
            }
            $stmt = $pdo->prepare('SELECT user_id, status FROM calon_siswa WHERE id=?');
            $stmt->execute([$studentId]);
            $student = $stmt->fetch();
            if (!$student) {
                json_response(['error' => 'Pendaftar tidak ditemukan.'], 404);
            }
            if ($student['status'] !== 'dikirim') {
                json_response(['error' => 'Pendaftaran harus berstatus menunggu verifikasi.'], 409);
            }
            $approvedDocs = $pdo->prepare("SELECT COUNT(*) FROM dokumen_pendaftaran WHERE calon_siswa_id=? AND status='disetujui'");
            $approvedDocs->execute([$studentId]);
            if ($decision === 'terverifikasi' && (int) $approvedDocs->fetchColumn() < 3) {
                json_response(['error' => 'Semua dokumen wajib harus disetujui terlebih dahulu.'], 409);
            }
            $pdo->beginTransaction();
            $pdo->prepare('UPDATE calon_siswa SET status=?, diperbarui_pada=NOW() WHERE id=?')->execute([$decision, $studentId]);
            record_status($pdo, $studentId, $admin['id'], $decision, trim((string) ($data['catatan'] ?? '')));
            notify($pdo, (int) $student['user_id'], 'Status pendaftaran diperbarui', 'Status pendaftaran Anda: ' . $decision . '.');
            $pdo->commit();
            json_response(['message' => 'Status verifikasi pendaftaran berhasil diperbarui.']);

        case 'admin/student':
            require_user('admin');
            $id = (int) ($data['id'] ?? 0);
            if ($method === 'DELETE') {
                $stmt = $pdo->prepare('DELETE FROM calon_siswa WHERE id=?');
                $stmt->execute([$id]);
                json_response(['message' => 'Data pendaftar dihapus.']);
            }
            if ($method !== 'POST') {
                json_response(['error' => 'Metode tidak diizinkan.'], 405);
            }
            $stmt = $pdo->prepare('UPDATE calon_siswa SET nama_lengkap=?, nisn=?, nik=?, alamat=?, nama_wali=?, telepon_wali=?, diperbarui_pada=NOW() WHERE id=?');
            foreach (['nama_lengkap', 'nisn', 'nik', 'alamat', 'nama_wali', 'telepon_wali'] as $field) {
                if (trim((string) ($data[$field] ?? '')) === '') {
                    json_response(['error' => 'Semua kolom data pendaftar wajib diisi.'], 422);
                }
            }
            if (!preg_match('/^\d{10}$/', (string) $data['nisn']) || !preg_match('/^\d{16}$/', (string) $data['nik'])) {
                json_response(['error' => 'NISN harus 10 digit dan NIK harus 16 digit.'], 422);
            }
            $stmt->execute([
                trim((string) ($data['nama_lengkap'] ?? '')), trim((string) ($data['nisn'] ?? '')),
                trim((string) ($data['nik'] ?? '')), trim((string) ($data['alamat'] ?? '')),
                trim((string) ($data['nama_wali'] ?? '')), trim((string) ($data['telepon_wali'] ?? '')), $id,
            ]);
            if ($stmt->rowCount() === 0) {
                $exists = $pdo->prepare('SELECT id FROM calon_siswa WHERE id=?');
                $exists->execute([$id]);
                if (!$exists->fetch()) {
                    json_response(['error' => 'Data pendaftar tidak ditemukan.'], 404);
                }
            }
            json_response(['message' => 'Data pendaftar berhasil diperbarui.']);

        case 'admin/period':
            require_user('admin');
            if ($method !== 'POST') {
                json_response(['error' => 'Metode tidak diizinkan.'], 405);
            }
            $name = trim((string) ($data['nama'] ?? ''));
            $start = (string) ($data['mulai'] ?? '');
            $end = (string) ($data['selesai'] ?? '');
            if ($name === '' || strtotime($start) === false || strtotime($end) === false || strtotime($end) <= strtotime($start)) {
                json_response(['error' => 'Nama dan rentang tanggal periode harus valid.'], 422);
            }
            $pdo->beginTransaction();
            if (($data['status'] ?? '') === 'aktif') {
                $pdo->exec("UPDATE periode_pendaftaran SET status='nonaktif' WHERE status='aktif'");
            }
            $periodId = (int) ($data['id'] ?? 0);
            if ($periodId) {
                $stmt = $pdo->prepare('UPDATE periode_pendaftaran SET nama=?, mulai=?, selesai=?, status=? WHERE id=?');
                $stmt->execute([$name, $start, $end, ($data['status'] ?? '') === 'aktif' ? 'aktif' : 'nonaktif', $periodId]);
            } else {
                $stmt = $pdo->prepare('INSERT INTO periode_pendaftaran (nama, mulai, selesai, status) VALUES (?, ?, ?, ?)');
                $stmt->execute([$name, $start, $end, ($data['status'] ?? '') === 'aktif' ? 'aktif' : 'nonaktif']);
                $periodId = (int) $pdo->lastInsertId();
            }
            $quotas = is_array($data['quotas'] ?? null) ? $data['quotas'] : [];
            if (!$quotas && !empty($data['jalur_id'])) {
                $quotas[(int) $data['jalur_id']] = (int) ($data['kuota'] ?? 0);
            }
            if (!$quotas || array_sum(array_map('intval', $quotas)) < 1) {
                $pdo->rollBack();
                json_response(['error' => 'Atur kuota minimal satu siswa pada salah satu jalur.'], 422);
            }
            $quotaStmt = $pdo->prepare('INSERT INTO kuota_pendaftaran (periode_id, jalur_id, kuota) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE kuota=VALUES(kuota)');
            foreach ($quotas as $trackId => $quota) {
                if ((int) $trackId <= 0 || !is_numeric($quota) || (int) $quota < 0) {
                    $pdo->rollBack();
                    json_response(['error' => 'Kuota tiap jalur harus berupa bilangan nol atau lebih.'], 422);
                }
                $quotaStmt->execute([$periodId, (int) $trackId, (int) $quota]);
            }
            $pdo->commit();
            json_response(['message' => 'Periode dan kuota berhasil disimpan.'], 201);

        case 'admin/selection':
            $admin = require_user('admin');
            if ($method !== 'POST') {
                json_response(['error' => 'Metode tidak diizinkan.'], 405);
            }
            $studentId = (int) ($data['calon_siswa_id'] ?? 0);
            $decision = (string) ($data['hasil'] ?? '');
            if (!in_array($decision, ['diterima', 'tidak_diterima'], true)) {
                json_response(['error' => 'Hasil seleksi tidak valid.'], 422);
            }
            $pdo->beginTransaction();
            $stmt = $pdo->prepare('SELECT cs.*, q.kuota FROM calon_siswa cs LEFT JOIN kuota_pendaftaran q ON q.periode_id=cs.periode_id AND q.jalur_id=cs.jalur_id WHERE cs.id=? FOR UPDATE');
            $stmt->execute([$studentId]);
            $student = $stmt->fetch();
            if (!$student) {
                $pdo->rollBack();
                json_response(['error' => 'Pendaftar tidak ditemukan.'], 404);
            }
            if (!in_array($student['status'], ['terverifikasi', 'diterima', 'tidak_diterima'], true)) {
                $pdo->rollBack();
                json_response(['error' => 'Verifikasi data dan dokumen pendaftar sebelum menetapkan hasil seleksi.'], 409);
            }
            $docs = $pdo->prepare("SELECT COUNT(*) FROM dokumen_pendaftaran WHERE calon_siswa_id=? AND status='disetujui'");
            $docs->execute([$studentId]);
            if ($decision === 'diterima' && (int) $docs->fetchColumn() < 3) {
                $pdo->rollBack();
                json_response(['error' => 'Pendaftar harus memiliki tiga dokumen yang disetujui sebelum diterima.'], 409);
            }
            if ($decision === 'diterima') {
                $quotaLock = $pdo->prepare('SELECT kuota FROM kuota_pendaftaran WHERE periode_id=? AND jalur_id=? FOR UPDATE');
                $quotaLock->execute([$student['periode_id'], $student['jalur_id']]);
                $lockedQuota = $quotaLock->fetchColumn();
                $filled = $pdo->prepare("SELECT COUNT(*) FROM hasil_seleksi hs JOIN calon_siswa cs ON cs.id=hs.calon_siswa_id WHERE cs.periode_id=? AND cs.jalur_id=? AND hs.hasil='diterima' AND cs.id<>?");
                $filled->execute([$student['periode_id'], $student['jalur_id'], $studentId]);
                if (!$lockedQuota || (int) $filled->fetchColumn() >= (int) $lockedQuota) {
                    $pdo->rollBack();
                    json_response(['error' => 'Kuota jalur ini sudah penuh atau belum diatur.'], 409);
                }
            }
            $stmt = $pdo->prepare('INSERT INTO hasil_seleksi (calon_siswa_id, hasil, diumumkan) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE hasil=VALUES(hasil), diumumkan=0, diumumkan_pada=NULL');
            $stmt->execute([$studentId, $decision]);
            $newStatus = $decision === 'diterima' ? 'diterima' : 'tidak_diterima';
            $pdo->prepare('UPDATE calon_siswa SET status=?, diperbarui_pada=NOW() WHERE id=?')->execute([$newStatus, $studentId]);
            record_status($pdo, $studentId, $admin['id'], $newStatus, 'Hasil seleksi diperbarui admin.');
            notify($pdo, (int) $student['user_id'], 'Hasil seleksi diperbarui', 'Admin telah menetapkan hasil seleksi Anda. Hasil dapat dilihat setelah diumumkan.');
            $pdo->commit();
            json_response(['message' => 'Hasil seleksi tersimpan. Umumkan hasil agar dapat dilihat pendaftar.']);

        case 'admin/publish':
            require_user('admin');
            if ($method !== 'POST') {
                json_response(['error' => 'Metode tidak diizinkan.'], 405);
            }
            $periodId = (int) ($data['periode_id'] ?? 0);
            $pdo->beginTransaction();
            $ready = $pdo->prepare('SELECT COUNT(*) FROM hasil_seleksi hs JOIN calon_siswa cs ON cs.id=hs.calon_siswa_id WHERE cs.periode_id=? AND hs.diumumkan=0');
            $ready->execute([$periodId]);
            if ((int) $ready->fetchColumn() === 0) {
                $pdo->rollBack();
                json_response(['error' => 'Belum ada hasil seleksi yang siap diumumkan untuk periode ini.'], 409);
            }
            $stmt = $pdo->prepare('UPDATE hasil_seleksi hs JOIN calon_siswa cs ON cs.id=hs.calon_siswa_id SET hs.diumumkan=1, hs.diumumkan_pada=NOW() WHERE cs.periode_id=?');
            $stmt->execute([$periodId]);
            $users = $pdo->prepare('SELECT DISTINCT cs.user_id FROM calon_siswa cs JOIN hasil_seleksi hs ON hs.calon_siswa_id=cs.id WHERE cs.periode_id=?');
            $users->execute([$periodId]);
            foreach ($users->fetchAll(PDO::FETCH_COLUMN) as $userId) {
                notify($pdo, (int) $userId, 'Pengumuman hasil seleksi', 'Hasil seleksi PPDB telah diumumkan. Silakan buka dashboard untuk melihat hasil.');
            }
            $pdo->commit();
            json_response(['message' => 'Hasil seleksi periode ini telah diumumkan.']);

        default:
            json_response(['error' => 'Endpoint tidak ditemukan.'], 404);
    }
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23000') {
        json_response(['error' => 'Data bertentangan dengan pendaftaran yang sudah ada. Periksa kembali nomor identitas atau periode.'], 409);
    }
    error_log((string) $exception);
    json_response(['error' => 'Terjadi kesalahan pada server. Periksa konfigurasi dan log aplikasi.'], 500);
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log((string) $exception);
    json_response(['error' => 'Terjadi kesalahan pada server. Periksa konfigurasi dan log aplikasi.'], 500);
}
