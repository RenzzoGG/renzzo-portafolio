# CLAUDE.md

Reglas de trabajo para este repositorio.

## Sobre el proyecto

- Portafolio / CV personal de Renzzo.
- Desplegado en **Railway** en **renzzogg.com** desde la rama `main`.
- **Cada push a `main` se publica en vivo** en renzzogg.com vía Railway.
- Railway (Railpack) detecta la carpeta `public/` y la sirve como sitio estático. **Solo lo que está en `public/` es público.**

## Estructura del repo

```
public/                          # Sitio publicado
├── index.html                   # Página del portafolio
├── css/styles.css
├── js/main.js
├── favicon.svg
├── renzzo-gracia-gomez-cv.pdf   # CV descargable (exportado desde cv/)
└── projects/                    # Demos de proyectos, cada uno autocontenido
    ├── cleaning-landing/        # Build compilado (no editar a mano; se genera desde src/)
    ├── inventory-dashboard/
    └── UIFlow/                  # Landing (index.html) + dashboard (dashboard.html)
src/                             # Fuentes con paso de build (no se publican)
└── cleaning-landing/            # Landing con Tailwind CSS (package.json, index.html, styles/, js/, assets/)
cv/                              # Fuente HTML/CSS del CV (no se publica)
README.md
CLAUDE.md
```

- El sitio viejo (`index.html`, `style.css`, `script.js` y `assets/` en la raíz) **ya no existe**; se borró en la fase de limpieza.
- El CV se edita en `cv/`, se exporta a PDF con Chrome (Carta, una sola página) y se reemplaza `public/renzzo-gracia-gomez-cv.pdf`.
- **Cada vez que se actualice el PDF del CV, incrementa el número de `?v=`** en el enlace del botón "Download CV" de `public/index.html` (por ejemplo `?v=2` → `?v=3`). Así navegadores y Cloudflare descargan la versión nueva en lugar de una copia en caché.

## Forma de trabajo

- Soy estudiante de Ingeniería de Software y quiero aprender: **explica las decisiones importantes antes de implementarlas** (qué opciones hay, cuál recomiendas y por qué).

## Git

- Trabajamos directo en la rama `main`, **sin crear ramas nuevas**.
- Haz commits **locales** con mensajes claros en español.
- **NUNCA** hagas `git push` ni ningún otro comando que suba cambios al remoto. El push lo hago yo.

## Stack

- HTML, CSS y JavaScript puro.
- Sin frameworks ni dependencias de npm, salvo que yo lo apruebe explícitamente.
- El sitio **no usa Firebase**.
- **Excepción de npm aprobada:** solo dentro de `src/cleaning-landing/`, para Tailwind CSS (`tailwindcss` y `@tailwindcss/cli`, versión exacta fijada en `package.json`). Nada global ni en la raíz del repo (un `package.json` en la raíz podría hacer que Railpack trate el sitio como app de Node).
- El portafolio no carga librerías desde CDN (sí puede usar Google Fonts). Los proyectos de `public/projects/` sí pueden usar CDN, siempre con versión exacta.

## Build de la landing con Tailwind (`src/cleaning-landing/`)

- Se edita **solo** `src/cleaning-landing/` (nunca `public/projects/cleaning-landing/` a mano).
- Comandos, desde `src/cleaning-landing/`:
  - `npm ci` — instala exactamente lo de `package-lock.json` (primera vez o tras clonar).
  - `npm run dev` — copia HTML/JS/assets y regenera el CSS al guardar. Ver en otra terminal con `python3 -m http.server 8000 -d public` → `http://localhost:8000/projects/cleaning-landing/`.
  - `npm run build` — limpia `public/projects/cleaning-landing/`, copia los estáticos y genera `css/styles.css` minificado.
- Railway **no** ejecuta el build: corre `npm run build` antes de cada commit que toque la landing y commitea el resultado de `public/`.
- Se commitean `package.json`, `package-lock.json` y el CSS compilado; `node_modules/` está en `.gitignore`.
- La configuración de Tailwind v4 está en `styles/input.css` (`@theme`, `@source`); no hay `tailwind.config.js`. No construir nombres de clase concatenando strings en JS: el escáner no los detecta.

## Reporte al terminar cada tarea

Al terminar cada tarea, entrega un **REPORTE** con:

1. Qué hiciste.
2. Archivos creados / modificados / borrados.
3. Commits hechos (hash y mensaje).
4. Problemas o dudas.
5. Siguientes pasos sugeridos.
