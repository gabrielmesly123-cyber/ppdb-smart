<?php
declare(strict_types=1);
require __DIR__ . '/app/bootstrap.php';
?><!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="PPDB Smart - Pendaftaran peserta didik baru yang mudah, transparan, dan aman.">
  <title>PPDB Smart | Penerimaan Peserta Didik Baru</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
  <link href="assets/css/app.css" rel="stylesheet">
</head>
<body>
<div id="app">
  <nav class="navbar navbar-expand-lg app-nav">
    <div class="container">
      <a class="navbar-brand brand" href="#" data-page="home"><span class="brand-mark"><i class="fa-solid fa-graduation-cap"></i></span> PPDB<span>Smart</span></a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"><span class="navbar-toggler-icon"></span></button>
      <div class="collapse navbar-collapse" id="mainNav">
        <div class="navbar-nav ms-auto align-items-lg-center gap-lg-3" id="nav-links"></div>
      </div>
    </div>
  </nav>
  <main id="main-content"><div class="page-loading"><span class="spinner-border text-primary"></span><span>Menyiapkan PPDB Smart...</span></div></main>
  <footer class="site-footer">
    <div class="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
      <a class="brand footer-brand" href="#" data-page="home"><span class="brand-mark"><i class="fa-solid fa-graduation-cap"></i></span> PPDB<span>Smart</span></a>
      <p class="mb-0">Penerimaan siswa baru yang lebih mudah dan transparan.</p>
      <small>&copy; <span id="year"></span> PPDB Smart</small>
    </div>
  </footer>
</div>
<div class="toast-container position-fixed bottom-0 end-0 p-3" id="toast-container" aria-live="polite"></div>
<script>window.PPDB_CSRF = <?= json_encode(csrf_token(), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>
