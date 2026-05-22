/* ── Config ─────────────────────────────────────────────────────────────── */
let SK = sessionStorage.getItem('sk') || new URLSearchParams(location.search).get('key') || '';
let vulns = [], activeFilter = 'ALL', activeScanId = null, pollTimer = null, currentVulnId = null;

/* ── Gauge constants ─────────────────────────────────────────────────────── */
const G = { cx: 100, cy: 95, r: 72, startDeg: 240, endDeg: 120 };
// Arc: 240° from lower-left to lower-right going clockwise through top
const G_ARC = (240 / 360) * 2 * Math.PI * G.r; // total arc length ≈ 301.6

function pt(angleDeg) {
  // angleDeg: 0=top, clockwise. SVG coords (y-down).
  const rad = angleDeg * Math.PI / 180;
  return [G.cx + G.r * Math.sin(rad), G.cy - G.r * Math.cos(rad)];
}

function arcD(fromDeg, toDeg) {
  const [x1, y1] = pt(fromDeg);
  const [x2, y2] = pt(toDeg);
  // 240° arc > 180° → large-arc-flag = 1, sweep clockwise = 1
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${G.r} ${G.r} 0 1 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function initGauge() {
  const d = arcD(G.startDeg, G.endDeg);
  document.getElementById('gaugeTrack').setAttribute('d', d);
  document.getElementById('gaugeFill').setAttribute('d', d);
  // Start fill at 0
  document.getElementById('gaugeFill').style.strokeDasharray = `0 ${G_ARC + 100}`;

  // Tick marks every 24° across the 240° arc
  const ticks = document.getElementById('gaugeTicks');
  for (let i = 0; i <= 10; i++) {
    const deg = G.startDeg + (i / 10) * 240;
    const rad = deg * Math.PI / 180;
    const rOuter = G.r + 6, rInner = G.r + 2;
    const major = i % 2 === 0;
    const x1 = G.cx + rOuter * Math.sin(rad), y1 = G.cy - rOuter * Math.cos(rad);
    const x2 = G.cx + (major ? rInner - 3 : rInner) * Math.sin(rad);
    const y2 = G.cy - (major ? rInner - 3 : rInner) * Math.cos(rad);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toFixed(2)); line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2)); line.setAttribute('y2', y2.toFixed(2));
    line.setAttribute('stroke-width', major ? '1.5' : '1');
    ticks.appendChild(line);
  }
}

function updateGauge(score) {
  const fill = document.getElementById('gaugeFill');
  const filled = G_ARC * (score / 100);
  fill.style.strokeDasharray = `${filled.toFixed(2)} ${(G_ARC + 100).toFixed(2)}`;

  const color = score >= 80 ? '#00d49a' : score >= 50 ? '#f0a500' : '#ff3355';
  fill.style.stroke = color;
  fill.style.filter = `drop-shadow(0 0 6px ${color}88)`;

  const valEl = document.getElementById('gaugeVal');
  valEl.style.color = color;

  // Animate counter
  const from = parseInt(valEl.textContent) || 0;
  animateNum(valEl, from, score, 700);
}

function animateNum(el, from, to, ms) {
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / ms, 1);
    const ease = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    el.textContent = Math.round(from + (to - from) * ease);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── Boot ───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initGauge();

  if (!SK) {
    document.getElementById('keyGate').classList.remove('hidden');
    document.getElementById('keyInput').addEventListener('keydown', e => { if (e.key === 'Enter') submitKey(); });
    document.getElementById('keySubmit').addEventListener('click', submitKey);
    return;
  }
  boot();
});

function submitKey() {
  SK = document.getElementById('keyInput').value.trim();
  if (!SK) return;
  sessionStorage.setItem('sk', SK);
  document.getElementById('keyGate').classList.add('hidden');
  boot();
}

function boot() {
  loadResults();
  loadHistory();
  loadBackupStatus();
  loadDriveHistory();
  startCountdown();
  bindEvents();
}

function bindEvents() {
  document.getElementById('btnScan').addEventListener('click', startScan);
  document.getElementById('btnEmail').addEventListener('click', sendEmail);
  document.getElementById('btnBackup').addEventListener('click', triggerBackup);
  document.getElementById('btnResolve').addEventListener('click', resolveVuln);
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerBg').addEventListener('click', closeDrawer);
  document.getElementById('searchInput').addEventListener('input', renderVulns);
  document.getElementById('hideResolved').addEventListener('change', renderVulns);
  document.querySelectorAll('.f-btn').forEach(b => b.addEventListener('click', setFilter));
  document.querySelectorAll('.d-tab').forEach(b => b.addEventListener('click', switchDTab));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
}

