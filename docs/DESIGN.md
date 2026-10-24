# Design system

## Who it's for

Young people on cheap Android phones, often outdoors in bright sun, and busy small-business owners who aren't fond of forms. The app is a working tool, so it should look like one: confident, plain and readable at a glance.

## Concept: green and gold

Green and gold, picked for the team: South Africa's sporting colours. Green means paid and go. Gold means reward.

Each tryout is drawn as a **shift slip**: a gold time stub separated by a dashed tear line, with the pay given the most weight, because time and pay are what people decide on. When something is won (a booking, a payment, a finished profile) a gold **Stamp** lands on it.

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

Gold is used for exactly two things: the stub of a shift slip and the Stamp. Not for highlights, badges, borders, links, icons or backgrounds. In code it is applied only by `ShiftSlip` and `Stamp`. Primary green fills only the one primary action per screenful, and is applied only by the primary button style.

## Type

System fonts only, for speed on weak signal: `system-ui` and the platform defaults.

| Role | Size | Weight |
| --- | --- | --- |
| Page title | 36 px (`text-4xl`) | Bold, letter-spacing -0.02em (`tracking-title`) |
| Pay on a slip | 24 px (`text-2xl`) | Bold |
| Section heading | 20 px (`text-xl`) | Bold |
| Body | 16 to 18 px | Regular |
| Stamp label | 16 px (`text-base`) | Bold |
| Secondary | 14 px (`text-sm`) | Regular, `muted` |

Money always uses tabular numerals (`tabular-nums`), so amounts line up and don't shift as they change.

Keep lines under 70 characters. Left-align everything.

## Shape

- Sharp edges everywhere: border radius 0 on cards, slips, inputs and buttons. The radius tokens are removed in `globals.css`, so the scale classes (`rounded`, `rounded-lg` and the like) generate nothing. `rounded-full`, `rounded-none` and arbitrary values such as `rounded-[8px]` still work in Tailwind v4, so never use any `rounded-*` class.
- Photos are square. No circles anywhere.
- Edges are drawn, not shaded: a 2 px `ink` border on slips, cards, the Stamp and secondary buttons, `edge` on inputs. No shadows.

## Layout

- A screen is a stack of full-width tonal bands that alternate between `paper` and `mist`, starting with `paper`. Two bands of the same tone never sit next to each other.
- Inside each band: single column, max width 28 rem, 20 px side padding. `Band` and `PageShell` in `src/components/ui` draw this; screens don't rebuild it.
- The wordmark header sits at the top of the screen on `paper` and runs straight into the first band, which is also `paper`.
- Text on `mist` uses `ink` or `muted` only (ratios above). Forms sit on `paper` bands.
- One primary action per screenful, full width, at least 52 px tall. A screenful is what fits in the viewport at once, so a long page may repeat its primary action as long as two never show together. The home page does this: "Find a paid tryout" sits under the example slip and again in the closing band, so someone who has read to the end doesn't scroll back up. At 360 px the two are about 900 px apart and never on screen together.
- Tap targets at least 44 px.
- Numbered steps only where the content really is a sequence.

## Form controls

Native first, because the phone's own controls cost no JavaScript and work the way people already know.

- **Dates and times:** native `type="date"` and `type="time"` inputs, which open the phone's own pickers.
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

These eight are the only motion allowed. Anything not listed here is not allowed, including hover animations and spinners.

### App screens

Responses to what the person did, or to new data. App screens never use scroll reveals or load animations: content in a tool appears instantly.

