export const compactViewportQuery = '(max-width: 900px), (max-width: 1100px) and (max-height: 500px)';

// Move the existing controls rather than duplicating filters or their state.
export function createFilterPanel({ onReset, onClose }) {
  const dialog = document.querySelector('#filter-dialog');
  const body = document.querySelector('#filter-dialog-body');
  const toggle = document.querySelector('#mobile-filter-toggle');
  const badge = document.querySelector('#mobile-filter-count');
  const summary = document.querySelector('#active-filter-summary');
  const apply = document.querySelector('#filter-dialog-apply');
  const compact = matchMedia(compactViewportQuery);
  const controls = ['.filter-group', '.platform-field', '.year-field', '#screenshots-filter'].map((selector) => {
    const control = document.querySelector(selector);
    const anchor = document.createComment('filter position');
    control.before(anchor);
    return { control, anchor };
  });

  function close() {
    if (dialog.open) dialog.close();
  }

  function updateLayout() {
    const hadFocus = dialog.contains(document.activeElement);
    close();
    toggle.hidden = !compact.matches;
    controls.forEach(({ control, anchor }) => {
      if (compact.matches) body.append(control);
      else anchor.after(control);
    });
    if (hadFocus && !compact.matches) document.querySelector('#search').focus({ preventScroll: true });
  }

  toggle.addEventListener('click', () => {
    dialog.showModal();
    document.documentElement.classList.add('filters-open');
    toggle.setAttribute('aria-expanded', 'true');
  });
  document.querySelector('#filter-dialog-close').addEventListener('click', close);
  apply.addEventListener('click', close);
  document.querySelector('#filter-dialog-reset').addEventListener('click', onReset);
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('filters-open');
    toggle.setAttribute('aria-expanded', 'false');
    onClose();
  });
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientY < bounds.top || event.clientY > bounds.bottom
      || event.clientX < bounds.left || event.clientX > bounds.right)) close();
  });
  compact.addEventListener('change', updateLayout);
  updateLayout();

  return {
    close,
    sync(state, labels) {
      const active = [
        state.status !== 'all' ? labels.status[state.status] : null,
        state.platform !== 'all' ? labels.platform[state.platform] ?? state.platform.replaceAll('_', ' ') : null,
        state.year !== 'all' ? state.year : null,
        state.screenshots ? 'Con screenshot' : null,
      ].filter(Boolean);
      badge.hidden = active.length === 0;
      badge.textContent = active.length;
      toggle.setAttribute('aria-label', active.length ? `Filtri, ${active.length} attivi` : 'Filtri');
      summary.hidden = active.length === 0;
      summary.textContent = active.join(' · ');
    },
    setResult(count) {
      apply.textContent = count === 1 ? 'Mostra 1 gioco' : `Mostra ${count} giochi`;
    },
  };
}
