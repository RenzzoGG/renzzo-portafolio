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
    ├── inventory-dashboard/
    └── UIFlow/                  # Landing (index.html) + dashboard (dashboard.html)
cv/                              # Fuente HTML/CSS del CV (no se publica)
README.md
CLAUDE.md
```

- El sitio viejo (`index.html`, `style.css`, `script.js` y `assets/` en la raíz) **ya no existe**; se borró en la fase de limpieza.
- El CV se edita en `cv/`, se exporta a PDF con Chrome (Carta, una sola página) y se reemplaza `public/renzzo-gracia-gomez-cv.pdf`.

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
- El portafolio no carga librerías desde CDN (sí puede usar Google Fonts). Los proyectos de `public/projects/` sí pueden usar CDN, siempre con versión exacta.

## Reporte al terminar cada tarea

Al terminar cada tarea, entrega un **REPORTE** con:

1. Qué hiciste.
2. Archivos creados / modificados / borrados.
3. Commits hechos (hash y mensaje).
4. Problemas o dudas.
5. Siguientes pasos sugeridos.
