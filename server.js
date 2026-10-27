'use strict';

/**
 * Pilar 360 — citizen issue reporting demo
 * Built by Jerosh. Uses Node.js built-ins only (no npm install required).
 * DEMO ONLY: no government integration, user authentication, or official dispatch.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DEFAULT_DATA_FILE = path.join(ROOT, 'data', 'reports.json');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY_BYTES = 6 * 1024 * 1024;
const CATEGORIES = ['Road & Sidewalk', 'Waste & Cleanliness', 'Drainage & Flooding', 'Streetlight', 'Water & Utilities', 'Public Safety', 'Parks & Public Spaces', 'Other'];
const STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];

function isoHoursAgo(hours) { return new Date(Date.now() - hours * 3600000).toISOString(); }
function seedReports() {
  const samples = [
    { id: 'PIL-2026-0012', title: 'Pothole near the roadside', category: 'Road & Sidewalk', description: 'Demo sample: a pothole has formed near the road edge. Please inspect the area when possible.', barangay: 'Banuyo', address: 'Near the barangay hall', priority: 'High', status: 'In Progress', department: 'Municipal Engineering', lat: 12.9251, lng: 123.6740, createdAt: isoHoursAgo(5), updatedAt: isoHoursAgo(1), reporter: 'Sample Resident', source: 'demo', photoData: null, timeline: [{ status: 'Submitted', note: 'Sample report created for prototype preview.', at: isoHoursAgo(5) }, { status: 'Under Review', note: 'The demo team reviewed the report.', at: isoHoursAgo(4) }, { status: 'Assigned', note: 'Assigned to Municipal Engineering (demo).', at: isoHoursAgo(3) }, { status: 'In Progress', note: 'Sample status only; no real work order was created.', at: isoHoursAgo(1) }] },
    { id: 'PIL-2026-0011', title: 'Uncollected waste at collection point', category: 'Waste & Cleanliness', description: 'Demo sample: waste appears to have remained at the collection point after the expected pickup.', barangay: 'Marifosque', address: 'Near the public waiting shed', priority: 'Normal', status: 'Under Review', department: 'Municipal Environment', lat: 12.9217, lng: 123.6698, createdAt: isoHoursAgo(11), updatedAt: isoHoursAgo(3), reporter: 'Sample Resident', source: 'demo', photoData: null, timeline: [{ status: 'Submitted', note: 'Sample report created for prototype preview.', at: isoHoursAgo(11) }, { status: 'Under Review', note: 'Awaiting verification in this demo workflow.', at: isoHoursAgo(3) }] },
    { id: 'PIL-2026-0010', title: 'Streetlight appears not to work', category: 'Streetlight', description: 'Demo sample: the streetlight near this location does not appear to turn on at night.', barangay: 'Binanuahan', address: 'Along the main road', priority: 'High', status: 'Assigned', department: 'General Services', lat: 12.9291, lng: 123.6810, createdAt: isoHoursAgo(26), updatedAt: isoHoursAgo(7), reporter: 'Sample Resident', source: 'demo', photoData: null, timeline: [{ status: 'Submitted', note: 'Sample report created for prototype preview.', at: isoHoursAgo(26) }, { status: 'Under Review', note: 'Sample inspection requested.', at: isoHoursAgo(20) }, { status: 'Assigned', note: 'Assigned to General Services (demo).', at: isoHoursAgo(7) }] },
    { id: 'PIL-2026-0009', title: 'Blocked drainage after rainfall', category: 'Drainage & Flooding', description: 'Demo sample: leaves and debris may be obstructing a roadside drainage channel.', barangay: 'Banuyo', address: 'Near the covered court', priority: 'Urgent', status: 'Submitted', department: 'Unassigned', lat: 12.9276, lng: 123.6714, createdAt: isoHoursAgo(1), updatedAt: isoHoursAgo(1), reporter: 'Sample Resident', source: 'demo', photoData: null, timeline: [{ status: 'Submitted', note: 'Sample report created for prototype preview.', at: isoHoursAgo(1) }] },
    { id: 'PIL-2026-0008', title: 'Damaged sidewalk section', category: 'Road & Sidewalk', description: 'Demo sample: one sidewalk section appears uneven and may be difficult to pass.', barangay: 'Marifosque', address: 'Near a local store', priority: 'Low', status: 'Resolved', department: 'Municipal Engineering', lat: 12.9189, lng: 123.6761, createdAt: isoHoursAgo(80), updatedAt: isoHoursAgo(16), reporter: 'Sample Resident', source: 'demo', photoData: null, timeline: [{ status: 'Submitted', note: 'Sample report created for prototype preview.', at: isoHoursAgo(80) }, { status: 'Under Review', note: 'Sample report checked.', at: isoHoursAgo(70) }, { status: 'Resolved', note: 'Marked resolved for demo purposes only.', at: isoHoursAgo(16) }] },
    { id: 'PIL-2026-0007', title: 'Water pooling on roadside', category: 'Drainage & Flooding', description: 'Demo sample: water tends to collect beside the road after heavy rain.', barangay: 'Binanuahan', address: 'Near the footpath', priority: 'Normal', status: 'Closed', department: 'Municipal Engineering', lat: 12.9314, lng: 123.6782, createdAt: isoHoursAgo(140), updatedAt: isoHoursAgo(45), reporter: 'Sample Resident', source: 'demo', photoData: null, timeline: [{ status: 'Submitted', note: 'Sample report created for prototype preview.', at: isoHoursAgo(140) }, { status: 'Closed', note: 'Closed in sample dataset.', at: isoHoursAgo(45) }] }
  ];
  return samples;
}

function safeEqual(a, b) { return a === b; }
function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body is too large. Keep photos under 4 MB.'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(Object.assign(new Error('Request body must be valid JSON.'), { statusCode: 400 })); }
    });
    req.on('error', reject);
  });
}
function cleanString(value, max = 1000) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function validatePhoto(photoData) {
  if (photoData == null || photoData === '') return null;
  if (typeof photoData !== 'string' || photoData.length > 5_700_000) throw Object.assign(new Error('Photo is too large. Please use an image under 4 MB.'), { statusCode: 400 });
  if (!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(photoData)) throw Object.assign(new Error('Photo must be a PNG, JPG, or WebP image.'), { statusCode: 400 });
  return photoData;
}
function summarize(reports) {
  const isActive = r => !['Resolved', 'Closed'].includes(r.status);
  const active = reports.filter(isActive).length;
  const resolved = reports.filter(r => r.status === 'Resolved' || r.status === 'Closed').length;
  const urgent = reports.filter(r => r.priority === 'Urgent' && isActive(r)).length;
  const submittedToday = reports.filter(r => new Date(r.createdAt).toDateString() === new Date().toDateString()).length;
  return { total: reports.length, active, resolved, urgent, submittedToday, resolutionRate: reports.length ? Math.round((resolved / reports.length) * 100) : 0, categories: CATEGORIES.map(category => ({ category, count: reports.filter(r => r.category === category).length })), statuses: STATUSES.map(status => ({ status, count: reports.filter(r => r.status === status).length })) };
}
function createApp(options = {}) {
  const dataFile = options.dataFile || process.env.PILAR360_DATA_FILE || DEFAULT_DATA_FILE;
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify(seedReports(), null, 2));
  function readReports() {
    try {
      const value = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.error('[Pilar 360] Unable to read data file:', error.message);
      throw Object.assign(new Error('Report database could not be read. Check data/reports.json.'), { statusCode: 500 });
    }
  }
  function writeReports(reports) {
    const temp = `${dataFile}.${process.pid}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(reports, null, 2), { mode: 0o600 });
    fs.renameSync(temp, dataFile);
  }
  async function handler(req, res) {
    const url = new URL(req.url, 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    try {
      if (req.method === 'GET' && pathname === '/api/health') return sendJson(res, 200, { ok: true, app: 'Pilar 360', version: '1.0.0-demo', mode: 'prototype', now: new Date().toISOString() });
      if (req.method === 'GET' && pathname === '/api/reports') {
        let reports = readReports();
        const status = cleanString(url.searchParams.get('status'), 50);
        const category = cleanString(url.searchParams.get('category'), 80);
        const q = cleanString(url.searchParams.get('q'), 200).toLowerCase();
        if (status && status !== 'All') reports = reports.filter(r => r.status === status);
        if (category && category !== 'All') reports = reports.filter(r => r.category === category);
        if (q) reports = reports.filter(r => [r.id, r.title, r.description, r.barangay, r.address, r.category, r.department].some(v => String(v || '').toLowerCase().includes(q)));
        reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return sendJson(res, 200, { reports, count: reports.length });
      }
      if (req.method === 'GET' && pathname === '/api/stats') return sendJson(res, 200, summarize(readReports()));
      if (req.method === 'GET' && pathname === '/api/export') {
        const payload = JSON.stringify({ app: 'Pilar 360', exportType: 'DEMO_DATA', exportedAt: new Date().toISOString(), reports: readReports() }, null, 2);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="pilar360-demo-export.json"', 'Content-Length': Buffer.byteLength(payload), 'X-Content-Type-Options': 'nosniff' });
        return res.end(payload);
      }
      if (req.method === 'POST' && pathname === '/api/reports') {
        const body = await readBody(req);
        const title = cleanString(body.title, 120);
        const description = cleanString(body.description, 1600);
        const category = cleanString(body.category, 80);
        const barangay = cleanString(body.barangay, 100);
        const address = cleanString(body.address, 240);
        const priority = PRIORITIES.includes(body.priority) ? body.priority : 'Normal';
        if (title.length < 5) return sendJson(res, 422, { error: 'Please enter a clear title with at least 5 characters.' });
        if (description.length < 15) return sendJson(res, 422, { error: 'Please add a description with at least 15 characters.' });
        if (!CATEGORIES.includes(category)) return sendJson(res, 422, { error: 'Choose a valid report category.' });
        if (barangay.length < 2) return sendJson(res, 422, { error: 'Please select or enter a barangay.' });
        const lat = body.lat === '' || body.lat == null ? null : Number(body.lat);
        const lng = body.lng === '' || body.lng == null ? null : Number(body.lng);
        if ((lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) || (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180))) return sendJson(res, 422, { error: 'The map coordinates are invalid.' });
        const photoData = validatePhoto(body.photoData);
        const now = new Date().toISOString();
        const reports = readReports();
        const nextSequence = (reports.reduce((max, r) => Math.max(max, Number((String(r.id).match(/(\d+)$/) || [0, 0])[1])), 0) + 1).toString().padStart(4, '0');
        const report = { id: `PIL-${new Date().getFullYear()}-${nextSequence}`, title, category, description, barangay, address, priority, status: 'Submitted', department: 'Unassigned', lat, lng, createdAt: now, updatedAt: now, reporter: cleanString(body.reporter, 80) || 'Community Member', source: 'user-demo', photoData, timeline: [{ status: 'Submitted', note: 'Report received by the local demo server. This is not an official LGU submission.', at: now }] };
        reports.push(report);
        writeReports(reports);
        return sendJson(res, 201, { report, message: 'Demo report saved. This is a prototype only, not an official municipal submission.' });
      }
      const reportMatch = pathname.match(/^\/api\/reports\/([^/]+)$/);
      if (req.method === 'GET' && reportMatch) {
        const report = readReports().find(r => r.id === reportMatch[1]);
        return report ? sendJson(res, 200, { report }) : sendJson(res, 404, { error: 'Report not found.' });
      }
      if (req.method === 'PATCH' && reportMatch) {
        const body = await readBody(req);
        if (!STATUSES.includes(body.status)) return sendJson(res, 422, { error: 'Choose a valid status.' });
        const reports = readReports();
        const index = reports.findIndex(r => r.id === reportMatch[1]);
        if (index < 0) return sendJson(res, 404, { error: 'Report not found.' });
        const status = body.status;
        const department = cleanString(body.department, 100) || reports[index].department || 'Unassigned';
        const note = cleanString(body.note, 500) || `Status updated to ${status} in the demo admin console.`;
        const at = new Date().toISOString();
        reports[index] = { ...reports[index], status, department, updatedAt: at, timeline: [...(reports[index].timeline || []), { status, note, at }].slice(-30) };
        writeReports(reports);
        return sendJson(res, 200, { report: reports[index], message: 'Demo report updated.' });
      }
      if (req.method === 'POST' && pathname === '/api/demo/reset') {
        writeReports(seedReports());
        return sendJson(res, 200, { message: 'The sample dataset has been restored.', stats: summarize(readReports()) });
      }
      if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'API endpoint not found.' });
      if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed.' });
      const requested = pathname === '/' ? '/index.html' : pathname;
      const resolved = path.resolve(PUBLIC_DIR, `.${requested}`);
      if (!resolved.startsWith(`${PUBLIC_DIR}${path.sep}`) && resolved !== path.join(PUBLIC_DIR, 'index.html')) return sendJson(res, 403, { error: 'Forbidden.' });
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return sendJson(res, 404, { error: 'Page not found.' });
      const ext = path.extname(resolved).toLowerCase();
      const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon' };
      const file = fs.readFileSync(resolved);
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream', 'Content-Length': file.length, 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
      return req.method === 'HEAD' ? res.end() : res.end(file);
    } catch (error) {
      if (!res.headersSent) sendJson(res, error.statusCode || 500, { error: error.message || 'Unexpected server error.' });
      else res.destroy();
    }
  }
  return http.createServer((req, res) => {
    // Small, deliberate safety headers for this local prototype.
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'geolocation=(self)');
    res.setHeader('Content-Security-Policy', "default-src 'self' https://unpkg.com https://*.tile.openstreetmap.org; img-src 'self' data: https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline' https://unpkg.com; script-src 'self' https://unpkg.com; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    handler(req, res);
  });
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, HOST, () => {
    console.log(`\nPilar 360 is running: http://${HOST}:${PORT}`);
    console.log('Prototype only — reports are stored locally in data/reports.json.');
    console.log('Press Ctrl+C to stop.\n');
  });
  app.on('error', error => {
    console.error('[Pilar 360] Server error:', error.message);
    process.exitCode = 1;
  });
}
module.exports = { createApp, seedReports, summarize, CATEGORIES, STATUSES, PRIORITIES };
