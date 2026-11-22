// =========================================================
// Portafolio — Renzzo Gracia Gomez
// Tema claro/oscuro, menú móvil, enlace activo, animaciones y año.
// El tema guardado se aplica antes en un <script> inline del <head>
// para evitar el parpadeo; aquí solo se maneja el botón.
// =========================================================

const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ===== Tema claro/oscuro =====
const themeToggle = document.querySelector('.theme-toggle');
const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');

function getCurrentTheme() {
  const chosen = root.getAttribute('data-theme');
  if (chosen === 'light' || chosen === 'dark') return chosen;
  return systemDark.matches ? 'dark' : 'light';
}

function updateThemeUI() {
  const theme = getCurrentTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${next} theme`);

  // Color de la barra del navegador en móvil
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  themeColorMetas.forEach((meta) => meta.setAttribute('content', bg));
}

themeToggle.addEventListener('click', () => {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try {
    localStorage.setItem('theme', next);
  } catch (e) {
    // localStorage puede no estar disponible (modo privado, bloqueado); el tema igual cambia
  }
  updateThemeUI();
});

// Si el usuario no eligió tema, seguimos los cambios del sistema
systemDark.addEventListener('change', updateThemeUI);
updateThemeUI();

// ===== Menú móvil =====
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.getElementById('nav-menu');
const desktop = window.matchMedia('(min-width: 960px)');

function setMenuOpen(open) {
  navMenu.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

menuToggle.addEventListener('click', () => {
  setMenuOpen(!navMenu.classList.contains('is-open'));
});

// Cerrar al elegir una sección
navMenu.addEventListener('click', (e) => {
  if (e.target.closest('a')) setMenuOpen(false);
});

// Cerrar con Escape y regresar el foco al botón
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navMenu.classList.contains('is-open')) {
    setMenuOpen(false);
    menuToggle.focus();
  }
});

// Al pasar a desktop el menú siempre se ve; reiniciamos su estado
desktop.addEventListener('change', () => setMenuOpen(false));

// ===== Enlace activo en el menú según la sección visible =====
const navLinks = navMenu.querySelectorAll('a[href^="#"]');
const sections = [...navLinks]
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const isCurrent = link.getAttribute('href') === `#${entry.target.id}`;
          if (isCurrent) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    },
    // Cuenta como "visible" la sección que cruza la franja central de la pantalla
    { rootMargin: '-45% 0px -50% 0px' }
  );
  sections.forEach((section) => sectionObserver.observe(section));
}

// ===== Animación de entrada al hacer scroll =====
const revealItems = document.querySelectorAll('.reveal');

if (reducedMotion.matches || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // se anima una sola vez
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  revealItems.forEach((item) => revealObserver.observe(item));
}

// ===== Año actual en el footer =====
document.getElementById('year').textContent = new Date().getFullYear();
