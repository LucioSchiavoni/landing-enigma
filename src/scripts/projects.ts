const root = document.querySelector<HTMLElement>('[data-projects]');

if (root) {
  const desktop = window.matchMedia('(min-width: 64rem) and (scripting: enabled)');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const HOVER_DELAY = 120;

  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-project]')).map((panel) => ({
    panel,
    trigger: panel.querySelector<HTMLButtonElement>('[data-project-trigger]'),
    content: panel.querySelector<HTMLElement>('[data-project-content]'),
    video: panel.querySelector<HTMLVideoElement>('[data-project-video]'),
  }));

  let active = Number(root.dataset.active ?? 0);
  let hoverTimer: number | undefined;

  const render = () => {
    root.dataset.active = String(active);
    panels.forEach(({ panel, trigger, content, video }, i) => {
      const open = i === active;
      panel.toggleAttribute('data-open', open);
      trigger?.setAttribute('aria-expanded', String(open));
      if (content) content.inert = !open;
      if (!video) return;
      if (open && !reducedMotion.matches) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  };

  const activate = (index: number) => {
    if (index === active) return;
    active = index;
    render();
  };

  panels.forEach(({ panel, trigger }, i) => {
    trigger?.addEventListener('click', () => {
      if (desktop.matches) {
        activate(i);
      } else {
        active = active === i ? -1 : i;
        render();
      }
    });

    trigger?.addEventListener('focus', () => {
      if (desktop.matches) activate(i);
    });

    panel.addEventListener('pointerenter', () => {
      if (!desktop.matches || !canHover.matches) return;
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => activate(i), HOVER_DELAY);
    });

    panel.addEventListener('pointerleave', () => {
      window.clearTimeout(hoverTimer);
    });
  });

  desktop.addEventListener('change', (event) => {
    if (event.matches && active < 0) {
      active = 0;
      render();
    }
  });

  render();
}
