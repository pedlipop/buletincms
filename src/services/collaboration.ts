import { BulletinDocument } from '../types/bulletin';

export interface CollaboratorUser {
  id: string;
  name: string;
  color: string;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  userColor: string;
  x: number; // percentage (0 to 100) or px relative to canvas
  y: number; // percentage or px
  activeBlockId?: string | null;
  updatedAt: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

const COLLAB_USER_KEY = 'buletincms_collab_user';

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
];

function getOrCreateLocalUser(): CollaboratorUser {
  try {
    const raw = localStorage.getItem(COLLAB_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.name && parsed.color) {
        return parsed;
      }
    }
  } catch {}

  const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newUser: CollaboratorUser = {
    id: 'user_' + Math.random().toString(36).slice(2, 8),
    name: `协作者_${randomSuffix}`,
    color: randomColor,
  };

  try {
    localStorage.setItem(COLLAB_USER_KEY, JSON.stringify(newUser));
  } catch {}

  return newUser;
}

class CollaborationService {
  private ws: WebSocket | null = null;
  private currentDocId: string | null = null;
  private localUser: CollaboratorUser = getOrCreateLocalUser();
  private status: ConnectionStatus = 'disconnected';
  private peers: Map<string, CollaboratorUser> = new Map();
  private remoteCursors: Map<string, RemoteCursor> = new Map();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private peersListeners: Set<(peers: CollaboratorUser[]) => void> = new Set();
  private cursorListeners: Set<(cursors: RemoteCursor[]) => void> = new Set();
  private docUpdateListeners: Set<(doc: BulletinDocument, senderId: string) => void> = new Set();

  private reconnectTimer: any = null;
  private cursorThrottleTimer: any = null;
  private pendingCursor: { x: number; y: number; activeBlockId?: string | null } | null = null;
  private isProcessingRemoteUpdate = false;

  constructor() {
    // Clean stale cursors every 3 seconds
    if (typeof window !== 'undefined') {
      window.setInterval(() => {
        const now = Date.now();
        let changed = false;
        for (const [id, cursor] of this.remoteCursors.entries()) {
          if (now - cursor.updatedAt > 5000) {
            this.remoteCursors.delete(id);
            changed = true;
          }
        }
        if (changed) {
          this.emitCursors();
        }
      }, 2000);
    }
  }

  public getLocalUser(): CollaboratorUser {
    return this.localUser;
  }

  public updateLocalUser(patch: Partial<CollaboratorUser>) {
    this.localUser = { ...this.localUser, ...patch };
    try {
      localStorage.setItem(COLLAB_USER_KEY, JSON.stringify(this.localUser));
    } catch {}
    // Re-announce if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.currentDocId) {
      this.ws.send(
        JSON.stringify({
          type: 'join',
          docId: this.currentDocId,
          user: this.localUser,
        })
      );
    }
    this.emitPeers();
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getPeers(): CollaboratorUser[] {
    return Array.from(this.peers.values());
  }

  public getRemoteCursors(): RemoteCursor[] {
    return Array.from(this.remoteCursors.values());
  }

  public joinRoom(docId: string) {
    if (this.currentDocId === docId && this.status === 'connected') return;

    this.leaveRoom();
    this.currentDocId = docId;
    this.connect();
  }

