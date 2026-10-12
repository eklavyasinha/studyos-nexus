import type { Settings, TimerState } from "../lib/types";

export function configuredTimerSeconds(
  mode: TimerState["mode"],
  settings: Settings,
): number {
  const minutes =
    mode === "focus"
      ? settings.focusMinutes
      : mode === "short"
        ? settings.shortBreak
        : settings.longBreak;
  return (
    Math.max(1, Math.min(180, Number.isFinite(minutes) ? minutes : 25)) * 60
  );
}

/** remaining is a snapshot at start/resume; endAt is the wall-clock deadline. */
export function remainingTimerSeconds(
  timer: TimerState,
  now = Date.now(),
): number {
  return timer.running && timer.endAt !== null
    ? Math.max(0, Math.min(timer.remaining, (timer.endAt - now) / 1000))
    : Math.max(0, timer.remaining);
}

/** Paused time and time beyond the deadline never count as focused time. */
export function elapsedTimerSeconds(
  timer: TimerState,
  now = Date.now(),
): number {
  if (!timer.startedAt) return 0;
  const currentSegment =
    timer.running && timer.endAt !== null
      ? Math.max(0, timer.remaining - remainingTimerSeconds(timer, now))
      : 0;
  return Math.max(0, Math.min(timer.duration, timer.elapsed + currentSegment));
}

export function timerDisplay(seconds: number): string {
  const rounded = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}
