import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Circle,
  CircleAlert,
  Code2,
  Edit3,
  Flag,
  GitBranch,
  Github,
  GraduationCap,
  ListChecks,
  Plus,
  Rocket,
  ShieldCheck,
  Target,
  Trophy,
  Wrench,
} from "lucide-react";
import {
  Badge,
  Button,
  Field,
  ItemEditor,
  PageHeader,
  Panel,
  Progress,
  RecordManager,
  Stat,
  Tabs,
  type FieldDef,
} from "../components/ui";
import { useStore } from "../lib/store";
import type { Item, Kind } from "../lib/types";
import { validDay } from "../lib/logic";
import {
  platformGateState,
  platformReadinessRecord,
  readinessValues,
  type PlatformGateState,
} from "../lib/readiness";
import { cx, formatDate, isDone, navigate, percent, today } from "../lib/utils";
import {
  CONTRIBUTION_STATUSES,
  GSOC_STATUSES,
  ICPC_STATUSES,
  MICRO_MBA_COPY,
  OFFICIAL_TIMELINE_NOTE,
  PLATFORM_GATES,
  PROPOSAL_STATUSES,
  STRATEGY_END_DATE,
  STRATEGY_PHASES,
  STRATEGY_START_DATE,
  WEEKLY_REVIEW_COPY,
  microMbaContentValues,
  microMbaMaintenanceValues,
  strategyMilestoneValues,
  strategyPhaseValues,
  type PlatformGate,
  type PlatformGateId,
  type StrategyPhase,
  type StrategyTab,
} from "./strategy-roadmap-data";
import "./strategy-roadmap.css";

type StrategyRoadmapProps = { recordId?: string };
type EditorState = { kind: Kind; initial: Partial<Item>; title?: string };
type GateState = PlatformGateState & {
  gate: PlatformGate;
  missing: number;
};

const phaseIds = new Set(STRATEGY_PHASES.map((phase) => phase.id));

const statusLabel = (status?: string) =>
  (status || "not started").replaceAll("-", " ");

const statusTone = (status?: string) => {
  if (
    ["completed", "done", "solved", "reviewed", "contributing"].includes(
      status || "",
    )
  )
    return "success";
  if (
    ["in-progress", "shortlisted", "contacted", "research"].includes(
      status || "",
    )
  )
    return "warning";
  return "neutral";
};

function readStrategyHash() {
  if (typeof window === "undefined") return "";
  const [route, id] = window.location.hash.replace(/^#\/?/, "").split("/");
  return route === "strategy" ? id || "" : "";
}

function useStrategyHash(recordId?: string) {
  const [hashId, setHashId] = useState(() => recordId || readStrategyHash());
  useEffect(() => {
    if (recordId) {
      setHashId(recordId);
      return;
    }
    const update = () => setHashId(readStrategyHash());
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [recordId]);
  return recordId || hashId;
}

function isStrategyRecord(item: Item) {
  return (
    item.sourceType?.startsWith("strategy-") ||
    (item.kind === "goal" && item.course === "roadmap-readiness") ||
    (item.roadmapPhase ? phaseIds.has(item.roadmapPhase) : false)
  );
}

function isPhaseRecord(item: Item, phaseId?: string) {
  return (
    item.kind === "project" &&
    item.sourceType === "strategy-phase" &&
    (!phaseId || item.roadmapPhase === phaseId)
  );
}

function isStrategyMilestone(item: Item) {
  return item.kind === "milestone" && item.sourceType === "strategy-milestone";
}

function isGsocResearch(item: Item) {
  return item.kind === "note" && item.sourceType === "strategy-gsoc-research";
}

function isContributionPrep(item: Item) {
  return (
    item.kind === "task" && item.sourceType === "strategy-contribution-prep"
  );
}

function isProposalMilestone(item: Item) {
  return item.kind === "milestone" && item.sourceType === "strategy-proposal";
}

function isIcpcContest(item: Item) {
  return item.kind === "contest" && item.sourceType === "strategy-icpc-contest";
}

function isMicroMbaMaintenance(item: Item) {
  return item.kind === "task" && item.sourceType === "strategy-micro-mba";
}

function isMicroMbaContent(item: Item) {
  return (
    item.kind === "note" && item.sourceType === "strategy-micro-mba-content"
  );
}

function tabForRecord(item: Item): StrategyTab {
  if (
    isGsocResearch(item) ||
    isContributionPrep(item) ||
    isProposalMilestone(item)
  )
    return "gsoc";
  if (isIcpcContest(item)) return "icpc";
  if (isMicroMbaMaintenance(item) || isMicroMbaContent(item)) return "mba";
  if (
    item.sourceType === "strategy-gate" ||
    item.course === "roadmap-readiness"
  )
    return "gates";
  return "timeline";
}

function gateState(items: Item[], definition: PlatformGate): GateState {
  const state = platformGateState(items, definition.id);
  return {
    ...state,
    gate: definition,
    missing: state.checks.filter((check) => !check.complete).length,
  };
}

function readinessEditorValues(item: Item): Partial<Item> {
  const platform =
    item.course === "roadmap-readiness" ? item.stage : item.milestone;
  if (
    platform !== "leetcode" &&
    platform !== "codeforces" &&
    platform !== "icpc"
  )
    return item;
  const {
    title: _title,
    description: _description,
    tags: _tags,
    ...identity
  } = readinessValues(platform, item.status === "ready");
  return { ...item, ...identity };
}

const phaseFields: FieldDef[] = [
  {
    key: "status",
    label: "Phase status",
    type: "select",
    options: [
      { value: "planned", label: "Planned" },
      { value: "in-progress", label: "In progress" },
      { value: "completed", label: "Completed" },
      { value: "paused", label: "Paused" },
    ],
    required: true,
  },
  { key: "description", label: "Summary", type: "textarea", full: true },
  { key: "startDate", label: "Start date", type: "date" },
  { key: "targetDate", label: "Target date", type: "date" },
  {
    key: "goals",
    label: "Priorities",
    type: "textarea",
    full: true,
    placeholder: "One priority per line",
  },
  {
    key: "checklist",
    label: "Suggested milestone notes",
    type: "textarea",
    full: true,
    placeholder:
      "Keep these as notes; only linked milestone records count as done.",
  },
  { key: "body", label: "Working notes", type: "textarea", full: true },
  { key: "tags", label: "Tags", type: "tags", full: true },
];

const milestoneFields: FieldDef[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "planned", label: "Planned" },
      { value: "in-progress", label: "In progress" },
      { value: "completed", label: "Completed" },
      { value: "paused", label: "Paused" },
    ],
    required: true,
  },
  {
    key: "description",
    label: "Success criteria",
    type: "textarea",
    full: true,
  },
  { key: "dueDate", label: "Target date", type: "date" },
  { key: "order", label: "Position", type: "number", min: 0 },
  {
    key: "evidence",
    label: "Evidence",
    type: "textarea",
    full: true,
    placeholder: "Link or describe evidence that actually exists.",
  },
  { key: "body", label: "Notes", type: "textarea", full: true },
  { key: "tags", label: "Tags", type: "tags", full: true },
];

