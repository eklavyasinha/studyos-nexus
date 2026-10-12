import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  CirclePause,
  Clock3,
  Coffee,
  Flame,
  Headphones,
  Link2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SkipForward,
  Target,
  Timer,
  Volume2,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Confirm,
  Empty,
  Field,
  Modal,
  PageHeader,
  Panel,
  Progress,
} from "../components/ui";
import { useStore } from "../lib/store";
import type { Item, TimerState } from "../lib/types";
import {
  addDays,
  cx,
  formatDate,
  isDone,
  navigate,
  percent,
  routeFor,
  today,
} from "../lib/utils";
import {
  configuredTimerSeconds,
  elapsedTimerSeconds,
  remainingTimerSeconds,
  timerDisplay,
} from "./focus-timer";
import "./knowledge.css";

type Store = ReturnType<typeof useStore>;
type CompletionReason = "completed" | "skipped";
const completionClaims = new Set<string>();
let timerAudio: AudioContext | null = null;

// Browsers require a gesture to unlock audio. Never claim that a background alarm is guaranteed.
async function unlockTimerSound() {
  try {
    if (!timerAudio) timerAudio = new AudioContext();
    if (timerAudio.state !== "running") await timerAudio.resume();
    return timerAudio.state === "running";
  } catch {
    return false;
  }
}

function playTimerSound() {
  if (!timerAudio || timerAudio.state !== "running") return false;
  try {
    const oscillator = timerAudio.createOscillator();
    const gain = timerAudio.createGain();
    const at = timerAudio.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, at);
    oscillator.frequency.setValueAtTime(880, at + 0.18);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.12, at + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.55);
    oscillator.connect(gain);
    gain.connect(timerAudio.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.6);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    return true;
  } catch {
    return false;
  }
}

function nextTimer(store: Store, countFocus = true): Partial<TimerState> {
  const { timer, settings } = store;
  const cycles = timer.cycles + (timer.mode === "focus" && countFocus ? 1 : 0);
  const mode =
    timer.mode === "focus"
      ? cycles > 0 && cycles % 4 === 0
        ? "long"
        : "short"
      : "focus";
  const duration = configuredTimerSeconds(mode, settings);
  return {
    mode,
    duration,
    remaining: duration,
    elapsed: 0,
    endAt: null,
    startedAt: null,
    running: false,
    interruptions: 0,
    cycles,
  };
}

function finishTimer(store: Store, reason: CompletionReason, now = Date.now()) {
  if (!store.ready || store.readOnly || !store.timer.startedAt) return;
  const timer = store.timer;
  const key = timer.startedAt!;
  // Same persisted startTime is checked after a reload; the in-memory claim also covers
  // StrictMode effects and a manual completion racing the global interval callback.
  if (completionClaims.has(key)) return;
  completionClaims.add(key);
  try {
    const seconds = elapsedTimerSeconds(timer, now);
    const end = new Date(
      timer.running && timer.endAt !== null ? Math.min(now, timer.endAt) : now,
    );
    const existing = store.items.some(
      (item) =>
        item.kind === "session" &&
        item.mode === "focus" &&
        item.startTime === key,
    );
    if (timer.mode === "focus" && seconds >= 1 && !existing) {
      const linked = store.items.find((item) => item.id === timer.linkedId);
      store.create("session", {
        title: linked ? `Focus · ${linked.title}` : "Deep work session",
        mode: "focus",
        status: reason,
        date: today(end),
        startTime: key!,
        endTime: end.toISOString(),
        completedAt: end.toISOString(),
        actualMinutes: Math.floor(seconds) / 60,
        duration: timer.duration / 60,
        interruptions: timer.interruptions,
        taskId: linked?.kind === "task" ? linked.id : undefined,
        projectId: linked?.kind === "project" ? linked.id : linked?.projectId,
        subjectId: linked?.kind === "subject" ? linked.id : linked?.subjectId,
      });
    }
    store.setTimer(nextTimer(store, seconds >= 1));
    const logged = Math.floor(seconds / 60);
    store.notify(
      timer.mode === "focus"
        ? seconds >= 1
          ? `${logged ? `${logged} min` : "Less than 1 min"} of focus logged. Your break is ready.`
          : "Next break is ready. No focused time to log."
        : "Break finished. Ready for your next focus block?",
      "success",
    );
    if (store.settings.sound) playTimerSound();
    if (completionClaims.size > 1000)
      completionClaims.delete(completionClaims.values().next().value!);
  } catch {
    completionClaims.delete(key);
    store.notify(
      "Could not finish this timer. Your current timer is still available.",
      "error",
    );
  }
}

