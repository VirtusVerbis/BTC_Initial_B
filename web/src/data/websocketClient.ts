import { WS_RECONNECT_PROBE_MS } from './exchangeConstants'

interface WebSocketClientOptions<T> {
  url: string
  /** If set with `onMessage`, parsed snapshots invoke `onMessage`. */
  parseMessage?: (payload: unknown) => T | null
  onMessage?: (message: T) => void
  /** Raw JSON handler (e.g. multi-type exchange streams). Runs first; then `parseMessage` when both are set. */
  onJsonMessage?: (payload: unknown) => void
  onStatus?: (status: 'connecting' | 'connected' | 'disconnected') => void
  onOpen?: (socket: WebSocket) => void
  maxPayloadBytes?: number
}

const DEFAULT_MAX_PAYLOAD_BYTES = 32_768

export class SafeWebSocketClient<T = void> {
  private socket: WebSocket | null = null
  private reconnectTimer: number | null = null
  private shouldReconnect = true

  constructor(private readonly options: WebSocketClientOptions<T>) {
    const hasJson = Boolean(options.onJsonMessage)
    const hasParsed = Boolean(options.parseMessage && options.onMessage)
    if (!hasJson && !hasParsed) {
      throw new Error('SafeWebSocketClient: provide onJsonMessage and/or parseMessage+onMessage')
    }
  }

  connect() {
    if (this.socket) {
      const rs = this.socket.readyState
      if (rs === WebSocket.CONNECTING || rs === WebSocket.OPEN) return
    }
    this.options.onStatus?.('connecting')
    this.socket = new WebSocket(this.options.url)

    this.socket.onopen = () => {
      this.options.onStatus?.('connected')
      if (this.socket) {
        this.options.onOpen?.(this.socket)
      }
    }

    this.socket.onclose = () => {
      this.options.onStatus?.('disconnected')
      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }

    this.socket.onerror = () => {
      this.socket?.close()
    }

    this.socket.onmessage = (event) => {
      const payloadText = String(event.data ?? '')
      const maxBytes = this.options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES
      if (payloadText.length > maxBytes) {
        return
      }

      try {
        const parsedRaw = JSON.parse(payloadText) as unknown
        this.options.onJsonMessage?.(parsedRaw)
        if (this.options.parseMessage && this.options.onMessage) {
          const parsed = this.options.parseMessage(parsedRaw)
          if (parsed) {
            this.options.onMessage(parsed)
          }
        }
      } catch {
        // Ignore malformed payloads.
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
    }
    this.socket?.close()
    this.socket = null
  }

  private scheduleReconnect() {
    /** Match Android `WebSocketRepository`: probe/reconnect on a ~10s cadence. */
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
    }
    const jitter = Math.floor(Math.random() * 500)
    const wait = WS_RECONNECT_PROBE_MS + jitter
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, wait)
  }
}
