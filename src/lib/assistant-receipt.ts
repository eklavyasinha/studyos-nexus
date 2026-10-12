import type { Snapshot, TimerState } from "./types";

type ComparableTimer = Omit<TimerState, "remaining" | "endAt" | "elapsed"> &
  Partial<Pick<TimerState, "remaining" | "endAt" | "elapsed">>;

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  }
  return value;
}

function timerIsStarted(timer: TimerState) {
  return timer.running || timer.startedAt !== null;
}

function comparableTimer(timer: TimerState, ignoreCountdown: boolean) {
  if (!ignoreCountdown) return timer;
  const { remaining, endAt, elapsed, ...stable } = timer;
  return stable as ComparableTimer;
}

function comparableSnapshot(snapshot: Snapshot, ignoreCountdown: boolean) {
  return {
    version: snapshot.version,
    items: snapshot.items,
    settings: snapshot.settings,
    timer: comparableTimer(snapshot.timer, ignoreCountdown),
  };
}

/** Compare saved workspace content while excluding the save timestamp. */
export function snapshotsMatch(left: Snapshot, right: Snapshot) {
  const ignoreCountdown =
    timerIsStarted(left.timer) || timerIsStarted(right.timer);
  return (
    JSON.stringify(canonical(comparableSnapshot(left, ignoreCountdown))) ===
    JSON.stringify(canonical(comparableSnapshot(right, ignoreCountdown)))
  );
}

export function snapshotChanged(before: Snapshot, after: Snapshot) {
  return !snapshotsMatch(before, after);
}

export type AssistantPersistenceVerification = {
  changed: boolean;
  matchesBefore: boolean;
  matchesAfter: boolean;
  verified: boolean;
};

export function verifyPersistedSnapshot(
  before: Snapshot,
  after: Snapshot,
  persisted: Snapshot,
): AssistantPersistenceVerification {
  const changed = snapshotChanged(before, after);
  const matchesBefore = snapshotsMatch(before, persisted);
  const matchesAfter = snapshotsMatch(after, persisted);
  return {
    changed,
    matchesBefore,
    matchesAfter,
    verified: changed && matchesAfter && !matchesBefore,
  };
}
