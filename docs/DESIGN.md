# Design system

## Who it's for

Young people on cheap Android phones, often outdoors in bright sun, and busy small-business owners who aren't fond of forms. The app is a working tool, so it should look like one: confident, plain and readable at a glance.

## Version 4 (26 October 2026)

A quieter, denser system after the audit (`docs/AUDIT-2.md`): Archivo type with a semi-condensed heading width, a smaller type scale, 1 px borders, smaller buttons, Lucide icons, and the owner's logo. The palette, the contrast ratios, the slip, the Stamp and the sharp edges are unchanged. References: our own builds (Citrus Aura, Dragon Pilates), Findra and PopArt Studio for density and numbered sections; Nielsen's heuristics, NN/g's error-message guidelines and WCAG 2.2 AA as the bar.

## Logo

The owner's mark (`public/icons/app_logo.png`, 1024 by 1024, transparent; green `#0E5A43` and gold `#C9A24E`) and wordmark (`header_logo.png`, 2400 by 760, transparent; adds ink `#20332C`). Their green and gold sit in the same hues as `primary` and `gold`, a little deeper, so the tokens stay as they are. Web copies, trimmed and sized for 2x screens, are in `src/assets`; the app icons are generated from the mark. Alt text "First Shift". The logo is an image, so the "gold only on the slip and the Stamp" rule applies to our CSS, not to it.

## Concept: green and gold

Green and gold, picked for the team: South Africa's sporting colours. Green means paid and go. Gold means reward.

Each tryout is drawn as a **shift slip**: a gold time stub separated by a dashed tear line, with the pay given the most weight, because time and pay are what people decide on. The stub is 112 px wide on a phone and 128 px from 1024 px, so the day and the time each take one line; a Stamp on a slip sits over its top-right corner, lifted clear of the pay, which is never covered. When something is won (a booking, a payment, a finished profile) a gold **Stamp** lands on it.

Spend boldness in two places only, the slip and the Stamp. Everything around them stays quiet.

## Colour

Defined as Tailwind theme tokens in `src/app/globals.css`.

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | #0F2D24 | Text and borders |
| `paper` | #FFFFFF | Page background |
| `mist` | #EFF5F1 | Secondary bands |
| `line` | #CADBD1 | Decorative dividers only, never a control edge |
| `edge` | #5F7A6D | Input borders and control edges |
| `muted` | #43584F | Secondary text |
| `primary` | #0A6B47 | The one primary button per screen |
| `on-primary` | #FFFFFF | Text on `primary` |
| `gold` | #FFB81C | The slip stub and the Stamp only, always with `ink` text |
| `go` | #0A6B47 | Confirmed states: paid, received, done |
| `stop` | #B42318 | Errors, blocked work, reports |

`primary` and `go` share a value on purpose: green is the colour of going ahead and of being paid. They stay separate tokens because they mean different things.

Measured contrast (WCAG AA needs 4.5:1 for text and 3:1 for control edges):

| Pair | Ratio |
| --- | --- |
| ink on paper | 14.78:1 |
| ink on mist | 13.37:1 |
| ink on gold | 8.53:1 |
| on-primary on primary | 6.55:1 |
| muted on paper | 7.64:1 |
| muted on mist | 6.92:1 |
| go on paper | 6.55:1 |
| stop on paper | 6.57:1 |
| stop on mist | 5.95:1 |
| edge on paper | 4.68:1 |

New measured ratios may be added here. Existing ones change only with a reason.

Never put text on `line`. Never put white text on `gold`, and never put `ink` text on `primary`.

Gold is used for exactly three things: the stub of a shift slip, the Stamp, and (v4) the small clipboard mark beside the AI guide while a tryout is drafted (`AiGuide`). Not for highlights, badges, borders, links, icons or backgrounds. In code it is applied only by `ShiftSlip` and `Stamp`. Primary green fills only the one primary action per screenful, and is applied only by the primary button style.

## Type (v4, 26 October 2026)

**Archivo**, a variable font with width and weight axes, self-hosted through `next/font` (latin subset, `display: swap`), so it costs no JavaScript and no third-party request. System fonts stay as the fallback.

