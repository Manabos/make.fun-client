# make.fun client — a fast static frontend for make.fun

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/Manabos/make.fun-client/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/Manabos/make.fun-client/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A complete read-only client for make.fun: the live bounty board, a bounty's page, its
leaderboard and any account's public profile. Six files, no framework, no build step, no
fonts — **9.9 KB gzipped on first load**.

## Surfaces

| route | what it shows |
|---|---|
| `#/` | the board: every open bounty with its live pot, entry fee, time left and entry count |
| `#/bounty/<slug>` | one bounty: pot, time left, fee, entries, deadline, rewards table, description, rules |
| `#/bounty/<slug>/leaderboard` | that bounty's ranked entries |
| `#/u/<handle>` | an account's public profile |

Each is reachable by its own URL and by the nav, and the back button works.

## Why it is fast

- One stylesheet, three ES modules, one HTML page. No framework, no polyfill, no webfont.
- System font stack: **zero font bytes** in the first load.
- Responses cached in memory for the life of the tab, with `If-None-Match` revalidation so a
  repeat view costs a 304 and no body. The API binds ETags to the minute, so the validator is
  dropped after the minute turns.
- Concurrent requests for the same URL are shared, not duplicated.
- Views swap the contents of `<main>`; the page never reloads.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
node main.ts         # copies app/ + screenshots/ to $MAKEFUN_OUTPUT_DIR and writes dossier.json
```

## Files

- `app/index.html`, `app/style.css` — the page and its one stylesheet
- `app/main.js` — the hash router and nav
- `app/views.js` — the four surfaces
- `app/api.js` — the API layer: cache, revalidation, shared in-flight requests
- `app/format.js` — money, deadline and score formatting
