import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Dumbbell,
  Edit3,
  Link2,
  LockKeyhole,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  Utensils,
} from "lucide-react";
import {
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  PageHeader,
  Panel,
  Progress,
  Stat,
  Tabs,
} from "../components/ui";
import { useStore } from "../lib/store";
import type { Item } from "../lib/types";
import { platformGateState, type ReadinessPlatform } from "../lib/readiness";
import {
  addDays,
  cx,
  formatDate,
  isDone,
  navigate,
  percent,
  today,
} from "../lib/utils";
import {
  DEFAULT_RECOVERY_RULES,
  END_DATE,
  SCHEDULE_WEEKS,
  START_DATE,
  STARTING_SCHEDULE,
  SCHEDULE_PREFIX,
  ROUTINE_BLOCKS,
  STUDY_WINDOWS,
  WEEKLY_CHECKLIST,
  WEEKEND_TARGETS,
  isScheduleItem,
  scheduleDate,
  scheduleForDate,
  scheduleWeekFor,
  weekStartFor,
  type ScheduleSeed,
} from "./study-schedule-data";
import { PERSONAL_ROADMAP } from "./personal-roadmap-data";
import {
  canonicalSchedulePrerequisite,
  freeStudySlots,
  hasScheduleInstallation,
  installationMarker,
  installationValues,
  lastIncompleteScheduleTopic,
  linkedScheduleModule,
  missingSchedulePrerequisites,
  moduleForScheduleKey,
  moduleLabel,
  overlap,
  scheduleTimingError,
  timeValue,
  validScheduleDay,
} from "./study-schedule-helpers";
import "./study-schedule.css";

type ScheduleTab = "daily" | "plan" | "checklist" | "recovery";
type EditorMode = "edit" | "reschedule";
type EditorState = { item: Item; mode: EditorMode } | null;
type RecoveryRules = {
  firstMove: string;
  lowEnergy: boolean;
  protectSleep: boolean;
  optionalOnlyAfterCore: boolean;
};
type ReviewDraft = {
  checks: Record<string, boolean>;
  note: string;
  blocker: string;
  nextFocus: string;
  rules: RecoveryRules;
};
type EditDraft = {
  title: string;
  course: string;
  stage: string;
  moduleKey: string;
  priority: string;
  milestone: string;
  completionCriteria: string;
  prerequisites: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  actualMinutes: string;
  status: string;
  description: string;
};
type TimedBlock = { item: Item; date: string; start: number; end: number };

const scheduleGate = (item: Partial<Item>, items: Item[]) => {
  const gate = item.requiresGate as ReadinessPlatform | undefined;
  if (gate !== "leetcode" && gate !== "codeforces" && gate !== "icpc")
    return undefined;
  return platformGateState(items, gate).unlocked ? undefined : gate;
};

const tabs = [
  { id: "daily", label: "Daily schedule" },
  { id: "plan", label: "Full dated plan" },
  { id: "checklist", label: "Weekly checklist" },
  { id: "recovery", label: "Recovery rules" },
] as const;

