chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'activate_typing_mode') {
    enableParagraphSelection();
  }
});

let typereadActive = false;
let lastHovered = null;

function enableParagraphSelection() {
  if (typereadActive) return;
  typereadActive = true;
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mouseover', handleParagraphHover, true);
  document.addEventListener('mouseout', handleParagraphUnhover, true);
  document.addEventListener('click', handleParagraphClick, true);
}

function handleParagraphHover(e) {
  const p = getParagraphElement(e.target);
  if (p) {
    lastHovered = p;
    p.classList.add('typeread-hover');
  }
}

function handleParagraphUnhover(e) {
  const p = getParagraphElement(e.target);
  if (p && p === lastHovered) {
    p.classList.remove('typeread-hover');
    lastHovered = null;
  }
}

function handleParagraphClick(e) {
  const p = getParagraphElement(e.target);
  if (p) {
    e.preventDefault();
    e.stopPropagation();
    cleanupParagraphSelection();
    startTypingOverlay(p);
  }
}

function getParagraphElement(el) {
  // Only allow <p> or similar block text elements
  if (!el) return null;
  if (el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'ARTICLE' || el.tagName === 'SECTION') {
    // Only if it contains enough text
    if (el.innerText && el.innerText.trim().split(' ').length > 5) {
      return el;
    }
  }
  return null;
}

function cleanupParagraphSelection() {
  typereadActive = false;
  document.body.style.cursor = '';
  document.querySelectorAll('.typeread-hover').forEach(el => el.classList.remove('typeread-hover'));
  document.removeEventListener('mouseover', handleParagraphHover, true);
  document.removeEventListener('mouseout', handleParagraphUnhover, true);
  document.removeEventListener('click', handleParagraphClick, true);
}

function startTypingOverlay(paragraphEl) {
  const text = paragraphEl.innerText.trim();
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'typeread-overlay';
  overlay.tabIndex = 0;
  // Build text container
  const textContainer = document.createElement('div');
  textContainer.className = 'typeread-text';
  overlay.appendChild(textContainer);
  // Controls
  const controls = document.createElement('div');
  controls.className = 'typeread-controls';
  controls.innerHTML = '<b>Tab</b>: Skip word &nbsp; <b>Esc</b>: Exit';
  overlay.appendChild(controls);
  // Add overlay to body
  document.body.appendChild(overlay);
  // Focus overlay for keyboard events
  overlay.focus();
  // Hide scroll
  document.body.style.overflow = 'hidden';

  // Typing state
  let idx = 0;
  let wordIdx = 0;
  let mistakes = 0;
  let startTime = Date.now();
  let finished = false;
  let typed = '';
  let skipMode = false;

  // Render function
  function render() {
    textContainer.innerHTML = '';
    for (let i = 0; i < text.length; i++) {
      const span = document.createElement('span');
      const char = text[i];
      if (i < idx) {
        span.className = 'typeread-correct';
        span.textContent = char;
      } else if (i === idx && !finished) {
        span.className = 'typeread-faded';
        span.textContent = char;
        // Blinking cursor
        const cursor = document.createElement('span');
        cursor.className = 'typeread-cursor';
        span.appendChild(cursor);
      } else {
        span.className = 'typeread-faded';
        span.textContent = char;
      }
      textContainer.appendChild(span);
    }
  }

  render();

  function handleKey(e) {
    if (finished) return;
    if (e.key === 'Escape') {
      cleanup();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      // Skip to next word
      while (idx < text.length && text[idx] !== ' ') idx++;
      if (idx < text.length && text[idx] === ' ') idx++;
      render();
      return;
    }
    if (e.key.length === 1) {
      if (text[idx] === e.key) {
        idx++;
        if (idx >= text.length) {
          finished = true;
          showSummary();
        }
        render();
      } else {
        // Incorrect char
        mistakes++;
        // Show incorrect feedback
        const spans = textContainer.querySelectorAll('span');
        if (spans[idx]) {
          spans[idx].className = 'typeread-incorrect';
        }
      }
    }
  }

  overlay.addEventListener('keydown', handleKey);

  function cleanup() {
    overlay.remove();
    document.body.style.overflow = '';
  }

  function showSummary() {
    const endTime = Date.now();
    const timeTaken = (endTime - startTime) / 1000; // seconds
    const totalChars = text.length;
    const correctChars = totalChars - mistakes;
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;
    const wpm = Math.round((totalChars / 5) / (timeTaken / 60));

    // Remove overlay
    cleanup();

    // Create stats panel
    const panel = document.createElement('div');
    panel.className = 'typeread-stats-panel';

    const title = document.createElement('div');
    title.className = 'typeread-stats-title';
    title.textContent = 'Typing Session Summary';
    panel.appendChild(title);

    // Metrics
    const metrics = [
      { label: 'WPM', value: wpm },
      { label: 'Accuracy', value: accuracy + '%' },
      { label: 'Time', value: timeTaken.toFixed(1) + 's' },
      { label: 'Mistakes', value: mistakes }
    ];
    metrics.forEach(m => {
      const row = document.createElement('div');
      row.className = 'typeread-stats-row';
      const label = document.createElement('span');
      label.className = 'typeread-stats-label';
      label.textContent = m.label;
      const value = document.createElement('span');
      value.className = 'typeread-stats-value';
      value.textContent = m.value;
      row.appendChild(label);
      row.appendChild(value);
      panel.appendChild(row);
    });

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'typeread-stats-close';
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => panel.remove();
    panel.appendChild(closeBtn);

    document.body.appendChild(panel);
  }
}