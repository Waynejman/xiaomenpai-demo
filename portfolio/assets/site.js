const anchoredDetails = () => {
  const id = window.location.hash.slice(1);
  const target = document.getElementById(id);
  if (target instanceof HTMLDetailsElement) target.open = true;
};

window.addEventListener('hashchange', anchoredDetails);
anchoredDetails();

if ('IntersectionObserver' in window && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  const observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      target.classList.add('arrived');
      observer.unobserve(target);
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
}
