'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp, seedReports } = require('../server');

test('Pilar360 public reporting, private authority access, tracking, map data and status workflow', async t => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilar360-test-'));
  const dataFile = path.join(tempDir, 'reports.json');
  fs.writeFileSync(dataFile, JSON.stringify(seedReports(), null, 2));
  const server = createApp({ dataFile, adminPassword: 'unit-test-secret' });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); fs.rmSync(tempDir, { recursive: true, force: true }); });
  const call = (url, options = {}) => fetch(`${base}${url}`, options);
  const json = (method, body, cookie) => ({ method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });

  const health = await call('/api/health');
  assert.equal(health.status, 200); assert.equal((await health.json()).ok, true);
  const session = await call('/api/admin/session');
  assert.deepEqual(await session.json(), { authenticated: false, configured: true });

  const privateList = await call('/api/reports');
  assert.equal(privateList.status, 401, 'report list must be authority-only');
  const privateStats = await call('/api/stats');
  assert.equal(privateStats.status, 401, 'statistics must be authority-only');

  const invalid = await call('/api/reports', json('POST', { title: 'bad', category: 'Unknown', description: 'too short', barangay: '' }));
  assert.equal(invalid.status, 422);

  const unpairedCoordinates = await call('/api/reports', json('POST', { title: 'Streetlight issue near court', category: 'Streetlight', description: 'The streetlight has not been working near the covered court.', barangay: 'Marifosque', reporter: 'Test Resident', lat: 12.92 }));
  assert.equal(unpairedCoordinates.status, 422);

  const outOfScope = await call('/api/reports', json('POST', { title: 'Streetlight in another area', category: 'Streetlight', description: 'This report is outside the selected project barangay.', barangay: 'Banuyo', reporter: 'Test Resident' }));
  assert.equal(outOfScope.status, 422, 'public submissions must stay within the selected barangay');

  const create = await call('/api/reports', json('POST', { title: 'Smoke test streetlight', category: 'Streetlight', description: 'The streetlight is not working near the test location.', barangay: 'Marifosque', address: 'Near test waiting shed', priority: 'Normal', lat: 12.9251, lng: 123.6740, reporter: 'Test Resident' }));
  assert.equal(create.status, 201);
  const created = (await create.json()).report;
  assert.match(created.id, /^PIL-\d{4}-\d{4}$/); assert.equal(created.status, 'Submitted');

  const track = await call(`/api/track/${created.id}`);
  assert.equal(track.status, 200);
  const publicTrack = (await track.json()).report;
  assert.equal(publicTrack.status, 'Submitted');
  assert.equal('reporter' in publicTrack, false, 'public tracker must not disclose reporter identity');
  assert.equal('lat' in publicTrack, false, 'public tracker must not disclose exact coordinates');

  const wrongLogin = await call('/api/admin/login', json('POST', { password: 'wrong' }));
  assert.equal(wrongLogin.status, 401);
  const login = await call('/api/admin/login', json('POST', { password: 'unit-test-secret' }));
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const authorizedList = await call('/api/reports', { headers: { cookie } });
  assert.equal(authorizedList.status, 200);
  const reports = (await authorizedList.json()).reports;
  assert.ok(reports.some(r => r.id === created.id && r.reporter === 'Test Resident' && r.lat === 12.9251));

  const unauthorizedUpdate = await call(`/api/reports/${created.id}`, json('PATCH', { status: 'Resolved' }));
  assert.equal(unauthorizedUpdate.status, 401);
  const update = await call(`/api/reports/${created.id}`, json('PATCH', { status: 'In Progress', department: 'Barangay Coordination', note: 'Demo status updated for testing.' }, cookie));
  assert.equal(update.status, 200);
  const updated = (await update.json()).report;
  assert.equal(updated.status, 'In Progress'); assert.equal(updated.department, 'Barangay Coordination');

  const trackedAgain = await call(`/api/track/${created.id}`);
  assert.equal((await trackedAgain.json()).report.status, 'In Progress');
  assert.equal((await call('/api/export')).status, 401);
  const exportResponse = await call('/api/export', { headers: { cookie } });
  assert.equal(exportResponse.status, 200);
  const exported = await exportResponse.json(); assert.ok(exported.reports.some(r => r.id === created.id));

  const logout = await call('/api/admin/logout', json('POST', {}, cookie));
  assert.equal(logout.status, 200);
  assert.equal((await call('/api/reports', { headers: { cookie } })).status, 401);

  assert.equal((await call('/')).status, 200);
  assert.match(await (await call('/')).text(), /Submit a report/);
  assert.equal((await call('/admin')).status, 200);
  assert.match(await (await call('/admin')).text(), /Authority sign in/);
});
