# Copy review (resolved 2026-11-22)

Renzzo chose the copy below. It now lives in `docs/CONTENT.md` and the content collections, which are the source of truth.

Clearline, Pulse Theory, Fernwick and Stocktill are fictional brands built as portfolio projects, so the copy calls them projects and never clients.

## Chosen copy

**Hero (option A)**

- **Headline:** I build web apps end to end and ship them live.
- **Subline:** Full-Stack Developer in Hermosillo, Mexico. Available for freelance projects, from the database to the deployed product.

**About**

> I'm a Full-Stack Developer based in Hermosillo, Mexico, studying Information Systems and Digital Networks Engineering. My portfolio projects cover the whole product. Clearline Dental is a booking system with a Django REST API and a React dashboard, where PostgreSQL itself prevents overlapping appointments. Stocktill is a multi-store POS and inventory SaaS with Next.js, Supabase and Stripe, where Row-Level Security isolates each business's data and 700+ automated tests run in CI on every push. I also care about how an interface feels: for Pulse Theory, I built a GSAP motion redesign that stays accessible, with a switch that turns all motion off. I deploy what I build myself, Docker, custom domains and HTTPS included. Open to freelance projects.

**Featured project one-liners**

- **Clearline Dental:** A dental clinic booking system where PostgreSQL makes double bookings impossible, with a Django API, a React dashboard and 98% backend test coverage.
- **Pulse Theory:** A fast, accessible coaching landing page with GSAP scroll motion that visitors can turn off.
- **Fernwick Platform:** A quote management system that takes requests from a landing page to a React dashboard, with a read-only demo enforced by the database.
- **Stocktill:** A multi-store POS and inventory SaaS where each business only sees its own data, backed by 700+ automated tests.

## Number verification (2026-11-22)

| Claim                          | Source                                                     | Result                                                                                    |
| ------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Clearline 98% backend coverage | CI's pytest command at `dcfc638`, run in a clean container | 98% (1,912 statements, 40 missed), 189 tests passed                                       |
| Stocktill 700+ tests in CI     | Suites CI runs at `178d43b`                                | 742: 267 unit, 62 integration, 28 e2e, 385 pgTAP assertions                               |
| Stocktill RLS on 20/20 tables  | Migrations                                                 | 20 of 20 public tables. Two internal `app.demo_*` tables have all access revoked instead. |
| Fernwick 300+ pytest tests     | `pytest --collect-only` at `d2ac0c7`                       | 329 collected                                                                             |
| Pulse Lighthouse 100           | `docs/upwork-catalog/v2/DESCRIPTION.md` at `39625d6`       | Median of 5 runs. Mobile runs were 88, 100, 100, 98, 100.                                 |
| Pulse critical JS 14.9 KB      | Same file                                                  | Minified                                                                                  |
| Pulse motion chunk 51.8 KB     | Same file                                                  | Gzip. The repo's README still says 51.7 KB.                                               |
