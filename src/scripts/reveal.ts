const targets = document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-stagger], [data-reveal-flow]');

if (targets.length > 0) {
  if (!('IntersectionObserver' in window)) {
    targets.forEach((target) => target.setAttribute('data-visible', ''));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute('data-visible', '');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    targets.forEach((target) => observer.observe(target));
  }
}