- Headings (`h1` to `h3`): semi-condensed (width 87, `font-stretch: 87%`) at weight 700, tracking -0.02em. Set once in `globals.css`.
- Body and UI: normal width at 400, and 600 for labels, buttons and emphasis. Never 700 outside headings.
- Money always uses tabular numerals (`tabular-nums`).

Premium comes from the contrast between large and small, not from size: a big title, quiet text around it.

| Role | Phone | Desktop (1024 px) | Class |
| --- | --- | --- | --- |
| Hero (home only) | 40/44 | 64/68 | `text-hero lg:text-hero-lg` |
| Page title | 28/32 | 36/40 | `text-title lg:text-title-lg` |
| Section heading | 20/26 | 20/26 | `text-xl` |
| Pay on a slip | 24/32 | 24/32 | `text-2xl` |
| Body | 16/24 | 16/24 | `text-base` |
| Small, secondary | 14/20 | 14/20 | `text-sm`, `muted` |
| Micro: chips, tags, step numbers | 12/16 | 12/16 | `text-micro` |
| Errors | 14/20, `stop`, never bold | | |

Keep lines under 70 characters. Left-align everything. `text-wrap: balance` on the hero.

## Shape

- Sharp edges everywhere: border radius 0. The radius tokens are removed in `globals.css`; never use any `rounded-*` class.
- Photos of people and shopfronts are square. No circles anywhere.
- Scene photos (home page and public page bands only, docs/CREDITS.md) keep their landscape crop, with sharp edges and a 1 px `line` border. Never on app screens, never presented as a First Shift user.
- **Borders are 1 px.** Cards and dividers use `line`; inputs and secondary buttons use `edge` or `ink` (control edges need 3:1). **2 px `ink` only for the shift slip and focus rings.** No shadows.

## Spacing

