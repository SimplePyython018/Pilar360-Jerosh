'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp, seedReports } = require('../server');

test('v2.3 ticket recovery, private phone encryption, status resolution and optional notifications', async t => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilar360-v23-'));
  const dataFile = path.join(tempDir, 'reports.json');
  fs.writeFileSync(dataFile, JSON.stringify(seedReports(), null, 2));
  const smsEvents = [];
  const server = createApp({
    dataFile,
    adminPassword: 'test-authority-password',
    phoneEncryptionKey: 'test-only-encryption-secret-that-is-long-enough',
    smsSender: async event => { smsEvents.push(event); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(tempDir, { recursive: true, force: true }); });
  const call = (url, options = {}) => fetch(`${base}${url}`, options);
  const json = (method, body, cookie) => ({ method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });

  const create = await call('/api/reports', json('POST', {
    reporter: '', phone: '09171234567', smsConsent: true,
    title: 'Streetlight near the waiting shed',
    category: 'Streetlight', barangay: 'Marifosque', address: 'Near the waiting shed',
    description: 'The streetlight near the waiting shed is not working at night.',
    priority: 'Normal', lat: null, lng: null
  }));
  assert.equal(create.status, 201);
  const creation = await create.json();
  assert.equal(creation.report.status, 'Submitted');
  assert.equal(creation.sms, 'queued');
  const id = creation.report.id;
  assert.match(id, /^PIL-\d{4}-\d{4}$/);
  assert.equal(smsEvents.length, 1);
  assert.equal(smsEvents[0].number, '639171234567');
  assert.equal(smsEvents[0].eventType, 'submitted');

  const stored = fs.readFileSync(dataFile, 'utf8');
  assert.equal(stored.includes('09171234567'), false, 'phone number must not be stored as plain text');
  assert.equal(stored.includes('639171234567'), false, 'normalized phone number must not be stored as plain text');
  assert.match(stored, /phoneEncrypted/);

  const publicList = await call('/api/public/tickets');
  assert.equal(publicList.status, 200);
  const directory = (await publicList.json()).tickets;
  assert.ok(directory.some(ticket => ticket.id === id));
  assert.equal(directory.some(ticket => ticket.id === 'PIL-2026-0012'), false, 'fictional seed tickets must not appear in the resident list');
  const publicEntry = directory.find(ticket => ticket.id === id);
  assert.deepEqual(Object.keys(publicEntry).sort(), ['category', 'createdAt', 'id', 'status', 'updatedAt'].sort());
  assert.equal('phone' in publicEntry, false);
  assert.equal('title' in publicEntry, false);
  assert.equal('reporter' in publicEntry, false);
  assert.equal('address' in publicEntry, false);
  assert.equal('lat' in publicEntry, false);

  const publicTrack = await call(`/api/track/${id}`);
  assert.equal(publicTrack.status, 200);
  const trackReport = (await publicTrack.json()).report;
  assert.equal(trackReport.status, 'Submitted');
  assert.equal('title' in trackReport, false);
  assert.equal('description' in trackReport, false);
  assert.equal('phone' in trackReport, false);
  assert.equal('reporter' in trackReport, false);
  assert.equal('address' in trackReport, false);
  assert.equal('note' in trackReport.timeline[0], false, 'public status timeline must not include authority notes');

  const privateBeforeLogin = await call('/api/reports');
  assert.equal(privateBeforeLogin.status, 401);
  const login = await call('/api/admin/login', json('POST', { password: 'test-authority-password' }));
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const adminList = await call('/api/reports', { headers: { cookie } });
  assert.equal(adminList.status, 200);
  const adminReport = (await adminList.json()).reports.find(report => report.id === id);
  assert.ok(adminReport);
  assert.equal(adminReport.phone, '639171234567');
  assert.equal(adminReport.reporter, '');
  assert.equal('phoneEncrypted' in adminReport, false, 'encrypted storage object must not be returned to admin browser');

  const resolve = await call(`/api/reports/${id}`, json('PATCH', { status: 'Resolved', department: 'General Services', note: 'Marked resolved in the student demo.' }, cookie));
  assert.equal(resolve.status, 200);
  const resolvedPayload = await resolve.json();
  assert.equal(resolvedPayload.report.status, 'Resolved');
  assert.equal(resolvedPayload.report.phone, '639171234567');
  assert.equal(resolvedPayload.sms, 'queued');
  assert.equal(smsEvents.length, 2);
  assert.equal(smsEvents[1].eventType, 'resolved');

  const activeListAfterResolution = await (await call('/api/public/tickets')).json();
  assert.equal(activeListAfterResolution.tickets.some(ticket => ticket.id === id), false, 'resolved tickets are hidden from the default active list');
  const allList = await (await call('/api/public/tickets?includeResolved=1')).json();
  assert.equal(allList.tickets.find(ticket => ticket.id === id).status, 'Resolved');
  const rechecked = await (await call(`/api/track/${id}`)).json();
  assert.equal(rechecked.report.status, 'Resolved', 'public ticket lookup must show resolved status after authority update');

  const exportWithoutAuth = await call('/api/export');
  assert.equal(exportWithoutAuth.status, 401);
  const exportWithAuth = await call('/api/export', { headers: { cookie } });
  assert.equal(exportWithAuth.status, 200);
  assert.ok((await exportWithAuth.text()).includes('639171234567'));

  const portal = await (await call('/report')).text();
  assert.match(portal, /Contact the developer/);
  assert.match(portal, /ahukyo@gmail\.com/);
  assert.match(portal, /id="developerContactForm"/);
  const reporterJs = await (await call('/reporter.js')).text();
  assert.match(reporterJs, /mailto:ahukyo@gmail\.com/);
  assert.match(reporterJs, /await loadPublicTickets\(\)/, 'ticket directory should refresh after a successful submission');
  const adminJs = await (await call('/admin-app.js')).text();
  assert.match(adminJs, /Mark this ticket as Resolved in the Pilar360 demo/);
});