1. **Press feedback.** Every `Button`, and every link styled with `buttonClass()`, scales to 0.97 while pressed, over `--dur-fast`.
2. **The Stamp**, the signature moment. Gold fill, `ink` text, 2 px `ink` border, square, rotated -8 degrees. It lands from scale 1.4 and opacity 0 to scale 1 and opacity 1 over `--dur-slow` with `--ease-spring` (`animate-stamp`). Its label is one of "Paid", "Received", "Booked", "Profile done" or "Posted" (a tryout that went live), and nothing else. When it lands, the phone gives one 15 ms vibration if it supports it, the person has tapped the page, and reduced motion is off.
3. **Sheet enter, sheet exit and item enter.** A sheet slides up from 24 px below over `--dur-slow` with `--ease-out` (`animate-sheet-enter`). Closing, it does the reverse: it slides 24 px down over `--dur-base` with `--ease-out` (`animate-sheet-exit`), so it never vanishes in a frame, which reads as broken. A new item in a live feed fades in from 8 px above over `--dur-base` with `--ease-out` (`animate-item-enter`).
4. **Field error.** When a submit fails validation, the first invalid field shakes once, 3 px left and right twice, 200 ms in all (`animate-field-shake`), and focus moves to it. Its error text fades in over `--dur-base` (`animate-error-in`, built into `FormError`).
5. **Step progress.** Onboarding shows a thin bar that fills with `transform: scaleX()` over `--dur-slow` with `--ease-out` as each step completes.
6. **Loading skeletons.** Placeholder blocks sized exactly like the content they stand for, so nothing jumps when data arrives, with a gentle opacity pulse from 1 to 0.55 and back over 1.4 s, ease-in-out (`animate-skeleton`). Loading states only.

### Marketing pages only

7. **Scroll reveal.** The `reveal` utility fades an element in from 12 px below as it enters the viewport, with a CSS scroll-driven animation (`animation-timeline: view()`, `animation-range: entry 0% entry 100%`) inside `@supports (animation-timeline: view())`. It finishes the moment the element is fully on screen; a later end such as `cover 30%` is never reached by a short band at the foot of the page, which stays half faded. Use it only on elements shorter than the viewport. Without support, content is simply visible. The steps in "How it works" use `reveal-steps` and `reveal-step` to arrive one after another through their own slices of the list's scroll range, not timers.
8. **The one load sequence.** The example slip slides in from 16 px below and fades from opacity 0 to 1, both over `--dur-slow`, then its Booked Stamp lands 240 ms after the slide ends (`load-sequence`). This is the only load animation in the product.

### Reduced motion

With `prefers-reduced-motion` set, all eight are instant or static: the Stamp appears without moving and there is no vibration, the skeleton doesn't pulse, and scroll reveals leave the scroll timeline so content is fully visible at once. One rule in `globals.css` handles this.

## Performance

The home page is the first thing anyone opens, often on a cheap phone with weak signal.

Every page's JavaScript has a budget: the gzipped size of all the scripts it loads. The budgets live in one place, `src/config/performance.ts`, and a phase that adds a page adds its budget there. `npm run budget` measures the production build against them (every `<script src>` in the page's HTML under `.next/server/app`, each file gzipped at the default level, summed). It runs inside `npm run check` and in CI, so going over budget fails like a broken test.

| Page | Budget | Baseline (24 October 2026) |
| --- | --- | --- |
| `/` | 200 KB | 174.3 KB, 8 scripts |
| `/sign-in` | 220 KB | 207.2 KB, 9 scripts |
| `/onboarding/work` | 260 KB (the cap) | 251.5 KB, 12 scripts |
| `/onboarding/business` | 260 KB (the cap) | 251.5 KB, 12 scripts |
| `/onboarding/role` | 260 KB (the cap) | 242.9 KB, 12 scripts |
| `/work` | 260 KB (the cap) | 243.0 KB, 12 scripts |
| `/business` | 260 KB (the cap) | 243.0 KB, 12 scripts |

A new page's budget is its measured size plus 10%, never above 260 KB.

Almost all of the home page's baseline is React and the Next.js runtime, so it has about 26 KB of room. Marketing pages never load auth or Firebase code (`AGENTS.md`), which is what keeps them inside it. Account pages load Firebase per service (`firebaseClient.ts` for Auth, `firebaseDb.ts`, `firebaseStorage.ts`), so a screen downloads only what it uses, and the photo code (Storage and resizing, about 10 KB) loads only when a photo step appears.

Known fix if a page nears its cap: Zod is about 31 KB of each onboarding page, because the browser runs the same schemas as the server. Zod's smaller build (`zod/mini`) would save about 20 KB, at the cost of rewriting the schemas in its functional style. Not adopted yet; reach for it before raising a budget.

## Avoid (these read as AI-made)

Warm cream with a terracotta accent, near-black with an acid accent, gradient washes, rounded corners, identical cards with soft grey shadows, all-caps eyebrow labels, middle-dot separators, arrows on buttons, sparkle icons, emoji, and one highlighted word in a headline.
