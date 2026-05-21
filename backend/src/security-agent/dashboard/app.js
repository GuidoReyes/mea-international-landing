/* ── State ──────────────────────────────────────────────────────────────── */
let securityKey = sessionStorage.getItem('securityKey') || new URLSearchParams(location.search).get('key') || '';
let currentScanId = null;
let currentVulns = [];
let activeFilter = 'ALL';
let pollInterval = null;
let currentVulnId = null;

/* ── Init ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (!securityKey) {
    securityKey = prompt('Enter security key:') || '';
    if (!securityKey) { document.body.innerHTML = '<p style="color:#ef4444;padding:40px">No security key provided.</p>'; return; }
  }
  sessionStorage.setItem('securityKey', securityKey);

  loadResults();
  loadHistory();
  loadBackupStatus();
  loadDriveHistory();
  startCountdown();

  document.getElementById('btnScan').addEventListener('click', startScan);
  document.getElementById('btnEmail').addEventListener('click', sendEmail);
  document.getElementById('btnBackup').addEventListener('click', triggerBackup);
  document.getElementById('btnResolve').addEventListener('click', resolveVuln);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', closeModal);
  document.getElementById('searchInput').addEventListener('input', renderVulns);
  document.getElementById('hideResolved').addEventListener('change', renderVulns);
  document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', setFilter));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', switchTab));
});

/* ── API ────────────────────────────────────────────────────────────────── */
async function api(method, path, body) {
  const opts = { method, headers: { 'X-Security-Key': securityKey, 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error || res.statusText); }
  return res.json();
}

/* ── Scan ───────────────────────────────────────────────────────────────── */
async function startScan() {
  try {
    document.getElementById('btnScan').disabled = true;
    showOverlay(0, '');
    const { scan_id } = await api('POST', '/api/security/scan');
    currentScanId = scan_id;
    pollInterval = setInterval(() => pollScan(scan_id), 2000);
  } catch (e) {
    hideOverlay();
    document.getElementById('btnScan').disabled = false;
    toast('Scan failed: ' + e.message, 'error');
  }
}

async function pollScan(scanId) {
  try {
    const state = await api('GET', `/api/security/status/${scanId}`);
    showOverlay(state.progress || 0, state.status);
    if (state.status === 'COMPLETED') {
      clearInterval(pollInterval);
      hideOverlay();
      document.getElementById('btnScan').disabled = false;
      await loadResults();
      await loadHistory();
      toast('Scan completed!', 'success');
    } else if (state.status === 'FAILED') {
      clearInterval(pollInterval);
      hideOverlay();
      document.getElementById('btnScan').disabled = false;
      toast('Scan failed: ' + (state.error || 'Unknown error'), 'error');
    }
  } catch (e) { /* transient network error, keep polling */ }
}

/* ── Results ────────────────────────────────────────────────────────────── */
async function loadResults() {
  try {
    const result = await api('GET', '/api/security/results');
    applyResult(result);
  } catch (e) {
    if (!e.message.includes('No scans')) console.warn('loadResults:', e.message);
  }
}

function applyResult(result) {
  const score = result.security_score;
  const el = document.getElementById('scoreValue');
  el.textContent = score;
  el.style.color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';

  document.getElementById('scanSummary').textContent = result.scan_summary;
  document.getElementById('lastScanTime').textContent = new Date(result.timestamp).toLocaleString();

  const vulns = result.vulnerabilities || [];
  currentVulns = vulns;

  document.getElementById('countCritical').textContent = vulns.filter(v => v.severity === 'CRITICAL').length;
  document.getElementById('countHigh').textContent     = vulns.filter(v => v.severity === 'HIGH').length;
  document.getElementById('countMedium').textContent   = vulns.filter(v => v.severity === 'MEDIUM').length;
  document.getElementById('countLow').textContent      = vulns.filter(v => v.severity === 'LOW').length;

  renderVulns();
}