test('phone number is rejected when encryption is not configured', async t => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilar360-no-phone-key-'));
  const dataFile = path.join(tempDir, 'reports.json');
  fs.writeFileSync(dataFile, JSON.stringify(seedReports(), null, 2));
  const server = createApp({ dataFile, adminPassword: 'test-authority-password' });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(tempDir, { recursive: true, force: true }); });
  const response = await fetch(`${base}/api/reports`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reporter: '', phone: '09171234567', smsConsent: false, title: 'Streetlight issue nearby', category: 'Streetlight', barangay: 'Marifosque', address: 'Near waiting shed', description: 'A nearby streetlight is not working at night.' })
  });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not enabled|encryption key/i);
  const withoutPhone = await fetch(`${base}/api/reports`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reporter: '', title: 'Road concern near the court', category: 'Road & Sidewalk', barangay: 'Marifosque', address: 'Near the covered court', description: 'There is a broken portion on the road near the covered court.' })
  });
  assert.equal(withoutPhone.status, 201, 'reporting without a phone number must still work when phone encryption is not set');
});

test('legacy plain-text contact numbers are migrated to encrypted storage before authority access', async t => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilar360-phone-migration-'));
  const dataFile = path.join(tempDir, 'reports.json');
  const legacyReport = {
    id: 'PIL-2026-0013', title: 'Legacy contact test', category: 'Other', description: 'Legacy test record from an older demo version.',
    barangay: 'Marifosque', address: 'Near the test location', reporter: 'Test Resident', phone: '09171234567',
    priority: 'Normal', status: 'Submitted', department: 'Unassigned', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    source: 'resident-demo', smsConsent: false, timeline: []
  };
  fs.writeFileSync(dataFile, JSON.stringify([...seedReports(), legacyReport], null, 2));
  const server = createApp({ dataFile, adminPassword: 'migration-test-password', phoneEncryptionKey: 'migration-test-secret-that-is-at-least-thirty-two-chars' });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(tempDir, { recursive: true, force: true }); });
  const publicList = await fetch(`${base}/api/public/tickets`);
  assert.equal(publicList.status, 200);
  const stored = fs.readFileSync(dataFile, 'utf8');
  assert.equal(stored.includes('09171234567'), false, 'legacy plaintext contact should be removed from storage after migration');
  assert.match(stored, /phoneEncrypted/);
  const login = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'migration-test-password' }) });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const list = await fetch(`${base}/api/reports`, { headers: { cookie } });
  const migrated = (await list.json()).reports.find(report => report.id === legacyReport.id);
  assert.equal(migrated.phone, '09171234567', 'authority should still be able to see the migrated contact number');
  assert.equal('phoneEncrypted' in migrated, false);
});