/** Mount exactly once in App, outside route content. Focus deliberately does not mount it. */
export function TimerEngine() {
  const store = useStore();
  useEffect(() => {
    if (!store.timer.startedAt) completionClaims.clear();
  }, [store.timer.startedAt]);
  const latest = useRef(store);
  latest.current = store;
  useEffect(() => {
    const check = () => {
      const current = latest.current;
      if (!current.ready || current.readOnly) return;
      if (
        current.timer.running &&
        current.timer.endAt !== null &&
        current.timer.endAt <= Date.now()
      )
        finishTimer(current, "completed");
    };
    check();
    const interval = window.setInterval(check, 500);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);
  useEffect(() => {
    if (
      !store.ready ||
      store.readOnly ||
      store.timer.startedAt ||
      store.timer.running
    )
      return;
    const duration = configuredTimerSeconds(store.timer.mode, store.settings);
    if (duration !== store.timer.duration || duration !== store.timer.remaining)
      store.setTimer({ duration, remaining: duration });
  }, [
    store.ready,
    store.readOnly,
    store.timer.startedAt,
    store.timer.running,
    store.timer.mode,
    store.timer.duration,
    store.timer.remaining,
    store.settings.focusMinutes,
    store.settings.shortBreak,
    store.settings.longBreak,
  ]);
  return null;
}

function FocusSettings({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const weeklyGoal = store.items.find(
    (item) =>
      item.kind === "goal" &&
      item.domain === "focus" &&
      item.period === "weekly",
  );
  const [values, setValues] = useState({
    focusMinutes: String(store.settings.focusMinutes),
    shortBreak: String(store.settings.shortBreak),
    longBreak: String(store.settings.longBreak),
    dailyGoal: String(store.settings.dailyGoal),
    weeklyGoal: String(weeklyGoal?.target || store.settings.dailyGoal * 7),
    sound: store.settings.sound,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (store.readOnly)
      return store.notify(
        "This tab is read-only. Switch to the active editing tab.",
        "info",
      );
    const focusMinutes = Number(values.focusMinutes),
      shortBreak = Number(values.shortBreak),
      longBreak = Number(values.longBreak),
      dailyGoal = Number(values.dailyGoal),
      weekly = Number(values.weeklyGoal);
    if (
      ![focusMinutes, shortBreak, longBreak].every(
        (value) => Number.isInteger(value) && value >= 1 && value <= 180,
      ) ||
      !Number.isInteger(dailyGoal) ||
      dailyGoal < 1 ||
      dailyGoal > 1440 ||
      !Number.isInteger(weekly) ||
      weekly < 1 ||
      weekly > 10080
    )
      return store.notify(
        "Enter valid whole-minute durations and goals.",
        "error",
      );
    store.setSettings({
      focusMinutes,
      shortBreak,
      longBreak,
      dailyGoal,
      sound: values.sound,
    });
    if (weeklyGoal) store.update(weeklyGoal.id, { target: weekly });
    else
      store.create("goal", {
        title: "Weekly focus goal",
        domain: "focus",
        category: "Focus",
        period: "weekly",
        target: weekly,
      });
    store.notify("Focus preferences saved.", "success");
    onClose();
  };
  return (
    <Modal title="Find your rhythm" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <fieldset disabled={store.readOnly} className="kn-fieldset stack">
          <p className="muted small">
            Durations apply to new blocks. An in-progress block keeps its
            original duration.
          </p>
          <div className="kn-settings-durations">
            {(
              [
                { key: "focusMinutes", label: "Focus" },
                { key: "shortBreak", label: "Short break" },
                { key: "longBreak", label: "Long break" },
              ] as const
            ).map((field) => (
              <Field key={field.key} label={`${field.label} (min)`}>
                <input
                  type="number"
                  required
                  min={1}
                  max={180}
                  step={1}
                  value={values[field.key]}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                />
              </Field>
            ))}
          </div>
          <div className="grid-2">
            <Field label="Daily focus goal (min)">
              <input
                type="number"
                required
                min={1}
                max={1440}
                step={1}
                value={values.dailyGoal}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    dailyGoal: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Weekly focus goal (min)">
              <input
                type="number"
                required
                min={1}
                max={10080}
                step={1}
                value={values.weeklyGoal}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    weeklyGoal: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <label className="kn-checkbox">
            <input
              type="checkbox"
              checked={values.sound}
              onChange={(event) => {
                setValues((current) => ({
                  ...current,
                  sound: event.target.checked,
                }));
                if (event.target.checked) void unlockTimerSound();
              }}
            />
            <span>
              <strong>Gentle completion sound</strong>
              <small>
                Sound requires a browser interaction and an open app. Muted or
                suspended tabs may not play it.
              </small>
            </span>
          </label>
          <Button
            type="button"
            variant="ghost"
            disabled={!values.sound}
            onClick={async () => {
              const unlocked = await unlockTimerSound();
              if (!unlocked || !playTimerSound())
                store.notify(
                  "The browser blocked audio. Check this site’s audio permissions.",
                  "info",
                );
            }}
          >
            <Volume2 size={16} /> Test sound
          </Button>
          <p className="kn-settings-note">
            Every fourth focus block is followed by a long break. The next block
            waits for you to press Start.
          </p>
          <div className="kn-modal-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save preferences
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

const modes = [
  { id: "focus", label: "Focus", icon: Headphones },
  { id: "short", label: "Short break", icon: Coffee },
  { id: "long", label: "Long break", icon: Coffee },
] as const;
const sessionDay = (session: Item) =>
  session.date?.slice(0, 10) ||
  today(new Date(session.completedAt || session.createdAt));
const minuteLabel = (minutes: number) =>
  minutes < 1 && minutes > 0 ? "<1" : String(Math.floor(minutes));

export default function Focus({ recordId }: { recordId?: string }) {
  const store = useStore();
  const { items, timer, settings, readOnly, ready, setTimer, notify } = store;
  const latestStore = useRef(store);
  latestStore.current = store;
  const [now, setNow] = useState(Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => void;
  } | null>(null);
  const [historyAll, setHistoryAll] = useState(false);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  const remaining = remainingTimerSeconds(timer, now);
  const elapsed = elapsedTimerSeconds(timer, now);
  const linked = items.find((item) => item.id === timer.linkedId);
  const sessions = items
    .filter((item) => item.kind === "session" && item.mode === "focus")
    .sort((a, b) =>
      (b.completedAt || b.createdAt).localeCompare(
        a.completedAt || a.createdAt,
      ),
    );
  const day = today(new Date(now));
  const weekDate = new Date(`${day}T12:00:00`);
  weekDate.setDate(
    weekDate.getDate() - ((weekDate.getDay() - settings.weekStart + 7) % 7),
  );
  const weekStart = today(weekDate);
  const weekEnd = addDays(weekStart, 6);
  const focusedToday = sessions
    .filter((session) => sessionDay(session) === day)
    .reduce((sum, session) => sum + (session.actualMinutes || 0), 0);
  const focusedWeek = sessions
    .filter(
      (session) =>
        sessionDay(session) >= weekStart && sessionDay(session) <= weekEnd,
    )
    .reduce((sum, session) => sum + (session.actualMinutes || 0), 0);
  const weeklyGoal =
    items.find(
      (item) =>
        item.kind === "goal" &&
        item.domain === "focus" &&
        item.period === "weekly",
    )?.target || settings.dailyGoal * 7;
  const selectedSession = recordId
    ? sessions.find((session) => session.id === recordId)
    : undefined;
  const canWrite = () => {
    if (!latestStore.current.ready || latestStore.current.readOnly) {
      latestStore.current.notify(
        "This tab is read-only. Switch to the active editing tab.",
        "info",
      );
      return false;
    }
    return true;
  };
  const setMode = (mode: TimerState["mode"]) => {
    if (!canWrite() || mode === timer.mode) return;
    const apply = () => {
      if (!canWrite()) return;
      const duration = configuredTimerSeconds(mode, settings);
      setTimer({
        mode,
        duration,
        remaining: duration,
        elapsed: 0,
        endAt: null,
        startedAt: null,
        running: false,
        interruptions: 0,
      });
    };
    if (timer.startedAt)
      setConfirm({
        title: "Switch this block?",
        message:
          "Switching clears this unfinished block without adding it to history. Use Complete to save your actual focused time first.",
        action: apply,
      });
    else apply();
  };
  const startPause = () => {
    if (!canWrite()) return;
    const at = Date.now();
    if (timer.running) {
      if (timer.endAt !== null && timer.endAt <= at)
        return finishTimer(store, "completed", at);
      setTimer({
        running: false,
        remaining: remainingTimerSeconds(timer, at),
        elapsed: elapsedTimerSeconds(timer, at),
        endAt: null,
        interruptions:
          timer.mode === "focus"
            ? timer.interruptions + 1
            : timer.interruptions,
      });
    } else {
      const duration = timer.startedAt
        ? timer.duration
        : configuredTimerSeconds(timer.mode, settings);
      const rest = timer.startedAt ? timer.remaining : duration;
      if (rest <= 0) return finishTimer(store, "completed", at);
      if (settings.sound) void unlockTimerSound();
      setTimer({
        running: true,
        duration,
        remaining: rest,
        endAt: at + rest * 1000,
        startedAt: timer.startedAt || new Date(at).toISOString(),
      });
    }
    setNow(at);
  };
  const reset = () => {
    if (!canWrite()) return;
    const apply = () => {
      if (!canWrite()) return;
      const duration = configuredTimerSeconds(timer.mode, settings);
      setTimer({
        running: false,
        remaining: duration,
        duration,
        endAt: null,
        startedAt: null,
        elapsed: 0,
        interruptions: 0,
      });
    };
    if (timer.startedAt)
      setConfirm({
        title: "Reset this timer?",
        message:
          "This unfinished block will be cleared without logging focus time. Completed session history is kept.",
        action: apply,
      });
    else apply();
  };
  const skip = () => {
    if (!canWrite()) return;
    if (!timer.startedAt) {
      setTimer(nextTimer(store, false));
      return;
    }
    setConfirm({
      title: "Move to the next block?",
      message:
        timer.mode === "focus"
          ? "Only the time you actually focused will be added to history. The next break will be ready, but will not start automatically."
          : "End this break and prepare a new focus block. Breaks are never counted toward your focus goal.",
      action: () => {
        if (canWrite()) finishTimer(latestStore.current, "skipped");
      },
    });
  };
  const complete = () => {
    if (canWrite()) finishTimer(store, "completed");
  };
  const history = historyAll ? sessions : sessions.slice(0, 6);
  const associationFor = (session: Item) =>
    items.find((item) =>
      [session.taskId, session.projectId, session.subjectId].includes(item.id),
    );
  return (
    <div className="knowledge-page focus-page">
      <PageHeader
        eyebrow="LESS NOISE. MORE PROGRESS."
        title="Find your focus"
        description="One thing at a time. Give your best ideas some uninterrupted space."
        actions={
          <Button onClick={() => setSettingsOpen(true)}>
            <Settings2 size={16} /> Preferences
          </Button>
        }
      />
      {readOnly && (
        <div className="kn-notice" role="status">
          This tab is read-only. The active editing tab owns timer changes and
          session logging.
        </div>
      )}
      <div className="kn-focus-layout">
        <section className="kn-timer-card">
          <div className="kn-timer-card-top">
            <span className="kn-live-label">
              <span
                className={cx("kn-status-dot", timer.running && "is-saving")}
              />
              {timer.running
                ? timer.mode === "focus"
                  ? "IN THE ZONE"
                  : "TAKE A BREATHER"
                : timer.startedAt
                  ? "ON PAUSE"
                  : "YOUR NEXT GOOD SESSION"}
            </span>
            <Badge>
              {timer.cycles} {timer.cycles === 1 ? "block" : "blocks"} logged
            </Badge>
          </div>
          <div className="kn-mode-tabs" role="group" aria-label="Timer mode">
            {modes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                disabled={readOnly || !ready}
                aria-pressed={timer.mode === id}
                className={cx(timer.mode === id && "is-active")}
                onClick={() => setMode(id)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
          <div
            className="kn-timer-dial"
            style={
              {
                "--timer-progress": `${Math.max(0, Math.min(100, percent(elapsed, timer.duration)))}%`,
              } as CSSProperties
            }
          >
            <svg
              className="kn-timer-ring"
              viewBox="0 0 280 280"
              aria-hidden="true"
            >
              <circle className="kn-ring-track" cx="140" cy="140" r="131" />
              <circle
                className="kn-ring-value"
                cx="140"
                cy="140"
                r="131"
                strokeDasharray={2 * Math.PI * 131}
                strokeDashoffset={
                  2 *
                  Math.PI *
                  131 *
                  (1 - Math.min(1, elapsed / Math.max(1, timer.duration)))
                }
              />
            </svg>
            <span className="kn-timer-eyebrow">
              {timer.mode === "focus"
                ? "DEEP WORK"
                : timer.mode === "short"
                  ? "SHORT BREAK"
                  : "LONG BREAK"}
            </span>
            <span
              className="kn-timer-digits"
              role="timer"
              aria-label={`${timerDisplay(remaining)} remaining`}
            >
              {timerDisplay(remaining)}
            </span>
            <span className="kn-timer-caption">
              {timer.running
                ? "You’re right where you need to be."
                : timer.startedAt
                  ? "Take your time. Then come back."
                  : timer.mode === "focus"
                    ? "A small start is still a start."
                    : "Rest is part of the work."}
            </span>
          </div>
          <div
            className="kn-cycle-dots"
            role="img"
            aria-label={`${timer.cycles % 4} of 4 focus blocks before a long break`}
          >
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={cx(index < timer.cycles % 4 && "is-complete")}
              />
            ))}
          </div>
          <div className="kn-timer-controls">
            <Button
              className="kn-round-control"
              aria-label="Reset timer"
              title="Reset timer"
              disabled={readOnly || !ready}
              onClick={reset}
            >
              <RotateCcw size={18} />
            </Button>
            <Button
              variant="primary"
              className="kn-timer-start"
              disabled={readOnly || !ready}
              onClick={startPause}
            >
              {timer.running ? <Pause size={19} /> : <Play size={19} />}
              {timer.running
                ? timer.mode === "focus"
                  ? "Pause focus"
                  : "Pause break"
                : timer.startedAt
                  ? "Resume"
                  : timer.mode === "focus"
                    ? "Start focus"
                    : "Start break"}
            </Button>
            <Button
              className="kn-round-control"
              aria-label="Skip to next block"
              title="Skip to next block"
              disabled={readOnly || !ready}
              onClick={skip}
            >
              <SkipForward size={18} />
            </Button>
          </div>
          {timer.startedAt && (
            <div className="kn-timer-secondary">
              <Button variant="ghost" disabled={readOnly} onClick={complete}>
                <Check size={15} />
                {timer.mode === "focus"
                  ? "Complete & log actual time"
                  : "Finish break"}
              </Button>
              {timer.mode === "focus" && (
                <Button
                  variant="ghost"
                  disabled={readOnly || !timer.running}
                  onClick={() => {
                    if (canWrite()) {
                      setTimer({ interruptions: timer.interruptions + 1 });
                      notify(
                        "Interruption noted. Take a breath and return.",
                        "info",
                      );
                    }
                  }}
                >
                  <Bell size={15} /> Log interruption ({timer.interruptions})
                </Button>
              )}
            </div>
          )}
          <div className="kn-timer-association">
            <Link2 size={16} />
            <Field label="What are you working on?">
              <select
                aria-label="Associate focus with a task, project, or subject"
                value={timer.linkedId}
                disabled={readOnly || Boolean(timer.startedAt)}
                onChange={(event) => {
                  if (canWrite()) setTimer({ linkedId: event.target.value });
                }}
              >
                <option value="">Open focus · no association</option>
                {(["task", "project", "subject"] as const).map((kind) => (
                  <optgroup
                    key={kind}
                    label={
                      kind === "task"
                        ? "Tasks"
                        : kind === "project"
                          ? "Projects"
                          : "Subjects"
                    }
                  >
                    {items
                      .filter(
                        (item) =>
                          item.kind === kind &&
                          (item.id === timer.linkedId || !isDone(item)),
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            {linked && (
              <Button
                variant="ghost"
                className="icon-button"
                aria-label={`Open ${linked.title}`}
                onClick={() => navigate(routeFor(linked), linked.id)}
              >
                <ArrowUpRight size={16} />
              </Button>
            )}
          </div>
          <p className="kn-timer-footnote">
            <Clock3 size={13} />
            Timer stays on track across pages and reloads. Completion is
            processed when this app is active.
          </p>
        </section>
        <aside className="kn-focus-aside">
          <Panel
            title="A little better, every day"
            action={<Target size={18} />}
            className="kn-goals-panel"
          >
            <div className="kn-focus-goal">
              <div className="kn-goal-label">
                <span>Today’s focus</span>
                <span>
                  {Math.min(100, percent(focusedToday, settings.dailyGoal))}%
                </span>
              </div>
              <div className="kn-goal-value">
                {minuteLabel(focusedToday)}
                <span> / {settings.dailyGoal} min</span>
              </div>
              <Progress
                value={Math.min(100, percent(focusedToday, settings.dailyGoal))}
                label="Daily focus goal"
              />
              <p>
                {focusedToday >= settings.dailyGoal
                  ? "Daily goal reached. Nice work showing up."
                  : `${Math.ceil(settings.dailyGoal - focusedToday)} minutes to your daily goal.`}
              </p>
            </div>
            <div className="kn-focus-goal">
              <div className="kn-goal-label">
                <span>This week</span>
                <span>
                  {formatDate(weekStart)}–{formatDate(weekEnd)}
                </span>
              </div>
              <div className="kn-goal-value">
                {minuteLabel(focusedWeek)}
                <span> / {weeklyGoal} min</span>
              </div>
              <Progress
                value={Math.min(100, percent(focusedWeek, weeklyGoal))}
                label="Weekly focus goal"
              />
              <div className="kn-week-bars">
                {Array.from({ length: 7 }, (_, index) => {
                  const date = addDays(weekStart, index);
                  const total = sessions
                    .filter((session) => sessionDay(session) === date)
                    .reduce(
                      (sum, session) => sum + (session.actualMinutes || 0),
                      0,
                    );
                  return (
                    <div
                      key={date}
                      className={cx(date === day && "is-today")}
                      title={`${formatDate(date)}: ${minuteLabel(total)} focus minutes`}
                    >
                      <div className="kn-week-bar-track">
                        <span
                          style={{
                            height: `${Math.min(100, percent(total, settings.dailyGoal))}%`,
                          }}
                        />
                      </div>
                      <small>
                        {new Date(`${date}T12:00:00`).toLocaleDateString(
                          undefined,
                          { weekday: "narrow" },
                        )}
                      </small>
                    </div>
                  );
                })}
              </div>
            </div>
            <Button variant="ghost" onClick={() => setSettingsOpen(true)}>
              Adjust your goals <ChevronRight size={14} />
            </Button>
          </Panel>
          <div className="kn-focus-tip">
            <div className="kn-tip-icon">
              <Flame size={21} />
            </div>
            <span className="eyebrow">MAKE SPACE FOR DEEP WORK</span>
            <h3>
              Small sessions.
              <br />
              Meaningful progress.
            </h3>
            <p>
              Choose one clear outcome. Close the extra tabs. Let the next few
              minutes belong to that one thing.
            </p>
            <div>
              <Check size={14} />
              <span>Only actual focus time counts toward goals.</span>
            </div>
            <div>
              <CirclePause size={14} />
              <span>Pauses are excluded and count as interruptions.</span>
            </div>
          </div>
        </aside>
      </div>
      <Panel
        title="Your focus history"
        action={
          <span className="muted small">
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
          </span>
        }
        className="kn-history-panel"
      >
        {sessions.length ? (
          <>
            <div className="kn-session-history">
              {history.map((session) => {
                const association = associationFor(session);
                return (
                  <div
                    className={cx(
                      "kn-session-row",
                      selectedSession?.id === session.id && "is-selected",
                    )}
                    key={session.id}
                  >
                    <div className="kn-session-icon">
                      <Headphones size={17} />
                    </div>
                    <div className="kn-session-content">
                      <strong>{session.title}</strong>
                      <span>
                        {formatDate(
                          session.completedAt ||
                            session.date ||
                            session.createdAt,
                        )}{" "}
                        ·{" "}
                        {session.completedAt
                          ? new Date(session.completedAt).toLocaleTimeString(
                              [],
                              {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: settings.timeFormat === "12",
                              },
                            )
                          : "Focus block"}
                        {association && (
                          <>
                            {" "}
                            ·{" "}
                            <button
                              onClick={() =>
                                navigate(routeFor(association), association.id)
                              }
                            >
                              {association.title}
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="kn-session-interruptions">
                      {session.interruptions || 0} interruptions
                    </div>
                    <div className="kn-session-time">
                      <strong>
                        {minuteLabel(session.actualMinutes || 0)} min
                      </strong>
                      <span>
                        {session.status === "skipped"
                          ? "Ended early"
                          : "Completed"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {sessions.length > 6 && (
              <Button
                variant="ghost"
                onClick={() => setHistoryAll(!historyAll)}
              >
                {historyAll
                  ? "Show recent sessions"
                  : `Show all ${sessions.length} sessions`}
              </Button>
            )}
          </>
        ) : (
          <Empty
            icon={<Timer size={29} />}
            title="Your next session is the first one"
            description="Complete a focus block to see your real progress here. Even a few intentional minutes count."
          />
        )}
      </Panel>
      {settingsOpen && <FocusSettings onClose={() => setSettingsOpen(false)} />}
      {confirm && (
        <Confirm
          title={confirm.title}
          message={confirm.message}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            confirm.action();
            setConfirm(null);
          }}
        />
      )}
      {selectedSession && (
        <Modal title="Focus session" onClose={() => navigate("focus")}>
          <div className="stack">
            <Badge>
              {selectedSession.status === "skipped"
                ? "Ended early"
                : "Completed"}
            </Badge>
            <h3>{selectedSession.title}</h3>
            <p>
              {minuteLabel(selectedSession.actualMinutes || 0)} focused minutes
              · {selectedSession.interruptions || 0} interruptions
            </p>
            <p className="muted">
              {formatDate(
                selectedSession.completedAt || selectedSession.createdAt,
                true,
              )}
            </p>
            <Button onClick={() => navigate("focus")}>
              <X size={15} /> Close details
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
