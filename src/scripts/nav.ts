const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.querySelector<HTMLElement>('[data-menu]');
const backdrop = document.querySelector<HTMLElement>('[data-menu-backdrop]');
const closeButton = document.querySelector<HTMLButtonElement>('[data-menu-close]');
const bar = document.querySelector<HTMLElement>('[data-nav-bar]');
const main = document.querySelector<HTMLElement>('main');

if (toggle && menu && backdrop && closeButton) {
  const desktop = window.matchMedia('(min-width: 64rem)');

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  const setOpen = (open: boolean, restoreFocus = true) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.toggleAttribute('data-open', open);
    backdrop.toggleAttribute('data-open', open);
    document.documentElement.classList.toggle('is-locked', open);
    bar?.toggleAttribute('inert', open);
    main?.toggleAttribute('inert', open);

    if (open) {
      closeButton.focus();
    } else if (restoreFocus) {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));
  closeButton.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));

  menu.querySelectorAll<HTMLAnchorElement>('[data-menu-link]').forEach((link) => {
    link.addEventListener('click', () => setOpen(false, false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
    }
  });

  desktop.addEventListener('change', (event) => {
    if (event.matches && isOpen()) {
      setOpen(false, false);
    }
  });
}
