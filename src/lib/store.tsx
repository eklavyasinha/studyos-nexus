import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { openDB } from "idb";
import {
  emptySnapshot,
  mergeSnapshots,
  removeRecord,
  toggleTask,
  validateSnapshot,
  updateRecord,
  pauseTimerAt,
  validateItem,
} from "./logic";
import { progressionError } from "./readiness";
import {
  type Item,
  type Kind,
  type Settings,
  type Snapshot,
  type TimerState,
} from "./types";
import { uid } from "./utils";

let dbPromise: ReturnType<typeof openDB> | undefined;
const database = () =>
  (dbPromise ||= openDB("studyos-nexus", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("workspace"))
        db.createObjectStore("workspace");
    },
    blocking() {
      void dbPromise?.then((db) => db.close());
      dbPromise = undefined;
    },
    terminated() {
      dbPromise = undefined;
    },
  }).catch((error) => {
    dbPromise = undefined;
    throw error;
  }));
export type Toast = {
  id: string;
  message: string;
  tone: "success" | "error" | "info";
};
type Store = {
  items: Item[];
  settings: Settings;
  timer: TimerState;
  ready: boolean;
  error: string | null;
  readOnly: boolean;
  saving: boolean;
  toasts: Toast[];
  dismiss: (id: string) => void;
  create: (kind: Kind, values: Partial<Item>) => Item;
  createMany: (records: { kind: Kind; values: Partial<Item> }[]) => Item[];
  update: (id: string, patch: Partial<Item>) => void;
  remove: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setTimer: (patch: Partial<TimerState>) => void;
  notify: (message: string, tone?: Toast["tone"]) => void;
  beginNotificationBuffer: () => void;
  endNotificationBuffer: () => Pick<Toast, "message" | "tone">[];
  completeTask: (id: string) => void;
  touch: (id: string) => void;
  snapshot: () => Snapshot;
  importData: (snapshot: Snapshot, mode: "merge" | "replace") => Promise<void>;
  reset: () => Promise<void>;
  recover: () => Promise<void>;
  flushSaved: () => Promise<Snapshot>;
  retry: () => void;
};
const Context = createContext<Store | null>(null);
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("StoreProvider missing");
  return value;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot>(emptySnapshot),
    [ready, setReady] = useState(false),
    [readOnly, setReadOnly] = useState(true),
    [error, setError] = useState<string | null>(null),
    [saving, setSaving] = useState(false),
    [toasts, setToasts] = useState<Toast[]>([]);
  const current = useRef(data),
    writable = useRef(false),
    pending = useRef(0),
    queue = useRef(Promise.resolve()),
    lastPersistenceError = useRef<unknown>(null),
    notificationBuffer = useRef<Pick<Toast, "message" | "tone">[] | null>(null),
    channel = useRef<BroadcastChannel | null>(null),
    alive = useRef(true);
  const notify = useCallback(
    (message: string, tone: Toast["tone"] = "success") => {
      if (notificationBuffer.current) {
        notificationBuffer.current.push({ message, tone });
        return;
      }
      const id = uid();
      setToasts((t) => [...t.slice(-3), { id, message, tone }]);
      window.setTimeout(
        () => setToasts((t) => t.filter((x) => x.id !== id)),
        tone === "error" ? 9000 : 4500,
      );
    },
    [],
  );
  const beginNotificationBuffer = useCallback(() => {
    notificationBuffer.current = [];
  }, []);
  const endNotificationBuffer = useCallback(() => {
    const buffered = notificationBuffer.current || [];
    notificationBuffer.current = null;
    return buffered;
  }, []);
  const dismiss = useCallback(
    (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );
  const persist = useCallback((next: Snapshot) => {
    pending.current++;
    setSaving(true);
    queue.current = queue.current
      .then(async () => {
        // Synchronous batches (curriculum imports, tag renames) need only their final snapshot.
        if (next !== current.current) return;
        const db = await database();
        await db.put("workspace", next, "current");
        lastPersistenceError.current = null;
        setError(null);
        channel.current?.postMessage("saved");
      })
      .catch((e) => {
        lastPersistenceError.current = e;
        setError(
          `Local save failed: ${e instanceof Error ? e.message : "storage unavailable"}. Export your data before closing this tab.`,
        );
      })
      .finally(() => {
        pending.current--;
        if (alive.current && pending.current === 0) setSaving(false);
      });
  }, []);
  const commit = useCallback(
    (change: (old: Snapshot) => Snapshot) => {
      if (!writable.current) {
        notify("This tab is read-only. Use the active editing tab.", "info");
        return;
      }
      const next = {
        ...change(current.current),
        savedAt: new Date().toISOString(),
      };
      current.current = next;
      setData(next);
      persist(next);
    },
    [notify, persist],
  );
  useEffect(() => {
    let release: (() => void) | undefined;
    let cancelled = false;
    alive.current = true;
    const load = async (isWriter: boolean) => {
      try {
        const db = await database();
        const raw = await db.get("workspace", "current");
        if (cancelled) return;
        const next = raw ? validateSnapshot(raw) : emptySnapshot();
        current.current = next;
        setData(next);
        writable.current = isWriter;
        setReadOnly(!isWriter);
        setReady(true);
        if (!raw && isWriter) await db.put("workspace", next, "current");
      } catch (e) {
        setError(
          `Unable to open saved data: ${e instanceof Error ? e.message : "browser storage unavailable"}. Existing data was not overwritten.`,
        );
        setReady(true);
      }
    };
    if (navigator.locks)
      void navigator.locks.request(
        "studyos-nexus:writer",
        { ifAvailable: true },
        async (lock) => {
          if (cancelled) return;
          await load(Boolean(lock));
          if (lock && !cancelled)
            await new Promise<void>((r) => {
              release = r;
            });
        },
      );
    else {
      setError(
        "This browser lacks Web Locks. Use a current Chrome, Edge, Firefox or Safari for safe editing.",
      );
      void load(false);
    }
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel("studyos-nexus:updates");
      channel.current = bc;
      bc.onmessage = async () => {
        if (writable.current) return;
        try {
          const db = await database();
          const raw = await db.get("workspace", "current");
          if (raw && !cancelled) {
            const next = validateSnapshot(raw);
            current.current = next;
            setData(next);
          }
        } catch {
          /* existing visible snapshot remains intact */
        }
      };
    }
    const before = (event: BeforeUnloadEvent) => {
      if (pending.current > 0) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => {
      cancelled = true;
      alive.current = false;
      writable.current = false;
      release?.();
      channel.current?.close();
      window.removeEventListener("beforeunload", before);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        "studyos-nexus:appearance",
        JSON.stringify({
          theme: data.settings.theme,
          accent: data.settings.accent,
          density: data.settings.density,
        }),
      );
    } catch {
      /* IndexedDB remains the canonical store. */
    }
  }, [data.settings.theme, data.settings.accent, data.settings.density, ready]);
  const create = useCallback(
    (kind: Kind, values: Partial<Item>) => {
      if (!writable.current) throw new Error("Workspace is read-only.");
      if (current.current.items.length >= 50000)
        throw new Error(
          "This workspace has reached its 50,000-record limit. Export a backup before removing records or resetting.",
        );
      const now = new Date().toISOString();
      const item: Item = {
        ...values,
        id: uid(),
        kind,
        title: values.title?.trim() || "Untitled",
        createdAt: now,
        updatedAt: now,
      };
      validateItem(item);
      commit((s) => ({ ...s, items: [...s.items, item] }));
      return item;
    },
    [commit],
  );
  const createMany = useCallback(
    (records: { kind: Kind; values: Partial<Item> }[]) => {
      if (!writable.current) throw new Error("Workspace is read-only.");
      const now = new Date().toISOString();
      const batch = records.map(({ kind, values }) =>
        validateItem({
          ...values,
          id: uid(),
          kind,
          title: values.title?.trim() || "Untitled",
          createdAt: now,
          updatedAt: now,
        }),
      );
      if (current.current.items.length + batch.length > 50000)
        throw new Error("Too many records in this workspace.");
      commit((s) => ({ ...s, items: [...s.items, ...batch] }));
      return batch;
    },
    [commit],
  );
  const update = useCallback(
    (id: string, patch: Partial<Item>) => {
      const old = current.current.items.find((item) => item.id === id);
      if (!old) return;
      const next = { ...old, ...patch };
      const advancing =
        patch.status !== undefined &&
        old.status !== patch.status &&
        (old.kind === "task"
          ? ["done", "completed"].includes(patch.status)
          : old.kind === "topic" &&
            [
              "learning",
              "practicing",
              "revising",
              "completed",
              "mastered",
            ].includes(patch.status));
      const error = advancing
        ? progressionError(next, current.current.items)
        : "";
      if (error) {
        notify(error, "info");
        return;
      }
      validateItem(next);
      commit((s) => ({
        ...s,
        items: updateRecord(s.items, id, patch),
      }));
    },
    [commit, notify],
  );
  const remove = useCallback(
    (id: string) =>
      commit((s) => ({
        ...s,
        items: removeRecord(s.items, id),
        settings: {
          ...s.settings,
          recent: s.settings.recent.filter((i) => i !== id),
          problemOfDay:
            s.settings.problemOfDay === id ? "" : s.settings.problemOfDay,
        },
        timer: {
          ...s.timer,
          linkedId: s.timer.linkedId === id ? "" : s.timer.linkedId,
        },
      })),
    [commit],
  );
  const setSettings = useCallback(
    (patch: Partial<Settings>) =>
      commit((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    [commit],
  );
  const setTimer = useCallback(
    (patch: Partial<TimerState>) =>
      commit((s) => ({ ...s, timer: { ...s.timer, ...patch } })),
    [commit],
  );
  const touch = useCallback(
    (id: string) => {
      if (!writable.current || current.current.settings.recent[0] === id)
        return;
      commit((s) => ({
        ...s,
        settings: {
          ...s.settings,
          recent: [id, ...s.settings.recent.filter((i) => i !== id)].slice(
            0,
            10,
          ),
        },
      }));
    },
    [commit],
  );
  const completeTask = useCallback(
    (id: string) => {
      const task = current.current.items.find((item) => item.id === id);
      if (!task || task.kind !== "task") return;
      const error = !["done", "completed"].includes(task.status || "")
        ? progressionError(task, current.current.items)
        : "";
      if (error) {
        notify(error, "info");
        return;
      }
      commit((s) => ({ ...s, items: toggleTask(s.items, id) }));
    },
    [commit, notify],
  );
  const importData = useCallback(
    async (incoming: Snapshot, mode: "merge" | "replace") => {
      if (!writable.current) throw new Error("This tab is read-only.");
      const valid = validateSnapshot(JSON.parse(JSON.stringify(incoming)));
      writable.current = false;
      setReadOnly(true);
      setSaving(true);
      try {
        await queue.current;
        const old = {
          ...current.current,
          savedAt: new Date().toISOString(),
          timer: pauseTimerAt(current.current.timer, Date.now()),
        };
        const next = mode === "merge" ? mergeSnapshots(old, valid) : valid;
        // A restored timer is paused; never count time elapsed between backup and restore as studying.
        next.timer = pauseTimerAt(next.timer, Date.parse(next.savedAt));
        next.settings = { ...next.settings, welcomed: true };
        next.savedAt = new Date().toISOString();
        const db = await database();
        const tx = db.transaction("workspace", "readwrite");
        await tx.store.put(old, "recovery");
        await tx.store.put(next, "current");
        await tx.done;
        lastPersistenceError.current = null;
        current.current = next;
        setData(next);
        setError(null);
        channel.current?.postMessage("saved");
      } finally {
        writable.current = true;
        setReadOnly(false);
        setSaving(false);
      }
    },
    [],
  );
  const reset = useCallback(async () => {
    const next = emptySnapshot();
    await importData(next, "replace");
  }, [importData]);
  const recover = useCallback(async () => {
    const db = await database();
    const raw = await db.get("workspace", "recovery");
    if (!raw)
      throw new Error(
        "No recovery copy yet. One is created before each import or reset.",
      );
    await importData(validateSnapshot(raw), "replace");
  }, [importData]);
  const flushSaved = useCallback(async () => {
    await queue.current;
    if (lastPersistenceError.current) {
      const cause = lastPersistenceError.current;
      throw new Error(
        `Local save failed: ${cause instanceof Error ? cause.message : "storage unavailable"}.`,
      );
    }
    const db = await database();
    const raw = await db.get("workspace", "current");
    if (!raw) throw new Error("No saved workspace snapshot was found.");
    return validateSnapshot(raw);
  }, []);
  const retry = useCallback(() => {
    if (writable.current) persist(current.current);
  }, [persist]);
  return (
    <Context.Provider
      value={{
        items: data.items,
        settings: data.settings,
        timer: data.timer,
        ready,
        error,
        readOnly,
        saving,
        toasts,
        dismiss,
        create,
        createMany,
        update,
        remove,
        setSettings,
        setTimer,
        notify,
        beginNotificationBuffer,
        endNotificationBuffer,
        completeTask,
        touch,
        snapshot: () => current.current,
        importData,
        reset,
        recover,
        flushSaved,
        retry,
      }}
    >
      {children}
    </Context.Provider>
  );
}