/* ── API ────────────────────────────────────────────────────────────────── */
async function api(method, path, body) {
  const r = await fetch(path, {
    method,
    headers: { 'X-Security-Key': SK, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(e.error || r.statusText);
  }
  return r.json();
}

/* ── Scan ───────────────────────────────────────────────────────────────── */
const LOG_MSGS = [
  'Parsing source tree…', 'Indexing TypeScript modules…', 'Chunking files for analysis…',
  'Sending chunk to Claude API…', 'Analyzing authentication routes…', 'Checking input validation…',
  'Auditing database queries…', 'Reviewing JWT configuration…', 'Scanning for hardcoded secrets…',
  'Checking CORS configuration…', 'Analyzing error handlers…', 'Reviewing rate limiting…',
  'Cross-referencing OWASP Top 10…', 'Deduplicating findings…', 'Scoring codebase…',
];
let logIdx = 0;

async function startScan() {
  try {
    document.getElementById('btnScan').disabled = true;
    document.getElementById('pulseDot').classList.add('scanning');
    logIdx = 0;
    showTerminal(0, 'Starting scanner…');

    const { scan_id } = await api('POST', '/api/security/scan');
    activeScanId = scan_id;
    pollTimer = setInterval(() => pollScan(scan_id), 2000);
  } catch (e) {
    hideTerminal();
    document.getElementById('btnScan').disabled = false;
    document.getElementById('pulseDot').classList.remove('scanning');
    toast('Scan failed: ' + e.message, 'error');
  }
}

async function pollScan(scanId) {
  try {
    const state = await api('GET', `/api/security/status/${scanId}`);
    const pct = state.progress || 0;

    // Add a terminal log line every poll
    const msg = LOG_MSGS[logIdx % LOG_MSGS.length];
    logIdx++;
    appendTermLog(msg);
    showTerminal(pct, state.status === 'RUNNING' ? `Analyzing… ${pct}%` : state.status);

    if (state.status === 'COMPLETED') {
      clearInterval(pollTimer);
      appendTermLog('✓ Scan complete — building report…');
      showTerminal(100, 'Complete');
      setTimeout(async () => {
        hideTerminal();
        document.getElementById('btnScan').disabled = false;
        document.getElementById('pulseDot').classList.remove('scanning');
        await loadResults();
        await loadHistory();
        toast('Scan completed successfully', 'success');
      }, 800);
    } else if (state.status === 'FAILED') {
      clearInterval(pollTimer);
      hideTerminal();
      document.getElementById('btnScan').disabled = false;
      document.getElementById('pulseDot').classList.remove('scanning');
      toast('Scan failed: ' + (state.error || 'Unknown error'), 'error');
    }
  } catch (_) { /* transient, keep polling */ }
}

function showTerminal(pct, msg) {
  document.getElementById('scanOverlay').classList.remove('hidden');
  document.getElementById('tBar').style.width = pct + '%';
  document.getElementById('tPct').textContent = pct + '%';
  document.getElementById('tMsg').textContent = msg;
}

function appendTermLog(msg) {
  const log = document.getElementById('tLog');
  const line = document.createElement('div');
  line.className = 't-log-line';
  line.textContent = msg;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function hideTerminal() {
  document.getElementById('scanOverlay').classList.add('hidden');
  document.getElementById('tLog').innerHTML = '';
}

/* ── Results ────────────────────────────────────────────────────────────── */
async function loadResults() {
  try {
    const r = await api('GET', '/api/security/results');
    applyResult(r);
  } catch (e) {
    if (!e.message.includes('No scans')) console.warn(e.message);
  }
}

function applyResult(r) {
  updateGauge(r.security_score);
  document.getElementById('summaryText').textContent = r.scan_summary;
  document.getElementById('lastScanTime').textContent = new Date(r.timestamp).toLocaleString();

  vulns = r.vulnerabilities || [];
  document.getElementById('cC').textContent = vulns.filter(v => v.severity === 'CRITICAL').length;
  document.getElementById('cH').textContent = vulns.filter(v => v.severity === 'HIGH').length;
  document.getElementById('cM').textContent = vulns.filter(v => v.severity === 'MEDIUM').length;
  document.getElementById('cL').textContent = vulns.filter(v => v.severity === 'LOW').length;
  renderVulns();
}

function renderVulns() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const hideR = document.getElementById('hideResolved').checked;
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  let filtered = vulns.filter(v => {
    if (activeFilter !== 'ALL' && v.severity !== activeFilter) return false;
    if (hideR && v.resolved) return false;
    if (search && !v.title.toLowerCase().includes(search) && !v.file.toLowerCase().includes(search)) return false;
    return true;
  }).sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));

  document.getElementById('vulnCount').textContent = filtered.length;
  const list = document.getElementById('vulnList');

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-msg"><span class="empty-hex">⬡</span><p>No vulnerabilities match the current filters.</p></div>`;
    return;
  }

  list.innerHTML = filtered.map(v => `
    <div class="vuln-card ${v.resolved ? 'resolved' : ''}" onclick="openDrawer('${v.id}')">
      <div class="vuln-stripe stripe-${v.severity}"></div>
      <div class="vuln-inner">
        <div class="vuln-top">
          <span class="sev-tag tag-${v.severity}">${v.severity}</span>
          ${v.resolved ? '<span class="resolved-pill">✓ Resolved</span>' : ''}
        </div>
        <div class="vuln-title">${esc(v.title)}</div>
        <div class="vuln-file">${esc(v.file)}:${v.line}</div>
      </div>
    </div>`).join('');
}

