# Real-device testing

How to put the `redesign` branch on a temporary HTTPS URL and test it on a phone. HTTPS is required: iOS only offers the gyroscope permission on a secure page.

These steps were written from Railway's and Railpack's current docs. They have **not been run**, because Claude doesn't push or touch Railway. Labels in the dashboard may differ slightly.

## Why these settings

- **An empty environment, not a duplicate.** Railway's docs don't say whether duplicating copies custom domains. An empty environment can't inherit `renzzogg.com`.
- **Explicit build and start commands.** Railpack looks for `astro.config.js`, this repo has `astro.config.mjs`, and a `public/` folder can make it treat the repo as a plain static site. That would publish `public/` instead of the built `dist/`.
- **No Railway file is committed.** The real launch configuration belongs to Phase 8.

## Deploy the preview

1. Push the branch from your terminal. This never touches `main`:

   ```bash
   git push origin redesign
   ```

2. In Railway, open the project that hosts the site. Note the latest deployment of the **production** service, so you can compare it in step 9.
3. Open the environment dropdown in the top bar, choose **+ New Environment**, then **Empty Environment**. Name it `redesign-preview`.
4. **Check the dropdown now says `redesign-preview`.** Everything below must happen there.
5. Choose **+ New**, then **GitHub Repo**, and pick this repository. If it starts deploying `main`, that's harmless here. It stays inside this environment.
6. Open the new service's **Settings** and set:

   | Setting        | Value                        |
   | -------------- | ---------------------------- |
   | Source: branch | `redesign`                   |
   | Build command  | `npm run build`              |
   | Start command  | `node scripts/serve-dist.ts` |

7. Open **Variables** and add:

   | Variable                | Value     |
   | ----------------------- | --------- |
   | `HOST`                  | `0.0.0.0` |
   | `RAILPACK_NODE_VERSION` | `24`      |

8. Deploy the staged changes. When the build finishes, go to **Settings > Networking > Public Networking** and choose **Generate Domain**. You get a `*.up.railway.app` URL. **Don't add a custom domain.**
9. Confirm the live site wasn't touched:
   - The production service shows the same latest deployment as in step 2.
   - `https://renzzogg.com` still shows the old site.
   - The preview URL shows the redesign, and `/cv/`, `/work/stocktill/` and the PDF all open.

Every later push of `redesign` redeploys only the preview.

**When finished:** delete the `redesign-preview` environment in **Settings > Environments**. Check that the dropdown doesn't say production before you confirm.

## Phone checklist

Test on **iOS Safari** and **Android Chrome**. Note the phone model and what you saw for anything that fails.

| Area           | Check                                                                   | iOS | Android |
| -------------- | ----------------------------------------------------------------------- | --- | ------- |
| First load     | The heading appears at once, with no blank screen or layout jump        | ☐   | ☐       |
| Gyroscope      | The tilt control appears, and nothing is requested before you tap it    | ☐   | ☐       |
| Gyroscope      | Allow: the face follows the phone smoothly                              | ☐   | n/a     |
| Gyroscope      | Deny (reset site data first): the face stays alive and nothing breaks   | ☐   | n/a     |
| Gyroscope      | Android: tilt works after tapping the control                           | n/a | ☐       |
| Gyroscope      | The face is bright and sharp, and its dot layers separate on tilt       | ☐   | ☐       |
| Gyroscope      | Shaking the phone calms the face instead of strobing it                 | ☐   | ☐       |
| Scrolling      | Hero to Contact feels smooth, with no jumps as the address bar hides    | ☐   | ☐       |
| Scrolling      | A hard fling up and down never leaves a blank screen                    | ☐   | ☐       |
| Transitions    | Seam bursts between sections are short and comfortable                  | ☐   | ☐       |
| Transitions    | **Nothing feels like strobing, even on a fast fling**                   | ☐   | ☐       |
| Work index     | The sticky index marks the project on screen, in both directions        | ☐   | ☐       |
| Carousel       | Swiping Featured work turns the 3D cards, and [01]–[04] follows         | ☐   | ☐       |
| Carousel       | Vertical scrolling over a card still scrolls the page normally          | ☐   | ☐       |
| Entrances      | Headings tune in, LEDs count, cassettes slide and CRTs power on         | ☐   | ☐       |
| Work index     | It leaves with Featured Work and doesn't cover More work                | ☐   | ☐       |
| Menu           | Opens, closes with its button, and each link lands on its section       | ☐   | ☐       |
| Menu           | The page behind doesn't scroll while it's open                          | ☐   | ☐       |
| Project detail | Opens from a project, and the counter is right                          | ☐   | ☐       |
| Project detail | The system back gesture closes it and returns to the same project       | ☐   | ☐       |
| Cassette shelf | Reels look like real cassette reels                                     | ☐   | ☐       |
| Cassette shelf | Each preview shows the **whole** screenshot, with nothing cropped       | ☐   | ☐       |
| Cassette shelf | Live demo and Source links are easy to tap                              | ☐   | ☐       |
| Text           | Paragraphs are left-aligned, and "Row-Level" never splits at its hyphen | ☐   | ☐       |
| Motion         | Motion off stops all animation, and the choice survives a reload        | ☐   | ☐       |
| Motion         | With the system's reduce-motion setting on, the page is calm            | ☐   | ☐       |
| CV             | The PDF opens and is one page                                           | ☐   | ☐       |
| Rotation       | Landscape has no sideways scroll or cut-off content                     | ☐   | ☐       |
