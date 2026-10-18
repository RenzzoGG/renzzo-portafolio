# renzzogg.com

Personal portfolio and CV of Renzzo Gracia Gomez, Front-End Developer.

**Live site:** [https://renzzogg.com](https://renzzogg.com)

## Stack

- HTML, CSS and vanilla JavaScript
- No frameworks, no build step, no npm dependencies
- Fonts from Google Fonts (Inter, JetBrains Mono)
- Light/dark theme, responsive, mobile-first

## Project structure

```
.
├── public/                        # Everything here is published
│   ├── index.html                 # Portfolio page
│   ├── css/styles.css
│   ├── js/main.js
│   ├── favicon.svg
│   ├── renzzo-gracia-gomez-cv.pdf # Downloadable CV (exported from cv/)
│   └── projects/                  # Live project demos
│       ├── inventory-dashboard/
│       └── UIFlow/                # Landing page + admin dashboard
└── cv/                            # Source of the CV (not published)
    ├── index.html
    └── cv.css
```

## Local preview

Requires Python 3.

```bash
python3 -m http.server 8000 -d public
```

Then open <http://localhost:8000>.

## Updating the CV

1. Serve the source: `python3 -m http.server 8001 -d cv`, then open <http://localhost:8001>.
2. Print it from Chrome (`Ctrl + P`) as **Save as PDF**, Letter size, default margins, headers and footers off.
3. Replace `public/renzzo-gracia-gomez-cv.pdf` with the new file.
4. In `public/index.html`, increment the `?v=` number in the "Download CV" link (e.g. `?v=2` → `?v=3`) so browsers and Cloudflare fetch the new PDF instead of a cached copy.

## Deployment

The site is hosted on [Railway](https://railway.com). Railpack detects the `public/` folder and serves it as a static site. Every push to `main` is deployed automatically to https://renzzogg.com, behind Cloudflare (DNS and SSL).
