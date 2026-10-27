'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp, seedReports } = require('../server');

test('Pilar 360 API smoke test: health, validation, create, update, export', async t => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilar360-test-'));
  const dataFile = path.join(tempDir, 'reports.json');
  fs.writeFileSync(dataFile, JSON.stringify(seedReports(), null, 2));
  const server = createApp({ dataFile });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const healthResponse = await fetch(`${base}/api/health`);
  assert.equal(healthResponse.status, 200);
  assert.equal((await healthResponse.json()).ok, true);

  const listResponse = await fetch(`${base}/api/reports`);
  assert.equal(listResponse.status, 200);
  const initial = await listResponse.json();
  assert.equal(initial.count, 6);
  assert.ok(initial.reports.some(report => report.id === 'PIL-2026-0012'));

  const invalidResponse = await fetch(`${base}/api/reports`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'bad', category: 'Unknown', description: 'too short', barangay: '' })
  });
  assert.equal(invalidResponse.status, 422);
  assert.match((await invalidResponse.json()).error, /title/i);

  const createResponse = await fetch(`${base}/api/reports`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Smoke test streetlight', category: 'Streetlight', description: 'The streetlight is not working near the test location.', barangay: 'Banuyo', address: 'Test landmark', priority: 'Normal', lat: 12.9251, lng: 123.6740, reporter: 'Test runner' })
  });
  assert.equal(createResponse.status, 201);
  const created = (await createResponse.json()).report;
  assert.match(created.id, /^PIL-\d{4}-\d{4}$/);
  assert.equal(created.status, 'Submitted');

  const updateResponse = await fetch(`${base}/api/reports/${created.id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'In Progress', department: 'General Services', note: 'Smoke test status update.' })
  });
  assert.equal(updateResponse.status, 200);
  const updated = (await updateResponse.json()).report;
  assert.equal(updated.status, 'In Progress');
  assert.equal(updated.department, 'General Services');
  assert.equal(updated.timeline.at(-1).note, 'Smoke test status update.');

  const statsResponse = await fetch(`${base}/api/stats`);
  assert.equal(statsResponse.status, 200);
  const stats = await statsResponse.json();
  assert.equal(stats.total, 7);
  assert.equal(stats.active, 5);

  const exportResponse = await fetch(`${base}/api/export`);
  assert.equal(exportResponse.status, 200);
  assert.match(exportResponse.headers.get('content-disposition'), /pilar360-demo-export\.json/);
  const exportPayload = await exportResponse.json();
  assert.equal(exportPayload.reports.length, 7);

  const filteredResponse = await fetch(`${base}/api/reports?status=In%20Progress`);
  assert.equal(filteredResponse.status, 200);
  assert.equal((await filteredResponse.json()).reports.length, 2);

  const missingResponse = await fetch(`${base}/api/reports/DOES-NOT-EXIST`);
  assert.equal(missingResponse.status, 404);

  const invalidUpdateResponse = await fetch(`${base}/api/reports/${created.id}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'Teleporting' })
  });
  assert.equal(invalidUpdateResponse.status, 422);

  const resetResponse = await fetch(`${base}/api/demo/reset`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
  });
  assert.equal(resetResponse.status, 200);
  assert.equal((await resetResponse.json()).stats.total, 6);

  const staticResponse = await fetch(`${base}/`);
  assert.equal(staticResponse.status, 200);
  assert.match(await staticResponse.text(), /Pilar 360/);
});
