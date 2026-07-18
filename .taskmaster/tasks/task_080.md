# Task ID: 80

**Title:** Build Security Dashboard UI (HTML, CSS, JS)

**Status:** done

**Dependencies:** 79 ✓

**Priority:** medium

**Description:** Create src/security-agent/dashboard/index.html, styles.css, and app.js with cybersecurity dark theme, vulnerability cards, scan progress, and backup section

**Details:**

Create index.html with structure:
- Header with security score, CRITICAL/HIGH/MEDIUM/LOW counters, Scan/Email buttons
- Vulnerability list with severity filters, search bar
- Detail modal with 3 tabs (Description, Fix Guide, References), code diff, Mark Resolved button
- Scan progress overlay with terminal-style progress bar and file log
- Scan history table with score trend, Canvas line chart
- Backup section with last backup info, Run Backup button, Drive history table, countdown timer

Create styles.css with:
- Dark theme: background #0f172a, cards #1e293b, text #e2e8f0
- Severity colors: CRITICAL #ef4444, HIGH #f97316, MEDIUM #eab308, LOW #3b82f6
- Terminal font for logs: monospace
- Modal with backdrop blur
- Responsive grid layout

Create app.js with:
- sessionStorage for security key
- Poll /api/security/status/:scan_id every 2s during scan
- Add X-Security-Key to all fetch headers
- Toast notifications for success/error
- Canvas chart for security score trend over time
- Backup countdown using setInterval to next scheduled backup (2:00 AM daily)
- Filter/search vulnerabilities client-side
- Code diff highlighting in Fix Guide tab

All assets served via security.routes.ts. UI is vanilla JS (no frameworks).

**Test Strategy:**

Manual UI testing: verify dashboard loads at /security?key=SECRET, test scan button triggers POST /api/security/scan and shows progress overlay, verify vulnerability cards display with correct severity colors, test modal opens with all 3 tabs, verify Mark Resolved button calls PATCH endpoint, test email button, verify backup section shows last backup and Drive history, test countdown timer updates every second

## Subtasks

### 80.1. Create dashboard directory and index.html base structure

**Status:** done  
**Dependencies:** None  

Create src/security-agent/dashboard/ directory and build index.html with complete semantic HTML structure including header, main sections, and modal containers.

**Details:**

Create backend/src/security-agent/dashboard/ directory. Build index.html with:
- DOCTYPE and HTML5 boilerplate with viewport meta, charset utf-8
- Link to styles.css and script src app.js (defer)
- Header section: security score badge (large number + color), severity counters row (CRITICAL/HIGH/MEDIUM/LOW with counts), Scan Now button, Send Email button
- Main container with vulnerability list section: severity filter buttons (All/CRITICAL/HIGH/MEDIUM/LOW), search input, empty state placeholder, vulnerability cards container
- Detail modal structure: close button, vulnerability title, 3-tab navigation (Description, Fix Guide, References), tab content containers, code block with diff placeholder, Mark Resolved button
- Scan progress overlay (hidden by default): terminal-style container, progress bar, current file log, percentage text
- Scan history section: table with columns (Date, Score, Duration, Vulns), Canvas element for trend chart
- Backup section: last backup info box (timestamp, filename, status), Run Backup Now button, Drive history table (Name, Date, Size, Link), countdown timer to next 2 AM backup
- Toast notification container (positioned fixed top-right)

### 80.2. Implement cybersecurity dark theme styles.css

**Status:** done  
**Dependencies:** 80.1  

Create styles.css with complete cybersecurity-themed dark styling including color scheme, typography, layout grid, and component styles.

**Details:**

Create backend/src/security-agent/dashboard/styles.css with:
- CSS reset and box-sizing border-box
- Root variables: --bg-primary: #0f172a, --bg-card: #1e293b, --text-primary: #e2e8f0, --text-secondary: #94a3b8, --critical: #ef4444, --high: #f97316, --medium: #eab308, --low: #3b82f6, --success: #22c55e
- Body: background var(--bg-primary), color var(--text-primary), font-family system-ui
- Header: flexbox row, space-between, gap for buttons
- Security score badge: large font (3rem), rounded circle, dynamic color class (.score-critical, .score-high, .score-medium, .score-good)
- Severity counter pills: inline-flex with colored left border matching severity
- Buttons: primary (blue), danger (red), outline variants, hover states
- Vulnerability cards: bg-card, border-left 4px colored by severity, padding, border-radius 8px, hover shadow
- Filter buttons: toggle active state with underline/background change
- Search input: dark input style, border on focus
- Modal: fixed inset-0, flex center, backdrop-filter blur(4px), bg rgba(0,0,0,0.5)
- Modal content: max-width 800px, max-height 90vh, overflow-y auto, bg-card, rounded-lg
- Tabs: horizontal flex, tab buttons with active underline
- Code block: monospace font, bg #0d1117, padding, overflow-x auto, white-space pre
- Code diff: .diff-add green bg, .diff-remove red bg styles
- Progress overlay: fixed inset-0, flex center, terminal-style box with monospace font
- Progress bar: height 8px, rounded, bg-gray-700, inner fill with gradient animation
- Table styles: full-width, striped rows, hover highlight
- Toast notifications: position fixed top-4 right-4, slide-in animation, severity colored left border
- Responsive: media queries for mobile (stack layout below 768px)

