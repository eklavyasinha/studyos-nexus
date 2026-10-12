import { describe, expect, it } from "vitest";
import { emptySnapshot } from "../lib/logic";
import {
  snapshotChanged,
  snapshotsMatch,
  verifyPersistedSnapshot,
} from "../lib/assistant-receipt";

describe("assistant persistence receipts", () => {
  it("ignores countdown drift but checks a started timer identity and duration", () => {
    const before = emptySnapshot();
    before.timer = {
      ...before.timer,
      mode: "focus",
      running: true,
      linkedId: "task-1",
      startedAt: "2026-10-11T10:00:00.000Z",
      duration: 1500,
      remaining: 1400,
      endAt: 1760178300000,
      elapsed: 100,
    };
    const after = structuredClone(before);
    after.timer.remaining = 900;
    after.timer.endAt = 1760178800000;
    after.timer.elapsed = 600;

    expect(snapshotsMatch(before, after)).toBe(true);
    expect(snapshotChanged(before, after)).toBe(false);

    const differentTask = structuredClone(after);
    differentTask.timer.linkedId = "task-2";
    expect(snapshotsMatch(before, differentTask)).toBe(false);

    const differentDuration = structuredClone(after);
    differentDuration.timer.duration = 1800;
    expect(snapshotsMatch(before, differentDuration)).toBe(false);
  });

  it("requires persisted content to match a real changed after-snapshot", () => {
    const before = emptySnapshot();
    const timestampOnly = structuredClone(before);
    timestampOnly.savedAt = "2026-10-11T10:01:00.000Z";
    expect(snapshotChanged(before, timestampOnly)).toBe(false);

    const after = structuredClone(before);
    after.settings.theme = "light";

    expect(
      verifyPersistedSnapshot(before, after, structuredClone(after)),
    ).toEqual({
      changed: true,
      matchesBefore: false,
      matchesAfter: true,
      verified: true,
    });
    expect(
      verifyPersistedSnapshot(before, after, structuredClone(before)).verified,
    ).toBe(false);
    expect(
      verifyPersistedSnapshot(before, before, structuredClone(before)),
    ).toMatchObject({ changed: false, verified: false });
  });
});