| Step | Tailwind | Use |
| --- | --- | --- |
| 4 px | `1` | Tight pairs: a term and its value |
| 8 to 12 px | `2`, `3` | Related items: label, hint, input and error; a button stack |
| 16 px | `4` | Card padding; between fields in a form |
| 24 px | `6` | Between groups (`Band`'s gap) |
| 48 px | `12` | Between sections on a phone; app screens' band padding stays 32 (`8`) |
| 96 px | `24` | Between sections on a desktop (marketing bands) |

The side gutter stays 20 px (`px-5`): it keeps a 360 px phone's column at 320 px.

## Buttons and links

| Kind | Size | Look | Use |
| --- | --- | --- | --- |
| Primary | 48 px tall | Green fill, white 600 text | The one main action per screenful |
| Secondary | 44 px tall | 1 px `ink` outline, 600 text | Every other action |
| Tertiary | 44 px tap target | Text with the animated underline | Quiet actions: Sign out, Back, Keep going |
| Stop | 44 px tall | 1 px `stop` outline, `stop` text | Undoing: withdraw, cancel |

Links in running text carry a 1 px underline that thickens to 2 px on hover and focus, over 0.3 s, `cubic-bezier(.2,.7,.2,1)` (`link` utility).

## Icons

One set only: **Lucide** (ISC licence), `lucide-react` pinned, imported per icon so each page carries only its own. 20 px in tabs and buttons, 1.75 stroke, always next to a text label or with an accessible name. No sparkle icons, no AI badges.

## Layout

- A screen is a stack of full-width tonal bands that alternate between `paper` and `mist`, starting with `paper`. Two bands of the same tone never sit next to each other, at any width.
- Inside each band: single column, max width 28 rem, 20 px side padding. `Band` and `PageShell` in `src/components/ui` draw this; screens don't rebuild it.
- The wordmark header sits at the top of the screen on `paper` and runs straight into the first band, which is also `paper`.
- **The app shell** (`AppShell`) holds every account screen. Its header has the wordmark on the left and, on the right, Sign out whenever someone is signed in, onboarding included, so nobody is stuck on the wrong account. A role's destinations come from `src/config/nav.ts`: a bottom tab bar on phones (56 px tabs, the current one on `mist`), links in the header on a desktop. The bar appears only once a role has two destinations; one tab would only take space. Marketing pages, the 404 and the error page use `PageShell`, which loads no auth code.
- **Desktop, from 1024 px.** Marketing: a 72 rem layout, with the hero as two columns (the promise left, the example slip right) and the three pitches as one three-column row, 48 px apart; on a phone each is still its own band. Tones keep alternating at both sizes: the hero is `paper`, how it works `mist`, the pitches `paper`, the closing actions `mist`. Account screens: a full-width header with a 2 px `ink` line under it, and the app column (28 rem) on a `mist` backdrop, `paper` inside a 2 px `ink` edge, 48 px from the header. It reads as an app, not a stretched phone page.
- Text on `mist` uses `ink` or `muted` only (ratios above). Forms sit on `paper` bands.
- One primary action per screenful, full width, at least 52 px tall. A screenful is what fits in the viewport at once, so a long page may repeat its primary action as long as two never show together. The home page does this: "Find a paid tryout" sits under the example slip and again in the closing band, so someone who has read to the end doesn't scroll back up. At 360 px the two are about 900 px apart and never on screen together.
- Tap targets at least 44 px.
- Numbered steps only where the content really is a sequence.

## Form controls

Native first, because the phone's own controls cost no JavaScript and work the way people already know.

- **Dates and times:** native `type="date"` and `type="time"` inputs, which open the phone's own pickers.
- **Hours:** a row of five square chips, 4 to 8, 48 px each: real radio inputs, visually hidden; the chosen chip is filled `ink` with `paper` text.
- **Undo buttons:** withdrawing or anything else that takes something down uses the `stop` button, a 2 px `stop` outline with `stop` text, never a filled red button.
- **Invalid fields:** a 2 px `stop` border. Focused, a valid field gets the 3 px `ink` focus outline 2 px out; an invalid one gets a 3 px `stop` outline flush against its border instead, so it shows one thick red edge, not two outlines.
- **Photos:** `PhotoField` opens the camera in the page (`CameraView`, getUserMedia): a square view with a dashed `paper` framing guide, square-edged, never an oval; a face shows mirrored and saves the right way round. The camera code loads only when opened. No motion. A face can't come from the gallery; a shopfront can.
- **Areas:** `AreaField`, a text input with a native `<datalist>` of known areas from `src/config/areas.ts`. The phone suggests them as you type, and any other area can still be typed. React Aria's ComboBox was measured against this and lost: it would add JavaScript to onboarding pages already close to their cap, for behaviour the phone gives for free.
- **React Aria Components** is used once only: the withdraw confirmation sheet on `/business` (Modal and Dialog), styled with our tokens through its data attributes (`[data-entering]`, `[data-exiting]`, `[data-pressed]`, `[data-focus-visible]`) and moving only with sheet-enter and sheet-exit. No default React Aria styles and no other React Aria component (`AGENTS.md`).

## Motion

CSS only, no animation libraries. Tokens in `globals.css`:

| Token | Value |
| --- | --- |
| `--dur-fast` | 120 ms |
| `--dur-base` | 200 ms |
| `--dur-slow` | 320 ms |
| `--ease-out` | cubic-bezier(0.2, 0.8, 0.2, 1) |
| `--ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) |

Motion animates `transform` and `opacity` only. No JavaScript scroll listeners and no timers.

These are the only motion allowed: the eight below, and the v4 additions after them. Anything not listed is not allowed, including spinners.

### App screens

Responses to what the person did, or to new data. App screens never use scroll reveals or load animations: content in a tool appears instantly.

1. **Press feedback.** Every `Button`, and every link styled with `buttonClass()`, scales to 0.97 while pressed, over `--dur-fast`.
2. **The Stamp**, the signature moment. Gold fill, `ink` text, 2 px `ink` border, square, rotated -8 degrees. It lands from scale 1.4 and opacity 0 to scale 1 and opacity 1 over `--dur-slow` with `--ease-spring` (`animate-stamp`). Its label is one of "Paid" (on the owner's booking, once the young person confirms Received), "Received", "Booked" (also the moment an offer is accepted), "Profile done", "Posted" (a tryout that went live) or "Hired" (a job offer marked hired), and nothing else. When it lands, the phone gives one 15 ms vibration if it supports it, the person has tapped the page, and reduced motion is off.
3. **Sheet enter, sheet exit and item enter.** A sheet slides up from 24 px below over `--dur-slow` with `--ease-out` (`animate-sheet-enter`). Closing, it does the reverse: it slides 24 px down and fades out over `--dur-base` with `--ease-out` (`animate-sheet-exit`), so it never vanishes in a frame, which reads as broken. The scrim behind it (`ink` at 40%) fades in and out with it (`animate-scrim-in`, `animate-scrim-out`). A new item in a live feed fades in from 8 px above over `--dur-base` with `--ease-out` (`animate-item-enter`).
4. **Field error.** When a submit fails validation, the first invalid field shakes once, 3 px left and right twice, 200 ms in all (`animate-field-shake`), and focus moves to it. Its error text fades in over `--dur-base` (`animate-error-in`, built into `FormError`).
5. **Step progress.** Onboarding shows a thin bar that fills with `transform: scaleX()` over `--dur-slow` with `--ease-out` as each step completes.
6. **Loading skeletons.** Placeholder blocks sized exactly like the content they stand for, so nothing jumps when data arrives, with a gentle opacity pulse from 1 to 0.55 and back over 1.4 s, ease-in-out (`animate-skeleton`). Loading states only.

### Marketing pages only

7. **Scroll reveal.** The `reveal` utility fades an element in from 12 px below as it enters the viewport, with a CSS scroll-driven animation (`animation-timeline: view()`, `animation-range: entry 0% entry 100%`) inside `@supports (animation-timeline: view())`. It finishes the moment the element is fully on screen; a later end such as `cover 30%` is never reached by a short band at the foot of the page, which stays half faded. Use it only on elements shorter than the viewport. Without support, content is simply visible. The steps in "How it works" use `reveal-steps` and `reveal-step` to arrive one after another through their own slices of the list's scroll range, not timers.
8. **The one load sequence.** The example slip slides in from 16 px below and fades from opacity 0 to 1, both over `--dur-slow`, then its Booked Stamp lands 240 ms after the slide ends (`load-sequence`). This is the only load animation in the product.

### Added in v4 (26 October 2026)

9. **Header hide and show** (marketing only): the header slides up out of view while scrolling down and back on scrolling up, `transform` over `--dur-base`. A passive scroll listener, no library.
10. **Link underline**: 1 px to 2 px over 0.3 s, `cubic-bezier(.2,.7,.2,1)`.
11. **Drawer**: the phone menu slides in from the right over `--dur-slow` with `--ease-out`, its `ink` 40% scrim fading with it.
12. **Card hover lift**: desktop and a real pointer only (`@media (hover: hover)`), `translateY(-2px)` over 120 ms.
13. **Skeleton shimmer**: a light band crossing the placeholder, by `transform`, replacing the opacity pulse.
14. **Toast**: enters from 8 px below and fades in; leaves by fading out.
15. **The AI guide's ticks**: each step's tick lands (scale 0.6 to 1 and fade) when that step really completes. Never on a timer.

No smooth-scroll library.

### Reduced motion

With `prefers-reduced-motion` set, all eight are instant or static: the Stamp appears without moving and there is no vibration, the skeleton doesn't pulse, and scroll reveals leave the scroll timeline so content is fully visible at once. One rule in `globals.css` handles this.

## Performance

The home page is the first thing anyone opens, often on a cheap phone with weak signal.

Every page's JavaScript has a budget: the gzipped size of all the scripts it loads. The budgets live in one place, `src/config/performance.ts`, and a phase that adds a page adds its budget there. `npm run budget` measures the production build against them (every `<script src>` in the page's HTML under `.next/server/app`, each file gzipped at the default level, summed). It runs inside `npm run check` and in CI, so going over budget fails like a broken test.

| Page | Budget | Measured (25 October 2026: app shell, error page, `zod/mini`) |
| --- | --- | --- |
| `/` | 200 KB | 179.3 KB, 9 scripts |
| `/sign-in` | 228 KB (207.2 KB at first, + 10%) | 219.9 KB, 12 scripts |
| `/onboarding/work` | 260 KB (the cap) | 250.2 KB, 15 scripts |
| `/onboarding/business` | 260 KB (the cap) | 249.7 KB, 15 scripts |
| `/onboarding/role` | 260 KB (the cap) | 239.8 KB, 14 scripts |
| `/work` | 260 KB (the cap) | 247.0 KB, 15 scripts (the nearby feed, 25 October 2026) |
| `/work/tryouts/[id]` | 260 KB (the cap) | 247.9 KB, 15 scripts, measured on the one shell built ahead of time (`/work/tryouts/tryout`); every id loads the same scripts |
| `/business` | 260 KB (the cap) | 244.5 KB, 15 scripts; the withdraw sheet (React Aria, 20.9 KB) and the Firestore listener (171.8 KB) load after the page has drawn |
| `/business/post` | 260 KB (the cap) | 249.4 KB, 15 scripts |
| `/business/tryouts/[id]` | 260 KB (the cap) | 256.0 KB, 17 scripts (the owner's tryout and applicants, 26 October 2026) |
| `/work/applications` | 260 KB (the cap) | 249.0 KB, 16 scripts |
| `/work/profile` | 260 KB (the cap) | 247.8 KB, 16 scripts (ways to be paid, what you can do, 26 October 2026) |
| `/business/owner` | 260 KB (the cap) | 254.3 KB, 17 scripts (the owner's details, 26 October 2026) |
| `/business/credits` | 260 KB (the cap) | 245.8 KB, 16 scripts (the Credits screen, 26 October 2026) |
| `/work/record` | 260 KB (the cap) | 246.8 KB, 16 scripts (the work record, 26 October 2026) |
| `/record/[token]` | 219 KB (199.2 KB measured, + 10%) | 199.2 KB, 10 scripts: the shared work record, no sign-in code, its schema in a module of its own |
| `/bookings/[id]` | 260 KB (the cap) | 258.2 KB, 17 scripts (payment methods, 26 October 2026); the day's panels (check-in, check-out, paying, confirming) load only once the day has begun, and the proof form and its resizing code only after Not received |
| `/status/[token]` | 200 KB (a marketing page) | 198.7 KB, 10 scripts: no sign-in code; the status words have their own module (`bookingStatus.ts`) so the page loads none of the booking rules |

A new page's budget is its measured size plus 10%, never above 260 KB.

Almost all of the home page's JavaScript is React and the Next.js runtime, so it has about 21 KB of room. Marketing pages never load auth or Firebase code (`AGENTS.md`), which is what keeps them inside it. Account pages load Firebase per service (`firebaseClient.ts` for Auth, `firebaseDb.ts`, `firebaseStorage.ts`), so a screen downloads only what it uses, and the photo code (Storage and resizing, about 10 KB) loads only when a photo step appears.

Every account page also carries the app shell (the header with Sign out, about 4 KB including Next's link code) and every page carries the branded error page (about 4.4 KB: as a root error boundary it loads everywhere, with its own copy of the link code).

`zod/mini`, Zod's small build, is adopted for every schema the browser runs (`src/schemas/profile.ts`, `src/lib/api.ts`): it saved about 10 KB on each account page (25 October 2026). Server-only schemas (AI output, environment) stay on the full build. Parsing that must accept either goes through `safeParse` from `zod/v4/core`.

## Avoid (these read as AI-made)

Warm cream with a terracotta accent, near-black with an acid accent, gradient washes, rounded corners, identical cards with soft grey shadows, all-caps eyebrow labels, middle-dot separators, arrows on buttons, sparkle icons, emoji, and one highlighted word in a headline.

## AI mark

One mark for AI, used wherever AI contributes and nowhere else (`src/components/AiMark.tsx`): the gold clipboard, a small boxed "AI" label and one line saying what the AI did.

- Draft versions: "Drafted by AI from your sentence".
- The safety check, on the AI assist panel and on a blocked request: "Checked by AI, decided by our rules". The panel says what the AI did and what our rules enforced (minimum wage, daylight hours, notice).
- References: "Written with AI from the business's answers". The hand-written demo example says "Example reference for the demo" instead, with no mark.
- While drafting: the clipboard, one line and an indeterminate bar on the skeleton shimmer. No steps, no percentages.
- Never on the show-up score or the ranking: those are our own rules (`src/domain/showUp.ts`, `ranking.ts`), with every reason shown.
