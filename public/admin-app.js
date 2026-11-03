'use strict';

/* Pilar 360 frontend — vanilla JavaScript, no build process, demo API only. */
(() => {
  const state = { page: 'dashboard', reports: [], stats: null, search: '', statusFilter: 'All', categoryFilter: 'All', mapInstances: [], detailMapInstance: null, currentDetail: null, authenticated: false };
  const CATEGORY_META = {
    'Road & Sidewalk': { icon: '🛣️', tone: 'road', department: 'Municipal Engineering' },
    'Waste & Cleanliness': { icon: '♻️', tone: 'waste', department: 'Municipal Environment' },
    'Drainage & Flooding': { icon: '💧', tone: 'drainage', department: 'Municipal Engineering' },
    'Streetlight': { icon: '💡', tone: 'light', department: 'General Services' },
    'Water & Utilities': { icon: '🚰', tone: 'drainage', department: 'Utilities Coordination' },
    'Public Safety': { icon: '🛡️', tone: 'public', department: 'Public Safety' },
    'Parks & Public Spaces': { icon: '🌳', tone: 'waste', department: 'General Services' },
    'Other': { icon: '📍', tone: 'public', department: 'Unassigned' }
  };
  const STATUS_CLASS = { 'Submitted': 'status-submitted', 'Under Review': 'status-review', 'Assigned': 'status-assigned', 'In Progress': 'status-progress', 'Resolved': 'status-resolved', 'Closed': 'status-closed' };
  const STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
  const CATEGORIES = Object.keys(CATEGORY_META);
  const DEPARTMENTS = ['Unassigned', 'Municipal Engineering', 'Municipal Environment', 'General Services', 'Utilities Coordination', 'Public Safety', 'Barangay Coordination'];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }
  function formatDate(value, options = {}) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', ...options }).format(date);
  }
  function relativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    const mins = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(value, { year: undefined });
  }
  function statusPill(status) {
    return `<span class="status ${STATUS_CLASS[status] || 'status-submitted'}">${escapeHtml(status || 'Submitted')}</span>`;
  }
  function categoryIcon(category) {
    const meta = CATEGORY_META[category] || CATEGORY_META.Other;
    return `<span class="category-icon ${meta.tone}" aria-hidden="true">${meta.icon}</span>`;
  }
  function byNewest(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }
  function activeReports(reports = state.reports) { return reports.filter(report => !['Resolved', 'Closed'].includes(report.status)); }
  function hasCoordinates(report) { return report.lat !== null && report.lat !== undefined && report.lng !== null && report.lng !== undefined && String(report.lat).trim() !== '' && String(report.lng).trim() !== '' && Number.isFinite(Number(report.lat)) && Number.isFinite(Number(report.lng)); }
  function currentStats() {
    return state.stats || { total: state.reports.length, active: activeReports().length, resolved: state.reports.filter(r => ['Resolved', 'Closed'].includes(r.status)).length, urgent: state.reports.filter(r => r.priority === 'Urgent' && !['Resolved', 'Closed'].includes(r.status)).length, submittedToday: 0, resolutionRate: 0, categories: [], statuses: [] };
  }
  async function api(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
    const type = response.headers.get('content-type') || '';
    const payload = type.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status}).`);
    return payload;
  }
  let mapLibraryLoading = false;
  function loadMapLibrary() {
    if (window.L || mapLibraryLoading) return;
    mapLibraryLoading = true;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.onerror = () => { css.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'; };
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      mapLibraryLoading = false;
      if (state.authenticated && state.currentDetail && $('#reportDetailMap')) initDetailMap(state.currentDetail);
      else if (state.authenticated && (state.page === 'dashboard' || state.page === 'map')) renderPage();
    };
    script.onerror = () => {
      if (script.dataset.fallback === 'used') { mapLibraryLoading = false; return; }
      script.dataset.fallback = 'used';
      script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
    };
    document.head.appendChild(script);
  }

  async function loadData({ keepPage = true } = {}) {
    try {
      const [reportsPayload, stats] = await Promise.all([api('/api/reports'), api('/api/stats')]);
      state.reports = Array.isArray(reportsPayload.reports) ? reportsPayload.reports : [];
      state.stats = stats;
      $('#navReportCount').textContent = String(state.reports.length);
      if (keepPage) renderPage();
    } catch (error) {
      if (/401|Authority access required/i.test(error.message)) { state.authenticated = false; showAdminLock('Your authority session has expired. Please sign in again.'); return; }
      showToast('The local demo server could not be reached.', error.message + ' Start it with npm start.', 'error');
      $('#pageContent').innerHTML = `<section class="panel" style="padding:28px"><h2 class="panel-title">Cannot reach the local API</h2><p style="font-size:11px;color:#80909b;line-height:1.8">${escapeHtml(error.message)}<br>Run <code>npm start</code> or <code>node server.js</code> in the project folder, then refresh this page.</p></section>`;
    }
  }
  function pageHeading(eyebrow, title, description, actions = '') {
    return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div><div class="heading-actions">${actions}</div></div>`;
  }
  function statCard(label, value, detail, icon, tone = '', trend = '') {
    return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${tone}">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-bottom">${trend ? `<span class="stat-trend ${trend === 'DEMO' ? 'neutral' : ''}">${trend}</span>` : ''}<span>${detail}</span></div></article>`;
  }
  function reportRow(report, compact = true) {
    return `<div class="report-row" data-open-report="${escapeHtml(report.id)}" tabindex="0" role="button" aria-label="Open report ${escapeHtml(report.title)}">${categoryIcon(report.category)}<div class="report-row-main"><div class="report-row-title">${escapeHtml(report.title)}</div><div class="report-row-meta">${escapeHtml(report.id)} · Brgy. ${escapeHtml(report.barangay || 'Not specified')} · ${relativeTime(report.createdAt)}</div></div>${statusPill(report.status)}</div>`;
  }
  function barsForCategories() {
    const counts = CATEGORIES.map(name => ({ name, count: state.reports.filter(r => r.category === name).length })).sort((a, b) => b.count - a.count);
    const max = Math.max(1, ...counts.map(item => item.count));
    const tones = ['', 'orange', 'blue', 'purple'];
    return counts.slice(0, 5).map((item, index) => `<div><div class="bar-meta"><strong>${escapeHtml(item.name)}</strong><span>${item.count} report${item.count === 1 ? '' : 's'}</span></div><div class="bar-track"><div class="bar-fill ${tones[index % tones.length]}" style="width:${Math.round(item.count / max * 100)}%"></div></div></div>`).join('');
  }
  function renderDashboard() {
    const stats = currentStats();
    const latest = [...state.reports].sort(byNewest).slice(0, 5);
    const urgent = state.reports.filter(r => r.priority === 'Urgent' && !['Resolved', 'Closed'].includes(r.status)).length;
    const heading = pageHeading(new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()).toUpperCase(), 'Let’s make Pilar better.', 'A clearer way for the community to raise concerns, track action, and help improve local spaces.', '<a class="btn btn-primary" href="/report">Open public report portal ↗</a>');
    $('#pageContent').innerHTML = `${heading}
      <section class="hero-panel"><div class="hero-copy"><div class="hero-kicker"><span></span> COMMUNITY-POWERED IMPROVEMENT</div><h2>Small reports.<br><em>Visible progress.</em></h2><p>Spot a road issue, blocked drainage, uncollected waste, or broken streetlight? Document it clearly and follow its progress in one place.</p><div class="hero-actions"><button class="btn btn-primary" data-page="reports">Review incoming reports</button><button class="hero-link" data-page="reports">Explore reports <span>↗</span></button></div></div><div class="hero-art" aria-hidden="true"><div class="hero-orbit"><div class="hero-pin"><span>⌖</span></div><div class="orbit-chip one"><b>${stats.total}</b> total reports</div><div class="orbit-chip two"><b>${stats.resolved}</b> resolved / closed</div></div></div></section>
      <section class="stats-grid" aria-label="Report statistics">${statCard('All reports', stats.total, 'Barangay Marifosque demo records', '▤', '', 'DEMO')}${statCard('Open concerns', stats.active, 'Not yet resolved or closed', '◷', 'orange', stats.active ? 'ACTIVE' : 'CLEAR')}${statCard('Resolved / closed', stats.resolved, `${stats.resolutionRate}% of all reports`, '✓', 'blue', `${stats.resolutionRate}%`)}${statCard('Urgent priorities', urgent, 'Needs prompt assessment', '⚑', 'purple', urgent ? 'REVIEW' : 'NONE')}</section>
      <section class="content-grid"><article class="panel"><div class="panel-header"><div><h3 class="panel-title">Community issue map</h3><p class="panel-subtitle">User-provided pins for Barangay Marifosque</p></div><button class="text-action" data-page="map">Open full map ↗</button></div><div class="map-preview"><div id="mapDashboard"></div><div class="map-no-network hidden" id="mapFallbackDash"><span>⌖</span><strong>Community location view</strong><small>Map tiles need an internet connection</small></div><div class="map-caption"><strong>Pilar, Sorsogon</strong>Demo coordinates · not official boundaries</div></div><div class="panel-footer"><div class="legend"><span><i style="background:#f4a178"></i>Urgent / high</span><span><i style="background:#85b5f4"></i>Other concerns</span><span><i style="background:#89bb50"></i>Resolved</span></div><span>${state.reports.filter(hasCoordinates).length} mapped</span></div></article>
      <article class="panel"><div class="panel-header"><div><h3 class="panel-title">Latest community reports</h3><p class="panel-subtitle">A live view of the local demo queue</p></div><button class="text-action" data-page="reports">View all ↗</button></div><div class="recent-list">${latest.length ? latest.map(r => reportRow(r)).join('') : `<div class="empty-state"><strong>No reports yet</strong>Submit the first demo report to get started.</div>`}</div><div class="panel-footer"><span>Sorted by latest submission</span><span>Auto-updated on refresh</span></div></article></section>
      <section class="content-grid" style="margin-top:16px"><article class="panel"><div class="panel-header"><div><h3 class="panel-title">Where attention is needed</h3><p class="panel-subtitle">Issues by category · demo dataset</p></div><button class="text-action" data-page="insights">View insights ↗</button></div><div class="category-bars">${barsForCategories()}</div></article><article class="panel"><div class="panel-header"><div><h3 class="panel-title">A simple reporting journey</h3><p class="panel-subtitle">Designed for residents and community coordinators</p></div></div><div class="category-bars"><div class="bar-meta"><strong>01 · Document</strong><span>Photo + details</span></div><div style="font-size:10px;color:#8c9aa4;line-height:1.65;margin-top:-11px">Describe what happened and where it can be found.</div><div class="bar-meta"><strong>02 · Review</strong><span>Classify + assign</span></div><div style="font-size:10px;color:#8c9aa4;line-height:1.65;margin-top:-11px">A demo coordinator can update the status and responsible unit.</div><div class="bar-meta"><strong>03 · Follow through</strong><span>Track changes</span></div><div style="font-size:10px;color:#8c9aa4;line-height:1.65;margin-top:-11px">See the report timeline and whether it is marked resolved.</div></div></article></section>`;
    initMap('mapDashboard', 'mapFallbackDash', { mini: true });
  }
  function filteredReports() {
    const q = state.search.trim().toLowerCase();
    return [...state.reports].filter(r => (state.statusFilter === 'All' || (state.statusFilter === 'Open' ? !['Resolved', 'Closed'].includes(r.status) : r.status === state.statusFilter)) && (state.categoryFilter === 'All' || r.category === state.categoryFilter) && (!q || [r.id, r.title, r.description, r.category, r.barangay, r.address, r.department, r.reporter].some(value => String(value || '').toLowerCase().includes(q)))).sort(byNewest);
  }
  function reportTableRow(report) {
    return `<tr data-open-report="${escapeHtml(report.id)}" tabindex="0"><td><div class="report-name">${categoryIcon(report.category)}<div><strong>${escapeHtml(report.title)}</strong><small>${escapeHtml(report.category)} · Brgy. ${escapeHtml(report.barangay || 'Not specified')}</small></div></div></td><td>${escapeHtml(report.reporter || 'Not provided')}</td><td>${escapeHtml([report.barangay, report.address].filter(Boolean).join(' · ') || 'Not provided')}</td><td><span class="id-text">${escapeHtml(report.id)}</span></td><td>${statusPill(report.status)}</td><td><span class="priority ${escapeHtml(report.priority)}">${escapeHtml(report.priority)}</span></td><td>${escapeHtml(report.department || 'Unassigned')}</td><td>${relativeTime(report.createdAt)}</td></tr>`;
  }
  function renderReports() {
    const rows = filteredReports();
    const heading = pageHeading('AUTHORITY INBOX', 'Issue reports', 'Review who submitted each concern, check its reported location, and update its demo status.', '<a class="btn btn-ghost" href="/report">Public report portal ↗</a>');
    $('#pageContent').innerHTML = `${heading}<div class="page-tools"><label class="input-wrap"><span>⌕</span><input id="reportSearch" type="search" value="${escapeHtml(state.search)}" placeholder="Search issue, reporter, ID, location…"></label><select class="filter-select" id="statusFilter" aria-label="Filter by status"><option value="All">All reports</option><option value="Open" ${state.statusFilter === 'Open' ? 'selected' : ''}>Open reports</option>${STATUSES.map(s => `<option value="${s}" ${state.statusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}</select><select class="filter-select" id="categoryFilter" aria-label="Filter by category"><option>All</option>${CATEGORIES.map(c => `<option ${state.categoryFilter === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select><button class="btn btn-ghost" data-action="clear-filters">Reset filters</button></div><article class="panel"><div class="table-wrap"><table class="report-table"><thead><tr><th>Issue</th><th>Reported by</th><th>Location</th><th>Report ID</th><th>Status</th><th>Priority</th><th>Assigned unit</th><th>Submitted</th></tr></thead><tbody id="reportTableBody">${rows.map(reportTableRow).join('') || `<tr><td colspan="8"><div class="empty-state"><strong>No matching reports</strong>Try another search or submit a new concern.</div></td></tr>`}</tbody></table></div><div class="table-count"><span id="reportCountText">Showing ${rows.length} of ${state.reports.length} reports</span><span>All entries are prototype data</span></div></article>`;
  }
  function renderMapPage() {
    const mapped = state.reports.filter(hasCoordinates);
    const urgent = activeReports().filter(r => r.priority === 'Urgent').length;
    const heading = pageHeading('LOCATION OVERVIEW', 'Community map', 'View the reported locations for Barangay Marifosque. Select a pin to open its report details. Coordinates are user-provided and not independently verified.');
    $('#pageContent').innerHTML = `${heading}<div class="map-stat-strip"><div class="map-stat"><small>Mapped reports</small><strong>${mapped.length}</strong></div><div class="map-stat"><small>Open concerns</small><strong>${activeReports().length}</strong></div><div class="map-stat"><small>Urgent open</small><strong>${urgent}</strong></div></div><section class="map-layout"><article class="panel"><div class="panel-header"><div><h3 class="panel-title">Barangay Marifosque · report locations</h3><p class="panel-subtitle">OpenStreetMap tiles · approximate sample pins</p></div><span class="demo-pill"><span></span> DEMO PINS</span></div><div class="full-map"><div id="mapFull" style="height:100%;width:100%"></div><div class="map-no-network hidden" id="mapFallbackFull"><span>⌖</span><strong>Map tiles unavailable</strong><small>Map tiles require internet. The report list and coordinates remain available below.</small></div></div><div class="panel-footer"><div class="legend"><span><i style="background:#f4a178"></i>High / urgent</span><span><i style="background:#85b5f4"></i>Open</span><span><i style="background:#89bb50"></i>Resolved</span></div><span>Tap a pin for details</span></div></article><article class="panel"><div class="panel-header"><div><h3 class="panel-title">Mapped issue list</h3><p class="panel-subtitle">${mapped.length} of ${state.reports.length} reports include coordinates</p></div></div><div class="map-side-list">${mapped.sort(byNewest).map(r => reportRow(r)).join('') || `<div class="empty-state"><strong>No mapped reports</strong>A resident must add coordinates in the public portal for a report pin to appear here.</div>`}</div></article></section>`;
    initMap('mapFull', 'mapFallbackFull', { mini: false });
  }
  function renderInsights() {
    const stats = currentStats();
    const statuses = STATUSES.map(status => ({ status, count: state.reports.filter(r => r.status === status).length }));
    const max = Math.max(1, ...statuses.map(s => s.count));
    const totals = state.reports.length || 0;
    const highPriority = state.reports.filter(r => ['High', 'Urgent'].includes(r.priority) && !['Resolved', 'Closed'].includes(r.status)).length;
    const noLocation = state.reports.filter(r => !hasCoordinates(r)).length;
    $('#pageContent').innerHTML = `${pageHeading('DATA SNAPSHOT', 'Community insights', 'A lightweight operational view of what residents are reporting. Counts are calculated from this prototype’s local dataset.', '<button class="btn btn-ghost" data-action="export"><span class="btn-icon">↓</span> Export JSON</button>')}<section class="stats-grid">${statCard('Total reports', totals, 'All categories and statuses', '▤', '', 'DEMO')}${statCard('High / urgent open', highPriority, 'Prioritize assessment', '⚑', 'orange', highPriority ? 'REVIEW' : 'NONE')}${statCard('Location missing', noLocation, 'Reports without map coordinates', '⌖', 'blue', noLocation ? 'CHECK' : 'READY')}${statCard('Resolved share', `${stats.resolutionRate}%`, 'Resolved or closed', '✓', 'purple', `${stats.resolutionRate}%`)}</section><section class="insights-grid"><article class="insight-card"><h3>Workflow distribution</h3><p>How reports are moving through the demo process.</p><div class="status-bars">${statuses.map(item => `<div class="status-bar-row"><span>${escapeHtml(item.status)}</span><div class="status-bar-track"><div class="status-bar-fill" style="width:${Math.round(item.count / max * 100)}%;background:${item.status === 'Resolved' || item.status === 'Closed' ? '#8dbd55' : item.status === 'Urgent' ? '#ef8d70' : '#92b5ed'}"></div></div><strong>${item.count}</strong></div>`).join('')}</div><div class="insight-summary"><div class="summary-circle">${totals ? Math.round(stats.resolutionRate) : 0}%</div><div><strong>Resolution / closure share</strong><br>This is a status ratio only. It is not a service-level guarantee or an official municipal performance measure.</div></div></article><article class="insight-card"><h3>Reports by category</h3><p>Use this to spot recurring topics in the sample data.</p><div class="status-bars">${CATEGORIES.map((category, index) => ({ category, count: state.reports.filter(r => r.category === category).length })).sort((a,b) => b.count - a.count).map((item,index) => `<div class="status-bar-row"><span>${escapeHtml(item.category)}</span><div class="status-bar-track"><div class="status-bar-fill" style="width:${Math.round(item.count / Math.max(1, totals) * 100)}%;background:${['#8dbd55','#92b5ed','#efad79','#a99bf5','#8fc5be'][index % 5]}"></div></div><strong>${item.count}</strong></div>`).join('')}</div><div class="insight-summary"><div class="summary-circle">${CATEGORIES.filter(category => state.reports.some(r => r.category === category)).length}</div><div><strong>Categories represented</strong><br>Categories with at least one report in the current local dataset.</div></div></article></section><div class="warning-note">Prototype analytics only: the sample records are fictional, and these numbers do not represent actual complaints or response performance in Pilar, Sorsogon.</div>`;
  }
  function renderSettings() {
    $('#pageContent').innerHTML = `${pageHeading('PROJECT INFORMATION', 'Workspace & settings', 'Manage this local prototype, review the technical boundaries, and restore the original sample records.', '<button class="btn btn-ghost" data-action="export"><span class="btn-icon">↓</span> Export data</button>')}<section class="settings-grid"><article class="setting-card"><h3>Project identity</h3><p>Pilar 360 is an independent civic reporting prototype designed and built by Jerosh. It is not an official application of the Municipality of Pilar.</p><div class="setting-line"><span>Project</span><strong>Pilar 360</strong></div><div class="setting-line"><span>Builder</span><strong>Jerosh</strong></div><div class="setting-line"><span>Version</span><strong>2.1.0-demo</strong></div><div class="setting-line"><span>Runtime</span><strong>Node.js · native modules</strong></div><div class="setting-line"><span>Storage</span><strong>Local JSON database</strong></div></article><article class="setting-card"><h3>Demo data controls</h3><p>Submitted reports are written to <code>data/reports.json</code>. Resetting replaces the dataset with fictional sample reports; export before resetting if you need to keep your local demo entries.</p><div class="setting-line"><span>Current report count</span><strong>${state.reports.length}</strong></div><div class="setting-line"><span>Demo photos</span><strong>Stored as data URLs</strong></div><div class="setting-line"><span>Real LGU integration</span><strong>Not connected</strong></div><button class="btn btn-dark" data-action="reset-demo">↻ Restore sample dataset</button><div class="warning-note">Reset is permanent for the local demo file. Export your data first if you want to preserve it.</div></article><article class="setting-card"><h3>Privacy & deployment notes</h3><p>Use only for an approved classroom demonstration. Hosted access and HTTPS depend on the configured hosting provider.</p><div class="setting-line"><span>Authentication</span><strong>Protected demo sign-in</strong></div><div class="setting-line"><span>HTTPS / TLS</span><strong>Hosting dependent</strong></div><div class="setting-line"><span>Official case numbers</span><strong>Not issued</strong></div><div class="setting-line"><span>Emergency dispatch</span><strong>Not supported</strong></div></article><article class="setting-card"><h3>Production readiness checklist</h3><p>Before any real community use, the prototype needs a trusted LGU partner and a secured production architecture.</p>${['Municipality approval and official ownership','Authenticated citizen and staff accounts','Role-based permissions and audit logs','Secure file storage and backup policy','Privacy notice and data-retention rules','Verified map/geocoding and department routing','Monitoring, rate limiting and abuse prevention'].map(item => `<div class="setting-line"><span>${escapeHtml(item)}</span><strong style="color:#c87551">Not yet</strong></div>`).join('')}</article></section>`;
  }
  function destroyMaps() {
    for (const map of state.mapInstances) { try { map.remove(); } catch {} }
    state.mapInstances = [];
    if (state.detailMapInstance) { try { state.detailMapInstance.remove(); } catch {} state.detailMapInstance = null; }
  }
  function renderPage() {
    destroyMaps();
    $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.page === state.page));
    const labels = { dashboard: 'Overview', reports: 'Issue reports', map: 'Community map', insights: 'Insights', settings: 'Workspace' };
    $('#crumbCurrent').textContent = labels[state.page] || 'Overview';
    $('#yearNow').textContent = new Date().getFullYear();
    if (state.page === 'dashboard') renderDashboard();
    else if (state.page === 'reports') renderReports();
    else if (state.page === 'map') renderMapPage();
    else if (state.page === 'insights') renderInsights();
    else renderSettings();
  }
  function initMap(containerId, fallbackId, { mini }) {
    const container = document.getElementById(containerId);
    const fallback = document.getElementById(fallbackId);
    if (!container) return;
    if (!window.L) {
      if (fallback) fallback.classList.remove('hidden');
      return;
    }
    try {
      const map = L.map(container, { scrollWheelZoom: false, zoomControl: !mini, attributionControl: true, tap: true });
      state.mapInstances.push(map);
      map.setView([12.925, 123.674], mini ? 13 : 14);
      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap contributors', updateWhenIdle: true, keepBuffer: 3
      });
      let tileLoaded = false;
      tiles.on('tileload', () => { tileLoaded = true; if (fallback) fallback.classList.add('hidden'); });
      tiles.on('tileerror', () => { if (!tileLoaded && fallback) fallback.classList.remove('hidden'); });
      tiles.addTo(map);
      const mapped = state.reports.filter(hasCoordinates);
      const bounds = [];
      mapped.forEach(report => {
        const lat = Number(report.lat), lng = Number(report.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        bounds.push([lat, lng]);
        const resolved = ['Resolved', 'Closed'].includes(report.status);
        const hot = ['High', 'Urgent'].includes(report.priority) && !resolved;
        const color = resolved ? '#8dbd55' : hot ? '#f19a75' : '#78a9ee';
        const dot = L.divIcon({ className: 'custom-pin-wrap', html: `<div style="width:25px;height:25px;background:${color};border:3px solid white;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);box-shadow:0 3px 9px #10223644;display:grid;place-items:center"><i style="display:block;width:5px;height:5px;background:#183047;border-radius:50%"></i></div>`, iconSize: [25,25], iconAnchor: [12,22], popupAnchor: [0,-22] });
        const marker = L.marker([lat, lng], { icon: dot }).addTo(map);
        marker.bindPopup(`<div class="map-popup-title">${escapeHtml(report.title)}</div><div class="map-popup-id">${escapeHtml(report.id)} · ${escapeHtml(report.barangay || 'Location provided')} · ${escapeHtml(report.reporter || 'Reporter not provided')}</div><div class="map-badge">${escapeHtml(report.status)}</div><br><button data-open-report="${escapeHtml(report.id)}" style="border:0;background:#c3f27b;padding:6px 9px;border-radius:6px;font-weight:800;font-size:9px;margin-top:7px;cursor:pointer">View report</button>`);
      });
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
      else if (bounds.length === 1) map.setView(bounds[0], 16);
      const refreshSize = () => { try { map.invalidateSize(true); } catch {} };
      requestAnimationFrame(refreshSize);
      setTimeout(refreshSize, 180);
      setTimeout(refreshSize, 650);
      if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(refreshSize);
        observer.observe(container);
        map.once('unload', () => observer.disconnect());
      }
      setTimeout(() => { if (!tileLoaded && fallback && document.body.contains(container)) fallback.classList.remove('hidden'); }, 6500);
    } catch (error) {
      console.warn('Map could not be initialized:', error);
      if (fallback) fallback.classList.remove('hidden');
    }
  }
  function showToast(message, detail = '', kind = 'success') {
    const host = $('#toastHost');
    const toast = document.createElement('div');
    toast.className = `toast ${kind}`;
    toast.innerHTML = `<div>${escapeHtml(message)}${detail ? `<small>${escapeHtml(detail)}</small>` : ''}</div>`;
    host.appendChild(toast);
    setTimeout(() => toast.remove(), 4700);
  }
  function initDetailMap(report) {
    const container = $('#reportDetailMap');
    if (!container || !hasCoordinates(report)) return;
    if (state.detailMapInstance) { try { state.detailMapInstance.remove(); } catch {} state.detailMapInstance = null; }
    if (!window.L) { $('#detailMapFallback')?.classList.remove('hidden'); return; }
    try {
      const lat = Number(report.lat), lng = Number(report.lng);
      const map = window.L.map(container, { scrollWheelZoom: false, tap: true, zoomControl: true }).setView([lat, lng], 16);
      state.detailMapInstance = map;
      const fallback = $('#detailMapFallback');
      const tiles = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' });
      tiles.on('tileload', () => fallback?.classList.add('hidden'));
      tiles.on('tileerror', () => fallback?.classList.remove('hidden'));
      tiles.addTo(map);
      window.L.marker([lat, lng]).addTo(map).bindPopup(`<strong>${escapeHtml(report.title)}</strong><br>${escapeHtml(report.address || report.barangay || 'Reported location')}`).openPopup();
      requestAnimationFrame(() => map.invalidateSize(true));
      setTimeout(() => { if (state.detailMapInstance === map) map.invalidateSize(true); }, 250);
    } catch (error) {
      console.warn('Report location map could not be opened:', error);
      $('#detailMapFallback')?.classList.remove('hidden');
    }
  }
  async function openReportDetail(id) {
    let report = state.reports.find(item => item.id === id);
    try { const data = await api(`/api/reports/${encodeURIComponent(id)}`); report = data.report; }
    catch (error) { showToast('Could not open report.', error.message, 'error'); return; }
    if (!report) return;
    state.currentDetail = report;
    const host = $('#modalHost');
    const timeline = [...(report.timeline || [])].sort((a,b) => new Date(a.at) - new Date(b.at));
    const imageHtml = report.photoData ? `<div style="margin:0 0 15px"><img src="${report.photoData}" alt="Photo submitted with ${escapeHtml(report.id)}" style="display:block;max-width:100%;max-height:250px;object-fit:contain;border-radius:9px;border:1px solid #e8edee"></div>` : '';
    const mapSection = hasCoordinates(report)
      ? `<section class="detail-map-card"><div class="detail-map-heading"><div><strong>Reported map location</strong><small>Pin based on the coordinates entered by the reporter.</small></div><a href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(report.lat)}&mlon=${encodeURIComponent(report.lng)}#map=17/${encodeURIComponent(report.lat)}/${encodeURIComponent(report.lng)}" target="_blank" rel="noopener noreferrer">Open larger map ↗</a></div><div class="detail-map-wrap"><div id="reportDetailMap" class="detail-map"></div><div id="detailMapFallback" class="detail-map-fallback hidden">The map tiles could not load. Use the coordinates below or open the map link.</div></div><div class="detail-map-coordinates">${escapeHtml(report.lat)}, ${escapeHtml(report.lng)} · ${escapeHtml(report.address || report.barangay || 'No landmark provided')}</div></section>`
      : `<section class="detail-map-card"><div class="detail-map-heading"><div><strong>Reported map location</strong><small>No map coordinates were provided.</small></div></div><div class="detail-map-empty">${escapeHtml(report.address || 'No nearby street or landmark was provided.')}<br><span>A map pin will appear here when the reporter selects a location or shares device coordinates.</span></div></section>`;
    host.innerHTML = `<div class="modal-backdrop" data-dismiss-modal><section class="modal modal-small" role="dialog" aria-modal="true" aria-labelledby="detailTitle"><div class="modal-head"><div><div class="eyebrow">REPORT DETAIL · ${escapeHtml(report.id)}</div><h2 id="detailTitle">Report overview</h2><p>Review the submission, reported location, and status history.</p></div><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body"><div class="detail-hero">${categoryIcon(report.category)}<div><h3>${escapeHtml(report.title)}</h3><small>Submitted ${formatDate(report.createdAt, { hour: 'numeric', minute: '2-digit' })} · ${escapeHtml(report.reporter || 'Community member')}</small></div></div><div class="detail-tags">${statusPill(report.status)}<span class="priority ${escapeHtml(report.priority)}">${escapeHtml(report.priority)} priority</span></div><p class="detail-description">${escapeHtml(report.description)}</p>${imageHtml}<div class="detail-grid"><div class="detail-field"><small>Submitted by</small><strong>${escapeHtml(report.reporter || 'Not provided')}</strong></div><div class="detail-field"><small>Category</small><strong>${escapeHtml(report.category)}</strong></div><div class="detail-field"><small>Barangay</small><strong>${escapeHtml(report.barangay || 'Not specified')}</strong></div><div class="detail-field"><small>Location / landmark</small><strong>${escapeHtml(report.address || 'No landmark provided')}</strong></div><div class="detail-field"><small>Assigned unit</small><strong>${escapeHtml(report.department || 'Unassigned')}</strong></div><div class="detail-field"><small>Coordinates</small><strong>${hasCoordinates(report) ? `${escapeHtml(report.lat)}, ${escapeHtml(report.lng)}` : 'Not provided'}</strong></div><div class="detail-field"><small>Last updated</small><strong>${formatDate(report.updatedAt, { hour: 'numeric', minute: '2-digit' })}</strong></div></div>${mapSection}<div class="timeline"><h4>Activity timeline</h4>${timeline.length ? timeline.map(item => `<div class="timeline-item"><div class="timeline-dot"></div><div><strong>${escapeHtml(item.status)}</strong><p>${escapeHtml(item.note || 'Status update recorded.')}</p><time>${formatDate(item.at, { hour: 'numeric', minute: '2-digit' })}</time></div></div>`).join('') : `<div class="empty-state">No activity recorded.</div>`}</div><div class="admin-editor"><h4>AUTHORITY STATUS CONTROLS <span style="font-size:8px;color:#668f39;font-weight:700">· signed-in demo session</span></h4><form id="updateReportForm" data-report-id="${escapeHtml(report.id)}"><div class="form-grid"><div class="form-field"><label for="updateStatus">Status</label><select id="updateStatus" name="status">${STATUSES.map(s => `<option ${report.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="form-field"><label for="updateDepartment">Assigned unit</label><select id="updateDepartment" name="department">${DEPARTMENTS.map(d => `<option ${report.department === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div><div class="form-field full"><label for="updateNote">Public update note</label><textarea id="updateNote" name="note" maxlength="500" placeholder="Add a short status note (optional)."></textarea></div></div><div class="form-bottom"><small>Changes are stored in this prototype’s demo data and added to the report timeline.</small><button class="btn btn-dark" type="submit" id="saveUpdateButton">Save status update</button></div></form></div></div></section></div>`;
    if (window.L) initDetailMap(report);
  }
  async function updateReport(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const id = form.dataset.reportId;
    const button = $('#saveUpdateButton');
    button.disabled = true; button.textContent = 'Saving…';
    try {
      await api(`/api/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status: $('#updateStatus').value, department: $('#updateDepartment').value, note: $('#updateNote').value.trim() }) });
      $('#modalHost').innerHTML = '';
      await loadData();
      showToast('Status updated.', `${id} was updated in the local demo.`);
      openReportDetail(id);
    } catch (error) {
      showToast('Could not update status.', error.message, 'error');
      button.disabled = false; button.textContent = 'Save status update';
    }
  }
  function closeModal() {
    $('#modalHost').innerHTML = '';
    state.currentDetail = null;
    if (state.detailMapInstance) { try { state.detailMapInstance.remove(); } catch {} state.detailMapInstance = null; }
  }
  async function resetDemo() {
    const confirmed = window.confirm('Restore the original fictional sample reports? Any reports saved in this local demo will be removed. Export first if you need to keep them.');
    if (!confirmed) return;
    try { await api('/api/demo/reset', { method: 'POST', body: '{}' }); state.page = 'dashboard'; state.search = ''; state.statusFilter = 'All'; state.categoryFilter = 'All'; await loadData(); showToast('Sample dataset restored.', 'All entries are fictional prototype records.'); }
    catch (error) { showToast('Could not reset demo data.', error.message, 'error'); }
  }
  function exportData() { window.location.href = '/api/export'; }
  function setPage(page) {
    if (!['dashboard', 'reports', 'map', 'insights', 'settings'].includes(page)) return;
    state.page = page;
    $('#sidebar').classList.remove('open'); $('#mobileScrim').classList.remove('show');
    renderPage();
    if (page === 'reports') $('#reportSearch')?.focus();
  }
  function applyReportFilters() {
    const rows = filteredReports();
    const body = $('#reportTableBody');
    if (body) body.innerHTML = rows.map(reportTableRow).join('') || `<tr><td colspan="8"><div class="empty-state"><strong>No matching reports</strong>Try another search or submit a new concern.</div></td></tr>`;
    const count = $('#reportCountText');
    if (count) count.textContent = `Showing ${rows.length} of ${state.reports.length} reports`;
  }

  function showAdminLock(message = '') {
    const lock = $('#adminLock');
    if (lock) lock.classList.remove('hidden');
    const msg = $('#adminLockMessage');
    if (msg) msg.textContent = message;
    const input = $('#adminPasswordInput');
    if (input) { input.value = ''; input.focus(); }
  }
  async function startAdmin() {
    try {
      const session = await api('/api/admin/session');
      if (!session.configured) {
        showAdminLock('Authority password is not configured on this server. For local use, add PILAR360_ADMIN_PASSWORD to your .env file.');
        return;
      }
      if (!session.authenticated) { showAdminLock(); return; }
      state.authenticated = true;
      $('#adminLock')?.classList.add('hidden');
      await loadData();
    } catch (error) { showAdminLock(`Could not check authority access: ${error.message}`); }
  }
  async function loginAdmin(event) {
    event.preventDefault();
    const button = $('#adminLoginButton');
    const password = $('#adminPasswordInput').value;
    button.disabled = true; button.textContent = 'Checking password…';
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      state.authenticated = true;
      $('#adminLock').classList.add('hidden');
      await loadData();
      showToast('Authority workspace unlocked.', 'This is a demonstration session.');
    } catch (error) { showAdminLock(error.message); }
    finally { button.disabled = false; button.textContent = 'Unlock authority workspace →'; }
  }
  async function logoutAdmin() {
    const confirmed = window.confirm('Sign out of the authority workspace? Your current session will end.\n\nOK = Yes, sign out\nCancel = No, stay here.');
    if (!confirmed) return;
    try {
      await api('/api/admin/logout', { method: 'POST', body: '{}' });
      state.authenticated = false; state.reports = []; state.stats = null; state.currentDetail = null; destroyMaps();
      window.location.replace('/report');
    } catch (error) {
      showToast('Could not end the authority session.', error.message + ' Please try signing out again.', 'error');
    }
  }

  document.addEventListener('click', event => {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) { event.preventDefault(); setPage(pageButton.dataset.page); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'logout') { logoutAdmin(); return; }
    if (action === 'close-modal') { closeModal(); return; }
    if (action === 'clear-filters') { state.search = ''; state.statusFilter = 'All'; state.categoryFilter = 'All'; renderReports(); return; }
    if (action === 'export') { exportData(); return; }
    if (action === 'reset-demo') { resetDemo(); return; }
    const reportRowElement = event.target.closest('[data-open-report]');
    if (reportRowElement) { openReportDetail(reportRowElement.dataset.openReport); return; }
    if (event.target.classList.contains('modal-backdrop')) closeModal();
  });
  document.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-open-report]')) { event.preventDefault(); openReportDetail(event.target.dataset.openReport); }
    if (event.key === 'Escape') { closeModal(); $('#sidebar').classList.remove('open'); $('#mobileScrim').classList.remove('show'); }
  });
  document.addEventListener('submit', event => {
    if (event.target.id === 'adminLoginForm') loginAdmin(event);
    if (event.target.id === 'updateReportForm') updateReport(event);
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'statusFilter') { state.statusFilter = event.target.value; applyReportFilters(); }
    if (event.target.id === 'categoryFilter') { state.categoryFilter = event.target.value; applyReportFilters(); }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'reportSearch') { state.search = event.target.value; applyReportFilters(); }
  });
  $('#globalSearch').addEventListener('keydown', event => {
    if (event.key === 'Enter') { state.search = event.currentTarget.value.trim(); state.statusFilter = 'All'; state.categoryFilter = 'All'; setPage('reports'); }
  });
  $('#mobileMenu').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#mobileScrim').classList.add('show'); });
  $('#mobileScrim').addEventListener('click', () => { $('#sidebar').classList.remove('open'); $('#mobileScrim').classList.remove('show'); });
  window.addEventListener('pilar360:open-report', event => openReportDetail(event.detail));
  window.addEventListener('resize', () => state.mapInstances.forEach(map => { try { map.invalidateSize(true); } catch {} }));

  startAdmin();
  loadMapLibrary();
})();