function renderVulns() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const hideResolved = document.getElementById('hideResolved').checked;
  const list = document.getElementById('vulnList');

  let filtered = currentVulns.filter(v => {
    if (activeFilter !== 'ALL' && v.severity !== activeFilter) return false;
    if (hideResolved && v.resolved) return false;
    if (search && !v.title.toLowerCase().includes(search) && !v.file.toLowerCase().includes(search)) return false;
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">No vulnerabilities match the current filters.</div>';
    return;
  }

  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  filtered.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));

  list.innerHTML = filtered.map(v => `
    <div class="vuln-card ${v.resolved ? 'resolved' : ''}" onclick="openModal('${v.id}')">
      <span class="severity-badge badge-${v.severity}">${v.severity}</span>
      <div class="vuln-body">
        <div class="vuln-title">${esc(v.title)} ${v.resolved ? '<span class="vuln-resolved-pill">✓ Resolved</span>' : ''}</div>
        <div class="vuln-file">${esc(v.file)}:${v.line}</div>
      </div>
    </div>`).join('');
}

function setFilter(e) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  e.currentTarget.classList.add('active');
  activeFilter = e.currentTarget.dataset.severity;
  renderVulns();
}

/* ── History ────────────────────────────────────────────────────────────── */
async function loadHistory() {
  try {
    const history = await api('GET', '/api/security/history');
    renderHistory(history);
    renderChart(history);
  } catch (e) { console.warn('loadHistory:', e.message); }
}

function renderHistory(history) {
  const list = document.getElementById('historyList');
  if (!history.length) { list.innerHTML = ''; return; }
  list.innerHTML = history.map((h, i) => `
    <div class="history-row" onclick="loadScanById(${i})">
      <span class="history-score" style="color:${scoreColor(h.security_score)}">${h.security_score}</span>
      <span class="history-date">${new Date(h.timestamp).toLocaleDateString()}</span>
      <span class="history-vulns">${h.vulnerabilities.length} vulns</span>
    </div>`).join('');
}

async function loadScanById(index) {
  try {
    const history = await api('GET', '/api/security/history');
    if (history[index]) applyResult(history[index]);
  } catch (e) { toast('Failed to load scan', 'error'); }
}