function setFilter(e) {
  document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active'));
  e.currentTarget.classList.add('active');
  activeFilter = e.currentTarget.dataset.sev;
  renderVulns();
}

/* ── History ────────────────────────────────────────────────────────────── */
async function loadHistory() {
  try {
    const h = await api('GET', '/api/security/history');
    renderHistory(h);
    renderChart(h);
  } catch (e) { console.warn(e.message); }
}

function renderHistory(history) {
  const list = document.getElementById('historyList');
  if (!history.length) { list.innerHTML = ''; return; }
  list.innerHTML = history.map((h, i) => {
    const c = scoreColor(h.security_score);
    return `<div class="hist-row" onclick="loadHistItem(${i})">
      <span class="hist-score" style="color:${c}">${h.security_score}</span>
      <span class="hist-date">${new Date(h.timestamp).toLocaleDateString()}</span>
      <span class="hist-vulns">${h.vulnerabilities.length}v</span>
    </div>`;
  }).join('');
}

async function loadHistItem(i) {
  try {
    const h = await api('GET', '/api/security/history');
    if (h[i]) applyResult(h[i]);
  } catch (_) { toast('Failed to load scan', 'error'); }
}

function renderChart(history) {
  const canvas = document.getElementById('scoreChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth, H = 72;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const scores = [...history].reverse().map(h => h.security_score);
  if (scores.length < 2) return;

  ctx.clearRect(0, 0, W, H);
  const pad = 10;
  const step = (W - pad * 2) / (scores.length - 1);

  // Grid lines
  ctx.strokeStyle = 'rgba(28,37,55,.8)'; ctx.lineWidth = 1;
  [25, 50, 75].forEach(y => {
    const vy = pad + (1 - y / 100) * (H - pad * 2);
    ctx.beginPath(); ctx.moveTo(pad, vy); ctx.lineTo(W - pad, vy); ctx.stroke();
  });

  // Gradient fill under line
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(240,165,0,.2)');
  grad.addColorStop(1, 'rgba(240,165,0,0)');
  ctx.beginPath();
  scores.forEach((s, i) => {
    const x = pad + i * step, y = pad + (1 - s / 100) * (H - pad * 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad + (scores.length - 1) * step, H);
  ctx.lineTo(pad, H);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // Line
  ctx.beginPath();
  scores.forEach((s, i) => {
    const x = pad + i * step, y = pad + (1 - s / 100) * (H - pad * 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#f0a500'; ctx.lineWidth = 1.5; ctx.stroke();

  // Dots
  scores.forEach((s, i) => {
    const x = pad + i * step, y = pad + (1 - s / 100) * (H - pad * 2);
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = scoreColor(s); ctx.fill();
  });
}

/* ── Backup ─────────────────────────────────────────────────────────────── */
async function loadBackupStatus() {
  try {
    const b = await api('GET', '/api/backup/status');
    document.getElementById('bStatus').textContent = b.status;
    document.getElementById('bStatus').style.color = b.status === 'COMPLETED' ? 'var(--safe)' : b.status === 'FAILED' ? 'var(--crit)' : '';
    document.getElementById('bTime').textContent = new Date(b.timestamp).toLocaleString();
    document.getElementById('bFile').textContent = b.driveFileName || b.fileName || '—';
    document.getElementById('bSize').textContent = b.sizeBytes ? fmtBytes(b.sizeBytes) : '—';
  } catch (e) {
    if (!e.message.includes('No backup')) console.warn(e.message);
  }
}

async function loadDriveHistory() {
  const list = document.getElementById('driveList');
  try {
    const files = await api('GET', '/api/backup/history');
    if (!files.length) { list.innerHTML = '<span class="loading-line">No backups in Drive yet.</span>'; return; }
    list.innerHTML = files.map(f => `
      <div class="drive-item">
        <a href="${f.webViewLink}" target="_blank" title="${f.name}">${f.name}</a>
        <span class="drive-size">${fmtBytes(f.size)}</span>
      </div>`).join('');
  } catch (_) {
    list.innerHTML = '<span class="loading-line">Drive not configured.</span>';
  }
}

async function triggerBackup() {
  const btn = document.getElementById('btnBackup');
  btn.disabled = true; btn.textContent = '…';
  try {
    const r = await api('POST', '/api/backup/trigger');
    toast(r.status === 'COMPLETED' ? '✓ Backup completed' : '✗ Backup failed', r.status === 'COMPLETED' ? 'success' : 'error');
    loadBackupStatus(); loadDriveHistory();
  } catch (e) { toast('Backup failed: ' + e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = '▶ Run'; }
}

function startCountdown() {
  function tick() {
    const now = new Date(), next = new Date();
    next.setHours(2, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const d = next - now;
    const h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000), s = Math.floor((d % 60000) / 1000);
    document.getElementById('bCountdown').textContent = `${p(h)}:${p(m)}:${p(s)}`;
  }
  tick(); setInterval(tick, 1000);
  function p(n) { return String(n).padStart(2, '0'); }
}

/* ── Email ──────────────────────────────────────────────────────────────── */
async function sendEmail() {
  try {
    const r = await api('POST', '/api/security/email');
    toast(r.success ? '✓ Email sent' : '✗ ' + r.error, r.success ? 'success' : 'error');
  } catch (e) { toast('Email failed: ' + e.message, 'error'); }
}

/* ── Drawer ─────────────────────────────────────────────────────────────── */
function openDrawer(id) {
  const v = vulns.find(x => x.id === id);
  if (!v) return;
  currentVulnId = id;

  document.getElementById('dBadge').textContent = v.severity;
  document.getElementById('dBadge').className = `sev-tag tag-${v.severity}`;
  document.getElementById('dFile').textContent = `${v.file}:${v.line}`;
  document.getElementById('dTitle').textContent = v.title;

  document.getElementById('dDesc').textContent = v.description;
  document.getElementById('dAttack').textContent = v.attack_scenario;
  document.getElementById('dImpact').textContent = v.business_impact;

  const fg = v.fix_guide || {};
  document.getElementById('fDiff').textContent = fg.difficulty || '—';
  document.getElementById('fTime').textContent = fg.estimated_time || '—';
  document.getElementById('fSteps').innerHTML = (fg.steps || []).map(s => `<li>${esc(s)}</li>`).join('');
  document.getElementById('codeBefore').textContent = fg.code_before || '';
  document.getElementById('codeAfter').textContent = fg.code_after || '';

  document.getElementById('rOwasp').textContent = v.owasp_reference || '—';
  document.getElementById('rCve').textContent = v.cve_reference || 'N/A';
  document.getElementById('rSnippet').textContent = v.code_snippet || '';

  const resolveBtn = document.getElementById('btnResolve');
  resolveBtn.disabled = v.resolved;
  resolveBtn.textContent = v.resolved ? '✓ Already Resolved' : '✓ Mark as Resolved';

  // Reset to first tab
  document.querySelectorAll('.d-tab').forEach(b => b.classList.remove('active'));
  document.querySelector('.d-tab[data-tab="overview"]').classList.add('active');
  document.querySelectorAll('.d-pane').forEach(p => p.classList.add('hidden'));
  document.getElementById('pOverview').classList.remove('hidden');

  document.getElementById('drawer').classList.remove('hidden');
}

function closeDrawer() {
  document.getElementById('drawer').classList.add('hidden');
  currentVulnId = null;
}

function switchDTab(e) {
  const tab = e.currentTarget.dataset.tab;
  document.querySelectorAll('.d-tab').forEach(b => b.classList.remove('active'));
  e.currentTarget.classList.add('active');
  document.querySelectorAll('.d-pane').forEach(p => p.classList.add('hidden'));
  const map = { overview: 'pOverview', fix: 'pFix', refs: 'pRefs' };
  document.getElementById(map[tab]).classList.remove('hidden');
}

/* ── Resolve ────────────────────────────────────────────────────────────── */
async function resolveVuln() {
  if (!currentVulnId) return;
  try {
    await api('PATCH', `/api/security/vuln/${currentVulnId}/resolve`);
    const v = vulns.find(x => x.id === currentVulnId);
    if (v) { v.resolved = true; v.resolved_at = new Date().toISOString(); }
    document.getElementById('btnResolve').disabled = true;
    document.getElementById('btnResolve').textContent = '✓ Already Resolved';
    renderVulns();
    toast('Marked as resolved', 'success');
  } catch (e) { toast('Failed: ' + e.message, 'error'); }
}

/* ── Toast ──────────────────────────────────────────────────────────────── */
let toastTm;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(toastTm);
  toastTm = setTimeout(() => el.classList.add('hidden'), 4000);
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function scoreColor(s) { return s >= 80 ? '#00d49a' : s >= 50 ? '#f0a500' : '#ff3355'; }
function fmtBytes(b) {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
