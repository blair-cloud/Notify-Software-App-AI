/**
 * Live message feed over a WebSocket.
 *
 * One shared socket per browser tab: components subscribe and get pushed
 * events (new chat messages) as they happen, instead of polling. Reconnects
 * on its own with backoff, and stays inert in demo/mock mode where there is
 * no real backend to connect to.
 */
import { isMockToken } from '../utils/mockAuth';

export type RealtimeEvent =
  | { type: 'connected'; user_id: string }
  | { type: 'pong' }
  | { type: 'message.created'; message: any };

type Listener = (event: RealtimeEvent) => void;

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;
const PING_INTERVAL_MS = 25000;

/** Derive ws(s)://host/api/v1/ws from the configured API base. */
const buildSocketUrl = (token: string): string => {
  const base = (import.meta as any).env?.VITE_API_URL || '/api/v1';
  const absolute = base.startsWith('http') ? base : `${window.location.origin}${base}`;
  const url = new URL(`${absolute.replace(/\/$/, '')}/ws`);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  return url.toString();
};

class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private closedByUs = false;

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.connect();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.disconnect();
    };
  }

  private emit(event: RealtimeEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Realtime listener failed', err);
      }
    });
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const token = localStorage.getItem('notify_access_token');
    // Demo sessions have no backend socket to talk to.
    if (!token || isMockToken(token)) return;

    this.closedByUs = false;
    try {
      const socket = new WebSocket(buildSocketUrl(token));
      this.socket = socket;

      socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.pingTimer = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send('ping');
        }, PING_INTERVAL_MS);
      };

      socket.onmessage = (raw) => {
        try {
          this.emit(JSON.parse(raw.data) as RealtimeEvent);
        } catch {
          /* ignore malformed frames */
        }
      };

      socket.onclose = (event) => {
        this.clearPing();
        this.socket = null;
        // 1008 = the server rejected the token; retrying would just loop.
        if (!this.closedByUs && event.code !== 1008 && this.listeners.size > 0) {
          this.scheduleReconnect();
        }
      };

      socket.onerror = () => {
        // onclose always follows; reconnection is handled there.
      };
    } catch (err) {
      console.warn('Realtime connect failed', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_MS);
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  disconnect() {
    this.closedByUs = true;
    this.clearPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }
}

export const realtime = new RealtimeClient();
