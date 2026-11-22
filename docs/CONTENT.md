# Content source of truth

Extracted **verbatim** from the live site (`legacy/index.html`, = `main@93d9b4d`) and the CV source (`cv/index.html`). Phase 1 reuses this copy instead of rewriting it. Edits to wording happen here first, then in the site and the CV.

Project data for repos outside this one was read (read-only) from the local clones in `~/proyectos/`.

---

## Identity

- **Name:** Renzzo Gracia Gomez
- **Role:** Full-Stack Developer
- **Hero stack line:** Next.js · TypeScript · PostgreSQL · Python
- **Tagline:** I build web apps end to end — and ship them live.
- **CV role line:** Full-Stack Developer · Next.js, TypeScript, PostgreSQL, Python
- **Location:** Hermosillo, Sonora, Mexico
- **Remote:** Open to remote work
- **Languages:** Spanish (native) · English (intermediate–advanced)
- **Domain:** renzzogg.com

### Meta (SEO / social)

- **Title:** Renzzo Gracia Gomez — Full-Stack Developer
- **Meta description:** Renzzo Gracia Gomez, full-stack developer and Information Systems and Digital Networks Engineering student in Hermosillo, Mexico. I build web apps end to end with Next.js, TypeScript, PostgreSQL and Python — and ship them live.
- **OG / Twitter description:** Full-stack developer from Hermosillo, Mexico. I build web apps end to end with Next.js, TypeScript, PostgreSQL and Python — from database to deployment. Open to freelance projects.
- **OG image alt:** Renzzo Gracia Gomez — Full-Stack Developer — renzzogg.com

## About (page)

> I'm a full-stack developer who thinks end to end, studying Information Systems and Digital Networks Engineering. I built Stocktill, a multi-store POS and inventory SaaS with Next.js, TypeScript, Supabase/PostgreSQL and Stripe, where each business's data is isolated by Row-Level Security and 700+ automated tests run in CI on every push. I've also built and deployed a REST API in Python with FastAPI and PostgreSQL, and fast, polished front ends with React, Tailwind CSS and plain HTML, CSS and JavaScript. I ship what I build myself — Docker, custom domains and HTTPS included. Open to freelance projects.

The about card (`renzzo.json`) has three entries: location, remote and languages (see Identity).

## Summary (CV)

> Full-stack developer who thinks end to end, studying Information Systems and Digital Networks Engineering. I built Stocktill, a multi-store POS and inventory SaaS with Next.js, TypeScript, Supabase/PostgreSQL and Stripe, isolated by Row-Level Security and backed by 700+ automated tests in CI. I've also deployed a REST API in Python with FastAPI and PostgreSQL, and fast front ends with React and Tailwind CSS. I ship what I build myself — Docker, custom domains and HTTPS included. Open to freelance projects.

> **Note:** neither text mentions Clearline Dental (Django + React) yet. Update both once Clearline's skills are approved (see below).

## Skills (identical on page and CV)

| Group | Items |
| --- | --- |
| Front-end | HTML5, CSS3 (Grid, Flexbox), Sass, Tailwind CSS, Bootstrap, JavaScript, TypeScript, React, Next.js, SVG, Responsive Design |
| Back-end | Node.js, Python, FastAPI, PostgreSQL, Supabase, SQL, Row-Level Security, REST APIs, JWT auth, Stripe |
| Testing | Vitest, Playwright, pytest, pgTAP |
| DevOps & deployment | Docker, GitHub Actions (CI), Railway, Cloudflare (DNS, SSL), Custom domains |
| Libraries | Chart.js, jsPDF, SheetJS |
| Tools & workflow | Git, GitHub, Linux (WSL) |

Rule: Skills only lists technologies used in a published project.

**Candidates to add (awaiting approval)**, from Clearline Dental (published at clearline.renzzogg.com): Django, Django REST Framework, Vite, Tailwind CSS v4, Motion. React, TypeScript, PostgreSQL, Docker, GitHub Actions and Railway are already listed.

The portfolio itself will add Astro, Three.js and GSAP once it's live. GSAP is also used in Pulse Theory's `motion-redesign` branch; if that's deployed, GSAP qualifies now.

## Education

- **Degree (official name, English):** Information Systems and Digital Networks Engineering
- **Official name (Spanish, `lang="es"`):** Ingeniería en Sistemas de la Información y Redes Digitales
- **School:** Universidad Tecnológica de Hermosillo
- **Status:** 4th term · in progress

## Certifications (Platzi)

Profile: https://platzi.com/p/renzzo.gomez07/ ("View full Platzi profile →")

