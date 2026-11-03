'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  let photoData = null;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const showToast = (message, isError = false) => {
    const node = document.createElement('div'); node.className = `toast${isError ? ' error' : ' success'}`; node.textContent = message; $('#toastHost').appendChild(node); setTimeout(() => node.remove(), 4000);
  };
  async function api(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }
  function switchTab(tab) {
    document.querySelectorAll('[data-tab]').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
    $('#submitPanel').classList.toggle('hidden', tab !== 'submit');
    $('#trackPanel').classList.toggle('hidden', tab !== 'track');
  }
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
  $('#year').textContent = new Date().getFullYear();
  $('#locateButton').addEventListener('click', () => {
    const button = $('#locateButton');
    if (!navigator.geolocation) return showToast('Location is unavailable in this browser. You may enter a landmark instead.', true);
    button.disabled = true; button.textContent = 'Finding location…';
    navigator.geolocation.getCurrentPosition(position => {
      $('#latitude').value = position.coords.latitude.toFixed(6); $('#longitude').value = position.coords.longitude.toFixed(6);
      button.disabled = false; button.textContent = '⌖ Use my location'; showToast('Location added. Check that the pin is correct before submitting.');
    }, error => {
      button.disabled = false; button.textContent = '⌖ Use my location';
      showToast(error.code === 1 ? 'Location permission was denied. Enter a landmark instead.' : 'Could not get your location. Enter a landmark instead.', true);
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  });
  $('#photo').addEventListener('change', event => {
    const file = event.target.files?.[0]; photoData = null; $('#photoPreview').classList.add('hidden');
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { event.target.value = ''; $('#photoHint').textContent = 'Please choose a PNG, JPG, or WebP image.'; return showToast('Unsupported image format.', true); }
    if (file.size > 3 * 1024 * 1024) { event.target.value = ''; $('#photoHint').textContent = 'Image must be 3 MB or smaller.'; return showToast('Photo is too large. Maximum size is 3 MB.', true); }
    const reader = new FileReader();
    reader.onload = () => { photoData = String(reader.result); $('#photoPreview').src = photoData; $('#photoPreview').classList.remove('hidden'); $('#photoHint').textContent = `${(file.size / 1024).toFixed(0)} KB · ready to submit`; };
    reader.onerror = () => showToast('The selected photo could not be read.', true);
    reader.readAsDataURL(file);
  });
  $('#reportForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!$('#reporter').value.trim() || $('#reporter').value.trim().length < 2) return showToast('Enter your name or display name.', true);
    if (!$('#title').value.trim() || $('#title').value.trim().length < 5) return showToast('Issue title must have at least 5 characters.', true);
    if (!$('#description').value.trim() || $('#description').value.trim().length < 15) return showToast('Please describe the concern in at least 15 characters.', true);
    if (!$('#confirmDemo').checked) return showToast('Please confirm that this is a demo project.', true);
    const latText = $('#latitude').value.trim(), lngText = $('#longitude').value.trim();
    if ((latText && !lngText) || (!latText && lngText)) return showToast('Enter both latitude and longitude, or leave both blank.', true);
    const button = $('#submitButton'); button.disabled = true; button.textContent = 'Saving report…';
    const body = { reporter: $('#reporter').value.trim(), title: $('#title').value.trim(), category: $('#category').value, barangay: 'Marifosque', address: $('#address').value.trim(), description: $('#description').value.trim(), priority: 'Normal', lat: latText || null, lng: lngText || null, photoData };
    try {
      const result = await api('/api/reports', { method: 'POST', body: JSON.stringify(body) });
      $('#submitResult').innerHTML = `<strong>Report saved successfully in the demo.</strong><div class="report-id">${escapeHtml(result.report.id)}</div><p>Save this ID. You can use it in “Check report status”. This is not an official barangay report number.</p><button class="copy-button" type="button" id="copyReportId">Copy report ID</button> <button class="copy-button" type="button" id="trackThisReport">Check status now</button>`;
      $('#submitResult').classList.remove('hidden');
      $('#copyReportId').addEventListener('click', async () => { try { await navigator.clipboard.writeText(result.report.id); showToast('Report ID copied.'); } catch { showToast(`Your report ID is ${result.report.id}`); } });
      $('#trackThisReport').addEventListener('click', () => { $('#trackId').value = result.report.id; switchTab('track'); $('#trackForm').requestSubmit(); });
      form.reset(); photoData = null; $('#photoPreview').classList.add('hidden'); $('#photoHint').textContent = 'PNG, JPG, or WebP · maximum 3 MB.';
      window.scrollTo({ top: $('#submitResult').getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
      showToast('Your demo report was saved. Keep the report ID.');
    } catch (error) { showToast(error.message, true); }
    finally { button.disabled = false; button.innerHTML = 'Submit demo report <span>→</span>'; }
  });
  function prettyDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-PH',{dateStyle:'medium',timeStyle:'short'}).format(date); }
  $('#trackForm').addEventListener('submit', async event => {
    event.preventDefault(); const id = $('#trackId').value.trim().toUpperCase(); const button = $('#trackButton');
    if (!id) return; button.disabled = true; button.textContent = 'Searching…'; $('#trackResult').innerHTML = '<div class="empty-track">Searching for your report…</div>';
    try {
      const result = await api(`/api/track/${encodeURIComponent(id)}`); const r = result.report;
      const timeline = (r.timeline || []).slice().sort((a,b) => new Date(a.at) - new Date(b.at));
      $('#trackResult').innerHTML = `<article class="track-card"><div class="track-card-head"><div><div class="track-id">${escapeHtml(r.id)}</div><h3>${escapeHtml(r.title)}</h3></div><span class="status-chip">${escapeHtml(r.status)}</span></div><div class="track-meta"><span>${escapeHtml(r.category)}</span><span>Brgy. ${escapeHtml(r.barangay)}</span><span>Updated ${prettyDate(r.updatedAt)}</span></div>${r.address ? `<p style="font-size:11px;color:#7d8c95;margin:0 0 18px">Landmark: ${escapeHtml(r.address)}</p>` : ''}<h4 style="font-size:11px;color:#536876;margin:0 0 15px">Status updates</h4><div class="timeline">${timeline.map(item => `<div class="timeline-item"><strong>${escapeHtml(item.status)}</strong><p>${escapeHtml(item.note)}</p><time>${prettyDate(item.at)}</time></div>`).join('') || '<p>No updates yet.</p>'}</div><p style="font-size:9px;color:#9aa5ac;margin:4px 0 0">Updates shown here are saved in the student demonstration only. They do not confirm official action by barangay personnel.</p></article>`;
    } catch (error) { $('#trackResult').innerHTML = `<div class="empty-track"><strong>Report not found</strong><p>${escapeHtml(error.message)}</p></div>`; }
    finally { button.disabled = false; button.innerHTML = 'Find report <span>→</span>'; }
  });
  const params = new URLSearchParams(location.search);
  if (params.get('track')) { $('#trackId').value = params.get('track'); switchTab('track'); $('#trackForm').requestSubmit(); }
})();