  public leaveRoom() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.currentDocId = null;
    this.peers.clear();
    this.remoteCursors.clear();
    this.setStatus('disconnected');
    this.emitPeers();
    this.emitCursors();
  }

  private connect() {
    if (typeof window === 'undefined' || !this.currentDocId) return;

    this.setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use Vite proxy (/ws) or directly fallback to port 3001 if needed
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        if (this.currentDocId && this.ws) {
          this.ws.send(
            JSON.stringify({
              type: 'join',
              docId: this.currentDocId,
              user: this.localUser,
            })
          );
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.warn('Failed to parse WS message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WS error:', err);
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.peers.clear();
        this.remoteCursors.clear();
        this.emitPeers();
        this.emitCursors();

        // Auto-reconnect after 3 seconds if still in room
        if (this.currentDocId && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.currentDocId) {
              this.connect();
            }
          }, 3000);
        }
      };
    } catch (e) {
      console.warn('Failed to initiate WS connection:', e);
      this.setStatus('disconnected');
    }
  }

  private handleMessage(msg: any) {
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'room_sync': {
        this.peers.clear();
        if (Array.isArray(msg.peers)) {
          msg.peers.forEach((p: CollaboratorUser) => {
            if (p.id !== this.localUser.id) {
              this.peers.set(p.id, p);
            }
          });
        }
        this.emitPeers();
        break;
      }
      case 'peer_joined': {
        if (msg.user && msg.user.id !== this.localUser.id) {
          this.peers.set(msg.user.id, msg.user);
          this.emitPeers();
        }
        break;
      }
      case 'peer_left': {
        if (msg.userId) {
          this.peers.delete(msg.userId);
          this.remoteCursors.delete(msg.userId);
          this.emitPeers();
          this.emitCursors();
        }
        break;
      }
      case 'cursor': {
        if (msg.userId && msg.userId !== this.localUser.id) {
          this.remoteCursors.set(msg.userId, {
            userId: msg.userId,
            userName: msg.userName || '协作者',
            userColor: msg.userColor || '#3b82f6',
            x: msg.x,
            y: msg.y,
            activeBlockId: msg.activeBlockId || null,
            updatedAt: Date.now(),
          });
          this.emitCursors();
        }
        break;
      }
      case 'doc_update': {
        if (msg.document && msg.senderId !== this.localUser.id) {
          this.isProcessingRemoteUpdate = true;
          this.docUpdateListeners.forEach((fn) => fn(msg.document, msg.senderId));
          this.isProcessingRemoteUpdate = false;
        }
        break;
      }
    }
  }

  public sendCursor(x: number, y: number, activeBlockId?: string | null) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.currentDocId) return;

    this.pendingCursor = { x, y, activeBlockId };
    if (!this.cursorThrottleTimer) {
      this.cursorThrottleTimer = setTimeout(() => {
        this.cursorThrottleTimer = null;
        if (this.pendingCursor && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(
            JSON.stringify({
              type: 'cursor',
              docId: this.currentDocId,
              x: this.pendingCursor.x,
              y: this.pendingCursor.y,
              activeBlockId: this.pendingCursor.activeBlockId,
            })
          );
        }
      }, 50); // 20 updates/sec max
    }
  }

  public sendDocUpdate(doc: BulletinDocument) {
    if (this.isProcessingRemoteUpdate) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.currentDocId) return;

    try {
      this.ws.send(
        JSON.stringify({
          type: 'doc_update',
          docId: this.currentDocId,
          document: doc,
        })
      );
    } catch (e) {
      console.warn('Failed to send doc update over WS:', e);
    }
  }

  public onStatusChange(cb: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  public onPeersChange(cb: (peers: CollaboratorUser[]) => void): () => void {
    this.peersListeners.add(cb);
    cb(this.getPeers());
    return () => this.peersListeners.delete(cb);
  }

  public onRemoteCursor(cb: (cursors: RemoteCursor[]) => void): () => void {
    this.cursorListeners.add(cb);
    cb(this.getRemoteCursors());
    return () => this.cursorListeners.delete(cb);
  }

  public onDocUpdate(cb: (doc: BulletinDocument, senderId: string) => void): () => void {
    this.docUpdateListeners.add(cb);
    return () => this.docUpdateListeners.delete(cb);
  }

  private setStatus(status: ConnectionStatus) {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach((fn) => fn(status));
    }
  }

  private emitPeers() {
    const list = this.getPeers();
    this.peersListeners.forEach((fn) => fn(list));
  }

  private emitCursors() {
    const list = this.getRemoteCursors();
    this.cursorListeners.forEach((fn) => fn(list));
  }
}

export const collaborationService = new CollaborationService();

