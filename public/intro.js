'use strict';
(() => {
  const target = document.getElementById('presenterTyping');
  if (!target) return;

  const text = target.dataset.typingText || 'Presented by Jerosh Nevado';
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    target.textContent = text;
    return;
  }

  target.textContent = '';
  let position = 0;
  const typeNext = () => {
    position += 1;
    target.textContent = text.slice(0, position);
    if (position < text.length) window.setTimeout(typeNext, 58);
  };
  window.setTimeout(typeNext, 350);
})();
