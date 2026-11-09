'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const message = $('#developerMessage');
  const count = $('#messageCount');
  const toast = $('#toast');
  let toastTimer;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
  }
  message.addEventListener('input', () => { count.textContent = `${message.value.length} / 2000`; });
  $('#developerContactForm').addEventListener('submit', event => {
    event.preventDefault();
    const text = message.value.trim();
    if (text.length < 8) { showToast('Please add more details to your message.'); return; }
    const email = $('#developerReplyEmail').value.trim();
    const subject = `Pilar360 - ${$('#developerConcernType').value}`;
    const body = [
      'Hello Jerosh,', '',
      'I would like to send a message about the Pilar360 student prototype.',
      `Concern: ${$('#developerConcernType').value}`,
      `Name: ${$('#developerName').value.trim() || 'Not provided'}`,
      `Reply email: ${email || 'Not provided'}`, '', 'Message:', text, '', 'Page: /contact'
    ].join('\n');
    window.location.href = `mailto:ahukyo@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showToast('Your email app should open. Review the draft and press Send.');
  });
})();