const researchFields: FieldDef[] = [
  {
    key: "repository",
    label: "Repository URL",
    type: "url",
    required: true,
    full: true,
    placeholder: "https://…",
  },
  {
    key: "url",
    label: "Documentation / project URL",
    type: "url",
    full: true,
    placeholder: "https://…",
  },
  {
    key: "status",
    label: "Research status",
    type: "select",
    options: GSOC_STATUSES.map((status) => ({
      value: status,
      label: statusLabel(status),
    })),
    required: true,
  },
  { key: "sourceDate", label: "Source checked date", type: "date" },
  {
    key: "body",
    label: "Issues / community notes",
    type: "textarea",
    full: true,
    placeholder:
      "Issue tracker, communication channels, contribution guidance and open questions.",
  },
  {
    key: "evidence",
    label: "Research evidence",
    type: "textarea",
    full: true,
    placeholder: "What did you actually inspect? Keep source context here.",
  },
  { key: "tags", label: "Tags", type: "tags", full: true },
];

function contributionFields(
  noteOptions: { value: string; label: string }[],
): FieldDef[] {
  return [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: CONTRIBUTION_STATUSES.map((status) => ({
        value: status,
        label: statusLabel(status),
      })),
      required: true,
    },
    { key: "dueDate", label: "Review date", type: "date" },
    {
      key: "noteId",
      label: "Linked organization research",
      type: "select",
      options: noteOptions,
    },
    { key: "repository", label: "Repository URL", type: "url" },
    {
      key: "description",
      label: "Prep outcome",
      type: "textarea",
      full: true,
      placeholder: "What would you inspect, explain, test or document?",
    },
    {
      key: "checklist",
      label: "Checklist",
      type: "textarea",
      full: true,
      placeholder: "One preparation check per line",
    },
    { key: "evidence", label: "Evidence", type: "textarea", full: true },
    { key: "body", label: "Notes", type: "textarea", full: true },
    { key: "tags", label: "Tags", type: "tags", full: true },
  ];
}

function proposalFields(
  noteOptions: { value: string; label: string }[],
): FieldDef[] {
  return [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: PROPOSAL_STATUSES.map((status) => ({
        value: status,
        label: statusLabel(status),
      })),
      required: true,
    },
    { key: "dueDate", label: "Target date", type: "date" },
    { key: "order", label: "Position", type: "number", min: 0 },
    {
      key: "noteId",
      label: "Linked organization research",
      type: "select",
      options: noteOptions,
    },
    {
      key: "description",
      label: "Milestone criteria",
      type: "textarea",
      full: true,
    },
    { key: "body", label: "Working notes", type: "textarea", full: true },
    {
      key: "evidence",
      label: "Evidence / feedback",
      type: "textarea",
      full: true,
    },
    { key: "tags", label: "Tags", type: "tags", full: true },
  ];
}

const contestFields: FieldDef[] = [
  {
    key: "status",
    label: "Record status",
    type: "select",
    options: ICPC_STATUSES.map((status) => ({
      value: status,
      label: statusLabel(status),
    })),
    required: true,
  },
  { key: "date", label: "Contest date", type: "date" },
  { key: "platform", label: "Platform / source", type: "text" },
  { key: "url", label: "Contest URL", type: "url" },
  { key: "duration", label: "Minutes practiced", type: "number", min: 0 },
  { key: "attempted", label: "Attempted", type: "number", min: 0 },
  { key: "solved", label: "Solved", type: "number", min: 0 },
  {
    key: "reflection",
    label: "Post-contest reflection",
    type: "textarea",
    full: true,
    placeholder: "What did you learn, and what will you revise?",
  },
  { key: "nextRevision", label: "Next revision date", type: "date" },
  { key: "evidence", label: "Evidence", type: "textarea", full: true },
  { key: "tags", label: "Tags", type: "tags", full: true },
];

const gateFields: FieldDef[] = [
  {
    key: "status",
    label: "Manual state",
    type: "select",
    options: [
      { value: "not ready", label: "Not ready" },
      { value: "ready", label: "Ready" },
    ],
    required: true,
  },
  { key: "date", label: "Acknowledged date", type: "date" },
  { key: "description", label: "Readiness note", type: "textarea", full: true },
  { key: "evidence", label: "Evidence note", type: "textarea", full: true },
];

const maintenanceFields: FieldDef[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "todo", label: "To do" },
      { value: "done", label: "Done" },
      { value: "paused", label: "Paused" },
    ],
    required: true,
  },
  { key: "dueDate", label: "Optional date", type: "date" },
  { key: "duration", label: "Minutes", type: "number", min: 0 },
  {
    key: "recurrence",
    label: "Recurrence",
    type: "select",
    options: [
      { value: "", label: "One task" },
      { value: "weekly", label: "Weekly maintenance" },
    ],
  },
  {
    key: "description",
    label: "Maintenance scope",
    type: "textarea",
    full: true,
  },
  { key: "body", label: "Notes", type: "textarea", full: true },
  { key: "tags", label: "Tags", type: "tags", full: true },
];

