# BTC Punch Up Web

BTC Bull Run web shell: client-heavy market and block-height feeds with the same overlay/splash UX as the upstream web port; the boxing scene layers are removed for a future replacement.

## Local development

From the **repository root** (recommended; uses npm workspaces):

1. `npm install`
2. `npm run dev`

From this `web/` folder only:

1. `npm install`
2. `npm run dev`
3. Run test/lint/build:
   - `npm run test`
   - `npm run lint`
   - `npm run build`

## Environment variables

Copy `.env.example` to `.env` and adjust values as needed.

- `VITE_BINANCE_WS_URL` Binance websocket endpoint.
- `VITE_COINBASE_WS_URL` Coinbase websocket endpoint.
- `VITE_MEMPOOL_TIP_URL` Mempool block tip endpoint.

## Feature highlights (this fork)

- Live Binance + Coinbase market feed with browser-safe websocket parsing.
- Block height polling with elapsed timer (overlay clock).
- Fixed mobile reference aspect ratio scene, with letterbox behavior instead of stretching.
- Splash sequence and full HUD overlay layout (combat simulation disabled; market-driven modes only).

## Browser support target

See [`docs/browser-support-matrix.md`](docs/browser-support-matrix.md).

## Security documentation

- [`docs/security-note.md`](docs/security-note.md)
- [`docs/security-runbook.md`](docs/security-runbook.md)

## Hosting

This project is static-host friendly and deploys well on Vercel, Netlify, or Cloudflare Pages.

- **Vercel:** `vercel.json` includes baseline headers (CSP/HSTS/etc) and clickjacking protection.
- **Cloudflare Pages:** set **Build command** to `npm run build`, **Build output directory** to `dist` (when the Pages project root is the `web/` folder). If the repo root is the Pages root instead, use `cd web && npm ci && npm run build` and output `web/dist`. Security headers for Cloudflare are mirrored in `public/_headers` (CSP omits YouTube directives used only by the removed video overlay).