| Certificate | Diploma URL | On CV |
| --- | --- | --- |
| Frontend Developer | https://platzi.com/p/renzzo.gomez07/curso/2467-course/diploma/detalle/ | ✔ |
| JavaScript Fundamentals | https://platzi.com/p/renzzo.gomez07/curso/10266-course/diploma/detalle/ | ✔ |
| CSS Architecture | https://platzi.com/p/renzzo.gomez07/curso/7991-course/diploma/detalle/ | ✔ |
| Professional CSS Grid Layout | https://platzi.com/p/renzzo.gomez07/curso/2222-course/diploma/detalle/ | |
| CSS Grid Basics | https://platzi.com/p/renzzo.gomez07/curso/2474-course/diploma/detalle/ | |
| Web Design with CSS Grid & Flexbox | https://platzi.com/p/renzzo.gomez07/curso/2229-course/diploma/detalle/ | |
| Practical CSS Layout | https://platzi.com/p/renzzo.gomez07/curso/1744-course/diploma/detalle/ | |
| Sass Fundamentals | https://platzi.com/p/renzzo.gomez07/curso/6867-course/diploma/detalle/ | ✔ |
| Design for Developers | https://platzi.com/p/renzzo.gomez07/curso/1906-course/diploma/detalle/ | |
| Effective Design Systems | https://platzi.com/p/renzzo.gomez07/curso/1420-course/diploma/detalle/ | ✔ |

## Services

