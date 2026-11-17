(() => {
  const main = document.querySelector('#main-content');
  const nav = document.querySelector('#nav-links');
  const state = { user: null, csrf: window.PPDB_CSRF || '', meta: null, page: 'home', admin: null, student: null, step: 1 };
  const docTypes = { akta: 'Akta kelahiran', kk: 'Kartu keluarga', foto: 'Pas foto' };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[char]);
  const dateText = (value) => value ? new Date(String(value).replace(' ', 'T')).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
  const dateTimeLocal = (value) => value ? String(value).replace(' ', 'T').slice(0, 16) : '';
  const labelStatus = (value) => ({
    draft: 'Draft', dikirim: 'Menunggu verifikasi', terverifikasi: 'Terverifikasi',
    ditolak: 'Perlu diperbaiki', diterima: 'Diterima', tidak_diterima: 'Belum diterima',
    menunggu: 'Menunggu', disetujui: 'Disetujui',
  })[value] || value;
  const badge = (value) => `<span class="status-badge status-${escapeHtml(value)}">${escapeHtml(labelStatus(value))}</span>`;
  const icon = (name) => `<i class="fa-solid ${name}" aria-hidden="true"></i>`;

  async function api(action, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (options.method && options.method !== 'GET') headers['X-CSRF-Token'] = state.csrf;
    const response = await fetch(`api/index.php?action=${encodeURIComponent(action)}${options.query || ''}`, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (response.ok) return response;
      throw new Error('Permintaan gagal. Silakan coba kembali.');
    }
    const result = await response.json();
    if (result.csrf) state.csrf = result.csrf;
    if (!response.ok) throw new Error(result.error || 'Permintaan gagal.');
    return result;
  }

  function toast(message, kind = 'success') {
    const container = document.querySelector('#toast-container');
    const element = document.createElement('div');
    element.className = `toast align-items-center text-bg-${kind === 'error' ? 'danger' : 'success'} border-0`;
    element.setAttribute('role', 'status');
    element.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Tutup"></button></div>`;
    container.append(element);
    const instance = new bootstrap.Toast(element, { delay: 4000 });
    instance.show();
    element.addEventListener('hidden.bs.toast', () => element.remove());
  }

  function renderNav() {
    if (!state.user) {
      nav.innerHTML = `
        <a class="nav-link" href="#requirements" data-page="home">Informasi</a>
        <a class="nav-link" href="#steps" data-page="home">Alur pendaftaran</a>
        <a class="btn btn-outline-primary btn-sm px-3" href="#" data-page="login">Masuk</a>
        <a class="btn btn-primary btn-sm px-3" href="#" data-page="register">Buat akun</a>`;
      return;
    }
    nav.innerHTML = `
      <span class="nav-user">${icon('fa-circle-user')} ${escapeHtml(state.user.name)}</span>
      <a class="btn btn-primary btn-sm px-3" href="#" data-page="${state.user.role === 'admin' ? 'admin' : 'student'}">Dashboard</a>
      <button class="btn btn-light btn-sm px-3" data-action="logout">Keluar</button>`;
  }

  async function loadMeta() {
    const meta = await api('meta');
    state.meta = meta;
    state.user = meta.user;
    if (meta.csrf) state.csrf = meta.csrf;
    renderNav();
  }

  function showLoading() {
    main.innerHTML = '<div class="page-loading"><span class="spinner-border text-primary"></span><span>Memuat data...</span></div>';
  }

  function renderHome() {
    const period = state.meta?.period;
    const opened = Boolean(period);
    main.innerHTML = `
      <section class="hero-section">
        <div class="container hero-grid">
          <div class="hero-copy">
            <div class="eyebrow"><span class="pulse-dot"></span> PENERIMAAN PESERTA DIDIK BARU</div>
            <h1>Langkah awal untuk <span>masa depan</span> yang hebat.</h1>
            <p class="hero-lead">Daftar sekolah dengan proses yang lebih sederhana. Isi formulir, unggah berkas, dan pantau hasil seleksi dalam satu tempat.</p>
            <div class="hero-actions">
              <a class="btn btn-primary btn-lg" href="#" data-page="${state.user ? (state.user.role === 'admin' ? 'admin' : 'student') : 'register'}">Mulai pendaftaran ${icon('fa-arrow-right')}</a>
              <a class="btn btn-link btn-lg" href="#requirements" data-page="home">Pelajari persyaratan</a>
            </div>
            <div class="hero-proof"><span class="proof-icon">${icon('fa-shield-halved')}</span><span><strong>Aman & transparan</strong><small>Proses pendaftaran online</small></span><span class="proof-divider"></span><span><strong>24/7</strong><small>Akses status pendaftaran</small></span></div>
          </div>
          <div class="hero-visual">
            <div class="hero-blob"></div>
            <div class="hero-student-art"><div class="art-sun"></div><div class="art-book art-book-one"></div><div class="art-book art-book-two"></div><div class="art-person"><div class="art-head"></div><div class="art-body"></div></div><div class="art-floor"></div></div>
            <div class="floating-card card-deadline"><span class="float-icon">${icon('fa-calendar-check')}</span><span><small>PENDAFTARAN</small><strong>${opened ? `Sampai ${dateText(period.selesai)}` : 'Belum dibuka'}</strong></span></div>
            <div class="floating-card card-status"><span class="float-check">${icon('fa-check')}</span><span><strong>Proses mudah</strong><small>Semua dari rumah</small></span></div>
            <div class="visual-caption">PPDB SMART <span>·</span> TAHUN AJARAN ${new Date().getFullYear()}/${new Date().getFullYear() + 1}</div>
          </div>
        </div>
      </section>
      <section class="section section-soft" id="requirements">
        <div class="container">
          <div class="section-heading text-center"><span class="eyebrow">MULAI DENGAN PERSIAPAN</span><h2>Semua yang perlu kamu ketahui</h2><p>Siapkan berkas dan ikuti alurnya. Kami bantu setiap langkahnya.</p></div>
          <div class="info-grid">
            <article class="info-card"><div class="info-icon lilac">${icon('fa-file-lines')}</div><h3>Persyaratan</h3><p>Siapkan dokumen dasar untuk melengkapi data pendaftaranmu.</p><ul><li>Akta kelahiran</li><li>Kartu keluarga</li><li>Pas foto terbaru</li><li>Data NISN dan NIK</li></ul></article>
            <article class="info-card"><div class="info-icon mint">${icon('fa-calendar-days')}</div><h3>Jadwal pendaftaran</h3><p>${opened ? `Periode ${escapeHtml(period.nama)} sedang dibuka.` : 'Jadwal periode pendaftaran belum diumumkan.'}</p><div class="schedule-line"><span>${opened ? dateText(period.mulai) : 'Menunggu jadwal'}</span><span class="schedule-track"></span><span>${opened ? dateText(period.selesai) : '—'}</span></div>${opened ? '<span class="open-label"><span class="pulse-dot"></span> Pendaftaran dibuka</span>' : '<span class="closed-label">Pantau informasi terbaru</span>'}</article>
            <article class="info-card"><div class="info-icon peach">${icon('fa-route')}</div><h3>Alur pendaftaran</h3><p>Proses yang ringkas dan bisa dipantau kapan saja.</p><div class="mini-steps"><span>01</span> Buat akun <span>02</span> Isi formulir <span>03</span> Pantau hasil</div><a href="#steps" data-page="home" class="text-link">Lihat langkah pendaftaran ${icon('fa-arrow-right')}</a></article>
          </div>
        </div>
      </section>
      <section class="section" id="steps">
        <div class="container">
          <div class="section-heading text-center"><span class="eyebrow">MUDAH DAN TERARAH</span><h2>Daftar dalam 3 langkah</h2><p>Proses pendaftaran dirancang sederhana agar kamu bisa fokus menyiapkan masa depan.</p></div>
          <div class="steps-grid"><div class="step-item"><span class="step-number">01</span><div class="step-icon">${icon('fa-user-plus')}</div><h3>Buat akun</h3><p>Daftar menggunakan email aktif dan buat kata sandi.</p></div><div class="step-item"><span class="step-number">02</span><div class="step-icon">${icon('fa-pen-to-square')}</div><h3>Lengkapi data</h3><p>Isi formulir pendaftaran dan unggah dokumen persyaratan.</p></div><div class="step-item"><span class="step-number">03</span><div class="step-icon">${icon('fa-bell')}</div><h3>Pantau hasil</h3><p>Cek proses verifikasi dan hasil seleksi lewat dashboard.</p></div></div>
        </div>
      </section>
      <section class="cta-section"><div class="container cta-content"><div><span class="eyebrow">SIAP MEMULAI?</span><h2>Masa depanmu dimulai dari sini.</h2><p>Buat akun dan lengkapi pendaftaranmu dengan mudah.</p></div><a class="btn btn-light btn-lg" href="#" data-page="${state.user ? (state.user.role === 'admin' ? 'admin' : 'student') : 'register'}">Daftar sekarang ${icon('fa-arrow-right')}</a></div></section>`;
    document.title = 'PPDB Smart | Penerimaan Peserta Didik Baru';
  }

  function renderAuth(mode) {
    const register = mode === 'register';
    main.innerHTML = `<section class="auth-section"><div class="auth-aside"><div class="auth-aside-inner"><span class="eyebrow">PPDB SMART</span><h1>${register ? 'Satu langkah lebih dekat dengan sekolah impian.' : 'Selamat datang kembali.'}</h1><p>${register ? 'Buat akun PPDB Smart untuk memulai proses pendaftaran yang mudah dan transparan.' : 'Masuk dan lanjutkan proses pendaftaran atau kelola penerimaan siswa.'}</p><div class="auth-illustration">${icon(register ? 'fa-graduation-cap' : 'fa-book-open')}</div><div class="auth-aside-note">${icon('fa-shield-halved')} Data kamu terlindungi dan hanya digunakan untuk proses penerimaan.</div></div></div><div class="auth-form-wrap"><form class="auth-form" data-form="${register ? 'register' : 'login'}"><a href="#" class="back-home" data-page="home">${icon('fa-arrow-left')} Kembali ke beranda</a><span class="eyebrow">${register ? 'MULAI PERJALANANMU' : 'AKSES AKUN'}</span><h2>${register ? 'Buat akun baru' : 'Masuk ke akun'}</h2><p class="form-intro">${register ? 'Masukkan informasi dasar untuk mendaftar.' : 'Masukkan email dan kata sandi akunmu.'}</p>${register ? '<label class="form-label" for="auth-name">Nama lengkap</label><input id="auth-name" name="nama" class="form-control form-control-lg" autocomplete="name" required minlength="3" placeholder="Nama sesuai identitas">' : ''}<label class="form-label mt-3" for="auth-email">Email</label><input id="auth-email" name="email" type="email" class="form-control form-control-lg" autocomplete="email" required placeholder="nama@email.com"><label class="form-label mt-3" for="auth-password">Kata sandi</label><input id="auth-password" name="password" type="password" class="form-control form-control-lg" autocomplete="${register ? 'new-password' : 'current-password'}" required minlength="${register ? '8' : '1'}" placeholder="${register ? 'Minimal 8 karakter' : 'Kata sandi'}"><button class="btn btn-primary btn-lg w-100 mt-4" type="submit">${register ? 'Buat akun' : 'Masuk'} ${icon('fa-arrow-right')}</button><p class="auth-switch">${register ? 'Sudah punya akun?' : 'Belum punya akun?'} <a href="#" data-page="${register ? 'login' : 'register'}">${register ? 'Masuk' : 'Daftar sekarang'}</a></p></form></div></section>`;
    document.title = `${register ? 'Buat akun' : 'Masuk'} | PPDB Smart`;
  }

  function statusCard(application) {
    const labels = {
      draft: 'Lengkapi data dan dokumen, lalu kirim formulir untuk memulai verifikasi.',
      dikirim: 'Formulir diterima. Admin sedang memeriksa data dan dokumenmu.',
      terverifikasi: 'Data dan dokumenmu sudah terverifikasi. Pantau pengumuman hasil seleksi.',
      ditolak: 'Ada data atau dokumen yang perlu diperbaiki. Hubungi admin untuk informasi lebih lanjut.',
      diterima: 'Selamat! Kamu dinyatakan diterima.',
      tidak_diterima: 'Terima kasih telah mendaftar. Hasil seleksi dapat dilihat pada dashboard.',
    };
    return `<div class="status-panel"><div class="status-panel-top"><div><span class="eyebrow">STATUS PENDAFTARAN</span><h3>${escapeHtml(application.nomor_pendaftaran)}</h3></div>${badge(application.status)}</div><p>${escapeHtml(labels[application.status] || '')}</p><div class="status-progress"><span class="${application.status !== 'draft' ? 'done' : 'current'}">Formulir</span><i class="${application.status !== 'draft' ? 'done' : ''}"></i><span class="${['terverifikasi','diterima','tidak_diterima'].includes(application.status) ? 'done' : ''}">Verifikasi</span><i class="${['diterima','tidak_diterima'].includes(application.status) ? 'done' : ''}"></i><span class="${['diterima','tidak_diterima'].includes(application.status) ? 'done' : ''}">Hasil</span></div><div class="d-flex flex-wrap gap-2 mt-4"><button class="btn btn-outline-primary btn-sm" data-action="proof" data-id="${application.id}">${icon('fa-download')} Bukti pendaftaran</button></div></div>`;
  }

  function studentDocuments(application, documents) {
    const docsByType = Object.fromEntries(documents.filter((item) => Number(item.calon_siswa_id) === Number(application.id)).map((item) => [item.jenis, item]));
    return `<div class="panel-card"><div class="panel-heading"><div><span class="eyebrow">BERKAS PERSYARATAN</span><h3>Dokumen pendaftaran</h3></div><span class="text-muted small">PDF, JPG, PNG · maks. 5 MB</span></div><div class="document-list">${Object.entries(docTypes).map(([type, title]) => {
      const doc = docsByType[type];
      return `<div class="document-item"><div class="document-icon">${icon(type === 'foto' ? 'fa-image' : 'fa-file-lines')}</div><div class="document-info"><strong>${title}</strong><small>${doc ? escapeHtml(doc.nama_file) : 'Belum diunggah'}${doc?.catatan ? ` · ${escapeHtml(doc.catatan)}` : ''}</small></div>${doc ? badge(doc.status) : ''}${['draft','ditolak'].includes(application.status) ? `<form data-form="upload" class="upload-form"><input type="hidden" name="jenis" value="${type}"><input type="file" name="dokumen" accept=".pdf,.jpg,.jpeg,.png" required hidden><button class="btn btn-outline-primary btn-sm" type="button" data-action="choose-file">${doc ? 'Ganti berkas' : 'Unggah'}</button></form>` : ''}</div>`;
    }).join('')}</div></div>`;
  }

  function renderApplicationForm(application) {
    const app = application || {};
    const value = (key) => escapeHtml(app[key] || '');
    const tracks = state.student.tracks.map((track) => `<option value="${track.id}" ${String(app.jalur_id) === String(track.id) ? 'selected' : ''}>${escapeHtml(track.nama)}</option>`).join('');
    return `<form class="panel-card application-form" id="application-form" data-form="application"><div class="panel-heading"><div><span class="eyebrow">FORMULIR PENDAFTARAN</span><h3>${app.id ? 'Data calon siswa' : 'Lengkapi data diri'}</h3></div><span class="text-muted small">Langkah <b id="step-current">1</b> dari 2</span></div><div class="step-indicator"><span class="active" data-step-indicator="1">1 <b>Data diri</b></span><i></i><span data-step-indicator="2">2 <b>Data wali & jalur</b></span></div><section class="form-step ${state.step === 1 ? 'active' : ''}" data-step="1"><div class="row g-3"><div class="col-md-8"><label class="form-label">Nama lengkap</label><input name="nama_lengkap" class="form-control" value="${value('nama_lengkap')}" required maxlength="140"></div><div class="col-md-4"><label class="form-label">NISN</label><input name="nisn" class="form-control" value="${value('nisn')}" required pattern="\\d{10}" maxlength="10" inputmode="numeric" placeholder="10 digit"></div><div class="col-md-6"><label class="form-label">NIK</label><input name="nik" class="form-control" value="${value('nik')}" required pattern="\\d{16}" maxlength="16" inputmode="numeric" placeholder="16 digit"></div><div class="col-md-6"><label class="form-label">Tanggal lahir</label><input name="tanggal_lahir" type="date" class="form-control" value="${value('tanggal_lahir')}" required></div><div class="col-md-6"><label class="form-label">Jenis kelamin</label><select name="jenis_kelamin" class="form-select" required><option value="">Pilih jenis kelamin</option><option value="L" ${app.jenis_kelamin === 'L' ? 'selected' : ''}>Laki-laki</option><option value="P" ${app.jenis_kelamin === 'P' ? 'selected' : ''}>Perempuan</option></select></div><div class="col-md-6"><label class="form-label">Jalur pendaftaran</label><select name="jalur_id" class="form-select" required><option value="">Pilih jalur</option>${tracks}</select></div><div class="col-12"><label class="form-label">Alamat lengkap</label><textarea name="alamat" class="form-control" rows="3" required maxlength="2000">${value('alamat')}</textarea></div></div><button type="button" class="btn btn-primary mt-4" data-action="next-step">Lanjutkan ${icon('fa-arrow-right')}</button></section><section class="form-step ${state.step === 2 ? 'active' : ''}" data-step="2"><div class="row g-3"><div class="col-md-6"><label class="form-label">Nama orang tua / wali</label><input name="nama_wali" class="form-control" value="${value('nama_wali')}" required maxlength="140"></div><div class="col-md-6"><label class="form-label">Nomor telepon wali</label><input name="telepon_wali" type="tel" class="form-control" value="${value('telepon_wali')}" required maxlength="24" placeholder="08xxxxxxxxxx"></div></div><div class="d-flex flex-wrap gap-2 mt-4"><button type="button" class="btn btn-light" data-action="previous-step">${icon('fa-arrow-left')} Kembali</button><button class="btn btn-outline-primary" type="submit" data-submit-mode="draft">${icon('fa-floppy-disk')} Simpan draft</button><button class="btn btn-primary ms-md-auto" type="submit" data-submit-mode="submit">${icon('fa-paper-plane')} Kirim pendaftaran</button></div><p class="form-hint mt-3 mb-0">Simpan draft terlebih dahulu, unggah 3 dokumen wajib, lalu kirim pendaftaran.</p></section></form>`;
  }

  async function renderStudent() {
    showLoading();
    const data = await api('student/home');
    state.student = data;
    const application = data.applications[0];
    const resultsByApp = Object.fromEntries(data.results.map((result) => [result.calon_siswa_id, result]));
    const result = application ? resultsByApp[application.id] : null;
    const period = data.period;
    const editable = !application || ['draft', 'ditolak'].includes(application.status);
    main.innerHTML = `<section class="dashboard-wrap"><div class="container"><div class="dashboard-top"><div><span class="eyebrow">DASHBOARD CALON SISWA</span><h1>Halo, ${escapeHtml(state.user.name.split(' ')[0])} <span class="wave">✦</span></h1><p>Kelola pendaftaran dan pantau perkembangannya di sini.</p></div><div class="period-chip">${icon('fa-calendar-check')} ${period ? escapeHtml(period.nama) : 'Periode pendaftaran tidak aktif'}</div></div>${application ? statusCard(application) : `<div class="empty-state"><div class="empty-icon">${icon('fa-clipboard-list')}</div><h2>Belum ada pendaftaran</h2><p>${period ? `Periode ${escapeHtml(period.nama)} sedang dibuka. Isi formulir untuk memulai.` : 'Pendaftaran saat ini belum dibuka. Informasi periode akan ditampilkan di beranda.'}</p></div>`}${application && result ? `<div class="result-banner ${result.hasil === 'diterima' ? 'result-success' : ''}"><div class="result-icon">${icon(result.hasil === 'diterima' ? 'fa-circle-check' : 'fa-circle-info')}</div><div><span class="eyebrow">PENGUMUMAN HASIL SELEKSI</span><h3>${result.hasil === 'diterima' ? 'Selamat, kamu diterima!' : 'Terima kasih atas partisipasimu.'}</h3><p>Hasil seleksi resmi diumumkan pada ${dateText(result.diumumkan_pada)}.</p></div></div>` : ''}<div class="dashboard-grid"><div class="dashboard-main">${period && editable ? renderApplicationForm(application) : ''}${application && period && editable ? studentDocuments(application, data.documents) : ''}${application && !editable ? `<div class="panel-card locked-panel"><span class="locked-icon">${icon('fa-lock')}</span><div><h3>Formulir sudah dikirim</h3><p>Data tidak dapat diubah setelah dikirim. Hubungi admin jika ada informasi yang perlu diperbaiki.</p></div></div>` : ''}</div><aside class="dashboard-side">${application ? `<div class="panel-card"><div class="panel-heading"><div><span class="eyebrow">RINGKASAN</span><h3>Pendaftaranmu</h3></div></div><div class="summary-row"><span>Nomor pendaftaran</span><strong>${escapeHtml(application.nomor_pendaftaran)}</strong></div><div class="summary-row"><span>Jalur</span><strong>${escapeHtml(application.jalur_nama)}</strong></div><div class="summary-row"><span>Status</span>${badge(application.status)}</div><div class="summary-row"><span>Diperbarui</span><strong>${dateText(application.diperbarui_pada)}</strong></div></div>` : ''}<div class="panel-card help-card"><div class="help-icon">${icon('fa-headset')}</div><h3>Butuh bantuan?</h3><p>Pastikan data dan dokumen yang kamu kirim sudah benar. Hubungi panitia sekolah untuk pertanyaan terkait persyaratan.</p></div>${data.notifications.length ? `<div class="panel-card"><div class="panel-heading"><div><span class="eyebrow">INFORMASI TERBARU</span><h3>Notifikasi</h3></div></div><div class="notification-list">${data.notifications.map((item) => `<div class="notification-item"><span class="notification-dot"></span><div><strong>${escapeHtml(item.judul)}</strong><p>${escapeHtml(item.pesan)}</p><small>${dateText(item.dibuat_pada)}</small></div></div>`).join('')}</div></div>` : ''}</aside></div></div></section>`;
    document.title = 'Dashboard Calon Siswa | PPDB Smart';
  }

  function adminStat(iconName, label, value, color) {
    return `<div class="stat-card"><div class="stat-icon ${color}">${icon(iconName)}</div><div><span>${label}</span><strong>${Number(value || 0).toLocaleString('id-ID')}</strong></div></div>`;
  }

  function renderAdminDashboard() {
    const data = state.admin;
    const apps = data.applications;
    const docsByStudent = {};
    data.documents.forEach((doc) => {
      docsByStudent[doc.calon_siswa_id] = (docsByStudent[doc.calon_siswa_id] || 0) + 1;
    });
    main.innerHTML = `<section class="admin-wrap"><div class="container-fluid admin-container"><div class="dashboard-top"><div><span class="eyebrow">PANEL ADMINISTRATOR</span><h1>Dashboard PPDB</h1><p>Pantau pendaftaran dan kelola proses penerimaan siswa.</p></div><button class="btn btn-outline-primary" data-action="export">${icon('fa-download')} Unduh laporan CSV</button></div><div class="stats-grid">${adminStat('fa-users','Total pendaftar',data.stats.total,'blue')}${adminStat('fa-hourglass-half','Menunggu verifikasi',data.stats.menunggu,'orange')}${adminStat('fa-circle-check','Terverifikasi',data.stats.terverifikasi,'green')}${adminStat('fa-user-graduate','Diterima',data.stats.diterima,'purple')}</div><div class="admin-tabs"><button class="admin-tab active" data-action="tab" data-tab="applications">Pendaftar <span>${apps.length}</span></button><button class="admin-tab" data-action="tab" data-tab="documents">Verifikasi dokumen <span>${data.documents.filter((doc) => doc.status === 'menunggu').length}</span></button><button class="admin-tab" data-action="tab" data-tab="periods">Periode & kuota</button></div><section class="tab-panel active" id="tab-applications"><div class="table-card"><div class="table-toolbar"><div><span class="eyebrow">DATA PENDAFTAR</span><h3>Daftar calon siswa</h3></div><div class="table-controls"><input class="form-control" id="table-search" placeholder="Cari nama, NISN, nomor..." aria-label="Cari pendaftar"><select class="form-select" id="status-filter" aria-label="Filter status"><option value="">Semua status</option><option value="dikirim">Menunggu verifikasi</option><option value="terverifikasi">Terverifikasi</option><option value="diterima">Diterima</option><option value="ditolak">Perlu diperbaiki</option><option value="tidak_diterima">Tidak diterima</option></select></div></div><div class="table-responsive"><table class="table align-middle"><thead><tr><th>Calon siswa</th><th>NISN</th><th>Jalur / periode</th><th>Dokumen</th><th>Status</th><th>Tanggal</th><th class="text-end">Aksi</th></tr></thead><tbody id="application-rows">${apps.map((app) => `<tr data-search="${escapeHtml(`${app.nama_lengkap} ${app.nisn} ${app.nomor_pendaftaran} ${app.email}`.toLowerCase())}" data-status="${escapeHtml(app.status)}"><td><div class="candidate-name">${escapeHtml(app.nama_lengkap)}</div><small>${escapeHtml(app.nomor_pendaftaran)}</small></td><td>${escapeHtml(app.nisn)}</td><td>${escapeHtml(app.jalur_nama)}<small class="d-block">${escapeHtml(app.periode_nama)}</small></td><td>${docsByStudent[app.id] || 0}/3</td><td>${badge(app.status)}</td><td>${dateText(app.dibuat_pada)}</td><td class="text-end text-nowrap"><button class="table-action" title="Edit data" data-action="edit-student" data-id="${app.id}">${icon('fa-pen')}</button>${app.status === 'dikirim' ? `<button class="table-action" title="Verifikasi pendaftaran" data-action="verify-student" data-id="${app.id}">${icon('fa-check')}</button>` : ''}<button class="table-action" title="Atur hasil seleksi" data-action="selection" data-id="${app.id}" data-name="${escapeHtml(app.nama_lengkap)}">${icon('fa-award')}</button><button class="table-action danger" title="Hapus" data-action="delete-student" data-id="${app.id}">${icon('fa-trash')}</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty-table">Belum ada pendaftar.</td></tr>'}</tbody></table></div><div class="table-footer"><span>Menampilkan <b id="visible-count">${apps.length}</b> dari ${apps.length} pendaftar</span><span>Gunakan tombol aksi untuk mengelola data.</span></div></div></section><section class="tab-panel" id="tab-documents"><div class="table-card"><div class="table-toolbar"><div><span class="eyebrow">PEMERIKSAAN BERKAS</span><h3>Verifikasi dokumen</h3></div><span class="text-muted small">Berkas menunggu pemeriksaan admin</span></div><div class="table-responsive"><table class="table align-middle"><thead><tr><th>Calon siswa</th><th>Jenis dokumen</th><th>Nama berkas</th><th>Status</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>${data.documents.map((doc) => `<tr><td>${escapeHtml(doc.nama_lengkap)}</td><td>${escapeHtml(docTypes[doc.jenis] || doc.jenis)}</td><td><a class="file-link" href="api/index.php?action=student/document&id=${doc.id}" target="_blank" rel="noopener">${escapeHtml(doc.nama_file)}</a></td><td>${badge(doc.status)}</td><td>${escapeHtml(doc.catatan || '-')}</td><td class="text-nowrap">${doc.status === 'menunggu' ? `<button class="btn btn-sm btn-outline-success" data-action="verify-doc" data-id="${doc.id}" data-status="disetujui" title="Setujui">${icon('fa-check')}</button> <button class="btn btn-sm btn-outline-danger" data-action="verify-doc" data-id="${doc.id}" data-status="ditolak" title="Tolak">${icon('fa-xmark')}</button>` : '—'}</td></tr>`).join('') || '<tr><td colspan="6" class="empty-table">Belum ada dokumen.</td></tr>'}</tbody></table></div></div></section><section class="tab-panel" id="tab-periods"><div class="admin-period-grid"><form class="panel-card period-form" data-form="period"><div class="panel-heading"><div><span class="eyebrow">PENGATURAN PPDB</span><h3>Buat periode & kuota</h3></div></div><label class="form-label">Nama periode</label><input class="form-control mb-3" name="nama" placeholder="PPDB Tahun Ajaran 2026/2027" required><div class="row g-3"><div class="col-md-6"><label class="form-label">Mulai</label><input type="datetime-local" name="mulai" class="form-control" required></div><div class="col-md-6"><label class="form-label">Selesai</label><input type="datetime-local" name="selesai" class="form-control" required></div></div><div class="row g-3 mt-1"><div class="col-md-6"><label class="form-label">Jalur</label><select class="form-select" name="jalur_id" required>${state.student.tracks.map((track) => `<option value="${track.id}">${escapeHtml(track.nama)}</option>`).join('')}</select></div><div class="col-md-6"><label class="form-label">Kuota jalur</label><input type="number" class="form-control" name="kuota" min="1" value="50" required></div></div><label class="form-label mt-3">Status periode</label><select class="form-select" name="status"><option value="nonaktif">Nonaktif</option><option value="aktif">Aktif (tutup periode aktif lain)</option></select><button class="btn btn-primary mt-4" type="submit">${icon('fa-floppy-disk')} Simpan periode</button></form><div class="panel-card"><div class="panel-heading"><div><span class="eyebrow">JADWAL TERDAFTAR</span><h3>Periode pendaftaran</h3></div></div><div class="period-list">${data.periods.map((period) => `<div class="period-row"><div><strong>${escapeHtml(period.nama)}</strong><small>${dateText(period.mulai)} – ${dateText(period.selesai)} · ${period.jumlah_pendaftar} pendaftar</small></div>${badge(period.status)}</div><button class="btn btn-sm btn-outline-primary mb-3" data-action="publish" data-id="${period.id}">${icon('fa-bullhorn')} Umumkan hasil periode</button>`).join('') || '<p class="text-muted">Belum ada periode.</p>'}</div><div class="quota-divider"></div><div class="panel-heading"><div><span class="eyebrow">KAPASITAS PENERIMAAN</span><h3>Kuota per jalur</h3></div></div><div class="quota-list">${data.quotas.map((quota) => `<div class="quota-row"><span>${escapeHtml(quota.jalur_nama)}<small>${escapeHtml(quota.periode_nama)}</small></span><span><b>${quota.terisi} / ${quota.kuota}</b><small>terisi / kuota</small></span><div class="quota-bar"><i style="width:${Math.min(100, Math.round(100 * quota.terisi / Math.max(1, quota.kuota)))}%"></i></div></div>`).join('') || '<p class="text-muted">Kuota belum diatur.</p>'}</div></div></div></section></div></section><div class="modal fade" id="edit-student-modal" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-lg modal-dialog-centered"><div class="modal-content"><div class="modal-header"><div><span class="eyebrow">KELOLA DATA</span><h5 class="modal-title">Edit data calon siswa</h5></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div><form data-form="edit-student"><div class="modal-body" id="edit-student-body"></div><div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Batal</button><button class="btn btn-primary" type="submit">Simpan perubahan</button></div></form></div></div></div>`;
    const periodForm = main.querySelector('[data-form="period"]');
    const oldQuotaFields = periodForm.querySelector('select[name="jalur_id"]').closest('.row');
    const quotaFields = document.createElement('div');
    quotaFields.className = 'row g-3 mt-1';
    state.student.tracks.forEach((track) => {
      const column = document.createElement('div');
      column.className = 'col-md-4';
      const label = document.createElement('label');
      label.className = 'form-label';
      label.textContent = `Kuota ${track.nama}`;
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.value = '50';
      input.required = true;
      input.name = `quota-${track.id}`;
      input.className = 'form-control';
      column.append(label, input);
      quotaFields.append(column);
    });
    oldQuotaFields.replaceWith(quotaFields);
    main.querySelectorAll('#application-rows tr').forEach((row) => {
      if (!['terverifikasi', 'diterima', 'tidak_diterima'].includes(row.dataset.status)) {
        const selectionButton = row.querySelector('[data-action="selection"]');
        if (selectionButton) {
          selectionButton.disabled = true;
          selectionButton.title = 'Verifikasi pendaftaran sebelum menetapkan hasil';
        }
      }
    });
    document.title = 'Admin Dashboard | PPDB Smart';
  }

  async function renderAdmin() {
    showLoading();
    const data = await api('admin/dashboard');
    state.admin = data;
    state.student = { tracks: state.meta.tracks };
    renderAdminDashboard();
  }

  async function navigate(page) {
    state.page = page;
    if (page === 'home') return renderHome();
    if (page === 'login' || page === 'register') return renderAuth(page);
    if (!state.user) return renderAuth('login');
    if (page === 'admin' && state.user.role === 'admin') return renderAdmin();
    if (page === 'student' && state.user.role === 'siswa') return renderStudent();
    toast('Halaman tersebut tidak tersedia untuk akun ini.', 'error');
    return renderHome();
  }

  function formObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  async function submitForm(form) {
    const kind = form.dataset.form;
    const submitButton = form.querySelector('[type="submit"]:focus') || form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
      if (kind === 'register' || kind === 'login') {
        const result = await api(kind, { method: 'POST', body: JSON.stringify(formObject(form)) });
        state.user = result.user;
        if (result.csrf) state.csrf = result.csrf;
        renderNav();
        toast(result.message);
        await navigate(state.user.role === 'admin' ? 'admin' : 'student');
      } else if (kind === 'application') {
        const mode = form.querySelector('[data-submit-mode="submit"]:focus') ? 'submit' : (document.activeElement?.dataset.submitMode || 'draft');
        const body = formObject(form);
        body.submit = mode === 'submit';
        const result = await api('student/application', { method: 'POST', body: JSON.stringify(body) });
        toast(result.message);
        state.step = 1;
        await renderStudent();
      } else if (kind === 'upload') {
        const formData = new FormData(form);
        await api('student/upload', { method: 'POST', body: formData });
        toast('Dokumen berhasil diunggah.');
        await renderStudent();
      } else if (kind === 'period') {
        const body = formObject(form);
        body.quotas = Object.fromEntries(state.student.tracks.map((track) => [track.id, Number(body[`quota-${track.id}`] || 0)]));
        body.mulai = body.mulai.replace('T', ' ') + ':00';
        body.selesai = body.selesai.replace('T', ' ') + ':00';
        await api('admin/period', { method: 'POST', body: JSON.stringify(body) });
        toast('Periode dan kuota berhasil disimpan.');
        await renderAdmin();
      } else if (kind === 'edit-student') {
        const body = formObject(form);
        body.id = form.dataset.id;
        await api('admin/student', { method: 'POST', body: JSON.stringify(body) });
        bootstrap.Modal.getInstance(document.querySelector('#edit-student-modal')).hide();
        toast('Data calon siswa diperbarui.');
        await renderAdmin();
      }
    } catch (error) {
      toast(error.message, 'error');
      if (submitButton) submitButton.disabled = false;
    }
  }

  function printProof(application) {
    const printWindow = window.open('', '_blank', 'width=800,height=850');
    if (!printWindow) {
      toast('Izinkan pop-up untuk mencetak bukti pendaftaran.', 'error');
      return;
    }
    printWindow.opener = null;
    const escapedName = escapeHtml(application.nama_lengkap);
    printWindow.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Bukti ${escapeHtml(application.nomor_pendaftaran)}</title><style>body{font-family:Arial,sans-serif;color:#17233b;padding:42px;max-width:760px;margin:auto}.brand{color:#2357d8;font-size:23px;font-weight:bold}.card{border:1px solid #dfe5ef;border-radius:16px;padding:28px;margin-top:24px}.row{display:flex;padding:13px 0;border-bottom:1px solid #edf0f5}.label{width:210px;color:#68758a}.status{background:#e8f7ef;color:#20884a;border-radius:20px;padding:5px 12px}@media print{button{display:none}}</style></head><body><div class="brand">PPDB Smart</div><p>Bukti pendaftaran peserta didik baru</p><div class="card"><h2>${escapedName}</h2><p>Nomor pendaftaran: <strong>${escapeHtml(application.nomor_pendaftaran)}</strong></p><div class="row"><span class="label">Periode</span><strong>${escapeHtml(application.periode_nama)}</strong></div><div class="row"><span class="label">Jalur pendaftaran</span><strong>${escapeHtml(application.jalur_nama)}</strong></div><div class="row"><span class="label">NISN</span><strong>${escapeHtml(application.nisn)}</strong></div><div class="row"><span class="label">Status saat ini</span><span class="status">${escapeHtml(labelStatus(application.status))}</span></div><div class="row"><span class="label">Tanggal pendaftaran</span><strong>${dateText(application.dibuat_pada)}</strong></div><div id="qr" style="margin-top:24px"></div></div><p>Dokumen bukti ini dibuat secara elektronik melalui PPDB Smart.</p><button onclick="window.print()">Cetak / Simpan PDF</button><script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script><script>new QRCode(document.getElementById('qr'),{text:${JSON.stringify(application.nomor_pendaftaran)},width:120,height:120});<\/script></body></html>`);
    printWindow.document.close();
  }

  function exportReport() {
    const rows = state.admin.applications;
    const fields = ['nomor_pendaftaran', 'nama_lengkap', 'nisn', 'email', 'jalur_nama', 'periode_nama', 'status', 'dibuat_pada'];
    const csvValue = (value) => {
      let text = String(value ?? '');
      if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = [fields.join(','), ...rows.map((row) => fields.map((field) => csvValue(row[field])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'laporan-ppdb.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  document.addEventListener('click', async (event) => {
    const pageLink = event.target.closest('[data-page]');
    if (pageLink) {
      event.preventDefault();
      const hash = pageLink.getAttribute('href') || '';
      const page = pageLink.dataset.page;
      if (page === 'home' && hash.startsWith('#')) {
        if (state.page !== 'home') await navigate('home');
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        await navigate(page);
        document.querySelector('#mainNav')?.classList.remove('show');
      }
      return;
    }
    const action = event.target.closest('[data-action]');
    if (!action) return;
    const kind = action.dataset.action;
    try {
      if (kind === 'logout') {
        await api('logout', { method: 'POST', body: '{}' });
        state.user = null;
        renderNav();
        toast('Kamu berhasil keluar.');
        navigate('home');
      } else if (kind === 'next-step') {
        const form = document.querySelector('#application-form');
        const fields = [...form.querySelector('[data-step="1"]').querySelectorAll('input,select,textarea')];
        const invalid = fields.find((field) => !field.reportValidity());
        if (!invalid) {
          state.step = 2;
          form.querySelector('[data-step="1"]').classList.remove('active');
          form.querySelector('[data-step="2"]').classList.add('active');
          form.querySelector('#step-current').textContent = '2';
          form.querySelector('[data-step-indicator="1"]').classList.add('done');
          form.querySelector('[data-step-indicator="2"]').classList.add('active');
        }
      } else if (kind === 'previous-step') {
        const form = document.querySelector('#application-form');
        state.step = 1;
        form.querySelector('[data-step="2"]').classList.remove('active');
        form.querySelector('[data-step="1"]').classList.add('active');
        form.querySelector('#step-current').textContent = '1';
        form.querySelector('[data-step-indicator="1"]').classList.remove('done');
        form.querySelector('[data-step-indicator="2"]').classList.remove('active');
      } else if (kind === 'choose-file') {
        action.closest('form').querySelector('input[type="file"]').click();
      } else if (kind === 'proof') {
        const application = state.student.applications.find((item) => Number(item.id) === Number(action.dataset.id));
        if (application) printProof(application);
      } else if (kind === 'export') {
        exportReport();
      } else if (kind === 'verify-doc') {
        const note = action.dataset.status === 'ditolak' ? (window.prompt('Catatan untuk calon siswa (opsional):') || '') : '';
        await api('admin/document', { method: 'POST', body: JSON.stringify({ id: action.dataset.id, status: action.dataset.status, catatan: note }) });
        toast('Verifikasi dokumen diperbarui.');
        await renderAdmin();
      } else if (kind === 'verify-student') {
        if (!window.confirm('Verifikasi pendaftaran ini? Pastikan seluruh dokumen telah disetujui.')) return;
        await api('admin/verify', { method: 'POST', body: JSON.stringify({ calon_siswa_id: action.dataset.id, status: 'terverifikasi' }) });
        toast('Pendaftaran berhasil diverifikasi.');
        await renderAdmin();
      } else if (kind === 'delete-student') {
        if (!window.confirm('Hapus data pendaftar ini beserta dokumennya? Tindakan ini tidak dapat dibatalkan.')) return;
        await api('admin/student', { method: 'DELETE', body: JSON.stringify({ id: action.dataset.id }) });
        toast('Data pendaftar dihapus.');
        await renderAdmin();
      } else if (kind === 'selection') {
        const answer = window.prompt(`Hasil seleksi untuk ${action.dataset.name}:\nKetik "diterima" atau "tidak_diterima".`);
        if (!answer) return;
        const result = answer.trim().toLowerCase();
        if (!['diterima', 'tidak_diterima'].includes(result)) throw new Error('Masukkan "diterima" atau "tidak_diterima".');
        await api('admin/selection', { method: 'POST', body: JSON.stringify({ calon_siswa_id: action.dataset.id, hasil: result }) });
        toast('Hasil tersimpan. Umumkan hasil pada tab Periode & kuota.');
        await renderAdmin();
      } else if (kind === 'publish') {
        if (!window.confirm('Umumkan seluruh hasil seleksi untuk periode ini kepada calon siswa?')) return;
        await api('admin/publish', { method: 'POST', body: JSON.stringify({ periode_id: action.dataset.id }) });
        toast('Hasil seleksi berhasil diumumkan.');
        await renderAdmin();
      } else if (kind === 'edit-student') {
        const student = state.admin.applications.find((item) => Number(item.id) === Number(action.dataset.id));
        if (!student) return;
        document.querySelector('#edit-student-body').innerHTML = `<input type="hidden" name="id" value="${student.id}"><div class="row g-3"><div class="col-md-8"><label class="form-label">Nama lengkap</label><input class="form-control" name="nama_lengkap" value="${escapeHtml(student.nama_lengkap)}" required></div><div class="col-md-4"><label class="form-label">NISN</label><input class="form-control" name="nisn" value="${escapeHtml(student.nisn)}" required maxlength="10"></div><div class="col-md-6"><label class="form-label">NIK</label><input class="form-control" name="nik" value="${escapeHtml(student.nik)}" required maxlength="16"></div><div class="col-12"><label class="form-label">Alamat</label><textarea class="form-control" name="alamat" rows="2" required>${escapeHtml(student.alamat || '')}</textarea></div><div class="col-md-6"><label class="form-label">Nama wali</label><input class="form-control" name="nama_wali" value="${escapeHtml(student.nama_wali || '')}" required></div><div class="col-md-6"><label class="form-label">Telepon wali</label><input class="form-control" name="telepon_wali" value="${escapeHtml(student.telepon_wali || '')}" required></div></div>`;
        document.querySelector('[data-form="edit-student"]').dataset.id = student.id;
        bootstrap.Modal.getOrCreateInstance(document.querySelector('#edit-student-modal')).show();
      } else if (action.classList.contains('admin-tab')) {
        document.querySelectorAll('.admin-tab').forEach((tab) => tab.classList.toggle('active', tab === action));
        document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${action.dataset.tab}`));
      }
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-form]');
    if (!form) return;
    event.preventDefault();
    if (form.dataset.form === 'application') {
      const stepTwoFields = [...form.querySelector('[data-step="2"]').querySelectorAll('input')];
      if (!stepTwoFields.every((field) => field.reportValidity())) return;
    }
    submitForm(form);
  });

  document.addEventListener('change', (event) => {
    if (event.target.matches('#table-search, #status-filter')) filterTable();
    if (event.target.matches('input[type="file"]') && event.target.files?.length) {
      event.target.closest('form').requestSubmit();
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.matches('#table-search')) filterTable();
  });

  function filterTable() {
    const search = (document.querySelector('#table-search')?.value || '').trim().toLowerCase();
    const status = document.querySelector('#status-filter')?.value || '';
    let visible = 0;
    document.querySelectorAll('#application-rows tr[data-search]').forEach((row) => {
      const show = row.dataset.search.includes(search) && (!status || row.dataset.status === status);
      row.hidden = !show;
      if (show) visible += 1;
    });
    const count = document.querySelector('#visible-count');
    if (count) count.textContent = String(visible);
  }

  document.querySelector('#year').textContent = String(new Date().getFullYear());
  loadMeta().then(() => navigate('home')).catch((error) => {
    main.innerHTML = `<section class="error-state"><div class="empty-icon">${icon('fa-triangle-exclamation')}</div><h2>Aplikasi belum terhubung ke database</h2><p>${escapeHtml(error.message)}</p><p>Pastikan MySQL aktif, database sudah dibuat, dan koneksi di <code>config/config.php</code> telah sesuai.</p></section>`;
  });
})();
