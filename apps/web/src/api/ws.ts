/**
 * Reconnecting WebSocket wrapper for the two §15.1 channels.
 *
 * Both surfaces need the same three things: survive a backend restart, expose typed
 * messages, and report connection state so the UI can say so rather than looking
 * silently stale.
 *
 * Reconnect uses exponential backoff with jitter. Without jitter, several dashboards
 * that dropped together would retry in lockstep and hammer the backend at the same
 * instant on every attempt.
 */

export type WsCommand =
  | "START_SESSION"
  | "PAUSE_SESSION"
  | "RESUME_SESSION"
  | "ADD_TIME"
  | "CANCEL_SESSION"
  | "RESTART_SESSION"
  | "REPRINT"
  | "LOCK_BOOTH"
  | "UNLOCK_BOOTH"
  | "SYNC_TEMPLATES"
  | "SYNC_LUTS";

export type WsEvent =
  | "BOOTH_ONLINE"
  | "BOOTH_OFFLINE"
  | "CAMERA_CONNECTED"
  | "CAMERA_DISCONNECTED"
  | "PRINTER_READY"
  | "PRINTER_ERROR"
  | "SESSION_STARTED"
  | "SESSION_PAUSED"
  | "SESSION_RESUMED"
  | "SESSION_COMPLETED"
  | "SESSION_EXPIRED"
  | "PHOTO_CAPTURED"
  | "PRINT_STARTED"
  | "PRINT_COMPLETED"
  | "PRINT_FAILED"
  | "SYNC_COMPLETED"
  | "HEARTBEAT";

export interface CommandMessage {
  type: "command";
  command: WsCommand;
  payload: Record<string, unknown>;
}

export interface EventMessage {
  type: "event";
  event: WsEvent;
  payload: Record<string, unknown>;
}

export interface HelloMessage {
  type: "hello";
  payload: { online_booth_ids: string[]; scope: string | string[] };
}

export type IncomingMessage = CommandMessage | EventMessage | HelloMessage | { type: "pong" };

export type ConnectionState = "connecting" | "open" | "closed";

export interface SocketHandlers {
  onMessage?: (message: IncomingMessage) => void;
  onState?: (state: ConnectionState) => void;
  /** Fatal auth rejection (close code 4003) — retrying cannot help. */
  onAuthFailure?: (reason: string) => void;
}

export interface Socket {
  send(data: unknown): void;
  close(): void;
  readonly state: ConnectionState;
}

const MAX_BACKOFF_MS = 10_000;

function connect(path: string, token: string, handlers: SocketHandlers): Socket {
  let ws: WebSocket | null = null;
  let closedByUs = false;
  let attempt = 0;
  let retryTimer: number | undefined;
  let pingTimer: number | undefined;
  let state: ConnectionState = "connecting";

  const setState = (next: ConnectionState) => {
    if (state === next) return;
    state = next;
    handlers.onState?.(next);
  };

  const open = () => {
    if (closedByUs) return;
    setState(attempt === 0 ? "connecting" : "connecting");

    const url = new URL(path, window.location.href);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("token", token);
    ws = new WebSocket(url);

    ws.onopen = () => {
      attempt = 0;
      setState("open");
      // A periodic ping keeps intermediaries from idling the socket out during a long
      // session where nothing happens to be sent.
      pingTimer = window.setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 25_000);
    };

    ws.onmessage = (event) => {
      try {
        handlers.onMessage?.(JSON.parse(event.data) as IncomingMessage);
      } catch {
        // A malformed frame is not worth tearing the connection down for.
      }
    };

    ws.onclose = (event) => {
      window.clearInterval(pingTimer);
      ws = null;
      if (closedByUs) {
        setState("closed");
        return;
      }
      if (event.code === 4003) {
        // Bad or expired token: reconnecting would loop forever.
        setState("closed");
        handlers.onAuthFailure?.(event.reason || "Authentication failed");
        return;
      }
      if (event.code === 4001) {
        // Replaced by a newer kiosk tab for this booth. Reconnecting would start a
        // fight between two tabs, each closing the other.
        setState("closed");
        handlers.onAuthFailure?.(
          "This booth was opened in another tab, which now owns the connection.",
        );
        return;
      }
      setState("connecting");
      const delay = Math.min(MAX_BACKOFF_MS, 500 * 2 ** attempt) * (0.7 + Math.random() * 0.6);
      attempt += 1;
      retryTimer = window.setTimeout(open, delay);
    };

    ws.onerror = () => {
      // `onclose` always follows; backoff is handled there.
    };
  };

  open();

  return {
    send(data: unknown) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(typeof data === "string" ? data : JSON.stringify(data));
      }
    },
    close() {
      closedByUs = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(pingTimer);
      ws?.close();
      setState("closed");
    },
    get state() {
      return state;
    },
  };
}

/** The kiosk's channel. Its lifetime is the booth's online status. */
export function connectBooth(token: string, handlers: SocketHandlers): Socket {
  return connect("/ws/booth", token, handlers);
}

/** The operator/admin dashboard channel. */
export function connectClient(token: string, handlers: SocketHandlers): Socket {
  return connect("/ws/client", token, handlers);
}
