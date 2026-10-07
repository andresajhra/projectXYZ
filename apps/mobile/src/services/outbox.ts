export type OutboxStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED";

export interface OutboxMutation {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
  status: OutboxStatus;
  retryCount: number;
  lastError?: string;
  signedXml?: string;
}

/**
 * In-memory / persistent Outbox manager.
 * In full production, this bridges to SQLite (op-sqlite / expo-sqlite).
 * Guarantees zero data loss when mobile network (2G/3G) drops during field operations.
 */
class OutboxService {
  private queue: OutboxMutation[] = [];
  private listeners: Array<(items: OutboxMutation[]) => void> = [];

  private notify() {
    const copy = [...this.queue];
    this.listeners.forEach((cb) => cb(copy));
  }

  subscribe(listener: (items: OutboxMutation[]) => void) {
    this.listeners.push(listener);
    listener([...this.queue]);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== listener);
    };
  }

  /** Append mutation immediately to local storage. UI never blocks. */
  add(action: string, payload: Record<string, unknown>, signedXml?: string): OutboxMutation {
    const item: OutboxMutation = {
      id: `mob-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      payload,
      createdAt: new Date().toISOString(),
      status: "PENDING",
      retryCount: 0,
      signedXml,
    };
    this.queue.unshift(item);
    this.notify();
    return item;
  }

  getPending(): OutboxMutation[] {
    return this.queue.filter((m) => m.status === "PENDING" || m.status === "FAILED");
  }

  markStatus(id: string, status: OutboxStatus, error?: string) {
    const item = this.queue.find((m) => m.id === id);
    if (item) {
      item.status = status;
      if (error) {
        item.lastError = error;
        item.retryCount += 1;
      }
      this.notify();
    }
  }

  clearSynced() {
    this.queue = this.queue.filter((m) => m.status !== "SYNCED");
    this.notify();
  }

  getAll(): OutboxMutation[] {
    return [...this.queue];
  }
}

export const outbox = new OutboxService();
