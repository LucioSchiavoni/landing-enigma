const waToggle = document.querySelector<HTMLButtonElement>('[data-wa-toggle]');
const waMenu = document.querySelector<HTMLElement>('[data-wa-menu]');

if (waToggle && waMenu) {
  const message = encodeURIComponent(waMenu.dataset.waText ?? '');

  waMenu.querySelectorAll<HTMLAnchorElement>('[data-wa]').forEach((link) => {
    const number = (link.dataset.wa ?? '').split('.').reverse().join('');
    link.href = `https://wa.me/${number}?text=${message}`;
  });

  const isOpen = () => waToggle.getAttribute('aria-expanded') === 'true';

  const setOpen = (open: boolean, restoreFocus = false) => {
    waToggle.setAttribute('aria-expanded', String(open));
    waMenu.hidden = !open;
    if (open) {
      waMenu.querySelector<HTMLAnchorElement>('[data-wa]')?.focus();
    } else if (restoreFocus) {
      waToggle.focus();
    }
  };

  waToggle.addEventListener('click', () => setOpen(!isOpen()));

  waMenu.querySelectorAll<HTMLAnchorElement>('[data-wa]').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('click', (event) => {
    if (!isOpen()) return;
    const target = event.target as Node;
    if (!waMenu.contains(target) && !waToggle.contains(target)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) setOpen(false, true);
  });
}