Section link: "Let's talk →" (to #contact).

| # | Title | Text | Stack |
| --- | --- | --- | --- |
| 01 | Web apps & SaaS | Dashboards, admin panels and apps with user accounts and roles — including subscriptions and payments with Stripe. | Next.js, Supabase, PostgreSQL, Stripe |
| 02 | APIs & back end | REST APIs with Node.js or Python, PostgreSQL database design, third-party integrations and webhooks. | Node.js, FastAPI, PostgreSQL, Webhooks |
| 03 | Landing pages & websites | Fast, responsive sites for products and small businesses — live on your own domain with HTTPS. | HTML, CSS, JavaScript, Tailwind CSS |

## Contact (links only)

- **Heading:** Let's work together
- **Intro:** Have a project in mind? Reach me through any of these channels.

| Label | Value | Href |
| --- | --- | --- |
| Email | renzzo.gomez07@gmail.com | `mailto:renzzo.gomez07@gmail.com` |
| GitHub | github.com/RenzzoGG | https://github.com/RenzzoGG |
| Platzi | platzi.com/p/renzzo.gomez07 | https://platzi.com/p/renzzo.gomez07/ |
| Resume (PDF) | renzzo-gracia-gomez-cv.pdf | `/renzzo-gracia-gomez-cv.pdf?v=11` (download) |

- **Footer:** © {year} Renzzo Gracia Gomez · renzzogg.com

---

## Projects

New layout: **Featured** (4 curved 3D screens) and **More work** (list).

Old screenshots live in `public/img/projects/`. Project repos also have screenshots in `docs/screenshots/`, but copy them into this repo only when Phase 2/5 needs them.

### Featured 1 — Clearline Dental *(new, not on the current site or CV)*

- **Type:** Full-stack web app
- **Live:** https://clearline.renzzogg.com · **Source:** https://github.com/RenzzoGG/clearline-dental
- **One-liner (provided by Renzzo):** Dental clinic booking system: Django REST API + React/TypeScript dashboard, overlap-proof bookings enforced by PostgreSQL, JWT roles, 98% backend test coverage, CI-gated deploys on Railway.
- **README intro:** Online booking and front-desk dashboard for a dental clinic. A Django REST API and a React SPA, deployed to production with CI, end-to-end tests and an animated, fast public site. *(Clearline is a fictional clinic, built as a portfolio project.)*
- **Features (README):** patients book a visit in five steps (service → dentist → date and time → details → confirm) with live availability. The front desk gets a week/day schedule per dentist color-coded by status, confirm/complete/cancel from a side drawer, and insights for 7/30/90 days. Admins manage dentists, services and patients, plus the Django admin. Public demo accounts exist, and demo data resets nightly.
- **Stack:** Django, DRF, PostgreSQL 17, React 19, TypeScript, Vite, Tailwind v4, Motion, Docker, GitHub Actions, Railway
- **Brand color** (`frontend/src/index.css`, `@theme`), teal `brand` scale: 50 `#effaf8` · 100 `#d6f2ec` · 200 `#aee4d9` · 300 `#7ccfc1` · **400 `#4cb3a5`** · **500 `#2f978a`** · **600 `#227a70`** · 700 `#1b625b` · 800 `#144f4a` · 900 `#0b3b37` · 950 `#062523`. Accent `coral`: 400 `#ff8f72` · 500 `#f4704f` · 600 `#de5636`. Suggested screen glow on dark bg: `#4cb3a5`.
- **Screenshots** (`~/proyectos/clearline-dental/docs/screenshots/`, webp): landing-hero, booking-service, booking-availability, patient-details, patient-review, patient-booked, reception-schedule, reception-insights, swagger, plus mobile-landing-hero, mobile-booking-availability, mobile-reception-schedule.

### Featured 2 — Pulse Theory

- **Type:** Landing page
- **Live:** https://pulse.renzzogg.com · **Source:** https://github.com/RenzzoGG/fitness-coach-landing
- **Page copy:** Built to turn visitors into free-consultation bookings: the coach's offer is clear at a glance, monthly and annual plans are easy to compare, and booking takes one short form. It loads fast on phones and works for everyone, including keyboard and screen-reader users.
- **Stats:** Lighthouse 97–100 mobile · 99–100 desktop · 15 KB CSS (brotli)
- **CV line:** Fitness coach landing on a custom Bootstrap 5 build with an accessible pricing toggle; Lighthouse 97–100.
- **Stack:** HTML, Bootstrap, Sass, JavaScript (GSAP on the `motion-redesign` branch)
- **Image alt:** Pulse Theory hero: "Train with intent. Get strong for real life." beside a hand gripping a dumbbell in a dark gym
- **Brand color** (`src/scss/_variables.scss`, `docs/DESIGN.md`): `$primary: $volt` = **`#C6F432`** (volt), on ink.
- **Images here:** `public/img/projects/pulse-theory-{400,800}.{avif,webp}`

### Featured 3 — Fernwick Platform (+ Fernwick landing)

- **Type:** Full-stack web app
- **Live:** https://fernwick-admin.renzzogg.com · **Landing:** https://fernwick.renzzogg.com
- **Source:** https://github.com/RenzzoGG/fernwick-platform · **Landing source:** https://github.com/RenzzoGG/fernwick-home-cleaning
- **Page copy:** Quote management system for a cleaning business: requests sent from the landing page are saved through a FastAPI + PostgreSQL API, and the team tracks them in a React dashboard with search, status history and metrics. The public demo is read-only and can't see real customer data — the database itself enforces it with Row-Level Security.
- **Stats:** 300+ pytest tests · PostgreSQL Row-Level Security · JWT auth
- **CV line:** Quote system for a cleaning business: landing form → FastAPI + PostgreSQL API → React dashboard. Read-only public demo isolated by Row-Level Security; JWT auth; 300+ pytest tests.
- **Stack:** React, TypeScript, Tailwind CSS, Python, FastAPI, PostgreSQL
- **Image alt:** Fernwick Admin dashboard in demo mode with quote totals and a quotes-per-day bar chart for the last 30 days
- **Brand color** (`admin/src/index.css`, same in `fernwick-home-cleaning/styles/input.css`), teal `brand`: 50 `#f0fdfa` · 100 `#ccfbf1` · 200 `#99f6e4` · **300 `#5eead4`** · **600 `#0d9488`** · 700 `#0f766e` · 800 `#115e59` · 900 `#134e4a`. Secondary `sky-700` `#0369a1`, `sun-400` `#fbbf24`.
- ⚠ **Fernwick and Clearline are both teal.** Phase 1 should pick hues that keep them apart on screen. One option is Fernwick `#5eead4` (cyan-teal) vs Clearline `#4cb3a5`, or Clearline leaning on its coral accent.
- **Images here:** `public/img/projects/fernwick-platform-{640,1200}.{avif,webp}`. In repo: `docs/screenshots/{dashboard,landing,mobile,quote-detail,quotes-list}.png`.

### Featured 4 — Stocktill

- **Title:** Stocktill — Multi-Store POS & Inventory SaaS
- **Type:** Full-stack SaaS
- **Live:** https://stocktill.renzzogg.com · **Source:** https://github.com/RenzzoGG/retail-pos-saas
- **Page copy:** Point of sale and inventory for many stores on one platform, where each business only ever sees its own data. The barcode-scanner checkout works on desktop and on phones; owner, admin and cashier roles are enforced with Row-Level Security in PostgreSQL; billing runs on Stripe with a free trial; and it ships as a Docker container.
- **Stats:** 700+ tests in CI · RLS on 20/20 tables · 3 roles
- **CV line:** Multi-tenant POS where each business only sees its own data. Barcode checkout on desktop and mobile; owner/admin/cashier roles enforced with PostgreSQL RLS; Stripe billing with a free trial; 700+ tests (Vitest, pgTAP, Playwright) in GitHub Actions on every push; Docker.
- **Stack:** Next.js, TypeScript, Supabase / PostgreSQL, Stripe, Docker
- **Case study:**
  - **Problem:** Small shops run the counter on spreadsheets: stock drifts, cashiers can see margins they shouldn't, and nobody knows who changed what.
  - **Solution:** A fast register for any USB scanner or the keyboard alone, inventory with low-stock alerts and Excel import, reports, returns and an activity log.
  - **Technical decisions:** Tenant isolation and roles live in PostgreSQL RLS, not just the UI. Stock only changes through database functions that log every movement, and money is stored as exact decimals.
  - **Result:** A live public demo backed by unit, pgTAP, integration and Playwright end-to-end tests that run in GitHub Actions on every push.
- **Gallery (images here):**
  - `stocktill-cover-{640,1200}`, alt: "Stocktill cover: the owner dashboard with today's, this week's and this month's sales on a laptop, next to the point-of-sale cart on a phone"
  - `stocktill-dashboard-{480,960}` "Owner dashboard", alt: "Owner dashboard with a low-stock alert, sales for today, this week and this month, and a sales-per-day bar chart"
  - `stocktill-pos-{480,960}` "Barcode checkout (cashier)", alt: "Point-of-sale screen signed in as a cashier, with four scanned products in the cart and a Charge $105.95 button"
  - `stocktill-reports-{480,960}` "Reports with Excel export", alt: "Monthly report with gross sales, refunds, net sales and gross profit, an Export to Excel button and a sales-by-day chart"
- **TODO:** brand color tokens (`retail-pos-saas` isn't cloned on this laptop), plus any extra screenshots.

### More work — Fernwick Home Cleaning (landing)

- **Live:** https://fernwick.renzzogg.com · **Source:** https://github.com/RenzzoGG/fernwick-home-cleaning
- **README:** Marketing landing page for a fictional residential cleaning service, built with HTML, Tailwind CSS and a little vanilla JavaScript. It has a hero, services, "Book in three simple steps", pricing, reviews, FAQ, and a free quote form that sends to the Fernwick API with `fetch`.
- **Note:** on the old site it shares a card with Fernwick Platform. It's a separate list item in the new layout.
- **Brand:** same teal scale as Fernwick Platform.
- **Screenshots in repo:** `docs/screenshots/{desktop-hero,desktop-pricing,mobile-hero}.webp`

### More work — UIFlow Landing Page

- **Type:** Landing page
- **Live:** https://uiflow.renzzogg.com · **Source:** https://github.com/RenzzoGG/uiflow
- **Copy:** Landing page for a fictional dashboard tool with strong visual hierarchy, an accessible mobile menu and FAQ, and a self-hosted custom font.
- **Stack:** HTML, CSS, JavaScript
- **Image alt:** UIFlow landing hero: "Design Better Dashboards, Faster." next to a dark dashboard card with KPIs and a revenue chart
- **Brand** (`assets/css/style.css`): `--primary: #4b6bff`

### More work — UIFlow Admin Dashboard

- **Type:** Web app
- **Live:** https://uiflow.renzzogg.com/dashboard.html · **Source:** https://github.com/RenzzoGG/uiflow
- **Copy:** Admin dashboard with range-filtered analytics, a searchable, sortable users table, a remembered dark mode and a layout that works on phones.
- **Stack:** HTML, CSS, JavaScript, Chart.js
- **Image alt:** UIFlow admin dashboard in dark mode with revenue, users, session and conversion KPIs above a revenue line chart
- **CV line (combined):** UIFlow — Admin dashboard & landing page: Dashboard with range-filtered analytics, a sortable table and dark mode, plus its accessible landing page.

### More work — Inventory & Sales Dashboard

- **Type:** Web app
- **Live:** https://inventory.renzzogg.com · **Source:** https://github.com/RenzzoGG/inventory-sales-dashboard
- **Copy:** Inventory and sales dashboard where every metric agrees: a hand-built SVG 30-day revenue chart, Products, Sales, Reports and Settings views, PDF and Excel export, and a mobile-ready layout.
- **CV line:** Inventory and sales dashboard with a hand-built SVG revenue chart, PDF/Excel export and mobile layout.
- **Stack:** HTML, CSS, JavaScript, SVG, jsPDF, SheetJS
- **Image alt:** Inventory & Sales Dashboard preview with 30-day revenue, low-stock count and a daily revenue bar chart
- **Brand** (`styles.css`): `--accent: #4f7cff`, `--accent-strong: #3563e9`

### Link conventions (keep)

- External links open in a new tab with `target="_blank" rel="noopener noreferrer"`, plus a visually hidden "(opens in new tab)" suffix.
- Link labels on the old site: "Live demo" / "Live", "Code" / "Source", "Landing", "Landing source".
