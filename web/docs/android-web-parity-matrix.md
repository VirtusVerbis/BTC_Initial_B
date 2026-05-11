# Android vs web parity matrix

**Reference:** [VirtusVerbis/BTC_Punch_Up](https://github.com/VirtusVerbis/BTC_Punch_Up) (`main`), Jetpack Compose.  
**Web app:** `web/` (this repo).  
**Status:** `done` = mirrored for web-feasible scope of this pass | `partial` | `missing` | `n/a` (Android-only).

**Binance network:** Web defaults to **Spot Testnet** (`testnet.binance.vision` / `stream.testnet.binance.vision`) for WS + klines so users are less likely to hit mainnet geo-blocks. Upstream Android **live** `BinanceWebSocketService` still uses **mainnet** `stream.binance.com`; Android `PriceRepository` REST already used testnet for some calls. Override with `VITE_BINANCE_WS_URL` / `VITE_BINANCE_API_ORIGIN` for mainnet. Production klines may still need a **same-origin proxy** if the browser blocks CORS to Binance (testnet or mainnet).

| Area | Android (source) | Web | Status | Notes |
|------|------------------|-----|--------|-------|
| Binance WS | `WebSocketRepository` / `BinanceWebSocketService` | `MarketDataService` + `websocketClient` | done | Combined stream: trades accumulate buy/sell; `24hrTicker` updates last price; 100ms emit + 5s volume reset like Android. Testnet/mainnet via env. |
| Coinbase WS | `CoinbaseWebSocketService` | `MarketDataService` | done | `ticker` + `level2` + `matches` + `heartbeats`; snapshot seeds top-50 book volumes; matches add; same throttle/reset as Android. |
| Block height poll | `PriceRepository` / Mempool | `BlockHeightService` | done | |
| Punch/defense/KO rules | `MainActivity` + mechanics | `game/mechanics.ts` + `store.ts` | done | Align with README |
| Dual splash (podcast + title) | `SplashScreen`, `vv_splash`, `btc_punchup_cover` | `SplashSequence` | done | Timings + tap skip; blocks main feed until done |
| Layered scene (audience, ring, fighters) | `MainActivity` draw order (bg5→bg0, fg1 Lizard under fg2 Satoshi) | `FightScene` + `mobileAssetManifest` z-index map | done | PNGs under `/mobile/`; bg4 signs / bg3 flash / bg2 meme / bg1 chart / bg0 ring + fg1–fg3 wired in `FightScene` |
| Ring rotation (timer mode) | `TEST_RING_ROTATION`, `RING_ROTATE_*`, `RING_FRAMES` | `useRingRotation` | partial | Matches timer path; block-triggered rotation not wired |
| Audience frames vs ring | `AUDIENCE_FRAMES_BY_RING`, `AUDIENCE_FRAME_DELAY_MS` | `FightScene` | done | Sub-frame cycles 0–2 |
| Optional candle chart | `BtcCandleChart`, BG2 intervals, Binance klines | `BtcCandleChart` + `fetchBinanceBtc1mKlines` + `useBg2ChartVisible` | partial | Periodic show/hide matches Android (`delay(BG2_SHOW_INTERVAL_MS)` then visible for `BG2_VISIBLE_DURATION_MS`). Default REST: testnet. Dev: Vite proxy `/binance-api` → testnet. Prod: CORS may require your own proxy; override `VITE_BINANCE_API_ORIGIN`. |
| Volume bars + mode + WiFi | `PriceDisplay`, `VolumeBar` | `Overlay` + CSS bars | done | Colors match Compose; feed glyph for status |
| Price green/red vs previous | `PriceDisplay` | `Overlay` | done | |
| Damage bars + KO count | `PriceDisplay` | `Overlay` + store | done | KO logic simplified vs simultaneous window |
| Time / block / elapsed flash | `MainActivity` | `Overlay` + `BlockHeightService` | done | |
| Character alignment toggle | Tap crosshair / saved offsets | Time button (existing) | partial | Web keeps toggle; no per-offset editor |
| Spread-based defense | `WebSocketRepository` median spread | — | missing | Web uses volume-only defense |
| Bid/ask / spread in UI | `ExchangeData` | — | missing | Not exposed on web feeds yet |
| Memes (Chika, BDWW, NEO, …) | `MainActivity` bg2 | `useBg2MemeState` + `FightScene` | partial | Price-window triggers + DCB frame cycle ported; gated with chart visibility in `App.tsx`. |
| Flash spawns bg3 | `MainActivity` | `useBg3FlashState` + `FightScene` | partial | KO-driven spawns + audience flash; tune against Android spawn counts/timing if needed. |
| Buy BTC signs bg4 | `MainActivity` | `useBg4SignState` + `FightScene` | partial | Timer spawns + frame advance; row Y fractions may differ slightly from Android constants. |
| Cat walk fg3 | `MainActivity` | `useFg3CatState` + `FightScene` | partial | Timer spawn + walk frames; verify lane/speed vs Android if pixel-perfect. |
| Bobbing / together movement | `MainActivity` | `useBoxerBobbing` + `bobbingLogic` | partial | Bobbing + together drift scaled to web scene; align with Android reference pixels if required. |
| YouTube video overlay (WiFi) | `MainActivity` + player | n/a | n/a | Use iframe only with legal/UX review; not in this pass |
| PiP | `PictureInPictureParams` | n/a | n/a | |
| Haptics / notifications | platform | n/a | n/a | |

Last updated: BG2 chart cadence parity + matrix refresh (web layers / bobbing).