### 80.3. Build app.js core functionality with API integration

**Status:** done  
**Dependencies:** 80.1, 80.2  

Create app.js with security key management, API fetch helpers with authentication headers, scan triggering with polling, and vulnerability data loading.

**Details:**

Create backend/src/security-agent/dashboard/app.js with:
- DOMContentLoaded wrapper
- Security key management: getSecurityKey() reads from URL ?key= param first, falls back to sessionStorage, setSecurityKey() saves to sessionStorage
- API helper: async fetchAPI(endpoint, options) that adds X-Security-Key header to all requests, handles JSON parsing, throws on non-ok responses
- State object: { vulnerabilities: [], scanHistory: [], currentScan: null, backupHistory: [], lastBackup: null }
- loadResults(): GET /api/security/results, populate state.vulnerabilities, call renderVulnerabilities()
- loadHistory(): GET /api/security/history, populate state.scanHistory, call renderHistoryTable(), renderChart()
- startScan(): POST /api/security/scan, show progress overlay, call pollScanStatus(scan_id)
- pollScanStatus(scan_id): setInterval 2000ms, GET /api/security/status/:scan_id, update progress bar/file log, clear interval on COMPLETED/FAILED, call loadResults() on complete
- sendEmail(): POST /api/security/email, show toast on success/error
- markResolved(vulnId): PATCH /api/security/vuln/:vulnId/resolve, update local state, re-render
- Event listeners: Scan button click -> startScan(), Email button click -> sendEmail()
- Init function: if no key show prompt/redirect message, else loadResults(), loadHistory(), loadBackupStatus()
- loadBackupStatus(): GET /api/backup/status, GET /api/backup/history, populate state, render backup section

### 80.4. Implement UI rendering functions and interactivity

**Status:** done  
**Dependencies:** 80.3  

Add DOM rendering functions for vulnerability cards, modal with tabs, filters, search, and toast notifications to app.js.

**Details:**

Extend app.js with rendering and interaction functions:
- renderVulnerabilities(filter='ALL', searchQuery=''): clear container, filter by severity and search text, create card elements with severity badge, title, file:line location, short description, click handler to openModal(vuln)
- openModal(vuln): populate modal title, render tab content (Description tab: full description text; Fix Guide tab: fix_recommendation text + code diff with before/after using .diff-add/.diff-remove classes; References tab: list of reference links as clickable anchors), show modal, bind close handlers (X button, backdrop click, Escape key)
- closeModal(): hide modal, clear content
- renderHistoryTable(): clear table body, iterate scanHistory, create rows with formatted date, score (colored), duration, vuln count
- showToast(message, type='success'): create toast element with icon, message, auto-dismiss after 3s with fade animation
- Filter buttons: click handlers that call renderVulnerabilities(severity)
- Search input: debounced input handler (300ms) that calls renderVulnerabilities(currentFilter, searchValue)
- Code diff rendering: renderCodeDiff(before, after) function that creates side-by-side or unified diff display with syntax highlighting classes
- Tab switching: click handlers on tab buttons that show/hide tab content, update active tab styling
- Mark Resolved button in modal: click handler calls markResolved(), closes modal, shows success toast, re-renders list

### 80.5. Add Canvas chart, backup section functionality, and countdown timer

**Status:** done  
**Dependencies:** 80.3, 80.4  

Implement Canvas-based security score trend chart, backup section rendering with Drive history, and countdown timer to next scheduled backup.

**Details:**

Extend app.js with chart and backup features:
- renderChart(): get Canvas 2d context, clear canvas, calculate chart dimensions with padding, draw axes (white lines), plot scanHistory scores as connected line graph with colored points (score color), add date labels on x-axis, score scale (0-100) on y-axis, fill area under line with gradient, add grid lines for readability
- calculateScoreColor(score): return color based on score ranges (0-40 critical red, 41-60 high orange, 61-80 medium yellow, 81-100 good green)
- Backup section rendering: renderBackupSection() - show last backup timestamp (formatted), filename, success/fail status with colored indicator, update countdown timer text
- loadBackupHistory(): GET /api/backup/history, render table rows with Name (link to webViewLink), Created date formatted, file size if available
- triggerBackup(): POST /api/backup/trigger, show loading state on button, on success refresh backup status and history, show toast
- Backup countdown timer: calculateNextBackup() returns Date for next 2:00 AM, startCountdownTimer() uses setInterval(1000ms) to update countdown display (HH:MM:SS format), recalculate when crossing midnight
- Run Backup Now button: click handler calls triggerBackup()
- Canvas responsive handling: resize observer or window resize handler to redraw chart at correct size
- Polish: loading spinners during API calls, empty states for no vulnerabilities/no history, error states with retry buttons