const microMbaContentFields: FieldDef[] = [
  {
    key: "status",
    label: "Explicit activation",
    type: "select",
    required: true,
    options: [
      { value: "pending", label: "Pending · coursework has not begun" },
      { value: "active", label: "Active · actual coursework has begun" },
      { value: "paused", label: "Paused" },
    ],
  },
  {
    key: "date",
    label: "Actual coursework start date (needed to activate)",
    type: "date",
  },
  {
    key: "url",
    label: "Actual course / content URL (optional)",
    type: "url",
    full: true,
  },
  {
    key: "body",
    label: "Actual available course content",
    type: "textarea",
    required: true,
    full: true,
    placeholder:
      "Name the actual material you have and the coursework you have started. No invented lesson titles.",
  },
  {
    key: "evidence",
    label: "Coursework notes / evidence",
    type: "textarea",
    full: true,
  },
];

function StrategyPhaseCard({
  phase,
  record,
  milestones,
  readOnly,
  onEdit,
  onAddMilestone,
  onEditMilestone,
  onToggleMilestone,
}: {
  phase: StrategyPhase;
  record?: Item;
  milestones: Item[];
  readOnly: boolean;
  onEdit: () => void;
  onAddMilestone: (suggested?: { title: string; description: string }) => void;
  onEditMilestone: (item: Item) => void;
  onToggleMilestone: (item: Item) => void;
}) {
  const completed = milestones.filter(isDone).length;
  const linkedComplete = Boolean(
    record && milestones.length > 0 && completed === milestones.length,
  );
  const sortedMilestones = [...milestones].sort(
    (a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title),
  );
  return (
    <article className={cx("strategy-phase-card", !record && "is-scaffold")}>
      <div className="strategy-phase-topline">
        <div>
          <span className="strategy-phase-month">{phase.month}</span>
          <h3>{record?.title || phase.title}</h3>
        </div>
        <div className="strategy-phase-actions">
          <Badge tone={linkedComplete ? "success" : "neutral"}>
            {linkedComplete
              ? "Complete · linked"
              : record
                ? "Tracked"
                : "Scaffold"}
          </Badge>
          <Button
            className="icon-button"
            variant="ghost"
            aria-label={`${record ? "Edit" : "Track"} ${phase.title}`}
            disabled={readOnly}
            onClick={onEdit}
          >
            {record ? <Edit3 size={15} /> : <Plus size={15} />}
          </Button>
        </div>
      </div>
      <div className="strategy-phase-date-row">
        <span className="mono">
          {formatDate(record?.startDate || phase.startDate)} –{" "}
          {formatDate(record?.targetDate || phase.endDate)}
        </span>
        {record && (
          <span className="muted small">
            Plan status: {statusLabel(record.status)} · Saved{" "}
            {formatDate(record.updatedAt)}
          </span>
        )}
      </div>
      <p className="strategy-phase-summary">
        {record?.description || phase.summary}
      </p>
      <div className="strategy-priority-list">
        {(record?.goals || phase.priorities.join("\n"))
          .split("\n")
          .map((priority) => priority.replace(/^[-*]\s*/, "").trim())
          .filter(Boolean)
          .map((priority) => (
            <div key={priority}>
              <Check size={13} />
              <span>{priority}</span>
            </div>
          ))}
      </div>
      <div className="strategy-phase-progress">
        <div className="row-between">
          <span className="strategy-section-label">REAL LINKED MILESTONES</span>
          <span className="muted small">
            {record && milestones.length
              ? `${completed}/${milestones.length} completed`
              : "0 linked records"}
          </span>
        </div>
        <Progress
          value={percent(completed, milestones.length)}
          label={`${phase.title} linked milestone progress`}
        />
      </div>
      <div className="strategy-suggested-block">
        <div className="row-between">
          <span className="strategy-section-label">
            SUGGESTED OUTCOMES · NOT PROGRESS
          </span>
          <Button
            variant="ghost"
            className="strategy-small-button"
            disabled={readOnly || !record}
            onClick={() => onAddMilestone()}
          >
            <Plus size={13} /> Add milestone
          </Button>
        </div>
        <div className="strategy-suggested-list">
          {phase.suggestedMilestones.map((suggested) => (
            <button
              type="button"
              className="strategy-suggested-row"
              key={suggested.title}
              disabled={readOnly || !record}
              onClick={() => onAddMilestone(suggested)}
            >
              <Flag size={13} />
              <span>{suggested.title}</span>
              <ArrowRight size={12} />
            </button>
          ))}
        </div>
      </div>
      <div className="strategy-real-milestones">
        <div className="row-between">
          <span className="strategy-section-label">EDITABLE RECORDS</span>
          {record && (
            <Button
              variant="ghost"
              className="strategy-small-button"
              disabled={readOnly}
              onClick={() => onAddMilestone()}
            >
              <Plus size={13} /> New
            </Button>
          )}
        </div>
        {sortedMilestones.length ? (
          <div className="strategy-milestone-list">
            {sortedMilestones.map((milestone) => {
              const done = isDone(milestone);
              return (
                <div
                  className={cx("strategy-milestone-row", done && "is-done")}
                  key={milestone.id}
                >
                  <button
                    type="button"
                    className="strategy-milestone-check"
                    aria-label={`${done ? "Reopen" : "Complete"} ${milestone.title}`}
                    aria-pressed={done}
                    disabled={readOnly}
                    onClick={() => onToggleMilestone(milestone)}
                  >
                    {done ? <Check size={13} /> : <Circle size={15} />}
                  </button>
                  <button
                    type="button"
                    className="strategy-milestone-title"
                    onClick={() => onEditMilestone(milestone)}
                  >
                    <strong>{milestone.title}</strong>
                    <span>
                      {milestone.description ||
                        "No success criteria saved yet."}
                    </span>
                  </button>
                  <Badge tone={statusTone(milestone.status)}>
                    {statusLabel(milestone.status)}
                  </Badge>
                  <Button
                    className="icon-button"
                    variant="ghost"
                    aria-label={`Edit milestone ${milestone.title}`}
                    disabled={readOnly}
                    onClick={() => onEditMilestone(milestone)}
                  >
                    <Edit3 size={14} />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="strategy-inline-empty">
            <CircleAlert size={15} />
            <span>
              {record
                ? "No real milestones linked yet. Suggested outcomes above do not count toward completion."
                : "Track this phase to create linked milestones. The scaffold is not completion evidence."}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

function GateCard({
  state,
  readOnly,
  hasRecord,
  onToggle,
  onOpenRecords,
  onEditRecord,
}: {
  state: GateState;
  readOnly: boolean;
  hasRecord: boolean;
  onToggle: () => void;
  onOpenRecords: () => void;
  onEditRecord: () => void;
}) {
  const { gate } = state;
  return (
    <article
      className={cx("strategy-gate-card", state.unlocked && "is-unlocked")}
    >
      <div className="strategy-gate-heading">
        <div className="strategy-gate-icon">
          {gate.id === "icpc" ? <Trophy size={18} /> : <Target size={18} />}
        </div>
        <div>
          <span className="strategy-phase-month">MANUAL READINESS GATE</span>
          <h3>{gate.title}</h3>
        </div>
        <Badge
          tone={
            state.unlocked ? "success" : state.manual ? "warning" : "neutral"
          }
        >
          {state.unlocked
            ? "Ready"
            : state.manual
              ? "Needs real records"
              : "Not ready"}
        </Badge>
      </div>
      <p className="strategy-gate-description">{gate.description}</p>
      <ul className="strategy-gate-checks">
        {state.checks.map((check) => (
          <li key={check.id} className={check.complete ? "is-complete" : ""}>
            <span className="strategy-check-icon">
              {check.complete ? <Check size={12} /> : <Circle size={10} />}
            </span>
            <span>
              <strong>{check.label}</strong>
              <small>{check.detail}</small>
            </span>
          </li>
        ))}
      </ul>
      <label className="strategy-ready-toggle">
        <input
          type="checkbox"
          checked={state.manual}
          disabled={readOnly}
          onChange={onToggle}
        />
        <span>
          I am manually ready for {gate.title}
          <small>
            {gate.id === "icpc"
              ? "I have reviewed the prerequisites and actual practice, and choose to begin virtual practice."
              : "I solve 70–80% of basic exercises independently, without hints or editorials."}{" "}
            This judgement is shared with the Course map.
          </small>
        </span>
      </label>
      {state.manual && !state.requirementsMet && (
        <p className="strategy-gate-warning">
          The acknowledgement is saved, but the gate remains incomplete until
          the missing real records exist.
        </p>
      )}
      <div className="strategy-gate-actions">
        <Button variant="ghost" onClick={onOpenRecords}>
          {gate.id === "icpc" ? <Trophy size={14} /> : <Code2 size={14} />} Open
          records
        </Button>
        {hasRecord && (
          <Button variant="ghost" onClick={onEditRecord} disabled={readOnly}>
            <Edit3 size={14} /> Edit note
          </Button>
        )}
      </div>
    </article>
  );
}

function GateCardWithRecord({
  state,
  items,
  readOnly,
  onToggle,
  onOpenRecords,
  onEditRecord,
}: {
  state: GateState;
  items: Item[];
  readOnly: boolean;
  onToggle: () => void;
  onOpenRecords: () => void;
  onEditRecord: () => void;
}) {
  return (
    <GateCard
      state={state}
      readOnly={readOnly}
      hasRecord={Boolean(platformReadinessRecord(items, state.gate.id))}
      onToggle={onToggle}
      onOpenRecords={onOpenRecords}
      onEditRecord={onEditRecord}
    />
  );
}

export default function StrategyRoadmap({ recordId }: StrategyRoadmapProps) {
  const { items, settings, ready, readOnly, create, update, notify, touch } =
    useStore();
  const [tab, setTab] = useState<StrategyTab>("timeline");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [missingDeepLink, setMissingDeepLink] = useState(false);
  const strategyHashId = useStrategyHash(recordId);
  const handledHash = useRef("");
  const [maintenanceDates, setMaintenanceDates] = useState<[string, string]>([
    "",
    "",
  ]);
  const [maintenanceError, setMaintenanceError] = useState("");

  const phaseRecords = useMemo(
    () => items.filter((item) => isPhaseRecord(item) && !item.archived),
    [items],
  );
  const gsocResearch = useMemo(
    () => items.filter((item) => isGsocResearch(item) && !item.archived),
    [items],
  );
  const contests = useMemo(
    () => items.filter((item) => isIcpcContest(item) && !item.archived),
    [items],
  );
  const maintenance = useMemo(
    () => items.filter((item) => isMicroMbaMaintenance(item) && !item.archived),
    [items],
  );
  const mbaContent = useMemo(
    () =>
      items
        .filter((item) => isMicroMbaContent(item) && !item.archived)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .at(0),
    [items],
  );
  const mbaActive = Boolean(
    mbaContent?.status === "active" &&
    mbaContent.body?.trim() &&
    mbaContent.date &&
    validDay(mbaContent.date) &&
    mbaContent.date <= today(),
  );
  const hasWeeklyMaintenance = maintenance.some(
    (item) =>
      item.noteId === mbaContent?.id &&
      item.recurrence === "weekly" &&
      item.status !== "paused",
  );

  const noteOptions = useMemo(
    () => [
      { value: "", label: "No organization link" },
      ...gsocResearch.map((record) => ({
        value: record.id,
        label: record.title,
      })),
    ],
    [gsocResearch],
  );

  const gateStates = useMemo(
    () =>
      Object.fromEntries(
        PLATFORM_GATES.map((gate) => [gate.id, gateState(items, gate)]),
      ) as Record<PlatformGateId, GateState>,
    [items],
  );

  const activeRecord = strategyHashId
    ? items.find((item) => item.id === strategyHashId)
    : undefined;

  useEffect(() => {
    if (!strategyHashId) {
      handledHash.current = "";
      setMissingDeepLink(false);
      return;
    }
    if (!ready || handledHash.current === strategyHashId) return;
    if (strategyHashId === "new") {
      setTab("timeline");
      setEditor({
        kind: "project",
        initial: strategyPhaseValues(STRATEGY_PHASES[0]),
        title: "Track strategy phase",
      });
      handledHash.current = strategyHashId;
      setMissingDeepLink(false);
      return;
    }
    if (!activeRecord || !isStrategyRecord(activeRecord)) {
      handledHash.current = strategyHashId;
      setEditor(null);
      setMissingDeepLink(true);
      return;
    }
    handledHash.current = strategyHashId;
    setMissingDeepLink(false);
    setTab(tabForRecord(activeRecord));
    touch(activeRecord.id);
    if (isPhaseRecord(activeRecord) || isStrategyMilestone(activeRecord)) {
      setEditor({
        kind: activeRecord.kind,
        initial: activeRecord,
        title:
          activeRecord.kind === "project"
            ? "Edit strategy phase"
            : "Edit strategy milestone",
      });
    } else if (
      activeRecord.sourceType === "strategy-gate" ||
      activeRecord.course === "roadmap-readiness"
    ) {
      setEditor({
        kind: "goal",
        initial: readinessEditorValues(activeRecord),
        title: "Edit readiness note",
      });
    }
  }, [activeRecord, ready, strategyHashId, touch]);

  const openEditor = (kind: Kind, initial: Partial<Item>, title?: string) => {
    if (initial.id) touch(initial.id);
    setEditor({
      kind,
      initial:
        kind === "goal" && initial.id
          ? readinessEditorValues(initial as Item)
          : initial,
      title,
    });
  };

  const closeEditor = () => {
    setEditor(null);
    if (strategyHashId) navigate("strategy");
  };

  const addPhaseMilestone = (
    phase: StrategyPhase,
    phaseRecord: Item,
    suggested?: { title: string; description: string },
  ) => {
    openEditor(
      "milestone",
      strategyMilestoneValues(
        phase,
        phaseRecord,
        suggested,
        items.filter(
          (item) =>
            isStrategyMilestone(item) && item.projectId === phaseRecord.id,
        ).length + 1,
      ),
      "Add linked strategy milestone",
    );
  };

  const toggleMilestone = (item: Item) => {
    if (readOnly) return;
    update(item.id, {
      status: isDone(item) ? "planned" : "completed",
      completedAt: isDone(item) ? undefined : new Date().toISOString(),
    });
    notify(
      isDone(item) ? "Milestone reopened." : "Milestone completed.",
      "success",
    );
  };

  const toggleGate = (id: PlatformGateId) => {
    if (readOnly) return;
    const definition = PLATFORM_GATES.find((gate) => gate.id === id)!;
    const existing = platformReadinessRecord(items, id);
    const nextReady = existing?.status !== "ready";
    const values = readinessValues(id, nextReady);
    try {
      if (existing) {
        const {
          title: _title,
          description: _description,
          tags: _tags,
          ...stateValues
        } = values;
        update(existing.id, { ...stateValues, date: today() });
      } else create("goal", { ...values, date: today() });
      notify(
        `${definition.title} manual state ${nextReady ? "saved" : "cleared"}.`,
        "success",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Unable to save readiness state.",
        "error",
      );
    }
  };

  const planMaintenance = (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly || !mbaActive || !mbaContent) return;
    setMaintenanceError("");
    const [first, second] = maintenanceDates;
    if (!validDay(first) || !validDay(second) || first === second) {
      setMaintenanceError("Choose two different actual maintenance dates.");
      return;
    }
    const week = (date: string) => {
      const value = new Date(`${date}T12:00:00Z`);
      value.setUTCDate(
        value.getUTCDate() - ((value.getUTCDay() - settings.weekStart + 7) % 7),
      );
      return value.toISOString().slice(0, 10);
    };
    if (week(first) !== week(second)) {
      setMaintenanceError(
        "Choose two dates in the same Planner week. Each maintenance task repeats weekly.",
      );
      return;
    }
    if (first < mbaContent.date! || second < mbaContent.date!) {
      setMaintenanceError("Maintenance starts after actual coursework begins.");
      return;
    }
    if (hasWeeklyMaintenance) {
      setMaintenanceError(
        "Weekly maintenance already exists for this coursework. Edit its real tasks instead of duplicating them.",
      );
      return;
    }
    try {
      create("task", microMbaMaintenanceValues(mbaContent, first, 1));
      create("task", microMbaMaintenanceValues(mbaContent, second, 2));
      setMaintenanceDates(["", ""]);
      notify(
        "Two weekly 30-minute maintenance tasks added to Planner.",
        "success",
      );
    } catch (cause) {
      setMaintenanceError(
        cause instanceof Error
          ? cause.message
          : "Unable to add maintenance tasks.",
      );
    }
  };

  const tabOptions = [
    { id: "timeline", label: "Timeline" },
    {
      id: "gsoc",
      label: "GSoC / open source",
      count: gsocResearch.length || undefined,
    },
    {
      id: "icpc",
      label: "ICPC readiness",
      count: contests.length || undefined,
    },
    { id: "gates", label: "Platform gates" },
    { id: "mba", label: "Micro MBA", count: maintenance.length || undefined },
  ];

  const phaseMap = useMemo(
    () => new Map(phaseRecords.map((record) => [record.roadmapPhase, record])),
    [phaseRecords],
  );

  const phaseMilestones = (phase: StrategyPhase, record?: Item) =>
    record
      ? items.filter(
          (item) =>
            isStrategyMilestone(item) &&
            item.projectId === record.id &&
            item.roadmapPhase === phase.id &&
            !item.archived,
        )
      : [];

  const researchFilter = (item: Item) => isGsocResearch(item);
  const contributionFilter = (item: Item) => isContributionPrep(item);
  const proposalFilter = (item: Item) => isProposalMilestone(item);
  const contestFilter = (item: Item) => isIcpcContest(item);
  const maintenanceFilter = (item: Item) => isMicroMbaMaintenance(item);

  return (
    <div className="strategy-roadmap-page">
      <PageHeader
        eyebrow="SIX-MONTH STRATEGY WORKSPACE"
        title="GSoC 2027 first. Build the evidence behind it."
        description={`A local, editable strategy from October 2026 through early April 2027 · ${STRATEGY_START_DATE} → ${STRATEGY_END_DATE}. ${OFFICIAL_TIMELINE_NOTE}`}
        actions={
          <div className="strategy-header-actions">
            <Button variant="ghost" onClick={() => navigate("planner")}>
              <CalendarDays size={15} /> Open Planner
            </Button>
            <Button variant="primary" onClick={() => navigate("planner")}>
              <ListChecks size={15} /> Weekly review
            </Button>
          </div>
        }
      />

      <div className="strategy-priority-banner">
        <div className="strategy-priority-mark">
          <Rocket size={18} />
        </div>
        <div>
          <strong>GSoC 2027 is the first priority.</strong>
          <p>
            Research real organizations and repositories, contribute when the
            evidence supports it, and keep Java + DSA, Sigma 8.0, Maths,
            college, ICPC, projects, Git/GitHub, debugging, testing and
            technical communication in the same view.
          </p>
        </div>
        <Badge tone="success">GSoC first</Badge>
      </div>

      <Tabs
        options={tabOptions}
        value={tab}
        onChange={(next) => {
          if (["timeline", "gsoc", "icpc", "gates", "mba"].includes(next))
            setTab(next as StrategyTab);
          if (strategyHashId) navigate("strategy");
        }}
      />

      {missingDeepLink && (
        <div className="strategy-deep-link" role="status">
          <CircleAlert size={16} />
          <span>
            This strategy record is no longer available in this workspace.
          </span>
          <Button variant="ghost" onClick={() => navigate("strategy")}>
            Back to strategy <ArrowRight size={13} />
          </Button>
        </div>
      )}

      {tab === "timeline" && (
        <>
          <div className="strategy-overview-grid">
            <Panel className="strategy-overview-card">
              <div className="strategy-overview-icon">
                <Flag size={20} />
              </div>
              <span className="strategy-section-label">WORKING WINDOW</span>
              <h2>October → early April</h2>
              <p>
                Static phase labels are editable scaffolding. A phase is never
                complete because a month passed; only real linked milestone
                records contribute to its progress.
              </p>
              <div className="strategy-stat-row">
                <Stat
                  label="Phases tracked"
                  value={phaseRecords.length}
                  hint={`of ${STRATEGY_PHASES.length} scaffold phases`}
                />
                <Stat
                  label="Milestones"
                  value={items.filter(isStrategyMilestone).length}
                  hint="real records only"
                />
                <Stat
                  label="Open-source research"
                  value={gsocResearch.length}
                  hint="saved organization notes"
                />
              </div>
            </Panel>
            <Panel title="How to use this map" className="strategy-howto-card">
              <div className="strategy-howto-row">
                <ShieldCheck size={16} />
                <span>
                  <strong>Record first.</strong> Templates never count as
                  completed work.
                </span>
              </div>
              <div className="strategy-howto-row">
                <GitBranch size={16} />
                <span>
                  <strong>Link evidence.</strong> Milestones point to a real
                  phase record through existing IDs.
                </span>
              </div>
              <div className="strategy-howto-row">
                <Wrench size={16} />
                <span>
                  <strong>Adjust honestly.</strong> Edit dates, scope and status
                  when college or energy changes the plan.
                </span>
              </div>
              <p className="strategy-review-copy">{WEEKLY_REVIEW_COPY}</p>
              <div className="strategy-howto-links">
                <Button variant="ghost" onClick={() => navigate("planner")}>
                  <CalendarDays size={14} /> Planner / weekly review
                </Button>
                <Button variant="ghost" onClick={() => navigate("projects")}>
                  <Github size={14} /> Projects
                </Button>
              </div>
            </Panel>
          </div>
          <Panel
            title="Six-month timeline"
            action={
              <Badge tone="neutral">
                Editable scaffold · no invented dates or guarantees
              </Badge>
            }
            className="strategy-timeline-panel"
          >
            <div className="strategy-timeline-intro">
              <p>
                The sequence protects foundations before platform practice. “As
                readiness allows” means you decide using the real records and
                manual gates below; the workspace does not auto-recommend a
                platform.
              </p>
              <Button
                variant="primary"
                disabled={readOnly || !ready}
                onClick={() =>
                  openEditor(
                    "project",
                    strategyPhaseValues(STRATEGY_PHASES[0]),
                    "Track strategy phase",
                  )
                }
              >
                <Plus size={15} /> Track a phase
              </Button>
            </div>
            <div className="strategy-phase-list">
              {STRATEGY_PHASES.map((phase) => {
                const record = phaseMap.get(phase.id);
                return (
                  <StrategyPhaseCard
                    key={phase.id}
                    phase={phase}
                    record={record}
                    milestones={phaseMilestones(phase, record)}
                    readOnly={readOnly}
                    onEdit={() =>
                      openEditor(
                        "project",
                        record || strategyPhaseValues(phase),
                        record ? "Edit strategy phase" : "Track strategy phase",
                      )
                    }
                    onAddMilestone={(suggested) =>
                      record && addPhaseMilestone(phase, record, suggested)
                    }
                    onEditMilestone={(item) =>
                      openEditor("milestone", item, "Edit strategy milestone")
                    }
                    onToggleMilestone={toggleMilestone}
                  />
                );
              })}
            </div>
          </Panel>
        </>
      )}

      {tab === "gsoc" && (
        <div className="strategy-tab-stack">
          <Panel
            title="GSoC / open-source research"
            className="strategy-focus-panel"
          >
            <div className="strategy-focus-heading">
              <div className="strategy-focus-icon">
                <Github size={20} />
              </div>
              <div>
                <span className="strategy-section-label">
                  RESEARCH BEFORE CLAIMS
                </span>
                <h2>
                  Build a 3–5 organization research set, then narrow to 1–2.
                </h2>
              </div>
              <Badge tone="warning">{OFFICIAL_TIMELINE_NOTE}</Badge>
            </div>
            <p>
              Organization names, repositories, docs and community notes below
              are your research records. The workspace does not supply official
              organizations, dates, PRs, rankings or selection guarantees.
            </p>
            <div className="strategy-focus-links">
              <a
                className="strategy-source-link"
                href="https://summerofcode.withgoogle.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Official Google GSoC program <ArrowRight size={13} />
              </a>
              <a
                className="strategy-source-link"
                href="https://developers.google.com/open-source/gsoc/timeline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Official timeline · verify the published year{" "}
                <ArrowRight size={13} />
              </a>
              <Button variant="ghost" onClick={() => navigate("projects")}>
                <Github size={14} /> Open Projects
              </Button>
              <Button variant="ghost" onClick={() => navigate("planner")}>
                <CalendarDays size={14} /> Plan research time
              </Button>
            </div>
          </Panel>
          <Panel className="strategy-manager-panel">
            <RecordManager
              kind="note"
              title="Organization research records"
              description="Use the organization name as the title. Save a repository URL, documentation, issues/community context and an honest status. Nothing is prefilled."
              fields={researchFields}
              filter={researchFilter}
              defaults={{
                status: "research",
                roadmapPhase: "strategy-gsoc-research",
                sourceType: "strategy-gsoc-research",
                official: false,
                tags: ["strategy-roadmap", "gsoc-research"],
              }}
              statuses={[...GSOC_STATUSES]}
              empty="No GSoC organization research records yet. Add the first organization you actually inspect."
            />
          </Panel>
          <Panel className="strategy-manager-panel">
            <RecordManager
              kind="task"
              title="Contribution preparation checklist"
              description="Create small prep records for setup, docs, tests, issue reading and communication. Link each one to a real organization research note when useful."
              fields={contributionFields(noteOptions)}
              filter={contributionFilter}
              defaults={{
                status: "todo",
                roadmapPhase: "strategy-gsoc-contribution",
                sourceType: "strategy-contribution-prep",
                official: false,
                tags: ["strategy-roadmap", "contribution-prep"],
              }}
              statuses={[...CONTRIBUTION_STATUSES]}
              empty="No contribution-prep records yet. Add one only for a real next action."
            />
          </Panel>
          <Panel className="strategy-manager-panel">
            <RecordManager
              kind="milestone"
              title="Project proposal milestones"
              description="Keep proposal research, scope, feedback and maintenance milestones separate from assumptions about an official process."
              fields={proposalFields(noteOptions)}
              filter={proposalFilter}
              defaults={{
                status: "planned",
                roadmapPhase: "strategy-gsoc-proposal",
                sourceType: "strategy-proposal",
                official: false,
                tags: ["strategy-roadmap", "proposal"],
              }}
              statuses={[...PROPOSAL_STATUSES]}
              empty="No proposal milestones yet. Add a real research or drafting outcome when it exists."
            />
          </Panel>
        </div>
      )}

      {tab === "icpc" && (
        <div className="strategy-tab-stack">
          <Panel
            title="ICPC readiness and virtual practice"
            className="strategy-focus-panel"
          >
            <div className="strategy-focus-heading">
              <div className="strategy-focus-icon">
                <Trophy size={20} />
              </div>
              <div>
                <span className="strategy-section-label">WHEN READY</span>
                <h2>
                  {gateStates.icpc.unlocked
                    ? "Virtual contest practice is manually unlocked."
                    : "Build core DSA, graphs and regular practice first."}
                </h2>
              </div>
              <Badge tone={gateStates.icpc.unlocked ? "success" : "neutral"}>
                {gateStates.icpc.unlocked
                  ? "Ready"
                  : `${gateStates.icpc.missing} checks open`}
              </Badge>
            </div>
            <p>
              The record below is a log, not a ranking board. Enter only actual
              contest or virtual practice evidence; use Platform gates to
              inspect the transparent prerequisites and make the final ready
              call yourself.
            </p>
            <div className="strategy-focus-links">
              <Button variant="ghost" onClick={() => setTab("gates")}>
                <ShieldCheck size={14} /> Inspect platform gates
              </Button>
              <Button variant="ghost" onClick={() => navigate("competitive")}>
                <Trophy size={14} /> Open Competitive workspace
              </Button>
            </div>
          </Panel>
          <Panel className="strategy-manager-panel">
            <RecordManager
              kind="contest"
              title="ICPC virtual contest records"
              description="Log the date, source, time, attempts, solves and reflection from a real virtual contest. No rankings or outcomes are inferred."
              fields={contestFields}
              filter={contestFilter}
              defaults={{
                status: "planned",
                roadmapPhase: "strategy-icpc",
                sourceType: "strategy-icpc-contest",
                official: false,
                tags: ["strategy-roadmap", "icpc", "virtual"],
              }}
              statuses={[...ICPC_STATUSES]}
              empty="No ICPC virtual contest records yet. The empty state is intentional until you are ready to log real practice."
            />
          </Panel>
        </div>
      )}

      {tab === "gates" && (
        <div className="strategy-tab-stack">
          <Panel title="Platform gates" className="strategy-gates-panel">
            <div className="strategy-gates-intro">
              <ShieldCheck size={18} />
              <p>
                Gates are transparent checks over records already in this
                workspace plus your explicit manual acknowledgement. Only
                completed/mastered topics with canonical module keys count as
                mastery; revised topics and task/problem keywords do not. Both
                pages read the same latest acknowledgement. They do not
                recommend, connect or enable LeetCode, Codeforces or ICPC
                automatically.
              </p>
            </div>
            <div className="strategy-gate-grid">
              {PLATFORM_GATES.map((definition) => (
                <GateCardWithRecord
                  key={definition.id}
                  state={gateStates[definition.id]}
                  items={items}
                  readOnly={readOnly}
                  onToggle={() => toggleGate(definition.id)}
                  onOpenRecords={() =>
                    navigate(
                      definition.id === "leetcode" ? "dsa" : "competitive",
                    )
                  }
                  onEditRecord={() => {
                    const record = platformReadinessRecord(
                      items,
                      definition.id,
                    );
                    if (record)
                      openEditor("goal", record, "Edit readiness note");
                  }}
                />
              ))}
            </div>
            <div className="strategy-gate-rule-note">
              <strong>Exact rule summary:</strong> LeetCode needs arrays,
              strings, searching and sorting topic mastery plus a manual 70–80%
              independent-basic-solving assessment. Codeforces also needs basic
              complexity and recursion. ICPC needs every named core structure,
              graphs, BFS and DFS, practice on at least three different actual
              dates, and an explicit ICPC ready acknowledgement. Hints/editorial
              solves are practice evidence, never automatic independent mastery.
              A revised topic is not completed/mastered. Calendar phases never
              satisfy prerequisites.
            </div>
          </Panel>
        </div>
      )}

      {tab === "mba" && (
        <div className="strategy-tab-stack">
          <Panel title="Micro MBA" className="strategy-mba-panel">
            <div className="strategy-mba-empty">
              <div className="strategy-mba-icon">
                <GraduationCap size={24} />
              </div>
              <div>
                <span className="strategy-section-label">
                  {mbaActive
                    ? "ACTIVE COURSEWORK · MAINTENANCE ONLY"
                    : "PENDING · NO AUTOMATIC SESSIONS"}
                </span>
                <h2>
                  {mbaActive
                    ? "Protect two small maintenance slots each week."
                    : "Keep the slot open until actual coursework begins."}
                </h2>
                <p>{MICRO_MBA_COPY}</p>
              </div>
              <Badge tone={mbaActive ? "success" : "neutral"}>
                {maintenance.length} maintenance records
              </Badge>
            </div>
            <div className="strategy-mba-note">
              <BookOpen size={15} />
              <span>
                Activation needs a real content note, an actual coursework start
                date, and your explicit “Active” selection. Until then
                maintenance planning remains pending. Once active, choose two
                dates for 30-minute weekly review tasks; these are not scheduled
                classes.
              </span>
            </div>
            {mbaContent && (
              <div className="strategy-mba-content-summary">
                <strong>{mbaContent.title}</strong>
                <span className="muted small">
                  {statusLabel(mbaContent.status)} ·{" "}
                  {mbaContent.date
                    ? `Recorded start date ${formatDate(mbaContent.date)}`
                    : "Start date not recorded"}
                </span>
                <p>{mbaContent.body}</p>
              </div>
            )}
            {mbaActive && (
              <form
                className="strategy-mba-plan"
                onSubmit={planMaintenance}
                noValidate
              >
                <div>
                  <strong>
                    Plan the initial two weekly tasks · 30 minutes each
                  </strong>
                  <p className="muted small">
                    Choose two dates in the same Planner week. Weekly successors
                    follow the existing Planner recurrence only when you
                    complete a real task.
                  </p>
                </div>
                <Field label="First maintenance date">
                  <input
                    type="date"
                    value={maintenanceDates[0]}
                    disabled={readOnly || hasWeeklyMaintenance}
                    onChange={(event) =>
                      setMaintenanceDates((previous) => [
                        event.target.value,
                        previous[1],
                      ])
                    }
                  />
                </Field>
                <Field label="Second maintenance date">
                  <input
                    type="date"
                    value={maintenanceDates[1]}
                    disabled={readOnly || hasWeeklyMaintenance}
                    onChange={(event) =>
                      setMaintenanceDates((previous) => [
                        previous[0],
                        event.target.value,
                      ])
                    }
                  />
                </Field>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={readOnly || !ready || hasWeeklyMaintenance}
                >
                  <Plus size={14} />
                  {hasWeeklyMaintenance
                    ? "Weekly maintenance already planned"
                    : "Add two maintenance tasks"}
                </Button>
                {maintenanceError && (
                  <div className="form-error" role="alert">
                    {maintenanceError}
                  </div>
                )}
              </form>
            )}
            {maintenance.length > 0 && (
              <div className="strategy-focus-links">
                {maintenance.map((task) => (
                  <Button
                    key={task.id}
                    variant="ghost"
                    onClick={() => navigate("planner", task.id)}
                  >
                    <CalendarDays size={14} />
                    {task.title}
                    <ArrowRight size={13} />
                  </Button>
                ))}
              </div>
            )}
          </Panel>
          <Panel className="strategy-manager-panel">
            <RecordManager
              kind="note"
              title="Course content and explicit activation"
              description="Save only content you actually have. The latest record controls activation: select Active and record the real coursework start date once coursework begins."
              fields={microMbaContentFields}
              filter={isMicroMbaContent}
              defaults={microMbaContentValues()}
              statuses={["pending", "active", "paused"]}
              empty="Micro MBA is pending. Add a real course-content record when material becomes available."
            />
          </Panel>
          {mbaActive && mbaContent && (
            <Panel className="strategy-manager-panel">
              <RecordManager
                kind="task"
                title="Editable maintenance tasks"
                description="Initially plan two 30-minute weekly tasks above. Keep their scope linked to actual coursework, and adjust your own tasks as needed."
                fields={maintenanceFields}
                filter={maintenanceFilter}
                defaults={{
                  ...microMbaMaintenanceValues(mbaContent, "", 1),
                  recurrence: "",
                }}
                statuses={["todo", "done", "paused"]}
                empty="No maintenance tasks yet. Choose the two initial dates above when you want to plan them."
              />
            </Panel>
          )}
        </div>
      )}

      {editor && (
        <ItemEditor
          key={`${editor.kind}-${editor.initial.id || "new"}`}
          kind={editor.kind}
          initial={editor.initial}
          fields={
            editor.kind === "project"
              ? phaseFields
              : editor.kind === "milestone"
                ? editor.initial.sourceType === "strategy-proposal"
                  ? proposalFields(noteOptions)
                  : milestoneFields
                : editor.kind === "goal"
                  ? gateFields
                  : milestoneFields
          }
          onClose={closeEditor}
          title={editor.title}
          allowDelete
        />
      )}
    </div>
  );
}
