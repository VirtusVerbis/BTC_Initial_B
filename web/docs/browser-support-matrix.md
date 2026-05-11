# Browser Support Matrix

The app is expected to be playable on modern browsers where websocket and ES module support are available.

## Supported targets

- Chrome (latest 2 major versions) on desktop and Android
- Edge (latest 2 major versions) on desktop
- Safari (latest 2 major versions) on macOS and iOS
- Firefox (latest 2 major versions) on desktop and Android

## Playable pass criteria

- App boots and renders scene without fatal errors.
- Binance/Coinbase feed status updates are visible.
- `Time` label click/tap toggles character alignment.
- Animations remain responsive and controls remain clickable.
- Block height label/timer renders and updates (live Mempool API).

## Graceful degradation

- If websocket feeds are unavailable, exchange panels show disconnected / unavailable until feeds recover.
- On lower-power devices, animation quality may reduce while gameplay remains functional.
- On narrow/wide screens, scene keeps fixed aspect ratio with letterbox/pillarbox.
