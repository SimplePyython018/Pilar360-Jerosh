'use strict';

/* Pilar 360 frontend — vanilla JavaScript, no build process, demo API only. */
(() => {
  const state = { page: 'dashboard', reports: [], stats: null, search: '', statusFilter: 'All', categoryFilter: 'All', approvedQueueIds: new Set(), mapInstances: [], detailMapInstance: null, currentDetail: null, authenticated: false, detailRequestToken: 0, openingReportId: null, mapLoadScheduled: false };
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
  const STATUS_CLASS = { 'Submitted': 'status-submitted', 'Under Review': 'status-review', 'Approved': 'status-approved', 'Assigned': 'status-assigned', 'In Progress': 'status-progress', 'Resolved': 'status-resolved', 'Closed': 'status-closed' };
  const STATUSES = ['Submitted', 'Under Review', 'Approved', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
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
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
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
      else if (state.authenticated && state.page === 'map') renderPage();
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
      const workspace = await api('/api/workspace');
      state.reports = Array.isArray(workspace.reports) ? workspace.reports : [];
      state.stats = workspace.stats || null;
      $('#navReportCount').textContent = String(state.reports.length);
      $('#navApprovedCount').textContent = String(state.reports.filter(isInApprovalQueue).length);
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
    return `<article class="report-row" data-open-report="${escapeHtml(report.id)}" tabindex="0" role="button" aria-label="Open report ${escapeHtml(report.title)}"><div class="report-row-main-wrap">${categoryIcon(report.category)}<div class="report-row-main"><div class="report-row-title">${escapeHtml(report.title)}</div><div class="report-row-meta">${escapeHtml(report.id)} · Brgy. ${escapeHtml(report.barangay || 'Not specified')} · ${relativeTime(report.createdAt)}</div></div>${statusPill(report.status)}</div><span class="report-row-open">View details <span aria-hidden="true">→</span></span></article>`;
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
    const approved = state.reports.filter(r => r.status === 'Approved').length;
    const queued = state.reports.filter(isInApprovalQueue).length;
    const heading = pageHeading('AUTHORITY WORKSPACE · BARANGAY MARIFOSQUE', 'Community overview', 'A clear workspace for reviewing reports, updating ticket status, and checking community concerns.', '<a class="btn btn-ghost" href="/report">Open public portal ↗</a>');
    const statusRows = STATUSES.map(status => ({ status, count: state.reports.filter(r => r.status === status).length }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
    const maxStatus = Math.max(1, ...statusRows.map(item => item.count));
    $('#pageContent').innerHTML = `${heading}
      <section class="overview-banner">
        <div class="overview-banner-copy"><span class="overview-kicker"><i></i> PILAR360 · LOCAL DEMO</span><h2>Every report deserves a clear update.</h2><p>Review what residents submitted, record the latest status, and let ticket holders follow progress through their report ID.</p><div class="overview-banner-actions"><button class="btn btn-primary" data-page="reports">Open report inbox <span aria-hidden="true">→</span></button><button class="btn btn-light-outline" data-page="map">View issue map</button></div></div>
        <div class="overview-queue-tile"><span>Approved this session</span><strong>${queued}</strong><small>${approved} report${approved === 1 ? '' : 's'} currently marked Approved</small><button type="button" data-page="approvals">Open approved queue ↗</button></div>
      </section>
      <section class="stats-grid" aria-label="Report statistics">${statCard('All reports', stats.total, 'Saved demo records', '▤', '', 'TOTAL')}${statCard('Open concerns', stats.active, 'Not yet resolved or closed', '◷', 'orange', stats.active ? 'ACTIVE' : 'CLEAR')}${statCard('Approved', approved, 'Current saved status', '✓', 'blue', approved ? 'APPROVED' : 'NONE')}${statCard('Urgent priorities', urgent, 'Needs prompt assessment', '⚑', 'purple', urgent ? 'REVIEW' : 'NONE')}</section>
      <section class="overview-lower-grid"><article class="panel"><div class="panel-header"><div><h3 class="panel-title">Latest report activity</h3><p class="panel-subtitle">The newest submissions in this workspace</p></div><button class="text-action" data-page="reports">View all reports ↗</button></div><div class="recent-list">${latest.length ? latest.map(r => reportRow(r)).join('') : `<div class="empty-state"><strong>No reports yet</strong>Submit a demo report through the public portal to get started.</div>`}</div><div class="panel-footer"><span>Sorted by latest submission</span><span>${state.reports.length} records</span></div></article>
      <div class="overview-side-stack"><article class="panel overview-status-panel"><div class="panel-header"><div><h3 class="panel-title">Status snapshot</h3><p class="panel-subtitle">Current workflow distribution</p></div><button class="text-action" data-page="insights">Insights ↗</button></div><div class="overview-status-list">${statusRows.map(item => `<div class="overview-status-row"><div><span>${escapeHtml(item.status)}</span><strong>${item.count}</strong></div><div class="overview-status-track"><i style="width:${Math.round(item.count / maxStatus * 100)}%"></i></div></div>`).join('') || `<div class="empty-state">No status data yet.</div>`}</div></article>
      <article class="panel overview-shortcuts"><div class="panel-header"><div><h3 class="panel-title">Quick navigation</h3><p class="panel-subtitle">Go directly to a workspace section</p></div></div><button type="button" data-page="approvals"><span class="shortcut-icon">✓</span><span><strong>Approved queue</strong><small>${queued} temporary item${queued === 1 ? '' : 's'} in this session</small></span><b>→</b></button><button type="button" data-page="map"><span class="shortcut-icon">⌖</span><span><strong>Community map</strong><small>View submitted location pins</small></span><b>→</b></button><button type="button" data-page="settings"><span class="shortcut-icon">⚙</span><span><strong>Workspace settings</strong><small>Project and demo data information</small></span><b>→</b></button></article></div></section>`;
  }
  function isInApprovalQueue(report) {
    if (report.status !== 'Approved' || !state.approvedQueueIds.has(report.id)) return false;
    const expiry = new Date(report.approvalExpiresAt || new Date(new Date(report.approvedAt || report.updatedAt).getTime() + 24 * 60 * 60 * 1000));
    return Number.isFinite(expiry.getTime()) && expiry.getTime() > Date.now();
  }
  function approvalTimeLeft(report) {
    const expiry = new Date(report.approvalExpiresAt || new Date(new Date(report.approvedAt || report.updatedAt).getTime() + 24 * 60 * 60 * 1000));
    const remaining = Math.max(0, expiry.getTime() - Date.now());
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    return `${hours}h ${minutes}m left in queue`;
  }
  function filteredReports() {
    const q = state.search.trim().toLowerCase();
    return [...state.reports].filter(r => {
      const matchesStatus = state.statusFilter === 'All'
        || (state.statusFilter === 'Open' ? !['Resolved', 'Closed'].includes(r.status) : state.statusFilter === 'Approved Queue' ? isInApprovalQueue(r) : r.status === state.statusFilter);
      const matchesCategory = state.categoryFilter === 'All' || r.category === state.categoryFilter;
      const matchesSearch = !q || [r.id, r.title, r.description, r.category, r.barangay, r.address, r.department, r.reporter].some(value => String(value || '').toLowerCase().includes(q));
      return matchesStatus && matchesCategory && matchesSearch;
    }).sort(byNewest);
  }
  function reportCard(report) {
    const location = [report.barangay ? `Brgy. ${report.barangay}` : '', report.address || 'Landmark not provided'].filter(Boolean).join(' · ');
    const approvalExpiry = state.statusFilter === 'Approved Queue' && isInApprovalQueue(report) ? `<small class="approval-expiry">${approvalTimeLeft(report)}</small>` : '';
    return `<article class="inbox-card" data-open-report="${escapeHtml(report.id)}" tabindex="0" role="button" aria-label="Open report ${escapeHtml(report.title)}">
      <div class="inbox-card-top">${categoryIcon(report.category)}<div class="inbox-card-heading"><strong>${escapeHtml(report.title)}</strong><small>${escapeHtml(report.id)} · ${relativeTime(report.createdAt)}</small>${approvalExpiry}</div>${statusPill(report.status)}</div>
      <div class="inbox-card-info"><span><b>Reporter</b>${escapeHtml(report.reporter || 'Not provided')}</span><span><b>Location</b>${escapeHtml(location || 'Not provided')}</span><span><b>Assigned unit</b>${escapeHtml(report.department || 'Unassigned')}</span></div>
      <div class="inbox-card-bottom"><span class="priority ${escapeHtml(report.priority || 'Normal')}">${escapeHtml(report.priority || 'Normal')} priority</span><span class="btn btn-primary btn-sm">View report details <span aria-hidden="true">→</span></span></div>
    </article>`;
  }

  function renderApprovals() {
    const rows = state.reports.filter(isInApprovalQueue).sort((a, b) => new Date(b.approvedAt || b.updatedAt) - new Date(a.approvedAt || a.updatedAt));
    const heading = pageHeading('TEMPORARY AUTHORITY QUEUE', 'Approved tickets', 'Review ticket IDs marked Approved in this browser session. Their saved public status remains available after the temporary queue expires.', '<button class="btn btn-ghost" data-page="reports">All reports</button>');
    $('#pageContent').innerHTML = `${heading}
      <section class="approval-explainer"><div class="approval-explainer-icon">✓</div><div><strong>Approval is visible to reporters</strong><p>Approved ticket IDs and their current status appear in the public ticket directory and Check Report Status page. The quick-access queue clears after 24 hours or when the authority page is refreshed/reopened. The saved report record is not deleted.</p></div></section>
      <div class="inbox-summary"><strong>${rows.length} approved ticket${rows.length === 1 ? '' : 's'} in this queue</strong><span>Temporary queue · sorted by latest approval</span></div>
      <section class="inbox-grid" id="approvedCardList">${rows.map(reportCard).join('') || `<div class="empty-state inbox-empty"><strong>No approved tickets in this session</strong>Open an issue report, choose Approved, then save the status update.</div>`}</section>
      <div class="table-count">Only ticket ID, category and status are shown publicly. Private report details remain restricted.</div>`;
  }

  function renderReports() {
    const rows = filteredReports();
    const approvedQueueCount = state.reports.filter(isInApprovalQueue).length;
    const heading = pageHeading('AUTHORITY INBOX', 'Issue reports', 'Review incoming concerns, save a clear status, and follow every ticket ID.', '<a class="btn btn-ghost" href="/report">Public report portal ↗</a>');
    const queueHint = state.statusFilter === 'Approved Queue'
      ? 'This temporary queue clears after 24 hours or when the authority page is refreshed/reopened. The ticket status and history remain saved.'
      : 'The Approved queue is temporary: it clears after 24 hours or when the authority page is refreshed/reopened. Ticket history remains saved.';
    $('#pageContent').innerHTML = `${heading}
      <div class="approval-queue-strip"><div><strong>Approved queue</strong><span>Temporary list · clears after 24 hours or page refresh</span></div><b>${approvedQueueCount}</b><button type="button" class="btn btn-ghost btn-sm" data-filter-approved-queue>View approved tickets →</button></div>
      <div class="page-tools"><label class="input-wrap"><span>⌕</span><input id="reportSearch" type="search" value="${escapeHtml(state.search)}" placeholder="Search title, reporter, ID, location…"></label>
      <select class="filter-select" id="statusFilter" aria-label="Filter by status"><option value="All">All reports</option><option value="Open" ${state.statusFilter === 'Open' ? 'selected' : ''}>Open reports</option><option value="Approved Queue" ${state.statusFilter === 'Approved Queue' ? 'selected' : ''}>Approved queue · 24h</option>${STATUSES.map(status => `<option value="${status}" ${state.statusFilter === status ? 'selected' : ''}>${status} · history</option>`).join('')}</select>
      <select class="filter-select" id="categoryFilter" aria-label="Filter by category"><option>All</option>${CATEGORIES.map(category => `<option ${state.categoryFilter === category ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('')}</select><button class="btn btn-ghost" data-action="clear-filters">Reset filters</button></div>
      <div class="inbox-summary"><strong>${rows.length} report${rows.length === 1 ? '' : 's'}</strong><span>${state.statusFilter === 'Approved Queue' ? queueHint : 'Tap “View report details” to open a submission.'}</span></div>
      <section class="inbox-grid" id="reportCardList">${rows.map(reportCard).join('') || `<div class="empty-state inbox-empty"><strong>No matching reports</strong>Try another search or submit a new concern.</div>`}</section>
      <div class="table-count" id="reportCountText">Showing ${rows.length} of ${state.reports.length} reports · Prototype records only</div>`;
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
    $('#pageContent').innerHTML = `${pageHeading('PROJECT INFORMATION', 'Workspace & settings', 'Manage this local prototype, review the technical boundaries, and restore the original sample records.', '<button class="btn btn-ghost" data-action="export"><span class="btn-icon">↓</span> Export data</button>')}<section class="settings-grid"><article class="setting-card"><h3>Project identity</h3><p>Pilar 360 is an independent civic reporting prototype designed and built by Jerosh. It is not an official application of the Municipality of Pilar.</p><div class="setting-line"><span>Project</span><strong>Pilar 360</strong></div><div class="setting-line"><span>Builder</span><strong>Jerosh</strong></div><div class="setting-line"><span>Version</span><strong>2.5.0-demo</strong></div><div class="setting-line"><span>Runtime</span><strong>Node.js · native modules</strong></div><div class="setting-line"><span>Storage</span><strong>Local JSON database</strong></div></article><article class="setting-card"><h3>Demo data controls</h3><p>Submitted reports are written to <code>data/reports.json</code>. Resetting replaces the dataset with fictional sample reports; export before resetting if you need to keep your local demo entries.</p><div class="setting-line"><span>Current report count</span><strong>${state.reports.length}</strong></div><div class="setting-line"><span>Demo photos</span><strong>Stored as data URLs</strong></div><div class="setting-line"><span>Real LGU integration</span><strong>Not connected</strong></div><button class="btn btn-dark" data-action="reset-demo">↻ Restore sample dataset</button><div class="warning-note">Reset is permanent for the local demo file. Export your data first if you want to preserve it.</div></article><article class="setting-card"><h3>Privacy & deployment notes</h3><p>Use only for an approved classroom demonstration. Hosted access and HTTPS depend on the configured hosting provider.</p><div class="setting-line"><span>Authentication</span><strong>Protected demo sign-in</strong></div><div class="setting-line"><span>HTTPS / TLS</span><strong>Hosting dependent</strong></div><div class="setting-line"><span>Official case numbers</span><strong>Not issued</strong></div><div class="setting-line"><span>Emergency dispatch</span><strong>Not supported</strong></div></article><article class="setting-card"><h3>Production readiness checklist</h3><p>Before any real community use, the prototype needs a trusted LGU partner and a secured production architecture.</p>${['Municipality approval and official ownership','Authenticated citizen and staff accounts','Role-based permissions and audit logs','Secure file storage and backup policy','Privacy notice and data-retention rules','Verified map/geocoding and department routing','Monitoring, rate limiting and abuse prevention'].map(item => `<div class="setting-line"><span>${escapeHtml(item)}</span><strong style="color:#c87551">Not yet</strong></div>`).join('')}</article></section>`;
  }
  function destroyMaps() {
    for (const map of state.mapInstances) { try { map.remove(); } catch {} }
    state.mapInstances = [];
    if (state.detailMapInstance) { try { state.detailMapInstance.remove(); } catch {} state.detailMapInstance = null; }
  }
  function renderPage() {
    destroyMaps();
    $$('.nav-item, .mobile-bottom-nav [data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === state.page));
    const labels = { dashboard: 'Overview', reports: 'Issue reports', approvals: 'Approved queue', map: 'Community map', insights: 'Insights', settings: 'Workspace' };
    $('#crumbCurrent').textContent = labels[state.page] || 'Overview';
    $('#yearNow').textContent = new Date().getFullYear();
    if (state.page === 'dashboard') renderDashboard();
    else if (state.page === 'reports') renderReports();
    else if (state.page === 'approvals') renderApprovals();
    else if (state.page === 'map') renderMapPage();
    else if (state.page === 'insights') renderInsights();
    else renderSettings();
    scheduleMapLibrary();
  }
  function scheduleMapLibrary() {
    if (state.mapLoadScheduled || window.L || !state.authenticated) return;
    if (state.page !== 'map' && !state.currentDetail) return;
    state.mapLoadScheduled = true;
    const run = () => {
      state.mapLoadScheduled = false;
      if (state.authenticated && (state.page === 'map' || state.currentDetail)) loadMapLibrary();
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2200 });
    else window.setTimeout(run, 900);
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
  function photoEvidence(report) {
    if (report.photoData) return `<figure class="evidence-photo"><img src="${report.photoData}" alt="Photo evidence submitted with ${escapeHtml(report.id)}" loading="lazy"><figcaption>Photo submitted by the reporter</figcaption></figure>`;
    const meta = CATEGORY_META[report.category] || CATEGORY_META.Other;
    return `<div class="evidence-placeholder" role="img" aria-label="No photo was attached to this report"><span>${meta.icon}</span><div><strong>No photo attached</strong><small>The reporter did not upload photo evidence for this submission.</small></div></div>`;
  }
  function showDetailLoading(id) {
    $('#modalHost').innerHTML = `<div class="modal-backdrop" data-dismiss-modal><section class="modal detail-loading" role="dialog" aria-modal="true" aria-label="Opening report"><div class="loader"></div><strong>Opening report ${escapeHtml(id)}…</strong><p>Loading report details.</p><button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button></section></div>`;
  }
  function renderReportDetail(report) {
    state.currentDetail = report;
    const host = $('#modalHost');
    const timeline = [...(report.timeline || [])].sort((a,b) => new Date(a.at) - new Date(b.at));
    const imageHtml = photoEvidence(report);
    const mapSection = hasCoordinates(report)
      ? `<section class="detail-map-card"><div class="detail-map-heading"><div><strong>Reported map location</strong><small>Pin based on the coordinates entered by the reporter.</small></div><a href="https://www.openstreetmap.org/?mlat=${encodeURIComponent(report.lat)}&mlon=${encodeURIComponent(report.lng)}#map=17/${encodeURIComponent(report.lat)}/${encodeURIComponent(report.lng)}" target="_blank" rel="noopener noreferrer">Open larger map ↗</a></div><div class="detail-map-wrap"><div id="reportDetailMap" class="detail-map"></div><div id="detailMapFallback" class="detail-map-fallback hidden">Map tiles could not load. The location coordinates are still available below. Open the larger map link to view the pin.</div></div><div class="detail-map-coordinates">${escapeHtml(report.lat)}, ${escapeHtml(report.lng)} · ${escapeHtml(report.address || report.barangay || 'No landmark provided')}</div></section>`
      : `<section class="detail-map-card"><div class="detail-map-heading"><div><strong>Reported map location</strong><small>No map pin was attached to this report.</small></div></div><div class="detail-map-empty"><span class="empty-map-icon">⌖</span><strong>${escapeHtml(report.address || 'No nearby street or landmark was provided.')}</strong><span>There are no coordinates to place on the map. The reporter can still be identified by the landmark they entered.</span></div></section>`;
    const authorityEditor = `<div class="admin-editor admin-editor-priority"><div class="editor-title-row"><div><span class="editor-kicker">AUTHORITY ACTION</span><h4>Update ticket status</h4></div><span class="editor-session">Signed-in session</span></div><p class="status-control-hint">Save a new status to update the report timeline and public ticket tracker. Choosing Approved also adds this ticket to the temporary 24-hour queue.</p><form id="updateReportForm" data-report-id="${escapeHtml(report.id)}"><div class="form-grid"><div class="form-field"><label for="updateStatus">New status</label><select id="updateStatus" name="status">${STATUSES.map(status => `<option ${report.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div><div class="form-field"><label for="updateDepartment">Assigned unit</label><select id="updateDepartment" name="department">${DEPARTMENTS.map(department => `<option ${report.department === department ? 'selected' : ''}>${department}</option>`).join('')}</select></div><div class="form-field full"><label for="updateNote">Internal note <span class="optional-label">Optional</span></label><textarea id="updateNote" name="note" maxlength="500" placeholder="Add an internal note for the authority record."></textarea></div></div><div class="form-bottom"><small>Saved records stay in the demo history. Public users can see ticket ID and status only.</small><button class="btn btn-dark" type="submit" id="saveUpdateButton">Save status</button></div></form></div>`;
    host.innerHTML = `<div class="modal-backdrop" data-dismiss-modal><section class="modal modal-small" role="dialog" aria-modal="true" aria-labelledby="detailTitle"><div class="modal-head"><div><div class="eyebrow">REPORT DETAIL · ${escapeHtml(report.id)}</div><h2 id="detailTitle">Report overview</h2><p>Review the submission, update its status, and follow the ticket history.</p></div><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body"><div class="detail-hero">${categoryIcon(report.category)}<div><h3>${escapeHtml(report.title)}</h3><small>Submitted ${formatDate(report.createdAt, { hour: 'numeric', minute: '2-digit' })} · ${escapeHtml(report.reporter || 'Community member')}</small></div></div><div class="detail-tags">${statusPill(report.status)}<span class="priority ${escapeHtml(report.priority || 'Normal')}">${escapeHtml(report.priority || 'Normal')} priority</span></div>${authorityEditor}<p class="detail-description">${escapeHtml(report.description)}</p>${imageHtml}<div class="detail-grid"><div class="detail-field"><small>Submitted by</small><strong>${escapeHtml(report.reporter || 'Not provided')}</strong></div><div class="detail-field"><small>Contact number · authority only</small><strong>${report.phone ? `<a href="tel:${escapeHtml(report.phone)}">${escapeHtml(report.phone)}</a>` : (report.phoneProtected ? 'Unavailable — check the server encryption key' : 'Not provided')}</strong></div><div class="detail-field"><small>Category</small><strong>${escapeHtml(report.category)}</strong></div><div class="detail-field"><small>Barangay</small><strong>${escapeHtml(report.barangay || 'Not specified')}</strong></div><div class="detail-field"><small>Location / landmark</small><strong>${escapeHtml(report.address || 'No landmark provided')}</strong></div><div class="detail-field"><small>Assigned unit</small><strong>${escapeHtml(report.department || 'Unassigned')}</strong></div><div class="detail-field"><small>Coordinates</small><strong>${hasCoordinates(report) ? `${escapeHtml(report.lat)}, ${escapeHtml(report.lng)}` : 'Not provided'}</strong></div><div class="detail-field"><small>Last updated</small><strong>${formatDate(report.updatedAt, { hour: 'numeric', minute: '2-digit' })}</strong></div></div>${mapSection}<div class="timeline"><h4>Activity timeline</h4>${timeline.length ? timeline.map(item => `<div class="timeline-item"><div class="timeline-dot"></div><div><strong>${escapeHtml(item.status)}</strong><p>${escapeHtml(item.note || 'Status update recorded.')}</p><time>${formatDate(item.at, { hour: 'numeric', minute: '2-digit' })}</time></div></div>`).join('') : `<div class="empty-state">No activity recorded.</div>`}</div></div></section></div>`;
    if (window.L && hasCoordinates(report)) initDetailMap(report);
    else if (!hasCoordinates(report)) $('#detailMapFallback')?.classList.add('hidden');
    else scheduleMapLibrary();
  }
  async function openReportDetail(id) {
    if (!id || !state.authenticated) return;
    if (state.openingReportId === id) return;
    const token = ++state.detailRequestToken;
    state.openingReportId = id;
    showDetailLoading(id);
    try {
      const data = await api(`/api/reports/${encodeURIComponent(id)}`);
      if (token !== state.detailRequestToken || !state.authenticated) return;
      if (!data.report) throw new Error('The report record was not returned by the server.');
      renderReportDetail(data.report);
    } catch (error) {
      if (token !== state.detailRequestToken) return;
      $('#modalHost').innerHTML = `<div class="modal-backdrop" data-dismiss-modal><section class="modal detail-error" role="alertdialog" aria-modal="true"><h2>Could not open report</h2><p>${escapeHtml(error.message)}</p><div class="detail-error-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Close</button><button type="button" class="btn btn-primary" data-retry-report="${escapeHtml(id)}">Try again</button></div></section></div>`;
    } finally {
      if (token === state.detailRequestToken) state.openingReportId = null;
    }
  }
  function closeDetailMapOnly() {
    if (state.detailMapInstance) { try { state.detailMapInstance.remove(); } catch {} state.detailMapInstance = null; }
  }
  async function updateReport(event) {
    event.preventDefault();
    // This submit handler is delegated from document, so event.target is the form.
    const form = event.target;
    const id = form?.dataset?.reportId;
    const button = form.querySelector('#saveUpdateButton');
    const statusField = form.querySelector('#updateStatus');
    const departmentField = form.querySelector('#updateDepartment');
    const noteField = form.querySelector('#updateNote');
    if (!id || !statusField || !departmentField || !button) {
      showToast('Status form is incomplete.', 'Close this detail and open the report again.', 'error');
      return;
    }
    const nextStatus = statusField.value;
    const previousLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving…';
    try {
      const result = await api(`/api/reports/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, department: departmentField.value, note: noteField?.value.trim() || '' })
      });
      if (!result.report || result.report.id !== id || result.report.status !== nextStatus) {
        throw new Error('The server response did not confirm the requested status. Please reload and check the ticket.');
      }
      if (result.report.status === 'Approved') state.approvedQueueIds.add(id);
      else state.approvedQueueIds.delete(id);
      const index = state.reports.findIndex(item => item.id === id);
      if (index >= 0) state.reports[index] = { ...state.reports[index], status: result.report.status, department: result.report.department, updatedAt: result.report.updatedAt, approvedAt: result.report.approvedAt, approvalExpiresAt: result.report.approvalExpiresAt };
      // Refresh aggregate counts separately; a stats refresh must not undo a successful save.
      try { state.stats = await api('/api/stats'); } catch (statsError) { console.warn('Stats refresh failed after a successful status update:', statsError); }
      $('#navApprovedCount').textContent = String(state.reports.filter(isInApprovalQueue).length);
      if (['reports', 'approvals'].includes(state.page)) renderPage();
      renderReportDetail(result.report);
      const smsDetail = result.sms === 'pending' ? 'SMS request is processing separately and does not delay saving.'
        : result.sms === 'not_configured' ? 'SMS is not configured on this server.'
        : result.sms === 'failed' ? 'The report was saved, but the SMS provider did not accept the message.'
        : result.sms === 'not_requested' ? 'No SMS was requested for this ticket.'
        : 'Status notification updated.';
      showToast('Status saved successfully.', `${id} is now ${result.report.status}. ${smsDetail}`);
    } catch (error) {
      showToast('Could not update status.', error.message, 'error');
      button.disabled = false;
      button.textContent = previousLabel || 'Save status';
    }
  }
  function closeModal() {
    state.detailRequestToken += 1;
    state.openingReportId = null;
    $('#modalHost').innerHTML = '';
    state.currentDetail = null;
    closeDetailMapOnly();
  }
  async function resetDemo() {
    const confirmed = window.confirm('Restore the original fictional sample reports? Any reports saved in this local demo will be removed. Export first if you need to keep them.');
    if (!confirmed) return;
    try { await api('/api/demo/reset', { method: 'POST', body: '{}' }); state.page = 'dashboard'; state.search = ''; state.statusFilter = 'All'; state.categoryFilter = 'All'; await loadData(); showToast('Sample dataset restored.', 'All entries are fictional prototype records.'); }
    catch (error) { showToast('Could not reset demo data.', error.message, 'error'); }
  }
  function exportData() { window.location.href = '/api/export'; }
  function setPage(page) {
    if (!['dashboard', 'reports', 'approvals', 'map', 'insights', 'settings'].includes(page)) return;
    state.page = page;
    $('#sidebar').classList.remove('open'); $('#mobileScrim').classList.remove('show');
    renderPage();
    if (page === 'reports') $('#reportSearch')?.focus();
  }
  function applyReportFilters() {
    const rows = filteredReports();
    const list = $('#reportCardList');
    if (list) list.innerHTML = rows.map(reportCard).join('') || `<div class="empty-state inbox-empty"><strong>No matching reports</strong>Try another search or submit a new concern.</div>`;
    const count = $('#reportCountText');
    if (count) count.textContent = `Showing ${rows.length} of ${state.reports.length} reports · Prototype records only`;
    const summary = $('.inbox-summary strong');
    if (summary) summary.textContent = `${rows.length} report${rows.length === 1 ? '' : 's'}`;
    const summaryHint = $('.inbox-summary span');
    if (summaryHint) summaryHint.textContent = state.statusFilter === 'Approved Queue'
      ? 'Approved tickets leave this quick-access queue after 24 hours; their ticket history remains saved.'
      : 'Tap “View report details” to open a submission.';
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
  function askLogout() {
    $('#modalHost').innerHTML = `<div class="modal-backdrop" data-dismiss-modal><section class="modal logout-confirm" role="alertdialog" aria-modal="true" aria-labelledby="logoutTitle"><div class="logout-symbol">↪</div><h2 id="logoutTitle">Sign out of authority?</h2><p>Your authority session will end. You will return to the public report page. Reports already saved in the demo will remain in the current server data file.</p><div class="detail-error-actions"><button type="button" class="btn btn-ghost" data-action="cancel-logout">No, stay here</button><button type="button" class="btn btn-dark" data-action="confirm-logout">Yes, sign out</button></div></section></div>`;
    $('[data-action="cancel-logout"]')?.focus();
  }
  async function logoutAdmin() {
    try {
      await api('/api/admin/logout', { method: 'POST', body: JSON.stringify({}) });
      state.authenticated = false; state.reports = []; state.stats = null; state.currentDetail = null; state.approvedQueueIds.clear(); destroyMaps();
      window.location.replace('/report?signedOut=1');
    } catch (error) {
      showToast('Could not end the authority session.', error.message + ' Please try signing out again.', 'error');
      closeModal();
    }
  }

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return;
    const reportTrigger = target.closest('[data-open-report]');
    if (reportTrigger) {
      event.preventDefault();
      const id = reportTrigger.dataset.openReport;
      if (id) openReportDetail(id);
      return;
    }
    const retryTrigger = target.closest('[data-retry-report]');
    if (retryTrigger) { event.preventDefault(); openReportDetail(retryTrigger.dataset.retryReport); return; }
    const pageButton = target.closest('[data-page]');
    if (pageButton) { event.preventDefault(); setPage(pageButton.dataset.page); return; }
    const action = target.closest('[data-action]')?.dataset.action;
    if (action === 'logout') { askLogout(); return; }
    if (action === 'confirm-logout') { logoutAdmin(); return; }
    if (action === 'cancel-logout') { closeModal(); return; }
    if (action === 'close-modal') { closeModal(); return; }
    if (action === 'clear-filters') { state.search = ''; state.statusFilter = 'All'; state.categoryFilter = 'All'; renderReports(); return; }
    if (target.closest('[data-filter-approved-queue]')) { state.search = ''; state.statusFilter = 'Approved Queue'; state.categoryFilter = 'All'; renderReports(); return; }
    if (action === 'export') { exportData(); return; }
    if (action === 'reset-demo') { resetDemo(); return; }
    if (target.classList.contains('modal-backdrop')) closeModal();
  }, true);
  document.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof Element && event.target.matches('[data-open-report]')) { event.preventDefault(); openReportDetail(event.target.dataset.openReport); }
    if (event.key === 'Escape') { closeModal(); $('#sidebar').classList.remove('open'); $('#mobileScrim').classList.remove('show'); }
  });
  document.addEventListener('submit', event => {
    if (event.target.id === 'adminLoginForm') loginAdmin(event);
    if (event.target.id === 'updateReportForm') void updateReport(event);
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
  window.setInterval(() => {
    if (!state.authenticated) return;
    state.approvedQueueIds = new Set([...state.approvedQueueIds].filter(id => {
      const report = state.reports.find(item => item.id === id);
      return report && isInApprovalQueue(report);
    }));
    $('#navApprovedCount').textContent = String(state.reports.filter(isInApprovalQueue).length);
    if (state.page === 'approvals') renderApprovals();
    else if (state.page === 'reports' && state.statusFilter === 'Approved Queue') renderReports();
  }, 60000);
})();
