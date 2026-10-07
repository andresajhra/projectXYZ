import { outbox, type OutboxMutation } from "./outbox";

export type NetworkMode = "ONLINE" | "SLOW_2G_3G" | "OFFLINE";

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  message: string;
}

class MobileSyncEngine {
  private mode: NetworkMode = "OFFLINE";
  private isSyncing = false;

  getNetworkMode(): NetworkMode {
    return this.mode;
  }

  setNetworkMode(mode: NetworkMode) {
    this.mode = mode;
  }

  /**
   * Flushes pending outbox mutations.
   * If on 2G/3G or slow connection, limits batch sizes and compresses payloads.
   */
  async flush(): Promise<SyncResult> {
    if (this.mode === "OFFLINE") {
      return { syncedCount: 0, failedCount: 0, message: "Cannot sync: Device is offline" };
    }

    if (this.isSyncing) {
      return { syncedCount: 0, failedCount: 0, message: "Sync already in progress" };
    }

    this.isSyncing = true;
    const pending = outbox.getPending();

    if (pending.length === 0) {
      this.isSyncing = false;
      return { syncedCount: 0, failedCount: 0, message: "Outbox is clear. Everything up to date." };
    }

    // 2G/3G batch limit optimization
    const batchSize = this.mode === "SLOW_2G_3G" ? 5 : 20;
    const batch = pending.slice(0, batchSize);

    let synced = 0;
    let failed = 0;

    for (const item of batch) {
      outbox.markStatus(item.id, "SYNCING");
      // Simulate network roundtrip (longer delay on 2G/3G)
      const latency = this.mode === "SLOW_2G_3G" ? 1200 : 300;
      await new Promise((r) => setTimeout(r, latency));

      try {
        // In real execution: await api.post("/sync/outbox", item)
        outbox.markStatus(item.id, "SYNCED");
        synced++;
      } catch (err) {
        outbox.markStatus(item.id, "FAILED", String(err));
        failed++;
      }
    }

    this.isSyncing = false;
    return {
      syncedCount: synced,
      failedCount: failed,
      message: `Synchronized ${synced} record(s)${failed > 0 ? `, ${failed} failed` : ""} via ${this.mode}`,
    };
  }
}

export const syncEngine = new MobileSyncEngine();
