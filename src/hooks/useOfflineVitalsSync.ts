import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface QueuedOfflineVital {
  id: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  temp?: string;
  systolic?: string;
  diastolic?: string;
  pulse?: string;
  respRate?: string;
  spo2?: string;
  weight?: string;
  height?: string;
  painScore?: string;
  priority?: "emergency" | "urgent" | "normal";
  triageNotes?: string;
  queuedAt: string;
}

const STORAGE_KEY = "hospnest_offline_triage_queue_v1";

export function useOfflineVitalsSync(
  onSyncItem?: (item: QueuedOfflineVital) => Promise<boolean>
) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [queue, setQueue] = useState<QueuedOfflineVital[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Load initial queue from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse offline queue", e);
    }
  }, []);

  // Save queue to localStorage whenever it changes
  const saveQueue = (newQueue: QueuedOfflineVital[]) => {
    setQueue(newQueue);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newQueue));
    } catch (e) {
      console.error("Failed to save offline queue", e);
    }
  };

  // Add a vital item to offline queue
  const enqueueVital = useCallback(
    (vital: Omit<QueuedOfflineVital, "id" | "queuedAt">) => {
      const newItem: QueuedOfflineVital = {
        ...vital,
        id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        queuedAt: new Date().toISOString(),
      };
      const updated = [...queue, newItem];
      saveQueue(updated);
      toast.warning(
        `Offline: Vitals for ${vital.patientName} queued locally (${updated.length} pending). Will auto-sync when online.`
      );
    },
    [queue]
  );

  // Sync all queued items sequentially
  const syncQueue = useCallback(async () => {
    if (!onSyncItem || queue.length === 0 || isSyncing) return;

    setIsSyncing(true);
    let successCount = 0;
    const remainingQueue: QueuedOfflineVital[] = [];

    for (const item of queue) {
      try {
        const ok = await onSyncItem(item);
        if (ok) {
          successCount++;
        } else {
          remainingQueue.push(item);
        }
      } catch (err) {
        console.error("Failed to sync item", item, err);
        remainingQueue.push(item);
      }
    }

    saveQueue(remainingQueue);
    setIsSyncing(false);

    if (successCount > 0) {
      toast.success(
        `Online Sync Complete: ${successCount} queued triage vitals successfully uploaded!`
      );
    }
  }, [queue, isSyncing, onSyncItem]);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info("Connection Restored: Checking offline vitals queue...");
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Offline Mode: Vitals captured will be queued locally on this device.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncQueue]);

  return {
    isOnline,
    queue,
    queueCount: queue.length,
    enqueueVital,
    syncQueue,
    isSyncing,
  };
}
