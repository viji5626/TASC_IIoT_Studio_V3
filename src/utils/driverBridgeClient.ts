import { DriverTagValue, DriverConnectionHealthPayload } from '../types';

export type DriverTagValueCallback = (update: DriverTagValue) => void;
export type DriverConnectionHealthCallback = (payload: DriverConnectionHealthPayload) => void;
export type DriverReconnectCallback = () => void;

const RECONNECT_INTERVAL_MS = 3000;
const DRIVER_BRIDGE_PATH = '/api/driver-bridge';

export class DriverBridgeClient {
  private ws: WebSocket | null = null;
  private onTagValue: DriverTagValueCallback;
  private onConnectionHealth?: DriverConnectionHealthCallback;
  private onReconnect?: DriverReconnectCallback;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldConnect = false;
  private subscribedTagIds: Set<string> = new Set();
  private pendingSubscriptions: any[] = [];
  private hasConnectedOnce = false; // tracks first vs subsequent connections

  constructor(
    onTagValue: DriverTagValueCallback,
    onConnectionHealth?: DriverConnectionHealthCallback,
    onReconnect?: DriverReconnectCallback
  ) {
    this.onTagValue = onTagValue;
    this.onConnectionHealth = onConnectionHealth;
    this.onReconnect = onReconnect;
  }

  connect() {
    this.shouldConnect = true;
    this.openSocket();
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(subscriptions: { tagId: string; panelId: string; connectionId: string; pollRate: number; tag?: any; connection?: any }[]) {
    this.pendingSubscriptions = subscriptions;
    subscriptions.forEach(s => this.subscribedTagIds.add(s.tagId));
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[DriverBridge] Sending subscribe for', subscriptions.length, 'tag(s)');
      this.ws.send(JSON.stringify({ type: 'subscribe', subscriptions }));
    } else {
      console.log('[DriverBridge] Queued pending subscriptions for connect:', subscriptions.length, 'tag(s)');
    }
  }

  unsubscribeAll() {
    this.subscribedTagIds.clear();
    this.pendingSubscriptions = [];
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[DriverBridge] Sending unsubscribe_all');
      this.ws.send(JSON.stringify({ type: 'unsubscribe_all' }));
    }
  }

  writeTag(tagId: string, connectionId: string, value: any, tag?: any, connection?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'write', tagId, connectionId, value, tag, connection }));
    } else {
      console.warn('[DriverBridge] Cannot write tag — not connected.');
    }
  }

  private openSocket() {
    if (!this.shouldConnect) return;
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${wsProtocol}//${window.location.host}${DRIVER_BRIDGE_PATH}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        const isReconnect = this.hasConnectedOnce;
        this.hasConnectedOnce = true;
        console.log(`[DriverBridge] ${isReconnect ? 'Re-connected' : 'Connected'} to driver bridge.`);

        // Always flush pending subscriptions on (re)connect so server always
        // gets the current set even after it restarts.
        if (this.pendingSubscriptions.length > 0) {
          console.log('[DriverBridge] Flushing pending subscriptions on connect:', this.pendingSubscriptions.length);
          this.ws?.send(JSON.stringify({ type: 'subscribe', subscriptions: this.pendingSubscriptions }));
        }

        // Notify App so it can also reset lastSubscribedKeyRef and force a
        // fresh bridge.subscribe() call on the next subscription effect run.
        if (isReconnect && this.onReconnect) {
          this.onReconnect();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'connection_health' && this.onConnectionHealth) {
            this.onConnectionHealth(data as DriverConnectionHealthPayload);
          } else if (data && data.tagId && data.panelId !== undefined) {
            this.onTagValue(data as DriverTagValue);
          }
        } catch {
          // ignore malformed messages
        }
      };

      this.ws.onerror = () => {
        console.warn('[DriverBridge] WebSocket error. Will retry.');
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.shouldConnect) {
          this.reconnectTimer = setTimeout(() => {
            this.openSocket();
          }, RECONNECT_INTERVAL_MS);
        }
      };
    } catch (err) {
      console.warn('[DriverBridge] Failed to create WebSocket:', err);
      if (this.shouldConnect) {
        this.reconnectTimer = setTimeout(() => {
          this.openSocket();
        }, RECONNECT_INTERVAL_MS);
      }
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
