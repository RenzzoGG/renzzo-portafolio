# renzzogg.com

Personal portfolio and CV of Renzzo Gracia Gomez, Full Stack Developer.

**Live site:** [https://renzzogg.com](https://renzzogg.com)

## Stack

- HTML, CSS and vanilla JavaScript
- No frameworks, no build step and no npm dependencies
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
│   ├── og-image.png               # Social preview image (generated from og/)
│   └── renzzo-gracia-gomez-cv.pdf # Downloadable CV (exported from cv/)
├── cv/                            # Source of the CV (not published)
│   ├── index.html
│   └── cv.css
└── og/                            # Source of the Open Graph image (not published)
    └── og-image.html
```

## Projects

Each project lives in its own repository and is deployed to its own subdomain. This repo only links to them.

| Project | Live | Source |
| --- | --- | --- |
| Fernwick Platform | [fernwick-admin.renzzogg.com](https://fernwick-admin.renzzogg.com) | [RenzzoGG/fernwick-platform](https://github.com/RenzzoGG/fernwick-platform) |
| Pulse Theory | [pulse.renzzogg.com](https://pulse.renzzogg.com) | [RenzzoGG/fitness-coach-landing](https://github.com/RenzzoGG/fitness-coach-landing) |
| Fernwick Home Cleaning (landing of Fernwick Platform) | [fernwick.renzzogg.com](https://fernwick.renzzogg.com) | [RenzzoGG/fernwick-home-cleaning](https://github.com/RenzzoGG/fernwick-home-cleaning) |
| Inventory & Sales Dashboard | [inventory.renzzogg.com](https://inventory.renzzogg.com) | [RenzzoGG/inventory-sales-dashboard](https://github.com/RenzzoGG/inventory-sales-dashboard) |
| UIFlow Admin Dashboard | [uiflow.renzzogg.com/dashboard.html](https://uiflow.renzzogg.com/dashboard.html) | [RenzzoGG/uiflow](https://github.com/RenzzoGG/uiflow) |
| UIFlow Landing Page | [uiflow.renzzogg.com](https://uiflow.renzzogg.com) | [RenzzoGG/uiflow](https://github.com/RenzzoGG/uiflow) |

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
4. In `public/index.html`, increment the `?v=` number in the "Resume (PDF)" link (e.g. `?v=2` → `?v=3`) so browsers and Cloudflare fetch the new PDF instead of a cached copy.

## Open Graph image

`public/og-image.png` (1200×630) is the preview shown when renzzogg.com is shared on LinkedIn, WhatsApp, etc. To regenerate it after editing `og/og-image.html`, take a screenshot with headless Chrome from the repo root (WSL with Chrome installed on Windows):

```bash
"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=5000 \
  --screenshot="$(wslpath -w "$PWD/public")\\og-image.png" \
  "file:///$(wslpath -w og/og-image.html | sed 's#\\#/#g')"
```

Social networks cache previews, so after deploying use [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) to refresh it.

## Deployment

The site is hosted on [Railway](https://railway.com). Railpack detects the `public/` folder and serves it as a static site. Every push to `main` is deployed automatically to https://renzzogg.com, behind Cloudflare (DNS and SSL).
