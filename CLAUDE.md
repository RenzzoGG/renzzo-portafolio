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
├── og-image.png                 # Imagen Open Graph 1200×630 (generada desde og/)
└── renzzo-gracia-gomez-cv.pdf   # CV descargable (exportado desde cv/)
cv/                              # Fuente HTML/CSS del CV (no se publica)
├── index.html
└── cv.css
og/                              # Plantilla de la imagen Open Graph (no se publica)
└── og-image.html
.gitignore
README.md
CLAUDE.md
```

- El sitio viejo (`index.html`, `style.css`, `script.js` y `assets/` en la raíz) **ya no existe**; se borró en la fase de limpieza.

## Proyectos (repos separados)

Cada proyecto vive en su propio repo y subdominio; este repo solo enlaza a ellos desde la sección Projects de `public/index.html` y desde `cv/index.html`. Si cambia un enlace, actualízalo en ambos.

| Proyecto | Live | Source |
| --- | --- | --- |
| Pulse Theory | https://pulse.renzzogg.com | https://github.com/RenzzoGG/fitness-coach-landing |
| Fernwick Home Cleaning | https://fernwick.renzzogg.com | https://github.com/RenzzoGG/fernwick-home-cleaning |
| Inventory & Sales Dashboard | https://inventory.renzzogg.com | https://github.com/RenzzoGG/inventory-sales-dashboard |
| UIFlow Admin Dashboard | https://uiflow.renzzogg.com/dashboard.html | https://github.com/RenzzoGG/uiflow |
| UIFlow Landing Page | https://uiflow.renzzogg.com | https://github.com/RenzzoGG/uiflow |

- Los enlaces Live de las tarjetas abren en nueva pestaña (`target="_blank" rel="noopener noreferrer"`).
- El build de Tailwind de Fernwick y sus reglas de npm viven en el repo `fernwick-home-cleaning`, no aquí.
- El CV se edita en `cv/`, se exporta a PDF con Chrome (Carta, una sola página) y se reemplaza `public/renzzo-gracia-gomez-cv.pdf`.
- La imagen Open Graph se edita en `og/og-image.html` y se captura con Chrome headless a `public/og-image.png` (comando en README.md).
- **Cada vez que se actualice el PDF del CV, incrementa el número de `?v=`** en el enlace "Resume (PDF)" de la sección Contact de `public/index.html` (por ejemplo `?v=2` → `?v=3`). Así navegadores y Cloudflare descargan la versión nueva en lugar de una copia en caché.
- **Lo mismo con el CSS y el JS:** cada vez que cambie `public/css/styles.css` o `public/js/main.js`, incrementa el `?v=` de su enlace en el `<head>` de `public/index.html` (`/css/styles.css?v=2` → `?v=3`, `/js/main.js?v=2` → `?v=3`). Cada archivo lleva su propio número; solo sube el del archivo que cambió.
- **Skills solo incluye tecnologías usadas en un proyecto publicado en el portafolio.** Al terminar un proyecto con una tecnología nueva, se agrega a Skills tanto en la página (`public/index.html`) como en el CV (`cv/index.html`).

## Forma de trabajo

- Soy estudiante de Ingeniería de Software y quiero aprender: **explica las decisiones importantes antes de implementarlas** (qué opciones hay, cuál recomiendas y por qué).

## Git

- Trabajamos directo en la rama `main`, **sin crear ramas nuevas**.
- Haz commits **locales** con mensajes claros en español.
- **NUNCA** hagas `git push` ni ningún otro comando que suba cambios al remoto. El push lo hago yo.

## Stack

- HTML, CSS y JavaScript puro.
- Sin frameworks, sin build y sin dependencias de npm, salvo que yo lo apruebe explícitamente. No agregues un `package.json` en este repo (Railpack podría tratar el sitio como app de Node).
- El sitio **no usa Firebase**.
- El portafolio no carga librerías desde CDN (sí puede usar Google Fonts).
- Vista previa local: `python3 -m http.server 8000 -d public` → `http://localhost:8000`.

## Reporte al terminar cada tarea

Al terminar cada tarea, entrega un **REPORTE** con:

1. Qué hiciste.
2. Archivos creados / modificados / borrados.
3. Commits hechos (hash y mensaje).
4. Problemas o dudas.
5. Siguientes pasos sugeridos.
