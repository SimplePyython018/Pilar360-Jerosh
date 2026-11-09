'use strict';

/** Pilar360 — independent student demonstration prototype. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Optional local configuration; production hosts should use their Environment settings.
const localEnvPath = path.join(__dirname, '.env');
if (fs.existsSync(localEnvPath)) {
  for (const line of fs.readFileSync(localEnvPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
  }
}

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DEFAULT_DATA_FILE = path.join(ROOT, 'data', 'reports.json');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_BODY_BYTES = 6 * 1024 * 1024;
const CATEGORIES = ['Road & Sidewalk', 'Waste & Cleanliness', 'Drainage & Flooding', 'Streetlight', 'Water & Utilities', 'Public Safety', 'Parks & Public Spaces', 'Other'];
const STATUSES = ['Submitted', 'Under Review', 'Approved', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const SESSION_COOKIE = 'pilar360_authority';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function isoHoursAgo(hours) { return new Date(Date.now() - hours * 3600000).toISOString(); }
function seedReports() {
  const samples = [
    { id: 'PIL-2026-0012', title: 'Pothole near the roadside', category: 'Road & Sidewalk', description: 'Demo sample: a pothole has formed near the road edge. Please inspect the area when possible.', barangay: 'Marifosque', address: 'Near the barangay hall', priority: 'High', status: 'In Progress', department: 'Municipal Engineering', lat: 12.9251, lng: 123.6740, createdAt: isoHoursAgo(5), updatedAt: isoHoursAgo(1), reporter: 'Sample Resident', source: 'demo', photoData: null, timeline: [{ status: 'Submitted', note: 'Sample report created for prototype preview.', at: isoHoursAgo(5) }, { status: 'Under Review', note: 'The demo team reviewed the report.', at: isoHoursAgo(4) }, { status: 'Assigned', note: 'Assigned to Municipal Engineering (demo).', at: isoHoursAgo(3) }, { status: 'In Progress', note: 'Sample status only; no real work order was created.', at: isoHoursAgo(1) }] },
    { id: 'PIL-2026-0011', title: 'Uncollected waste at collection point', category: 'Waste & Cleanliness', description: 'Demo sample: waste appears to have remained at the collection point after the expected pickup.', barangay: 'Marifosque', address: 'Near the public waiting shed', priority: 'Normal', status: 'Under Review', department: 'Municipal Environment', lat: 12.9217, lng: 123.6698, createdAt: isoHoursAgo(11), updatedAt: isoHoursAgo(3), reporter: 'Sample Resident', source: 'demo', photoData: null, timeline: [{ status: 'Submitted', note: 'Sample report created for prototype preview.', at: isoHoursAgo(11) }, { status: 'Under Review', note: 'Awaiting verification in this demo workflow.', at: isoHoursAgo(3) }] },
    { id: 'PIL-2026-0010', title: 'Streetlight appears not to work', category: 'Streetlight', description: 'Demo sample: the streetlight near this location does not appear to turn on at night.', barangay: 'Marifosque', address: 'Along the main road', priority: 'High', status: 'Assigned', department: 'General Services', lat: 12.9291, lng: 123.6810, createdAt: isoHoursAgo(26), updatedAt: isoHoursAgo(7), reporter: 'Sample Resident', source: 'demo', photoData: null, timeline: [{ status: 'Submitted', note: 'Sample report created for prototype preview.', at: isoHoursAgo(26) }, { status: 'Under Review', note: 'Sample inspection requested.', at: isoHoursAgo(20) }, { status: 'Assigned', note: 'Assigned to General Services (demo).', at: isoHoursAgo(7) }] },
    { id: 'PIL-2026-0009', title: 'Blocked drainage after rainfall', category: 'Drainage & Flooding', description: 'Demo sample: leaves and debris may be obstructing a roadside drainage channel.', barangay: 'Marifosque', address: 'Near the covered court', priority: 'Urgent', status: 'Submitted', department: 'Unassigned', lat: 12.9276, lng: 123.6714, createdAt: isoHoursAgo(1), updatedAt: isoHoursAgo(1), reporter: 'Sample Resident', source: 'demo', photoData: null, timeline: [{ status: 'Submitted', note: 'Sample report created for prototype preview.', at: isoHoursAgo(1) }] },
    { id: 'PIL-2026-0008', title: 'Damaged sidewalk section', category: 'Road & Sidewalk', description: 'Demo sample: one sidewalk section appears uneven and may be difficult to pass.', barangay: 'Marifosque', address: 'Near a local store', priority: 'Low', status: 'Resolved', department: 'Municipal Engineering', lat: 12.9189, lng: 123.6761, createdAt: isoHoursAgo(80), updatedAt: isoHoursAgo(16), reporter: 'Sample Resident', source: 'demo', photoData: null, timeline: [{ status: 'Submitted', note: 'Sample report created for prototype preview.', at: isoHoursAgo(80) }, { status: 'Under Review', note: 'Sample report checked.', at: isoHoursAgo(70) }, { status: 'Resolved', note: 'Marked resolved for demo purposes only.', at: isoHoursAgo(16) }] },
    { id: 'PIL-2026-0007', title: 'Water pooling on roadside', category: 'Drainage & Flooding', description: 'Demo sample: water tends to collect beside the road after heavy rain.', barangay: 'Marifosque', address: 'Near the footpath', priority: 'Normal', status: 'Closed', department: 'Municipal Engineering', lat: 12.9314, lng: 123.6782, createdAt: isoHoursAgo(140), updatedAt: isoHoursAgo(45), reporter: 'Sample Resident', source: 'demo', photoData: null, timeline: [{ status: 'Submitted', note: 'Sample report created for prototype preview.', at: isoHoursAgo(140) }, { status: 'Closed', note: 'Closed in sample dataset.', at: isoHoursAgo(45) }] }
  ];
  return samples;
}


function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    let tooLarge = false;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { tooLarge = true; return; }
      if (!tooLarge) chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return reject(Object.assign(new Error('Request body is too large. Use a smaller photo (under 4 MB).'), { statusCode: 413 }));
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
function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return index < 0 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}
function normalizePHMobile(value) {
  const compact = String(value || '').replace(/[\s()-]/g, '');
  if (/^09\d{9}$/.test(compact)) return `63${compact.slice(1)}`;
  if (/^\+639\d{9}$/.test(compact)) return compact.slice(1);
  if (/^639\d{9}$/.test(compact)) return compact;
  return '';
}
function publicTicket(report) {
  // Public list intentionally contains no title, description, reporter, phone, landmark, photo or coordinates.
  return { id: report.id, category: report.category, status: report.status, createdAt: report.createdAt, updatedAt: report.updatedAt };
}
function publicReport(report) {
  // Ticket lookup is a status-only view. Full report details stay behind authority sign-in.
  return {
    id: report.id, category: report.category, status: report.status,
    createdAt: report.createdAt, updatedAt: report.updatedAt,
    timeline: (report.timeline || []).map(item => ({ status: item.status, at: item.at }))
  };
}
function createApp(options = {}) {
  const dataFile = options.dataFile || process.env.PILAR360_DATA_FILE || DEFAULT_DATA_FILE;
  const adminPassword = options.adminPassword ?? process.env.PILAR360_ADMIN_PASSWORD ?? '';
  const smsApiKey = options.smsApiKey ?? process.env.SEMAPHORE_API_KEY ?? '';
  const smsSenderName = options.smsSenderName ?? process.env.SEMAPHORE_SENDERNAME ?? '';
  const smsSender = options.smsSender;
  const phoneEncryptionKey = options.phoneEncryptionKey ?? process.env.PILAR360_PHONE_ENCRYPTION_KEY ?? '';
  const sessions = new Map();
  const loginAttempts = new Map();
  const submissionAttempts = new Map();
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify(seedReports(), null, 2));

  function readReports() {
    try {
      const value = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (!Array.isArray(value)) return [];

      // Migrate legacy plain-text contact numbers when the private key is configured.
      // If the key is missing, authority responses hide legacy values until migration is possible.
      if (derivePhoneKey()) {
        let migrated = false;
        const updated = value.map(report => {
          if (typeof report.phone !== 'string' || !report.phone.trim()) return report;
          const next = { ...report, phoneEncrypted: encryptPhoneNumber(report.phone.trim()) };
          delete next.phone;
          migrated = true;
          return next;
        });
        if (migrated) writeReports(updated);
        return updated;
      }
      return value;
    } catch (error) {
      console.error('[Pilar360] Unable to read report data:', error.message);
      throw Object.assign(new Error('The demo report file could not be read. Check data/reports.json.'), { statusCode: 500 });
    }
  }
  function writeReports(reports) {
    const temp = `${dataFile}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(reports, null, 2), { mode: 0o600 });
    fs.renameSync(temp, dataFile);
  }
  function currentSession(req) {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    const session = token && sessions.get(token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) { sessions.delete(token); return null; }
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return { token, session };
  }
  function isAuthorized(req) { return Boolean(currentSession(req)); }
  function unauthorized(res) { return sendJson(res, 401, { error: 'Authority access required. Please sign in again.' }); }
  function clientIp(req) { return req.socket.remoteAddress || 'unknown'; }
  function derivePhoneKey() {
    return phoneEncryptionKey && Buffer.byteLength(String(phoneEncryptionKey), 'utf8') >= 32
      ? crypto.createHash('sha256').update(String(phoneEncryptionKey), 'utf8').digest()
      : null;
  }
  function encryptPhoneNumber(number) {
    const key = derivePhoneKey();
    if (!key) throw Object.assign(new Error('Optional phone contact is disabled until the server encryption key is configured with at least 32 characters.'), { statusCode: 503 });
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(number, 'utf8'), cipher.final()]);
    return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') };
  }
  function decryptPhoneNumber(report) {
    const value = report.phoneEncrypted;
    const key = derivePhoneKey();
    if (!value || !key || value.version !== 1) return '';
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]).toString('utf8');
    } catch {
      return '';
    }
  }
    function authorityViewReport(report) {
    const { phoneEncrypted, phone: legacyPhone, ...visible } = report;
    return { ...visible, phone: decryptPhoneNumber(report), phoneProtected: Boolean(phoneEncrypted) };
  }
  function authorityListReport(report) {
    // List/dashboard payloads do not need images, timelines, or contact numbers.
    // Keep detail-only data on the authenticated single-ticket endpoint.
    const { phoneEncrypted, phone: legacyPhone, photoData, timeline, ...visible } = report;
    return visible;
  }
  function hasValidOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return true; // Non-browser clients may omit Origin; browser requests are checked.
    try { return new URL(origin).host === req.headers.host; } catch { return false; }
  }
  async function sendSmsNotification(report, eventType, statusValue = '') {
    const phone = report.phone || decryptPhoneNumber(report);
    if (!phone || report.smsConsent !== true) return 'not_requested';
    const message = eventType === 'submitted'
      ? `Pilar360 demo: Your report ${report.id} was saved with status SUBMITTED. Keep this ticket ID to check updates. This is not an official barangay report.`
      : `Pilar360 demo: Ticket ${report.id} status updated to ${String(statusValue || report.status).toUpperCase()}. Check Pilar360 using this ticket ID. This does not confirm official barangay action.`;
    try {
      if (typeof smsSender === 'function') {
        await smsSender({ number: phone, message, reportId: report.id, eventType, status: statusValue || report.status });
        return 'queued';
      }
      if (!smsApiKey) return 'not_configured';
      const form = new URLSearchParams({ apikey: smsApiKey, number: phone, message });
      if (smsSenderName) form.set('sendername', smsSenderName);
      const response = await fetch('https://api.semaphore.co/api/v4/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
        signal: AbortSignal.timeout(8000)
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) throw new Error(`SMS provider returned HTTP ${response.status}`);
      const item = Array.isArray(payload) ? payload[0] : payload;
      const providerStatus = String(item?.status || '').toLowerCase();
      if (!['queued', 'pending', 'sent'].includes(providerStatus)) {
        throw new Error('SMS provider did not accept the message');
      }
      return 'queued';
    } catch (error) {
      // Never log the contact number or provider key.
      console.warn('[Pilar360] SMS notification could not be queued:', error.message);
      return 'failed';
    }
  }
  function queueSmsNotification(report, eventType, statusValue = '') {
    const phone = report.phone || decryptPhoneNumber(report);
    if (!phone || report.smsConsent !== true) return 'not_requested';
    if (typeof smsSender !== 'function' && !smsApiKey) return 'not_configured';
    // Do not make report/status saving wait for a third-party SMS API.
    // The record is committed first; provider delivery continues in the background.
    void sendSmsNotification(report, eventType, statusValue).then(result => {
      console.info(`[Pilar360] SMS ${eventType} for ${report.id}: ${result}`);
    }).catch(error => {
      console.warn(`[Pilar360] SMS ${eventType} for ${report.id} failed:`, error.message);
    });
    return 'pending';
  }
  function loginLimit(ip) {
    const entry = loginAttempts.get(ip) || { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
    if (entry.resetAt <= Date.now()) { entry.count = 0; entry.resetAt = Date.now() + 15 * 60 * 1000; }
    return entry;
  }
  function submissionLimit(ip) {
    const entry = submissionAttempts.get(ip) || { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
    if (entry.resetAt <= Date.now()) { entry.count = 0; entry.resetAt = Date.now() + 15 * 60 * 1000; }
    return entry;
  }

  async function handler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { return sendJson(res, 400, { error: 'Invalid URL path.' }); }
    try {
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && !hasValidOrigin(req)) return sendJson(res, 403, { error: 'Request origin was not accepted.' });
      if (req.method === 'GET' && pathname === '/api/health') return sendJson(res, 200, { ok: true, app: 'Pilar360', version: '2.5.0-demo', mode: 'prototype', now: new Date().toISOString() });

      if (req.method === 'GET' && pathname === '/api/admin/session') return sendJson(res, 200, { authenticated: isAuthorized(req), configured: Boolean(adminPassword) });
      if (req.method === 'POST' && pathname === '/api/admin/login') {
        if (!adminPassword) return sendJson(res, 503, { error: 'Authority password is not configured. Set PILAR360_ADMIN_PASSWORD in the server environment.' });
        const ip = clientIp(req);
        const attempts = loginLimit(ip);
        if (attempts.count >= 8) return sendJson(res, 429, { error: 'Too many attempts. Try again after 15 minutes.' });
        const body = await readBody(req);
        if (!constantTimeEqual(cleanString(body.password, 200), adminPassword)) {
          attempts.count += 1; attempts.resetAt = attempts.resetAt || Date.now() + 15 * 60 * 1000; loginAttempts.set(ip, attempts);
          return sendJson(res, 401, { error: 'Incorrect authority password.' });
        }
        loginAttempts.delete(ip);
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, { createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS });
        const secure = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https';
        const cookie = `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure ? '; Secure' : ''}`;
        return sendJson(res, 200, { authenticated: true, expiresInSeconds: Math.floor(SESSION_TTL_MS / 1000) }, { 'Set-Cookie': cookie });
      }
      if (req.method === 'POST' && pathname === '/api/admin/logout') {
        const active = currentSession(req);
        if (active) sessions.delete(active.token);
        const secure = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https';
        return sendJson(res, 200, { authenticated: false }, { 'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}` });
      }

      // Public reporting: a resident may submit a concern without seeing the authority inbox.
      if (req.method === 'POST' && pathname === '/api/reports') {
        const body = await readBody(req);
        const title = cleanString(body.title, 120);
        const description = cleanString(body.description, 1600);
        const category = cleanString(body.category, 80);
        const barangayInput = cleanString(body.barangay, 100);
        const barangay = 'Marifosque';
        const address = cleanString(body.address, 240);
        const reporter = cleanString(body.reporter, 80);
        const rawPhone = cleanString(body.phone, 32);
        const phone = rawPhone ? normalizePHMobile(rawPhone) : '';
        const smsConsent = Boolean(phone && body.smsConsent === true);
        const priority = PRIORITIES.includes(body.priority) ? body.priority : 'Normal';
        if (title.length < 5) return sendJson(res, 422, { error: 'Please enter a clear title with at least 5 characters.' });
        if (description.length < 15) return sendJson(res, 422, { error: 'Please add a description with at least 15 characters.' });
        if (!CATEGORIES.includes(category)) return sendJson(res, 422, { error: 'Choose a valid report category.' });
        if (barangayInput.toLowerCase() !== 'marifosque') return sendJson(res, 422, { error: 'Select or type Marifosque. This proposal demo currently covers Barangay Marifosque only.' });
        if (rawPhone && !phone) return sendJson(res, 422, { error: 'Enter a valid Philippine mobile number, such as 09XXXXXXXXX or +639XXXXXXXXX.' });
        if (phone && !derivePhoneKey()) return sendJson(res, 503, { error: 'Optional phone contact is not enabled. The server needs a private encryption key with at least 32 characters. You can submit the report without a phone number.' });
        const latInput = body.lat === '' || body.lat == null ? null : Number(body.lat);
        const lngInput = body.lng === '' || body.lng == null ? null : Number(body.lng);
        if ((latInput === null) !== (lngInput === null)) return sendJson(res, 422, { error: 'Enter both latitude and longitude, or leave both blank.' });
        if ((latInput !== null && (!Number.isFinite(latInput) || latInput < -90 || latInput > 90)) || (lngInput !== null && (!Number.isFinite(lngInput) || lngInput < -180 || lngInput > 180))) return sendJson(res, 422, { error: 'The map coordinates are invalid.' });
        if (!address && latInput === null) return sendJson(res, 422, { error: 'Add a nearby street or landmark, or select a location pin on the map.' });
        const photoData = validatePhoto(body.photoData);
        const submitIp = clientIp(req);
        const submitAttempts = submissionLimit(submitIp);
        if (submitAttempts.count >= 8) return sendJson(res, 429, { error: 'Too many demo submissions from this connection. Please try again in 15 minutes.' });
        submitAttempts.count += 1;
        submissionAttempts.set(submitIp, submitAttempts);
        const now = new Date().toISOString();
        const reports = readReports();
        const nextSequence = (reports.reduce((max, r) => Math.max(max, Number((String(r.id).match(/(\d+)$/) || [0, 0])[1])), 0) + 1).toString().padStart(4, '0');
        const report = {
          id: `PIL-${new Date().getFullYear()}-${nextSequence}`, title, category, description, barangay, address,
          priority, status: 'Submitted', department: 'Unassigned', lat: latInput, lng: lngInput,
          createdAt: now, updatedAt: now, reporter, phoneEncrypted: phone ? encryptPhoneNumber(phone) : null, smsConsent, source: 'resident-demo', photoData,
          timeline: [{ status: 'Submitted', note: 'Your report was saved in the Pilar360 demonstration system. This is not an official LGU submission.', at: now }]
        };
        reports.push(report);
        writeReports(reports);
        const sms = queueSmsNotification(report, 'submitted');
        return sendJson(res, 201, { report: { id: report.id, status: report.status }, sms, message: 'Demo report saved. Keep the report ID to check its status.' });
      }
      if (req.method === 'GET' && pathname === '/api/public/tickets') {
        const includeResolved = url.searchParams.get('includeResolved') === '1';
        // Resident-submitted tickets are public. An Approved sample ticket is also shown so the approval workflow can be demonstrated end-to-end without exposing private report details.
        let tickets = readReports().filter(report => report.source !== 'demo' || Boolean(report.publicListingEnabledAt) || report.status === 'Approved');
        if (!includeResolved) tickets = tickets.filter(report => !['Resolved', 'Closed'].includes(report.status));
        tickets.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        return sendJson(res, 200, { tickets: tickets.map(publicTicket), count: tickets.length, includeResolved });
      }
      const trackMatch = pathname.match(/^\/api\/track\/([^/]+)$/);
      if (req.method === 'GET' && trackMatch) {
        const report = readReports().find(r => r.id.toLowerCase() === trackMatch[1].toLowerCase());
        return report ? sendJson(res, 200, { report: publicReport(report) }) : sendJson(res, 404, { error: 'Report ID not found. Check the ID and try again.' });
      }

      // All other report records and management actions are authority-only.
      const protectedPath = pathname === '/api/workspace' || pathname === '/api/reports' || pathname === '/api/stats' || pathname === '/api/export' || pathname === '/api/demo/reset' || /^\/api\/reports\/[^/]+$/.test(pathname);
      if (protectedPath && !isAuthorized(req)) return unauthorized(res);

      if (req.method === 'GET' && pathname === '/api/workspace') {
        const reports = readReports();
        const ordered = [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return sendJson(res, 200, { reports: ordered.map(authorityListReport), stats: summarize(reports) });
      }
      if (req.method === 'GET' && pathname === '/api/reports') {
        let reports = readReports();
        const status = cleanString(url.searchParams.get('status'), 50);
        const category = cleanString(url.searchParams.get('category'), 80);
        const q = cleanString(url.searchParams.get('q'), 200).toLowerCase();
        if (status && status !== 'All') reports = reports.filter(r => r.status === status);
        if (category && category !== 'All') reports = reports.filter(r => r.category === category);
        if (q) reports = reports.filter(r => [r.id, r.title, r.description, r.barangay, r.address, r.category, r.department, r.reporter].some(v => String(v || '').toLowerCase().includes(q)));
        reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return sendJson(res, 200, { reports: reports.map(authorityListReport), count: reports.length });
      }
      if (req.method === 'GET' && pathname === '/api/stats') return sendJson(res, 200, summarize(readReports()));
      if (req.method === 'GET' && pathname === '/api/export') {
        const payload = JSON.stringify({ app: 'Pilar360', exportType: 'DEMO_DATA', exportedAt: new Date().toISOString(), reports: readReports().map(authorityViewReport) }, null, 2);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="pilar360-demo-export.json"', 'Content-Length': Buffer.byteLength(payload), 'Cache-Control': 'no-store' });
        return res.end(payload);
      }
      const reportMatch = pathname.match(/^\/api\/reports\/([^/]+)$/);
      if (req.method === 'GET' && reportMatch) {
        const report = readReports().find(r => r.id === reportMatch[1]);
        return report ? sendJson(res, 200, { report: authorityViewReport(report) }) : sendJson(res, 404, { error: 'Report not found.' });
      }
      if (req.method === 'PATCH' && reportMatch) {
        const body = await readBody(req);
        if (!STATUSES.includes(body.status)) return sendJson(res, 422, { error: 'Choose a valid status.' });
        const reports = readReports();
        const index = reports.findIndex(r => r.id === reportMatch[1]);
        if (index < 0) return sendJson(res, 404, { error: 'Report not found.' });
        const status = body.status;
        const department = cleanString(body.department, 100) || reports[index].department || 'Unassigned';
        const note = cleanString(body.note, 500) || `Status updated to ${status} in the Pilar360 demo. No official service action is implied.`;
        const at = new Date().toISOString();
        const previousStatus = reports[index].status;
        const updatedReport = { ...reports[index], status, department, updatedAt: at,
          timeline: [...(reports[index].timeline || []), { status, note, at }].slice(-30) };
        // Once a sample ticket is approved, keep its ID in the public status directory
        // even after it moves to In Progress, Resolved or another later status.
        if (status === 'Approved') updatedReport.publicListingEnabledAt = updatedReport.publicListingEnabledAt || at;
        else if (previousStatus === 'Approved' && !updatedReport.publicListingEnabledAt) {
          updatedReport.publicListingEnabledAt = reports[index].approvedAt || at;
        }
        const expiryTime = Date.parse(reports[index].approvalExpiresAt || '');
        const approvalExpired = !Number.isFinite(expiryTime) || expiryTime <= Date.now();
        if (status === 'Approved' && (previousStatus !== 'Approved' || approvalExpired)) {
          updatedReport.approvedAt = at;
          updatedReport.approvalExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        } else if (status !== 'Approved') {
          delete updatedReport.approvedAt;
          delete updatedReport.approvalExpiresAt;
        }
        reports[index] = updatedReport;
        writeReports(reports);
        // Notify only when the status actually changes, avoiding duplicate SMS on unchanged saves.
        const smsEvent = status === 'Resolved' ? 'resolved' : 'status_update';
        const sms = status !== previousStatus
          ? queueSmsNotification(reports[index], smsEvent, status)
          : 'not_requested';
        return sendJson(res, 200, { report: authorityViewReport(reports[index]), sms, changed: status !== previousStatus, message: 'Demo report updated.' });
      }
      if (req.method === 'POST' && pathname === '/api/demo/reset') {
        writeReports(seedReports());
        return sendJson(res, 200, { message: 'The sample dataset has been restored.', stats: summarize(readReports()) });
      }
      if (pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'API endpoint not found.' });

      if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed.' });
      let requested = pathname === '/' ? '/index.html' : pathname;
      if (requested === '/admin' || requested === '/admin/') requested = '/admin.html';
      if (requested === '/report' || requested === '/report/') requested = '/report.html';
      if (requested === '/contact' || requested === '/contact/') requested = '/contact.html';
      const resolved = path.resolve(PUBLIC_DIR, `.${requested}`);
      if (!resolved.startsWith(`${PUBLIC_DIR}${path.sep}`) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return sendJson(res, 404, { error: 'Page not found.' });
      const ext = path.extname(resolved).toLowerCase();
      const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon' };
      const file = fs.readFileSync(resolved);
      const isAdminPage = requested === '/admin.html';
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream', 'Content-Length': file.length, 'Cache-Control': isAdminPage ? 'no-store' : (['.html'].includes(ext) ? 'no-cache' : (['.js', '.css'].includes(ext) ? 'public, max-age=600' : 'public, max-age=3600')), 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
      return req.method === 'HEAD' ? res.end() : res.end(file);
    } catch (error) {
      if (!res.headersSent) return sendJson(res, error.statusCode || 500, { error: error.message || 'Unexpected server error.' });
      return res.destroy();
    }
  }
  return http.createServer((req, res) => {
    const secureRequest = Boolean(req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    if (secureRequest) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self' https://unpkg.com https://*.tile.openstreetmap.org; img-src 'self' data: https://*.tile.openstreetmap.org; style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net; script-src 'self' https://unpkg.com https://cdn.jsdelivr.net; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    handler(req, res);
  });
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, HOST, () => {
    console.log(`\nPilar360 is listening on ${HOST}:${PORT}`);
    console.log(`Open locally: http://127.0.0.1:${PORT}`);
    console.log('Project introduction: /  |  Reporter portal: /report  |  Authority workspace: /admin');
    console.log(`Authority password: ${process.env.PILAR360_ADMIN_PASSWORD ? 'configured' : 'NOT CONFIGURED — set PILAR360_ADMIN_PASSWORD'}`);
    console.log('Demo only — not connected to barangay or municipal services.\n');
  });
  app.on('error', error => { console.error('[Pilar360] Server error:', error.message); process.exitCode = 1; });
}
module.exports = { createApp, seedReports, summarize, CATEGORIES, STATUSES, PRIORITIES };