function dayTitle(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function shortDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function minutesLabel(minutes: number) {
  minutes = Math.round(minutes);
  if (minutes >= 60)
    return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
  return `${minutes}m`;
}

function courseLabel(course?: string) {
  return (
    {
      "java-dsa": "Java + DSA",
      "sigma-8": "Sigma 8.0",
      sigma: "Sigma 8.0",
      "maths-ml": "Maths for ML",
      gsoc: "GSoC exploration",
      "gsoc-open-source": "Git / GSoC foundations",
      icpc: "ICPC practice",
      leetcode: "LeetCode · gated",
      codeforces: "Codeforces · gated",
      competitive: "Competitive practice",
      "weekly-review": "Weekly review",
      recovery: "Recovery",
    }[course || ""] ||
    course ||
    "Personal study"
  );
}

function useScheduleHash(recordId?: string) {
  const read = () => {
    if (recordId) return recordId;
    if (typeof window === "undefined") return "";
    const [route, id] = window.location.hash.replace(/^#\/?/, "").split("/");
    return route === "schedule" ? id || "" : "";
  };
  const [hash, setHash] = useState(read);
  useEffect(() => {
    if (recordId) {
      setHash(recordId);
      return;
    }
    const onHash = () => setHash(read());
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [recordId]);
  return hash;
}

function defaultReviewDraft(): ReviewDraft {
  return {
    checks: Object.fromEntries(
      WEEKLY_CHECKLIST.map((item) => [item.id, false]),
    ),
    note: "",
    blocker: "",
    nextFocus: "",
    rules: { ...DEFAULT_RECOVERY_RULES },
  };
}

function reviewDraftFrom(item?: Item): ReviewDraft {
  const draft = defaultReviewDraft();
  if (!item) return draft;
  const checks = Object.fromEntries(
    WEEKLY_CHECKLIST.map((check) => [check.id, false]),
  );
  let rules: RecoveryRules = { ...DEFAULT_RECOVERY_RULES };
  try {
    const saved = JSON.parse(item.checklist || "") as {
      checks?: Record<string, boolean>;
      rules?: Partial<RecoveryRules>;
    };
    for (const check of WEEKLY_CHECKLIST)
      checks[check.id] = Boolean(saved.checks?.[check.id]);
    if (
      ["move-one", "reduce-scope", "release"].includes(
        saved.rules?.firstMove || "",
      )
    )
      rules.firstMove = saved.rules!.firstMove!;
    for (const key of [
      "lowEnergy",
      "protectSleep",
      "optionalOnlyAfterCore",
    ] as const)
      if (typeof saved.rules?.[key] === "boolean")
        rules[key] = saved.rules[key]!;
  } catch {
    /* Older or hand-edited reviews can still show their text fields. */
  }
  return {
    checks,
    note: item.body || "",
    blocker: item.reflection || "",
    nextFocus: item.goals || "",
    rules,
  };
}

function appendRescheduleHistory(
  body: string | undefined,
  from: string,
  to: string,
) {
  const marker = "Reschedule history:";
  const existing = body || "";
  if (existing.includes(marker))
    return `${existing.trim()}\n${from} → ${to}`.trim();
  return `${existing.trim()}${existing.trim() ? "\n\n" : ""}${marker}\n${from} → ${to}`.trim();
}

function asTimedBlock(item: Item): TimedBlock | null {
  if (item.archived || item.status === "cancelled" || isDone(item)) return null;
  const date = scheduleDate(item);
  const start = timeValue(item.startTime);
  if (!date || start === null) return null;
  const explicitEnd = timeValue(item.endTime);
  const end = explicitEnd ?? (item.duration ? start + item.duration : start);
  return end > start ? { item, date, start, end } : null;
}

function editDraftFrom(item: Item): EditDraft {
  return {
    title: item.title,
    course: item.course || "",
    stage: item.stage || "",
    moduleKey: item.moduleKey || "",
    priority: item.priority || "Medium",
    milestone: item.milestone || "",
    completionCriteria: item.completionCriteria || "",
    prerequisites: (item.prerequisites || []).join(", "),
    date: scheduleDate(item) || START_DATE,
    startTime: item.startTime || "",
    endTime: item.endTime || "",
    duration: item.duration === undefined ? "" : String(item.duration),
    actualMinutes:
      item.actualMinutes === undefined ? "" : String(item.actualMinutes),
    status: item.status || "todo",
    description: item.description || "",
  };
}

function scheduleSeedValues(seed: ScheduleSeed, items: Item[]): Partial<Item> {
  const topic = moduleForScheduleKey(items, seed.moduleKey);
  return { ...seed, ...(topic ? { topicId: topic.id } : {}) };
}

function ScheduleRecordCard({
  item,
  actualMinutes,
  readOnly,
  conflict,
  items,
  onComplete,
  onEdit,
  onReschedule,
}: {
  item: Item;
  actualMinutes: number;
  readOnly: boolean;
  conflict: boolean;
  items: Item[];
  onComplete: (item: Item) => void;
  onEdit: (item: Item) => void;
  onReschedule: (item: Item) => void;
}) {
  const done = isDone(item);
  const missing = missingSchedulePrerequisites(item, items);
  const blockedGate = !done ? scheduleGate(item, items) : undefined;
  const blocked = !done && (missing.length > 0 || Boolean(blockedGate));
  const module = linkedScheduleModule(item, items);
  const revision = lastIncompleteScheduleTopic(item, items);
  const moved = Boolean(
    item.originalDate &&
    scheduleDate(item) &&
    item.originalDate !== scheduleDate(item),
  );
  return (
    <article
      className={cx(
        "schedule-record",
        done && "is-done",
        conflict && "has-conflict",
        blocked && "is-blocked",
      )}
    >
      <div className="schedule-record-main">
        <button
          type="button"
          className={cx("schedule-check", done && "is-checked")}
          aria-label={`${done ? "Mark incomplete" : "Complete"}: ${item.title}`}
          aria-pressed={done}
          disabled={readOnly || item.kind !== "task" || blocked}
          title={
            blockedGate
              ? `The ${blockedGate} readiness gate is not yet satisfied.`
              : blocked
                ? "Revise last incomplete topic instead; prerequisites must be completed in the course map."
                : undefined
          }
          onClick={() => onComplete(item)}
        >
          {done ? <Check size={15} /> : <Circle size={17} />}
        </button>
        <div className="schedule-record-copy">
          <button
            type="button"
            className="schedule-record-title"
            onClick={() => onEdit(item)}
          >
            {item.title}
          </button>
          <div className="schedule-record-meta">
            <Badge
              tone={
                item.sessionType?.startsWith("optional") ? "neutral" : "success"
              }
            >
              {courseLabel(item.course)}
            </Badge>
            {item.stage && <span>{item.stage}</span>}
            {item.priority && <Badge>{item.priority}</Badge>}
            {item.startTime && (
              <span className="mono">
                <Clock3 size={12} />
                {item.startTime}–{item.endTime || "?"}
              </span>
            )}
            {item.sessionType?.startsWith("optional") && (
              <Badge>Optional</Badge>
            )}
            {conflict && (
              <Badge tone="warning">
                <TriangleAlert size={11} /> Conflict
              </Badge>
            )}
            {blocked && (
              <Badge tone="warning">
                <LockKeyhole size={11} />
                {blockedGate ? "Readiness gate" : "Prerequisite blocked"}
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="schedule-record-description">{item.description}</p>
          )}
          {blocked && (
            <div className="schedule-prerequisite-state" role="status">
              <b>
                {blockedGate
                  ? "Readiness gate is still closed."
                  : "Revise last incomplete topic instead."}
              </b>
              <span>
                {missing.length > 0 &&
                  `Waiting for ${missing.map(moduleLabel).join(", ")}. `}
                {blockedGate &&
                  `Unlock ${blockedGate} from the roadmap gate after its real requirements are met. `}
                The dated task stays here and is not marked complete.
              </span>
              {revision && (
                <button
                  type="button"
                  onClick={() => navigate("roadmap", revision.module?.id)}
                >
                  Revise {moduleLabel(revision.key)} <Link2 size={12} />
                </button>
              )}
            </div>
          )}
          {item.milestone && (
            <p className="schedule-record-milestone">
              Milestone: {item.milestone}
            </p>
          )}
          <div className="schedule-topic-links">
            <button type="button" onClick={() => navigate("planner", item.id)}>
              <Link2 size={12} /> Task details
            </button>
            {(module || item.moduleKey) && (
              <button
                type="button"
                onClick={() => navigate("roadmap", module?.id)}
              >
                <Link2 size={12} />{" "}
                {module?.title || moduleLabel(item.moduleKey!)} · course topic
              </button>
            )}
            {missing.length === 0 && item.prerequisites?.length ? (
              <span>Prerequisites verified in course topics</span>
            ) : null}
          </div>
          {moved && (
            <p className="schedule-record-history">
              Moved from {formatDate(item.originalDate)} ·{" "}
              {item.rescheduleCount || 1} reschedule
              {(item.rescheduleCount || 1) === 1 ? "" : "s"}
            </p>
          )}
          {item.body?.includes("Reschedule history:") && (
            <details className="schedule-history">
              <summary>View reschedule history</summary>
              <p>{item.body.split("Reschedule history:")[1]?.trim()}</p>
            </details>
          )}
          <div className="schedule-effort">
            <span>
              Planned <b>{minutesLabel(item.duration || 0)}</b>
            </span>
            <span>
              Actual <b>{minutesLabel(actualMinutes)}</b>
            </span>
            {item.completionCriteria && (
              <details className="schedule-criteria">
                <summary>
                  <Target size={12} /> Completion criteria
                </summary>
                <p>{item.completionCriteria}</p>
              </details>
            )}
          </div>
        </div>
        <div className="schedule-record-actions">
          <Button
            className="icon-button"
            variant="ghost"
            aria-label={`Reschedule ${item.title}`}
            disabled={readOnly}
            onClick={() => onReschedule(item)}
          >
            <CalendarClock size={15} />
          </Button>
          <Button
            className="icon-button"
            variant="ghost"
            aria-label={`Edit ${item.title}`}
            onClick={() => onEdit(item)}
          >
            <Edit3 size={15} />
          </Button>
        </div>
      </div>
    </article>
  );
}

function WeekendTargetCard({ date }: { date: string }) {
  const target = WEEKEND_TARGETS.find((item) => item.date === date);
  if (!target) return null;
  return (
    <article className="schedule-target-card">
      <div className="schedule-target-icon">
        <Target size={17} />
      </div>
      <div>
        <p className="eyebrow">
          {target.label} · week {target.week}
        </p>
        <h3>{target.title}</h3>
        <p>{target.target}</p>
        <small>{target.support}</small>
      </div>
    </article>
  );
}

function RoutinePanel() {
  return (
    <Panel title="A realistic day" className="schedule-routine-panel">
      <div className="schedule-routine-grid">
        <div>
          <p className="schedule-subheading">
            <LockKeyhole size={14} /> Protected time
          </p>
          <div className="schedule-routine-list">
            {ROUTINE_BLOCKS.map((block) => (
              <div className="schedule-routine-row" key={block.label}>
                <span className="mono">
                  {block.start}–{block.end}
                </span>
                <b>{block.label}</b>
                <small>{block.note}</small>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="schedule-subheading">
            <Sparkles size={14} /> Starting study blocks
          </p>
          <div className="schedule-routine-list">
            {STUDY_WINDOWS.map((block) => (
              <div className="schedule-routine-row" key={block.label}>
                <span className="mono">
                  {block.start}–{block.end}
                </span>
                <b>{block.label}</b>
                <small>{block.note}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="schedule-routine-note">
        College and lunch remain protected on all seven days; no weekend absence
        is assumed. Weekday question sets use part of Java time. Weekend targets
        are aspirations, with at most 5h genuinely free including breaks;
        optional solving/cleanup is only 15m. Dinner and the 22:45 stop take
        priority.
      </p>
    </Panel>
  );
}

function ScheduleEditor({
  state,
  draft,
  error,
  readOnly,
  blocked,
  onChange,
  onClose,
  onSave,
}: {
  state: Exclude<EditorState, null>;
  draft: EditDraft;
  error: string;
  readOnly: boolean;
  blocked: boolean;
  onChange: (patch: Partial<EditDraft>) => void;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const moved =
    draft.date !== (scheduleDate(state.item) || state.item.originalDate);
  const changeTime = (field: "startTime" | "endTime", value: string) => {
    const start = timeValue(field === "startTime" ? value : draft.startTime);
    const end = timeValue(field === "endTime" ? value : draft.endTime);
    onChange({
      [field]: value,
      ...(start !== null && end !== null && end > start
        ? { duration: String(end - start) }
        : {}),
    });
  };
  return (
    <Modal
      title={
        state.mode === "reschedule"
          ? "Reschedule schedule item"
          : "Edit schedule item"
      }
      onClose={onClose}
      wide
    >
      <form className="schedule-editor" onSubmit={onSave} noValidate>
        <div className="schedule-editor-note">
          <CalendarClock size={16} />
          {state.mode === "reschedule"
            ? "Move the record without changing its deterministic schedule ID. Its original date and history stay saved."
            : `This edits the real store record. New scaffold dates run from ${formatDate(START_DATE, true)} 2026 through ${formatDate(END_DATE, true)} 2027.`}
        </div>
        <fieldset className="form-grid" disabled={readOnly}>
          <div className="full-width">
            <Field label="Title">
              <input
                autoFocus
                value={draft.title}
                maxLength={240}
                onChange={(event) => onChange({ title: event.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Course">
            <input
              value={draft.course}
              onChange={(event) => onChange({ course: event.target.value })}
              placeholder="e.g. java-dsa or sigma-8"
              required
            />
          </Field>
          <Field label="Stage">
            <input
              value={draft.stage}
              onChange={(event) => onChange({ stage: event.target.value })}
              placeholder="A personal phase or topic"
              required
            />
          </Field>
          <Field label="Prerequisites">
            <input
              value={draft.prerequisites}
              onChange={(event) =>
                onChange({ prerequisites: event.target.value })
              }
              placeholder="Canonical keys, e.g. java.arrays, sigma.css-2"
            />
          </Field>
          <Field label="Linked course module key">
            <input
              list="schedule-module-keys"
              value={draft.moduleKey}
              onChange={(event) => onChange({ moduleKey: event.target.value })}
              placeholder="e.g. java.arrays or sigma.css-2"
            />
            <datalist id="schedule-module-keys">
              {PERSONAL_ROADMAP.map((module) => (
                <option key={module.key} value={module.key}>
                  {module.title}
                </option>
              ))}
            </datalist>
          </Field>
          <Field label="Priority">
            <select
              value={draft.priority}
              onChange={(event) => onChange({ priority: event.target.value })}
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </Field>
          <div className="full-width">
            <Field label="Practice milestone">
              <input
                value={draft.milestone}
                onChange={(event) =>
                  onChange({ milestone: event.target.value })
                }
                placeholder="The meaningful outcome this session supports"
                required
              />
            </Field>
          </div>
          <Field label="Scheduled date">
            <input
              type="date"
              min={START_DATE}
              max={END_DATE}
              value={draft.date}
              onChange={(event) => onChange({ date: event.target.value })}
              required
            />
          </Field>
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(event) => onChange({ status: event.target.value })}
            >
              <option value="todo">To do</option>
              <option value="in-progress">In progress</option>
              <option value="done" disabled={blocked}>
                Done{blocked ? " · prerequisites incomplete" : ""}
              </option>
              <option value="cancelled">Cancelled</option>
              {!["todo", "in-progress", "done", "cancelled"].includes(
                draft.status,
              ) && (
                <option value={draft.status}>
                  {draft.status} · saved status
                </option>
              )}
            </select>
          </Field>
          <Field label="Start time">
            <input
              type="time"
              value={draft.startTime}
              onChange={(event) => changeTime("startTime", event.target.value)}
              required
            />
          </Field>
          <Field label="End time">
            <input
              type="time"
              value={draft.endTime}
              onChange={(event) => changeTime("endTime", event.target.value)}
              required
            />
          </Field>
          <Field label="Planned minutes">
            <input
              type="number"
              min="1"
              max="300"
              value={draft.duration}
              readOnly
              aria-describedby="schedule-duration-note"
            />
          </Field>
          <Field label="Actual minutes">
            <input
              type="number"
              min="0"
              max="1440"
              value={draft.actualMinutes}
              onChange={(event) =>
                onChange({ actualMinutes: event.target.value })
              }
            />
          </Field>
          <div className="full-width">
            <Field label="Completion criteria">
              <textarea
                rows={3}
                value={draft.completionCriteria}
                onChange={(event) =>
                  onChange({ completionCriteria: event.target.value })
                }
                placeholder="What must be true before this item is complete?"
                required
              />
            </Field>
          </div>
          <div className="full-width">
            <Field label="Notes">
              <textarea
                rows={4}
                value={draft.description}
                onChange={(event) =>
                  onChange({ description: event.target.value })
                }
                placeholder="Keep this record useful to future you."
                required
              />
            </Field>
          </div>
        </fieldset>
        <p className="muted small" id="schedule-duration-note">
          Planned minutes are calculated from start/end. Course topic completion
          is recorded separately in the personal map.
        </p>
        {moved && (
          <p className="schedule-editor-move">
            <ShieldCheck size={14} /> This save will preserve{" "}
            {formatDate(state.item.originalDate || scheduleDate(state.item))}
            as the original date and increment reschedule history.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {readOnly && <p className="muted small">This tab is read-only.</p>}
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={readOnly}>
            <Save size={15} />
            {state.mode === "reschedule" ? "Save reschedule" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function StudySchedule({ recordId }: { recordId?: string }) {
  const {
    items,
    ready,
    readOnly,
    saving,
    create,
    createMany,
    update,
    completeTask,
    notify,
    touch,
    snapshot,
  } = useStore();
  const hashId = useScheduleHash(recordId);
  const [tab, setTab] = useState<ScheduleTab>("daily");
  const [selectedDate, setSelectedDate] = useState(() => {
    const value = today();
    return value < START_DATE
      ? START_DATE
      : value > END_DATE
        ? END_DATE
        : value;
  });
  const [editor, setEditor] = useState<EditorState>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState("");
  const [reviewDraft, setReviewDraft] =
    useState<ReviewDraft>(defaultReviewDraft);
  const [reviewMessage, setReviewMessage] = useState("");
  const [catchUpOpen, setCatchUpOpen] = useState(false);
  const [catchUpSourceId, setCatchUpSourceId] = useState("");
  const [catchUpDuration, setCatchUpDuration] = useState("30");
  const [catchUpStart, setCatchUpStart] = useState("");
  const [catchUpError, setCatchUpError] = useState("");
  const openedHash = useRef("");
  const applying = useRef(false);
  const savingReview = useRef(false);

  const scheduleRecords = useMemo(() => items.filter(isScheduleItem), [items]);
  const hasApplied = hasScheduleInstallation(items);
  const selectedWeek = scheduleWeekFor(selectedDate);
  const selectedWeekStart = weekStartFor(selectedDate);
  const selectedDayRecords = useMemo(
    () =>
      scheduleForDate(scheduleRecords, selectedDate).sort(
        (first, second) =>
          (timeValue(first.startTime) ?? 1500) -
          (timeValue(second.startTime) ?? 1500),
      ),
    [scheduleRecords, selectedDate],
  );
  const actualForItem = (item: Item) => {
    const linkedMinutes = items
      .filter(
        (record) => record.kind === "session" && record.taskId === item.id,
      )
      .reduce((sum, record) => sum + (record.actualMinutes || 0), 0);
    return linkedMinutes || item.actualMinutes || 0;
  };
  const reviewRecord = useMemo(
    () =>
      items.find(
        (item) =>
          item.kind === "review" &&
          item.scheduleId ===
            `${SCHEDULE_PREFIX}-weekly-review-${selectedWeekStart}`,
      ),
    [items, selectedWeekStart],
  );
  const catchUpSources = useMemo(
    () =>
      scheduleRecords
        .filter(
          (item) =>
            item.kind === "task" &&
            !item.archived &&
            !isDone(item) &&
            item.status !== "cancelled" &&
            (scheduleDate(item) || "") >= START_DATE &&
            (scheduleDate(item) || "") <= selectedDate &&
            ![
              "catch-up",
              "daily-review",
              "weekly-review",
              "weekly-planning",
            ].includes(item.sessionType || "") &&
            !item.sessionType?.startsWith("optional"),
        )
        .sort((a, b) =>
          (scheduleDate(a) || "").localeCompare(scheduleDate(b) || ""),
        ),
    [scheduleRecords, selectedDate],
  );
  const catchUpSource = catchUpSources.find(
    (item) => item.id === catchUpSourceId,
  );
  const catchUpMissing = catchUpSource
    ? missingSchedulePrerequisites(catchUpSource, items)
    : [];
  const catchUpSlots = useMemo(
    () => freeStudySlots(items, selectedDate, Number(catchUpDuration)),
    [items, selectedDate, catchUpDuration],
  );
  const catchUpSlot = catchUpSlots.find(
    (slot) => slot.startTime === catchUpStart,
  );
  const catchUpExisting = catchUpSource
    ? items.find(
        (item) =>
          item.scheduleId ===
          `${SCHEDULE_PREFIX}-catch-up-${selectedDate}-${catchUpSource.id}`,
      )
    : undefined;
  const weekStats = useMemo(() => {
    const records = selectedDayRecords.filter(
      (item) => item.status !== "cancelled",
    );
    const planned = records.reduce(
      (sum, item) => sum + (item.duration || 0),
      0,
    );
    const complete = records
      .filter(isDone)
      .reduce((sum, item) => sum + (item.duration || 0), 0);
    const actual = records.reduce((sum, item) => sum + actualForItem(item), 0);
    return {
      planned,
      complete,
      remaining: Math.max(planned - complete, 0),
      actual,
    };
  }, [items, selectedDayRecords]);
  const allTimed = useMemo(
    () =>
      items
        .filter((item) =>
          [
            "task",
            "event",
            "exam",
            "contest",
            "assignment",
            "practice",
            "session",
          ].includes(item.kind),
        )
        .map(asTimedBlock)
        .filter((item): item is TimedBlock => Boolean(item)),
    [items],
  );
  const timedConflicts = useMemo(() => {
    const pairs: { first: TimedBlock; second: TimedBlock }[] = [];
    for (let first = 0; first < allTimed.length; first += 1) {
      for (let second = first + 1; second < allTimed.length; second += 1) {
        const a = allTimed[first];
        const b = allTimed[second];
        if (a.item.id !== b.item.id && a.date === b.date && overlap(a, b))
          pairs.push({ first: a, second: b });
      }
    }
    return pairs;
  }, [allTimed]);
  const protectedConflicts = useMemo(() => {
    const conflicts: { item: Item; block: (typeof ROUTINE_BLOCKS)[number] }[] =
      [];
    for (const timed of allTimed) {
      for (const block of ROUTINE_BLOCKS) {
        const start = timeValue(block.start)!;
        const end = timeValue(block.end)!;
        if (overlap(timed, { start, end }))
          conflicts.push({ item: timed.item, block });
      }
    }
    return conflicts;
  }, [allTimed]);
  const conflictIds = useMemo(
    () =>
      new Set(
        timedConflicts.flatMap(({ first, second }) => [
          first.item.id,
          second.item.id,
        ]),
      ),
    [timedConflicts],
  );
  const selectedConflicts = useMemo(
    () => [
      ...timedConflicts.filter(({ first }) => first.date === selectedDate),
      ...protectedConflicts.filter(
        ({ item }) => scheduleDate(item) === selectedDate,
      ),
    ],
    [timedConflicts, protectedConflicts, selectedDate],
  );
  const selectedTimingIssues = useMemo(
    () =>
      selectedDayRecords.flatMap((item) => {
        const error = scheduleTimingError(
          selectedDate,
          item.startTime || "",
          item.endTime || "",
          item.duration ?? NaN,
        );
        return error ? [{ item, error }] : [];
      }),
    [selectedDayRecords, selectedDate],
  );

  const planWeeks = useMemo(
    () =>
      Array.from({ length: SCHEDULE_WEEKS }, (_, index) => {
        const week = index + 1;
        const dates = Array.from({ length: 7 }, (_, dayIndex) =>
          addDays(START_DATE, index * 7 + dayIndex),
        ).filter((date) => date <= END_DATE);
        return {
          week,
          dates,
          records: (hasApplied
            ? scheduleRecords
            : STARTING_SCHEDULE.map(
                (seed) =>
                  ({
                    ...seed,
                    id: seed.scheduleId,
                    createdAt: "",
                    updatedAt: "",
                  }) as Item,
              )
          ).filter((item) => {
            const date = scheduleDate(item);
            return (
              item.kind === "task" &&
              !item.archived &&
              item.status !== "cancelled" &&
              date &&
              dates.includes(date)
            );
          }),
        };
      }),
    [scheduleRecords, hasApplied],
  );

  useEffect(() => {
    if (
      !ready ||
      readOnly ||
      installationMarker(items) ||
      !items.some(isScheduleItem)
    )
      return;
    // Legacy plans are recognized as installations. Add metadata only; never
    // rewrite their seed content, completion, links or chosen dates.
    if (!installationMarker(snapshot().items))
      create("goal", installationValues(true));
  }, [ready, readOnly, items, create, snapshot]);

  useEffect(() => {
    if (!hashId || hashId === "new") {
      openedHash.current = "";
      setEditor(null);
      setEditDraft(null);
      return;
    }
    if (hashId.startsWith("date-") && validScheduleDay(hashId.slice(5))) {
      setSelectedDate(hashId.slice(5));
      setEditor(null);
      setEditDraft(null);
      openedHash.current = hashId;
      return;
    }
    if (!ready || hashId === openedHash.current) return;
    const item = items.find(
      (record) => record.id === hashId && isScheduleItem(record),
    );
    if (!item) {
      openedHash.current = hashId;
      setEditor(null);
      setEditDraft(null);
      notify(
        "That saved schedule record is unavailable. Its deletion does not regenerate tasks.",
        "info",
      );
      return;
    }
    openedHash.current = hashId;
    touch(item.id);
    const date = scheduleDate(item);
    if (date) setSelectedDate(date);
    if (item.kind === "review") {
      setTab("checklist");
      return;
    }
    setEditor({ item, mode: "edit" });
    setEditDraft(editDraftFrom(item));
  }, [hashId, items, ready, touch, notify]);

  useEffect(() => {
    setReviewDraft(reviewDraftFrom(reviewRecord));
    setReviewMessage("");
  }, [reviewRecord?.id, reviewRecord?.updatedAt, selectedWeekStart]);

  useEffect(() => {
    if (!catchUpOpen) return;
    if (!catchUpSources.some((item) => item.id === catchUpSourceId))
      setCatchUpSourceId(catchUpSources[0]?.id || "");
    if (!catchUpSlots.some((slot) => slot.startTime === catchUpStart))
      setCatchUpStart(catchUpSlots[0]?.startTime || "");
  }, [
    catchUpOpen,
    catchUpSources,
    catchUpSourceId,
    catchUpSlots,
    catchUpStart,
  ]);

  const openEditor = (item: Item, mode: EditorMode = "edit") => {
    touch(item.id);
    openedHash.current = item.id;
    setEditError("");
    setEditor({ item, mode });
    setEditDraft(editDraftFrom(item));
    if (
      typeof window !== "undefined" &&
      window.location.hash !== `#schedule/${item.id}`
    )
      navigate("schedule", item.id);
  };

  const closeEditor = () => {
    setEditor(null);
    setEditDraft(null);
    setEditError("");
    if (
      typeof window !== "undefined" &&
      window.location.hash.startsWith("#schedule/")
    )
      navigate("schedule");
  };

  const saveScheduleItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || !editDraft || readOnly) return;
    setEditError("");
    const nextDate = editDraft.date;
    const currentItems = snapshot().items;
    const currentItem = currentItems.find((item) => item.id === editor.item.id);
    const currentDate =
      scheduleDate(currentItem || editor.item) || editor.item.originalDate;
    const planned =
      editDraft.duration === "" ? undefined : Number(editDraft.duration);
    const actual =
      editDraft.actualMinutes === ""
        ? undefined
        : Number(editDraft.actualMinutes);
    try {
      if (!editDraft.title.trim())
        throw new Error("Give this schedule item a title.");
      if (!currentItem)
        throw new Error(
          "This record was removed. Close the editor and select an existing task.",
        );
      if (editDraft.title.trim().length > 240)
        throw new Error("Keep the title within 240 characters.");
      if (!editDraft.course.trim() || !editDraft.stage.trim())
        throw new Error(
          "Save a course and an actual topic/stage for this task.",
        );
      if (
        !editDraft.description.trim() ||
        !editDraft.completionCriteria.trim() ||
        !editDraft.milestone.trim()
      )
        throw new Error(
          "Save an actionable description, completion criteria and meaningful milestone.",
        );
      const timingError = scheduleTimingError(
        nextDate,
        editDraft.startTime,
        editDraft.endTime,
        planned ?? NaN,
        currentItems,
        editor.item.id,
      );
      if (timingError) throw new Error(timingError);
      if (
        actual !== undefined &&
        (!Number.isInteger(actual) || actual < 0 || actual > 1440)
      )
        throw new Error(
          "Actual minutes must be whole minutes between 0 and 1440.",
        );
      if (!["High", "Medium", "Low"].includes(editDraft.priority))
        throw new Error("Choose a valid priority.");
      const moduleKey = editDraft.moduleKey.trim();
      const template = PERSONAL_ROADMAP.find(
        (module) => module.key === moduleKey,
      );
      const module = moduleForScheduleKey(currentItems, moduleKey);
      if (moduleKey && !template && !module)
        throw new Error("Choose an existing canonical course module key.");
      if (["java-dsa", "sigma-8"].includes(editDraft.course) && !moduleKey)
        throw new Error(
          "Link Java/Sigma work to a canonical course module key.",
        );
      if (
        (template || module) &&
        (template?.course || module?.course) !== editDraft.course.trim()
      )
        throw new Error(
          "The linked module must belong to the selected course.",
        );
      const prerequisites = [
        ...new Set(
          editDraft.prerequisites
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .map((value) =>
              canonicalSchedulePrerequisite(
                value,
                currentItems,
                editDraft.course.trim(),
              ),
            ),
        ),
      ];
      if (
        prerequisites.length > 50 ||
        prerequisites.some(
          (key) =>
            !PERSONAL_ROADMAP.some((entry) => entry.key === key) &&
            !moduleForScheduleKey(currentItems, key),
        )
      )
        throw new Error(
          "Prerequisites must be existing canonical course module keys, separated by commas.",
        );
      if (moduleKey && prerequisites.includes(moduleKey))
        throw new Error(
          "A task’s linked module cannot be its own prerequisite.",
        );
      const moved = nextDate !== currentDate;
      const patch: Partial<Item> = {
        title: editDraft.title.trim(),
        course: editDraft.course.trim() || undefined,
        stage: editDraft.stage.trim() || undefined,
        completionCriteria: editDraft.completionCriteria.trim() || undefined,
        prerequisites,
        moduleKey: moduleKey || undefined,
        topicId: module?.id,
        priority: editDraft.priority,
        milestone: editDraft.milestone.trim(),
        dueDate: nextDate,
        date: nextDate,
        scheduleWeek: scheduleWeekFor(nextDate),
        startTime: editDraft.startTime || undefined,
        endTime: editDraft.endTime || undefined,
        duration: planned,
        actualMinutes: actual,
        status: editDraft.status,
        description: editDraft.description.trim() || undefined,
      };
      if (!isDone(currentItem) && isDone({ ...currentItem, ...patch })) {
        const missing = missingSchedulePrerequisites(patch, currentItems);
        if (missing.length)
          throw new Error(
            `Prerequisites incomplete: ${missing.map(moduleLabel).join(", ")}. Revise last incomplete topic instead.`,
          );
        const gated = scheduleGate(patch, currentItems);
        if (gated)
          throw new Error(
            `The ${gated} readiness gate is not yet satisfied. Keep this dated practice incomplete until the real gate is unlocked.`,
          );
        patch.completedAt = new Date().toISOString();
      } else if (isDone(currentItem) && !isDone({ ...currentItem, ...patch }))
        patch.completedAt = undefined;
      if (moved) {
        patch.originalDate = currentItem.originalDate || currentDate;
        patch.rescheduledAt = new Date().toISOString();
        patch.rescheduleCount = (currentItem.rescheduleCount || 0) + 1;
        patch.body = appendRescheduleHistory(
          currentItem.body,
          currentDate || editor.item.originalDate || START_DATE,
          nextDate,
        );
      }
      update(editor.item.id, patch);
      notify(
        moved
          ? "Schedule item rescheduled; history preserved."
          : "Schedule item updated.",
      );
      closeEditor();
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Unable to save this item.",
      );
    }
  };

  const applyStartingSchedule = () => {
    if (readOnly || !ready || hasApplied || applying.current) return;
    applying.current = true;
    try {
      const currentItems = snapshot().items;
      if (hasScheduleInstallation(currentItems)) return;
      const existing = new Set(
        currentItems
          .map((item) => item.scheduleId)
          .filter((id): id is string => Boolean(id)),
      );
      const records = STARTING_SCHEDULE.filter(
        (seed) => !existing.has(seed.scheduleId),
      ).map((seed) => ({
        kind: seed.kind,
        values: scheduleSeedValues(seed, currentItems),
      }));
      createMany([...records, { kind: "goal", values: installationValues() }]);
      const created = records.length;
      notify(`${created} starting schedule records created.`);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to apply schedule.",
        "error",
      );
    } finally {
      applying.current = false;
    }
  };

  const addCatchUp = () => {
    if (readOnly || !hasApplied || selectedDate < START_DATE) return;
    setCatchUpError("");
    setCatchUpSourceId(catchUpSources[0]?.id || "");
    setCatchUpDuration("30");
    setCatchUpStart("");
    setCatchUpOpen(true);
  };

  const createCatchUp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly || selectedDate < START_DATE || !hasApplied) return;
    setCatchUpError("");
    try {
      const currentItems = snapshot().items;
      const source = currentItems.find(
        (item) =>
          item.id === catchUpSourceId &&
          item.kind === "task" &&
          !item.archived &&
          !isDone(item),
      );
      if (!source || !catchUpSource)
        throw new Error("Choose one real unfinished study task to revise.");
      const scheduleId = `${SCHEDULE_PREFIX}-catch-up-${selectedDate}-${source.id}`;
      const existing = currentItems.find(
        (item) => item.scheduleId === scheduleId,
      );
      if (existing) {
        setCatchUpOpen(false);
        openEditor(existing);
        return;
      }
      const missing = missingSchedulePrerequisites(source, currentItems);
      if (missing.length)
        throw new Error(
          `Revise last incomplete topic instead: ${missing.map(moduleLabel).join(", ")}.`,
        );
      if (!catchUpSlot)
        throw new Error(
          "Choose a genuinely free timed slot. If none remains, explicitly reschedule one existing task.",
        );
      const duration = Number(catchUpDuration);
      if (![15, 30, 45].includes(duration))
        throw new Error("Choose a 15, 30 or 45-minute repair block.");
      const error = scheduleTimingError(
        selectedDate,
        catchUpSlot.startTime,
        catchUpSlot.endTime,
        duration,
        currentItems,
      );
      if (error) throw new Error(error);
      const module = linkedScheduleModule(source, currentItems);
      const moduleKey =
        source.moduleKey || module?.moduleKey || module?.collection;
      if (["java-dsa", "sigma-8"].includes(source.course || "") && !moduleKey)
        throw new Error(
          "Edit the original task to save a canonical course module key before creating its linked repair.",
        );
      const created = create("task", {
        title: `Revise: ${source.title}`.slice(0, 240),
        description: `Choose one previously failed example/input from “${source.title}”. Work independently for ${duration - 5}m, then use 5m to rerun one boundary case and explain the first remaining error. Original exercise criterion: ${source.completionCriteria || "Use its saved topic and write the input/output to check."} This bounded repair stops at ${catchUpSlot.endTime}; the original task and its history stay saved.`,
        status: "todo",
        priority: "Low",
        dueDate: selectedDate,
        date: selectedDate,
        duration,
        ...catchUpSlot,
        sessionType: "catch-up",
        scheduleId,
        scheduleWeek: scheduleWeekFor(selectedDate),
        originalDate: selectedDate,
        course: source.course || "recovery",
        stage: source.stage || "Named exercise repair",
        taskId: source.id,
        topicId: module?.id,
        moduleKey,
        completionCriteria: `Retain a new independent attempt of “${source.title}”, one checked boundary input and the exact remaining next step. This repair task does not automatically complete its source task or course topic.`,
        prerequisites: (source.prerequisites || []).map((key) =>
          canonicalSchedulePrerequisite(key, currentItems, source.course),
        ),
        official: false,
        roadmapPhase: "october-foundations",
        milestone:
          source.milestone ||
          `Week ${selectedWeek} · repair ${source.stage || source.title}`,
        sourceType: "study-plan-recovery",
        tags: ["starting-scaffold", "catch-up"],
      });
      setCatchUpOpen(false);
      notify("Named, timed repair task created; original history preserved.");
      openEditor(created);
    } catch (error) {
      setCatchUpError(
        error instanceof Error
          ? error.message
          : "Unable to create catch-up task.",
      );
    }
  };

  const saveWeeklyReview = () => {
    if (
      readOnly ||
      !hasApplied ||
      selectedDate < START_DATE ||
      savingReview.current
    )
      return;
    if (!reviewDraft.note.trim() || !reviewDraft.nextFocus.trim()) {
      setReviewMessage(
        "Write a progress/evidence note and one concrete next action before saving this review.",
      );
      return;
    }
    if (
      reviewDraft.note.length > 8000 ||
      reviewDraft.blocker.length > 8000 ||
      reviewDraft.nextFocus.length > 4000 ||
      !["move-one", "reduce-scope", "release"].includes(
        reviewDraft.rules.firstMove,
      )
    ) {
      setReviewMessage(
        "Keep review notes within 8,000 characters, next actions within 4,000, and choose a valid recovery rule.",
      );
      return;
    }
    savingReview.current = true;
    const allChecked = WEEKLY_CHECKLIST.every(
      (check) => reviewDraft.checks[check.id],
    );
    const values: Partial<Item> = {
      title: `Study schedule · week ${selectedWeek} review`,
      date: selectedWeekStart,
      period: "weekly",
      status: allChecked ? "completed" : "in-progress",
      body: reviewDraft.note.trim(),
      reflection: reviewDraft.blocker.trim(),
      goals: reviewDraft.nextFocus.trim(),
      checklist: JSON.stringify({
        checks: reviewDraft.checks,
        rules: reviewDraft.rules,
      }),
      scheduleId: `${SCHEDULE_PREFIX}-weekly-review-${selectedWeekStart}`,
      scheduleWeek: selectedWeek,
      sessionType: "weekly-review",
      originalDate: selectedWeekStart,
      course: "weekly-review",
      stage: "weekly review",
      completionCriteria:
        "Save a clear progress note, recovery rule, and next focus.",
      prerequisites: [],
      official: false,
      roadmapPhase: "october-foundations",
      milestone: `Week ${selectedWeek} · honest evidence and named next action`,
      sourceType: "study-plan-weekly-review",
      tags: ["starting-scaffold", "weekly-review"],
    };
    try {
      const existing = snapshot().items.find(
        (item) =>
          item.kind === "review" && item.scheduleId === values.scheduleId,
      );
      if (existing) update(existing.id, values);
      else create("review", values);
      setReviewMessage("Weekly review saved to the workspace.");
      notify("Weekly review saved.");
    } catch (error) {
      setReviewMessage(
        error instanceof Error
          ? error.message
          : "Unable to save weekly review.",
      );
    } finally {
      savingReview.current = false;
    }
  };

  const selectDate = (date: string) => {
    if (!validScheduleDay(date)) return;
    setSelectedDate(date);
    navigate("schedule", `date-${date}`);
  };
  const changeDate = (delta: number) =>
    selectDate(addDays(selectedDate, delta));
  const changeWeek = (delta: number) =>
    selectDate(addDays(selectedWeekStart, delta * 7));
  const completeScheduleTask = (record: Item) => {
    if (readOnly) return;
    const currentItems = snapshot().items;
    const current = currentItems.find((item) => item.id === record.id);
    if (!current || current.kind !== "task") return;
    const missing = missingSchedulePrerequisites(current, currentItems);
    if (!isDone(current) && missing.length) {
      notify(
        `Prerequisites incomplete: ${missing.map(moduleLabel).join(", ")}. Revise last incomplete topic instead.`,
        "info",
      );
      return;
    }
    const gated = scheduleGate(current, currentItems);
    if (gated) {
      notify(
        `The ${gated} readiness gate is not yet satisfied. Keep this practice incomplete until the real gate is unlocked.`,
        "info",
      );
      return;
    }
    completeTask(current.id);
  };

  if (!ready) {
    return (
      <div className="study-schedule-page">
        <PageHeader
          eyebrow="PERSONAL STUDY RHYTHM"
          title="Study schedule"
          description="Opening your local schedule…"
        />
        <Panel>
          <div className="schedule-loading">
            Loading saved schedule records…
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="study-schedule-page">
      <PageHeader
        eyebrow="PERSONAL STUDY RHYTHM"
        title="Study schedule"
        description={`A date-wise scaffold from ${formatDate(START_DATE, true)} 2026 through ${formatDate(END_DATE, true)} 2027: GSoC/open source first, Java / DSA second, Web third, maintained Maths and gated competitive practice after readiness.`}
        actions={
          hasApplied ? (
            <Button disabled title="The starting scaffold is already applied.">
              <CheckCircle2 size={16} /> Scaffold applied
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={applyStartingSchedule}
              disabled={readOnly || saving}
            >
              <Sparkles size={16} /> Apply starting schedule
            </Button>
          )
        }
      />
      <div className="schedule-scaffold-note">
        <ShieldCheck size={16} />
        <span>
          <b>
            This schedule is a starting scaffold · edit with your real evidence.
          </b>{" "}
          It creates dated local tasks once, retains saved edits/deletions and
          adds no completion progress. Task completion does not complete a
          course topic. This 11 October–31 March version has a separate schedule
          identity, so a legacy installation and its records stay untouched; the
          marker prevents this version from regenerating.
        </span>
      </div>
      <Tabs
        options={tabs.map((option) => ({ ...option }))}
        value={tab}
        onChange={(value) => setTab(value as ScheduleTab)}
      />
      <div className="stats-grid schedule-stats">
        <Stat
          label="Planned"
          value={minutesLabel(weekStats.planned)}
          hint="Selected day"
          icon={<Clock3 size={17} />}
        />
        <Stat
          label="Complete"
          value={minutesLabel(weekStats.complete)}
          hint={`${percent(weekStats.complete, weekStats.planned)}% of planned`}
          icon={<CheckCircle2 size={17} />}
        />
        <Stat
          label="Remaining"
          value={minutesLabel(weekStats.remaining)}
          hint="From real schedule records"
          icon={<RotateCcw size={17} />}
        />
        <Stat
          label="Actual"
          value={minutesLabel(weekStats.actual)}
          hint="Logged on records"
          icon={<Target size={17} />}
        />
      </div>
      {tab === "daily" && (
        <div className="schedule-tab-content schedule-daily-tab">
          <Panel className="schedule-day-panel">
            <div className="schedule-day-toolbar">
              <div>
                <p className="eyebrow">
                  DAILY SCHEDULE ·{" "}
                  {selectedWeek ? `WEEK ${selectedWeek}` : "BEFORE START"}
                </p>
                <h2>{dayTitle(selectedDate)}</h2>
                <p className="muted small">
                  View any date; new scaffold records start on 11 October 2026
                  and end on 31 March 2027.
                </p>
              </div>
              <div className="schedule-date-controls">
                <Button variant="ghost" onClick={() => selectDate(today())}>
                  Today
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => selectDate(START_DATE)}
                >
                  Start date
                </Button>
                <Button
                  className="icon-button"
                  variant="ghost"
                  aria-label="Previous date"
                  onClick={() => changeDate(-1)}
                >
                  <ChevronLeft size={17} />
                </Button>
                <input
                  aria-label="Selected schedule date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => selectDate(event.target.value)}
                />
                <Button
                  className="icon-button"
                  variant="ghost"
                  aria-label="Next date"
                  onClick={() => changeDate(1)}
                >
                  <ChevronRight size={17} />
                </Button>
              </div>
            </div>
            <div className="schedule-recovery-hint" role="status">
              <RotateCcw size={15} />
              <span>
                <b>Missed-day rule:</b> protect college, meals and the 22:45
                stop. Move one named item, reduce its scope or release it; do
                not double tomorrow or generate a whole-day backlog.
              </span>
            </div>
            {(selectedConflicts.length > 0 ||
              selectedTimingIssues.length > 0) && (
              <div className="schedule-conflict-alert" role="status">
                <TriangleAlert size={17} />
                <div>
                  <b>Timed conflict warning</b>
                  {selectedConflicts.slice(0, 4).map((conflict, index) =>
                    "first" in conflict ? (
                      <p
                        key={`${conflict.first.item.id}-${conflict.second.item.id}-${index}`}
                      >
                        {conflict.first.item.title} overlaps{" "}
                        {conflict.second.item.title}.
                      </p>
                    ) : (
                      <p
                        key={`${conflict.item.id}-${conflict.block.label}-${index}`}
                      >
                        {conflict.item.title} overlaps protected{" "}
                        {conflict.block.label.toLowerCase()}.
                      </p>
                    ),
                  )}
                  {selectedTimingIssues.slice(0, 3).map(({ item, error }) => (
                    <p key={`timing-${item.id}`}>
                      {item.title}: {error}
                    </p>
                  ))}
                  <p>
                    Saved records stay unchanged until you choose Edit or
                    Reschedule.
                  </p>
                </div>
              </div>
            )}
            {selectedDate < START_DATE ? (
              <div className="schedule-before-start">
                <CalendarClock size={20} />
                <b>No new scaffold before 11 October 2026.</b>
                <span>
                  Today’s browser-local date is selected by default. Browse
                  freely, then use Start date to view the first planned day; no
                  backlog is created here.
                </span>
                <Button
                  variant="secondary"
                  onClick={() => selectDate(START_DATE)}
                >
                  Go to start date
                </Button>
              </div>
            ) : selectedDayRecords.length ? (
              <div className="schedule-record-list">
                {selectedDayRecords.map((item) => (
                  <ScheduleRecordCard
                    key={item.id}
                    item={item}
                    items={items}
                    actualMinutes={actualForItem(item)}
                    readOnly={readOnly}
                    conflict={
                      conflictIds.has(item.id) ||
                      selectedTimingIssues.some(
                        (issue) => issue.item.id === item.id,
                      ) ||
                      protectedConflicts.some(
                        (conflict) => conflict.item.id === item.id,
                      )
                    }
                    onComplete={completeScheduleTask}
                    onEdit={(record) => openEditor(record)}
                    onReschedule={(record) => openEditor(record, "reschedule")}
                  />
                ))}
              </div>
            ) : (
              <Empty
                title="Nothing scheduled for this date"
                description={
                  hasApplied
                    ? "Saved history remains available on every date. Choose a named, timed repair when needed; deleted tasks are never recreated."
                    : "Apply the full dated schedule to save editable tasks for 11 October 2026–31 March 2027. Browse the full plan for a preview first."
                }
                icon={<CalendarClock size={22} />}
              />
            )}
            <div className="schedule-day-actions">
              <Button
                variant="secondary"
                onClick={addCatchUp}
                disabled={readOnly || !hasApplied || selectedDate < START_DATE}
              >
                <Plus size={15} /> Choose a timed catch-up task
              </Button>
              <span className="muted small">
                Choose one real unfinished exercise and a free slot; nothing is
                generated on date changes.
              </span>
            </div>
          </Panel>
          <div className="schedule-daily-sidebar">
            <WeekendTargetCard date={selectedDate} />
            <Panel title="Day boundaries" className="schedule-boundary-panel">
              <div className="schedule-boundary-list">
                <div>
                  <Dumbbell size={15} />
                  <span>Gym + breakfast</span>
                  <b>06:30–09:00</b>
                </div>
                <div>
                  <LockKeyhole size={15} />
                  <span>College + lunch</span>
                  <b>09:00–16:30</b>
                </div>
                <div>
                  <Utensils size={15} />
                  <span>Dinner</span>
                  <b>20:00–21:00</b>
                </div>
                <div>
                  <ShieldCheck size={15} />
                  <span>Study stops / sleep</span>
                  <b>22:45</b>
                </div>
              </div>
              <p className="muted small">
                These boundaries apply on weekends too. The new plan fits them;
                saved legacy conflicts are shown for explicit correction.
              </p>
            </Panel>
            <RoutinePanel />
          </div>
        </div>
      )}
      {tab === "plan" && (
        <div className="schedule-tab-content schedule-plan-tab">
          <Panel
            title="Full dated plan at a glance"
            action={
              <span className="muted small">
                {formatDate(START_DATE)} 2026 – {formatDate(END_DATE)} 2027
              </span>
            }
          >
            <div className="schedule-plan-intro">
              <p>
                {hasApplied
                  ? "These are your real saved tasks and history."
                  : "Preview only: apply the schedule to create editable dated tasks."}{" "}
                Each week keeps GSoC/open-source evidence first, a Java / DSA
                spine, Web practice, Maths on Sun/Tue/Thu/Sat and a daily
                15-minute review. Course prerequisites and manual readiness
                gates govern progression; later competitive blocks stay visible
                but cannot be completed while gated.
              </p>
              <div className="schedule-legend">
                <span>
                  <i className="legend-dot legend-core" />
                  Core
                </span>
                <span>
                  <i className="legend-dot legend-optional" />
                  Optional
                </span>
                <span>
                  <i className="legend-dot legend-weekend" />
                  Weekend target
                </span>
              </div>
            </div>
            <div className="schedule-week-list">
              {planWeeks.map((week) => {
                const planned = week.records.reduce(
                  (sum, item) => sum + (item.duration || 0),
                  0,
                );
                const complete = week.records
                  .filter(isDone)
                  .reduce((sum, item) => sum + (item.duration || 0), 0);
                return (
                  <section className="schedule-week-card" key={week.week}>
                    <div className="schedule-week-heading">
                      <div>
                        <p className="eyebrow">WEEK {week.week}</p>
                        <h3>
                          {shortDay(week.dates[0])} –{" "}
                          {shortDay(week.dates.at(-1)!)}
                        </h3>
                      </div>
                      <div className="schedule-week-progress">
                        <b>
                          {minutesLabel(complete)} / {minutesLabel(planned)}
                        </b>
                        <Progress
                          value={percent(complete, planned)}
                          label={`Week ${week.week} completion`}
                        />
                      </div>
                    </div>
                    <div className="schedule-week-days">
                      {week.dates.map((date) => {
                        const records = week.records.filter(
                          (item) => scheduleDate(item) === date,
                        );
                        const target = WEEKEND_TARGETS.find(
                          (item) => item.date === date,
                        );
                        return (
                          <button
                            type="button"
                            key={date}
                            className={cx(
                              "schedule-plan-day",
                              selectedDate === date && "is-selected",
                              target && "is-weekend",
                            )}
                            onClick={() => {
                              selectDate(date);
                              setTab("daily");
                            }}
                          >
                            <span>{shortDay(date)}</span>
                            <b>
                              {records.length}{" "}
                              {records.length === 1 ? "item" : "items"}
                            </b>
                            <small>
                              {minutesLabel(
                                records.reduce(
                                  (sum, item) => sum + (item.duration || 0),
                                  0,
                                ),
                              )}
                            </small>
                            <div className="schedule-plan-tags">
                              {[...new Set(records.map((item) => item.course))]
                                .slice(0, 3)
                                .map((course) => (
                                  <Badge key={course}>
                                    {courseLabel(course)}
                                  </Badge>
                                ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="schedule-week-targets">
                      {week.dates
                        .filter((date) =>
                          WEEKEND_TARGETS.some((item) => item.date === date),
                        )
                        .map((date) => (
                          <WeekendTargetCard key={date} date={date} />
                        ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </Panel>
          {timedConflicts.length > 0 && (
            <Panel
              title="Conflicts from actual timed records"
              className="schedule-conflict-panel"
            >
              <div className="schedule-conflict-list">
                {timedConflicts.slice(0, 12).map(({ first, second }) => (
                  <p key={`${first.item.id}-${second.item.id}`}>
                    <TriangleAlert size={14} />
                    {shortDay(first.date)} · {first.item.title} overlaps{" "}
                    {second.item.title}
                  </p>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
      {(tab === "checklist" || tab === "recovery") && (
        <div className="schedule-tab-content schedule-review-tab">
          <div className="schedule-review-toolbar">
            <div>
              <p className="eyebrow">
                WEEKLY RECORD ·{" "}
                {selectedWeek ? `WEEK ${selectedWeek}` : "BEFORE START"}
              </p>
              <h2>
                {shortDay(selectedWeekStart)} –{" "}
                {shortDay(addDays(selectedWeekStart, 6))}
              </h2>
              <p className="muted small">
                Saving creates or edits one real weekly review record for this
                actual week, including every week through March 2027.{" "}
                {!hasApplied
                  ? "Apply a schedule first."
                  : selectedDate < START_DATE
                    ? "Review saving starts on 11 October 2026."
                    : ""}
              </p>
            </div>
            <div className="schedule-week-controls">
              <Button
                className="icon-button"
                variant="ghost"
                aria-label="Previous week"
                onClick={() => changeWeek(-1)}
              >
                <ChevronLeft size={17} />
              </Button>
              <input
                aria-label="Review week date"
                type="date"
                value={selectedDate}
                onChange={(event) => selectDate(event.target.value)}
              />
              <Button
                className="icon-button"
                variant="ghost"
                aria-label="Next week"
                onClick={() => changeWeek(1)}
              >
                <ChevronRight size={17} />
              </Button>
            </div>
          </div>
          {tab === "checklist" ? (
            <Panel
              title="Weekly checklist"
              action={
                reviewRecord ? (
                  <Badge tone="success">Saved review</Badge>
                ) : (
                  <Badge>Not saved yet</Badge>
                )
              }
            >
              <div className="schedule-checklist-progress">
                <Progress
                  value={percent(
                    Object.values(reviewDraft.checks).filter(Boolean).length,
                    WEEKLY_CHECKLIST.length,
                  )}
                  label="Weekly checklist progress"
                />
                <span>
                  {Object.values(reviewDraft.checks).filter(Boolean).length}/
                  {WEEKLY_CHECKLIST.length} checked
                </span>
              </div>
              <fieldset
                className="schedule-checklist-list"
                disabled={readOnly || !hasApplied || selectedDate < START_DATE}
              >
                {WEEKLY_CHECKLIST.map((check) => (
                  <label
                    className={cx(
                      "schedule-checklist-item",
                      reviewDraft.checks[check.id] && "is-checked",
                    )}
                    key={check.id}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(reviewDraft.checks[check.id])}
                      onChange={(event) =>
                        setReviewDraft((draft) => ({
                          ...draft,
                          checks: {
                            ...draft.checks,
                            [check.id]: event.target.checked,
                          },
                        }))
                      }
                    />
                    <span>
                      <b>{check.label}</b>
                      <small>{check.detail}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
              <fieldset
                className="form-grid schedule-review-fields"
                disabled={readOnly || !hasApplied || selectedDate < START_DATE}
              >
                <div className="full-width">
                  <Field label="What went well?">
                    <textarea
                      rows={3}
                      value={reviewDraft.note}
                      onChange={(event) =>
                        setReviewDraft((draft) => ({
                          ...draft,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Evidence, small wins, or a useful observation."
                    />
                  </Field>
                </div>
                <div>
                  <Field label="What got in the way?">
                    <textarea
                      rows={3}
                      value={reviewDraft.blocker}
                      onChange={(event) =>
                        setReviewDraft((draft) => ({
                          ...draft,
                          blocker: event.target.value,
                        }))
                      }
                      placeholder="Name the friction without adding blame."
                    />
                  </Field>
                </div>
                <div>
                  <Field label="Next focus">
                    <textarea
                      rows={3}
                      value={reviewDraft.nextFocus}
                      onChange={(event) =>
                        setReviewDraft((draft) => ({
                          ...draft,
                          nextFocus: event.target.value,
                        }))
                      }
                      placeholder="One or two concrete next actions."
                    />
                  </Field>
                </div>
              </fieldset>
              {reviewMessage && (
                <p className="schedule-save-message" role="status">
                  {reviewMessage}
                </p>
              )}
              <div className="modal-actions">
                <Button
                  variant="primary"
                  onClick={saveWeeklyReview}
                  disabled={
                    readOnly ||
                    !hasApplied ||
                    selectedDate < START_DATE ||
                    saving
                  }
                >
                  <Save size={15} /> Save weekly review
                </Button>
              </div>
            </Panel>
          ) : (
            <Panel
              title="Recovery rules"
              action={<Badge tone="warning">Human override</Badge>}
            >
              <div className="schedule-recovery-intro">
                <ShieldCheck size={20} />
                <p>
                  Recovery is part of the plan. When a day goes sideways,
                  protect the fixed routine first and move one meaningful item
                  instead of recreating the whole day.
                </p>
              </div>
              <fieldset
                className="form-grid schedule-recovery-fields"
                disabled={readOnly || !hasApplied || selectedDate < START_DATE}
              >
                <Field label="First move when a session is missed">
                  <select
                    value={reviewDraft.rules.firstMove}
                    onChange={(event) =>
                      setReviewDraft((draft) => ({
                        ...draft,
                        rules: {
                          ...draft.rules,
                          firstMove: event.target.value,
                        },
                      }))
                    }
                  >
                    <option value="move-one">
                      Move one core item to the next open block
                    </option>
                    <option value="reduce-scope">
                      Reduce the scope and keep the date
                    </option>
                    <option value="release">
                      Release it and write the next smallest step
                    </option>
                  </select>
                </Field>
                <div className="schedule-rule-checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={reviewDraft.rules.lowEnergy}
                      onChange={(event) =>
                        setReviewDraft((draft) => ({
                          ...draft,
                          rules: {
                            ...draft.rules,
                            lowEnergy: event.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Use low-energy work when focus is limited
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={reviewDraft.rules.protectSleep}
                      onChange={(event) =>
                        setReviewDraft((draft) => ({
                          ...draft,
                          rules: {
                            ...draft.rules,
                            protectSleep: event.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Protect dinner and sleep boundaries
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={reviewDraft.rules.optionalOnlyAfterCore}
                      onChange={(event) =>
                        setReviewDraft((draft) => ({
                          ...draft,
                          rules: {
                            ...draft.rules,
                            optionalOnlyAfterCore: event.target.checked,
                          },
                        }))
                      }
                    />{" "}
                    Keep optional problem-solving after core work
                  </label>
                </div>
                <Field label="Recovery evidence note">
                  <textarea
                    rows={3}
                    value={reviewDraft.note}
                    onChange={(event) =>
                      setReviewDraft((draft) => ({
                        ...draft,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Name the specific missed exercise or the evidence you reviewed."
                  />
                </Field>
                <Field label="First named recovery exercise">
                  <textarea
                    rows={3}
                    value={reviewDraft.nextFocus}
                    onChange={(event) =>
                      setReviewDraft((draft) => ({
                        ...draft,
                        nextFocus: event.target.value,
                      }))
                    }
                    placeholder="One precise retry, expected output and a protected stopping time."
                  />
                </Field>
              </fieldset>
              <div className="schedule-recovery-rules">
                <div>
                  <b>1 · Keep the fixed routine</b>
                  <span>
                    Gym, meals, college, and sleep do not become catch-up space.
                  </span>
                </div>
                <div>
                  <b>2 · Move one item explicitly</b>
                  <span>
                    Use Reschedule on the real record so original date and
                    history stay visible.
                  </span>
                </div>
                <div>
                  <b>3 · Catch up only by choice</b>
                  <span>
                    The catch-up button creates one transparent task; nothing is
                    regenerated in the background.
                  </span>
                </div>
              </div>
              {reviewMessage && (
                <p className="schedule-save-message" role="status">
                  {reviewMessage}
                </p>
              )}
              <div className="modal-actions">
                <Button
                  variant="primary"
                  onClick={saveWeeklyReview}
                  disabled={
                    readOnly ||
                    !hasApplied ||
                    selectedDate < START_DATE ||
                    saving
                  }
                >
                  <Save size={15} /> Save recovery rules to weekly review
                </Button>
              </div>
            </Panel>
          )}
        </div>
      )}
      {catchUpOpen && (
        <Modal
          title={`Choose one timed repair · ${shortDay(selectedDate)}`}
          onClose={() => setCatchUpOpen(false)}
        >
          <form
            className="schedule-catch-up-editor"
            onSubmit={createCatchUp}
            noValidate
          >
            <p className="schedule-editor-note">
              Select a real unfinished exercise and a genuinely free block. Its
              original record stays saved; no whole-day backlog is copied.
            </p>
            <fieldset className="form-grid" disabled={readOnly}>
              <div className="full-width">
                <Field label="Unfinished source task">
                  <select
                    value={catchUpSourceId}
                    onChange={(event) => {
                      setCatchUpSourceId(event.target.value);
                      setCatchUpError("");
                    }}
                  >
                    <option value="">Choose a named exercise</option>
                    {catchUpSources.map((item) => (
                      <option key={item.id} value={item.id}>
                        {shortDay(scheduleDate(item)!)} · {item.title}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Repair duration">
                <select
                  value={catchUpDuration}
                  onChange={(event) => {
                    setCatchUpDuration(event.target.value);
                    setCatchUpError("");
                  }}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                </select>
              </Field>
              <Field label="Free study slot">
                <select
                  value={catchUpStart}
                  onChange={(event) => {
                    setCatchUpStart(event.target.value);
                    setCatchUpError("");
                  }}
                >
                  <option value="">Choose a free block</option>
                  {catchUpSlots.map((slot) => (
                    <option key={slot.startTime} value={slot.startTime}>
                      {slot.startTime}–{slot.endTime}
                    </option>
                  ))}
                </select>
              </Field>
            </fieldset>
            {catchUpSource && (
              <p className="schedule-catch-up-preview">
                <b>{catchUpSource.title}</b>
                <span>
                  {catchUpSource.completionCriteria ||
                    catchUpSource.description ||
                    "Open the task’s saved topic to choose the exact example to retry."}
                </span>
              </p>
            )}
            {catchUpSource &&
              !catchUpSource.moduleKey &&
              !linkedScheduleModule(catchUpSource, items) &&
              ["java-dsa", "sigma-8"].includes(catchUpSource.course || "") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setCatchUpOpen(false);
                    openEditor(catchUpSource);
                  }}
                >
                  Edit source task’s module link
                </Button>
              )}
            {!catchUpSources.length && (
              <p className="muted small">
                No unfinished core exercise exists on or before this date.
                Browse saved history or choose a new module in the course map.
              </p>
            )}
            {!catchUpSlots.length && (
              <p className="muted small">
                No free block of this length remains. Try a shorter repair or
                explicitly reschedule a real task; meals, college and the daily
                review remain protected.
              </p>
            )}
            {catchUpMissing.length > 0 && (
              <p className="schedule-prerequisite-state">
                <b>Revise last incomplete topic instead.</b>
                <span>
                  Waiting for {catchUpMissing.map(moduleLabel).join(", ")}. Open
                  the course map to revise those prerequisites.
                </span>
              </p>
            )}
            {catchUpError && (
              <p className="form-error" role="alert">
                {catchUpError}
              </p>
            )}
            <div className="modal-actions">
              <Button onClick={() => setCatchUpOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                type="submit"
                disabled={
                  readOnly ||
                  saving ||
                  !catchUpSource ||
                  (!catchUpExisting &&
                    (!catchUpSlot || catchUpMissing.length > 0))
                }
              >
                <Plus size={15} />{" "}
                {catchUpExisting ? "Open saved repair" : "Create named repair"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {editor && editDraft && (
        <ScheduleEditor
          state={editor}
          draft={editDraft}
          error={editError}
          readOnly={readOnly}
          blocked={
            !isDone(editor.item) &&
            (missingSchedulePrerequisites(
              {
                ...editor.item,
                prerequisites: editDraft.prerequisites
                  .split(",")
                  .map((key) => key.trim())
                  .filter(Boolean),
              },
              items,
            ).length > 0 ||
              Boolean(scheduleGate(editor.item, items)))
          }
          onChange={(patch) =>
            setEditDraft((current) =>
              current ? { ...current, ...patch } : current,
            )
          }
          onClose={closeEditor}
          onSave={saveScheduleItem}
        />
      )}
    </div>
  );
}