function renderChart(history) {
  const canvas = document.getElementById('scoreChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = 120 * dpr;
  ctx.scale(dpr, dpr);
  const w = canvas.offsetWidth, h = 120;

  const scores = [...history].reverse().map(h => h.security_score);
  if (scores.length < 2) return;

  ctx.clearRect(0, 0, w, h);
  const pad = 12, step = (w - pad * 2) / (scores.length - 1);

  ctx.beginPath();
  scores.forEach((s, i) => {
    const x = pad + i * step, y = pad + (1 - s / 100) * (h - pad * 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dots
  scores.forEach((s, i) => {
    const x = pad + i * step, y = pad + (1 - s / 100) * (h - pad * 2);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = scoreColor(s);
    ctx.fill();
  });
}

/* ── Backup ─────────────────────────────────────────────────────────────── */
async function loadBackupStatus() {
  try {
    const last = await api('GET', '/api/backup/status');
    document.getElementById('lastBackupTime').textContent = new Date(last.timestamp).toLocaleString();
    document.getElementById('backupStatus').textContent   = last.status;
    document.getElementById('backupFile').textContent     = last.driveFileName || last.fileName || '—';
    document.getElementById('backupSize').textContent     = last.sizeBytes ? formatBytes(last.sizeBytes) : '—';
  } catch (e) {
    if (!e.message.includes('No backup')) console.warn('loadBackupStatus:', e.message);
  }
}

async function loadDriveHistory() {
  try {
    const files = await api('GET', '/api/backup/history');
    const list = document.getElementById('driveList');
    if (!files.length) { list.innerHTML = '<span class="empty-state-sm">No backups in Drive yet.</span>'; return; }
    list.innerHTML = files.map(f => `
      <div class="drive-item">
        <a href="${f.webViewLink}" target="_blank" title="${f.name}">${f.name}</a>
        <span class="drive-size">${formatBytes(f.size)}</span>
      </div>`).join('');
  } catch (e) {
    document.getElementById('driveList').innerHTML = '<span class="empty-state-sm">Drive not configured.</span>';
  }
}

async function triggerBackup() {
  const btn = document.getElementById('btnBackup');
  btn.disabled = true;
  btn.textContent = '⏳';
  try {
    const result = await api('POST', '/api/backup/trigger');
    toast(result.status === 'COMPLETED' ? '✓ Backup completed' : '✗ Backup failed', result.status === 'COMPLETED' ? 'success' : 'error');
    loadBackupStatus();
    loadDriveHistory();
  } catch (e) {
    toast('Backup failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '▶ Run Now';
  }
}

function startCountdown() {
  function update() {
    const now = new Date();
    const next = new Date();
    next.setHours(2, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const diff = next - now;
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
    document.getElementById('backupCountdown').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  update();
  setInterval(update, 1000);
}

/* ── Modal ──────────────────────────────────────────────────────────────── */
function openModal(vulnId) {
  const v = currentVulns.find(x => x.id === vulnId);
  if (!v) return;
  currentVulnId = vulnId;

  document.getElementById('modalSeverity').textContent = v.severity;
  document.getElementById('modalSeverity').className = `severity-badge badge-${v.severity}`;
  document.getElementById('modalTitle').textContent = v.title;
  document.getElementById('modalFile').textContent = `${v.file}:${v.line}`;

  document.getElementById('modalDescription').textContent = v.description;
  document.getElementById('modalAttack').textContent = v.attack_scenario;
  document.getElementById('modalImpact').textContent = v.business_impact;

  const fg = v.fix_guide || {};
  document.getElementById('fixDifficulty').textContent = fg.difficulty || '—';
  document.getElementById('fixTime').textContent = fg.estimated_time || '—';
  const steps = document.getElementById('fixSteps');
  steps.innerHTML = (fg.steps || []).map(s => `<li>${esc(s)}</li>`).join('');
  document.getElementById('codeBefore').textContent = fg.code_before || '';
  document.getElementById('codeAfter').textContent  = fg.code_after  || '';

  document.getElementById('refOwasp').textContent = v.owasp_reference || '—';
  document.getElementById('refCve').textContent   = v.cve_reference   || 'N/A';
  document.getElementById('codeSnippet').textContent = v.code_snippet || '';

  const resolveBtn = document.getElementById('btnResolve');
  resolveBtn.disabled = v.resolved;
  resolveBtn.textContent = v.resolved ? '✓ Already Resolved' : '✓ Mark Resolved';

  switchTab({ currentTarget: document.querySelector('.tab-btn[data-tab="desc"]') });
  document.getElementById('detailModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('detailModal').classList.add('hidden');
  currentVulnId = null;
}

function switchTab(e) {
  const tab = e.currentTarget.dataset.tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  e.currentTarget.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.remove('hidden');
}

/* ── Resolve ────────────────────────────────────────────────────────────── */
async function resolveVuln() {
  if (!currentVulnId) return;
  try {
    await api('PATCH', `/api/security/vuln/${currentVulnId}/resolve`);
    const v = currentVulns.find(x => x.id === currentVulnId);
    if (v) { v.resolved = true; v.resolved_at = new Date().toISOString(); }
    document.getElementById('btnResolve').disabled = true;
    document.getElementById('btnResolve').textContent = '✓ Already Resolved';
    renderVulns();
    toast('Vulnerability marked as resolved', 'success');
  } catch (e) {
    toast('Failed to resolve: ' + e.message, 'error');
  }
}

/* ── Email ──────────────────────────────────────────────────────────────── */
async function sendEmail() {
  try {
    const result = await api('POST', '/api/security/email');
    toast(result.success ? '✓ Email sent' : '✗ ' + result.error, result.success ? 'success' : 'error');
  } catch (e) { toast('Email failed: ' + e.message, 'error'); }
}

/* ── Overlay ────────────────────────────────────────────────────────────── */
function showOverlay(pct, status) {
  document.getElementById('progressOverlay').classList.remove('hidden');
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressPct').textContent = pct + '%';
  const log = document.getElementById('progressLog');
  if (status && status !== 'PENDING') {
    log.textContent += `[${new Date().toLocaleTimeString()}] ${status} — ${pct}%\n`;
    log.scrollTop = log.scrollHeight;
  }
}
function hideOverlay() {
  document.getElementById('progressOverlay').classList.add('hidden');
  document.getElementById('progressLog').textContent = '';
}

/* ── Toast ──────────────────────────────────────────────────────────────── */
let toastTimeout;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.add('hidden'), 4000);
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function scoreColor(s) { return s >= 80 ? '#22c55e' : s >= 50 ? '#eab308' : '#ef4444'; }
function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
