CREATE DATABASE IF NOT EXISTS ppdb_smart
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ppdb_smart;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('siswa','admin') NOT NULL DEFAULT 'siswa',
  dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS periode_pendaftaran (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(120) NOT NULL,
  mulai DATETIME NOT NULL,
  selesai DATETIME NOT NULL,
  status ENUM('aktif','nonaktif') NOT NULL DEFAULT 'nonaktif',
  active_guard TINYINT GENERATED ALWAYS AS (CASE WHEN status = 'aktif' THEN 1 ELSE NULL END) STORED,
  dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_single_active_period (active_guard),
  INDEX idx_periode_status (status, mulai, selesai)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS jalur_pendaftaran (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL UNIQUE,
  deskripsi VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kuota_pendaftaran (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  periode_id BIGINT UNSIGNED NOT NULL,
  jalur_id BIGINT UNSIGNED NOT NULL,
  kuota INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_kuota_periode_jalur (periode_id, jalur_id),
  CONSTRAINT fk_kuota_periode FOREIGN KEY (periode_id) REFERENCES periode_pendaftaran(id) ON DELETE CASCADE,
  CONSTRAINT fk_kuota_jalur FOREIGN KEY (jalur_id) REFERENCES jalur_pendaftaran(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS calon_siswa (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  periode_id BIGINT UNSIGNED NOT NULL,
  jalur_id BIGINT UNSIGNED NOT NULL,
  nomor_pendaftaran VARCHAR(24) NOT NULL UNIQUE,
  nama_lengkap VARCHAR(140) NOT NULL,
  nisn CHAR(10) NOT NULL,
  nik CHAR(16) NOT NULL,
  tanggal_lahir DATE NOT NULL,
  jenis_kelamin ENUM('L','P') NOT NULL,
  alamat TEXT NOT NULL,
  nama_wali VARCHAR(140) NOT NULL,
  telepon_wali VARCHAR(24) NOT NULL,
  status ENUM('draft','dikirim','terverifikasi','ditolak','diterima','tidak_diterima') NOT NULL DEFAULT 'draft',
  dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  diperbarui_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pendaftaran_akun_periode (user_id, periode_id),
  UNIQUE KEY uq_nisn_periode (nisn, periode_id),
  CONSTRAINT fk_siswa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_siswa_periode FOREIGN KEY (periode_id) REFERENCES periode_pendaftaran(id) ON DELETE RESTRICT,
  CONSTRAINT fk_siswa_jalur FOREIGN KEY (jalur_id) REFERENCES jalur_pendaftaran(id) ON DELETE RESTRICT,
  INDEX idx_siswa_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dokumen_pendaftaran (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  calon_siswa_id BIGINT UNSIGNED NOT NULL,
  jenis ENUM('akta','kk','foto') NOT NULL,
  nama_file VARCHAR(255) NOT NULL,
  path_file VARCHAR(255) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  ukuran INT UNSIGNED NOT NULL,
  status ENUM('menunggu','disetujui','ditolak') NOT NULL DEFAULT 'menunggu',
  catatan VARCHAR(500) NULL,
  diunggah_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dokumen_jenis (calon_siswa_id, jenis),
  CONSTRAINT fk_dokumen_siswa FOREIGN KEY (calon_siswa_id) REFERENCES calon_siswa(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS hasil_seleksi (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  calon_siswa_id BIGINT UNSIGNED NOT NULL UNIQUE,
  hasil ENUM('diterima','tidak_diterima') NOT NULL,
  diumumkan TINYINT(1) NOT NULL DEFAULT 0,
  diumumkan_pada DATETIME NULL,
  CONSTRAINT fk_hasil_siswa FOREIGN KEY (calon_siswa_id) REFERENCES calon_siswa(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifikasi (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  judul VARCHAR(160) NOT NULL,
  pesan TEXT NOT NULL,
  dibaca TINYINT(1) NOT NULL DEFAULT 0,
  dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifikasi_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifikasi_user (user_id, dibuat_pada)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS riwayat_status (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  calon_siswa_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  status VARCHAR(32) NOT NULL,
  catatan VARCHAR(500) NOT NULL DEFAULT '',
  dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_riwayat_siswa FOREIGN KEY (calon_siswa_id) REFERENCES calon_siswa(id) ON DELETE CASCADE,
  CONSTRAINT fk_riwayat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO jalur_pendaftaran (nama, deskripsi) VALUES
  ('Zonasi', 'Penerimaan berdasarkan wilayah domisili calon siswa.'),
  ('Prestasi', 'Penerimaan berdasarkan prestasi akademik atau non-akademik.'),
  ('Afirmasi', 'Penerimaan bagi calon siswa dari keluarga yang memenuhi kriteria afirmasi.');
