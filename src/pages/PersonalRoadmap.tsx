import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Code2,
  Edit3,
  GitBranch,
  Layers3,
  Link2,
  ListChecks,
  LockKeyhole,
  Plus,
  Route,
  Sparkles,
  Target,
  Terminal,
  Trash2,
  Trophy,
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
  Tabs,
  type FieldDef,
} from "../components/ui";
import { useStore } from "../lib/store";
import type { Item } from "../lib/types";
import { validDay } from "../lib/logic";
import {
  isModuleComplete,
  missingModulePrerequisites,
  moduleForKey,
  modulePrerequisiteKey,
  modulePrerequisiteKeys,
  modulePrerequisiteLabel,
  platformGateState,
  platformReadinessRecord,
  readinessValues,
  type PlatformGateState,
} from "../lib/readiness";
import { cx, formatDate, isDone, navigate, percent, today } from "../lib/utils";
import {
  CUSTOM_COURSE_CATEGORY,
  CUSTOM_COURSE_DOMAIN,
  CUSTOM_COURSE_ROADMAP_PHASE,
  CUSTOM_COURSE_SOURCE_TYPE,
  CUSTOM_COURSE_STATUS,
  CUSTOM_COURSE_TOPIC_STATUS,
  getCustomCourseProgress,
  getCustomCourseTopics,
  getCustomCourses,
  getTopicProgress,
  isCustomCourse,
  isCustomCourseTopic,
  slugify,
  topicStatusLabel,
} from "../lib/course-customization";
import {
  COURSE_MAP_LABEL,
  PERSONAL_COURSES,
  PERSONAL_ROADMAP,
  PLATFORM_GATES,
  READINESS_SKILLS,
  ROADMAP_STATUSES,
  ROADMAP_START_DATE,
  customModuleValues,
  templateValues,
  type PersonalCourse,
  type PlatformGate,
  type RoadmapTemplate,
} from "./personal-roadmap-data";
import "./personal-roadmap.css";

type PersonalRoadmapProps = { recordId?: string };
type EditorRequest = { initial: Partial<Item>; title?: string };
type GateState = PlatformGateState;

const COURSE_OPTIONS = [
  { id: "java-dsa", label: "Java + DSA ordered progression" },
  { id: "sigma-8", label: PERSONAL_COURSES["sigma-8"].title },
] as const;

const statusLabel = (value?: string) =>
  (value || "not started").replaceAll("-", " ");

const statusTone = (value?: string) => {
  if (isModuleComplete({ status: value })) return "success";
  if (["learning", "practicing", "revising"].includes(value || ""))
    return "warning";
  return "neutral";
};

const customTopicStatusOptions = (current?: string) => [
  ...new Set([
    ...ROADMAP_STATUSES,
    ...(current && !ROADMAP_STATUSES.includes(current) ? [current] : []),
  ]),
];

const isCourse = (value?: string): value is PersonalCourse =>
  value === "java-dsa" || value === "sigma-8";

const readRoadmapHash = () => {
  if (typeof window === "undefined") return undefined;
  const [route, id] = window.location.hash.replace(/^#\/?/, "").split("/");
  return route === "roadmap" ? id || undefined : undefined;
};

function moduleFields(): FieldDef[] {
  return [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ROADMAP_STATUSES.map((value) => ({
        value,
        label: statusLabel(value),
      })),
    },
    {
      key: "stage",
      label: "Stage",
      placeholder: "e.g. Foundations or a phase name",
    },
    {
      key: "courseOrder",
      label: "Order",
      type: "number",
      min: 0,
      placeholder: "1",
    },
    {
      key: "prerequisites",
      label: "Prerequisites · one stable key or legacy title per line",
      type: "textarea",
      placeholder: "java.arrays\njava.searching",
      full: true,
    },
    {
      key: "description",
      label: "Module notes / scope",
      type: "textarea",
      full: true,
      placeholder: "What does this module mean to you?",
    },
    {
      key: "completionCriteria",
      label: "Completion gate",
      type: "textarea",
      full: true,
      placeholder: "What must be true before you mark it completed?",
    },
    {
      key: "nextRevision",
      label: "Next revision date",
      type: "date",
    },
    {
      key: "readinessGate",
      label: "Readiness skill (optional)",
      type: "select",
      options: [
        { value: "", label: "No platform skill" },
        ...READINESS_SKILLS.map((skill) => ({
          value: skill.id,
          label: skill.label,
        })),
      ],
    },
    {
      key: "requiresGate",
      label: "Requires manual gate",
      type: "select",
      options: [
        { value: "", label: "No additional gate" },
        { value: "leetcode", label: "LeetCode readiness" },
        { value: "codeforces", label: "Codeforces / CP readiness" },
      ],
    },
    {
      key: "examples",
      label: "Beginner practice",
      type: "textarea",
      full: true,
      placeholder: "A small first practice step",
    },
    {
      key: "approach",
      label: "Independent exercise",
      type: "textarea",
      full: true,
      placeholder: "A problem or build you can do independently",
    },
    {
      key: "mistakes",
      label: "Common mistakes",
      type: "textarea",
      full: true,
      placeholder: "Mistakes or failure modes to watch for",
    },
    {
      key: "reflection",
      label: "Revision notes",
      type: "textarea",
      full: true,
      placeholder: "What should you revisit next time?",
    },
    {
      key: "body",
      label: "Notes",
      type: "textarea",
      full: true,
      placeholder: "Your notes, links or questions (links are not executed).",
    },
    {
      key: "evidence",
      label: "Evidence",
      type: "textarea",
      full: true,
      placeholder:
        "A saved task, result, explanation or other evidence you actually have",
    },
    {
      key: "tags",
      label: "Tags",
      type: "tags",
      placeholder: "Separate tags with commas",
    },
  ];
}

const ROADMAP_FIELDS = moduleFields();

function findTemplateRecord(
  template: RoadmapTemplate,
  modules: Item[],
): Item | undefined {
  return (
    moduleForKey(modules, template.key) ||
    modules.find(
      (item) =>
        item.course === template.course &&
        item.roadmapPhase === "scaffold" &&
        !PERSONAL_ROADMAP.some(
          (entry) => entry.key === (item.moduleKey || item.collection),
        ) &&
        (item.courseOrder === template.courseOrder ||
          item.title === template.title),
    )
  );
}

function missingPrerequisites(
  record: Item | undefined,
  template: RoadmapTemplate,
  modules: Item[],
) {
  return missingModulePrerequisites(
    record ? { ...record, moduleKey: template.key } : templateValues(template),
    modules,
  );
}

function moduleGate(
  record: Item | undefined,
  gateState: Record<PlatformGate, GateState>,
) {
  const gate = record?.requiresGate;
  if (gate !== "leetcode" && gate !== "codeforces") return undefined;
  return gateState[gate].unlocked ? undefined : gate;
}

function linkedTasks(items: Item[], module?: Item) {
  if (!module) return [];
  return items.filter(
    (item) =>
      item.kind === "task" &&
      (item.topicId === module.id ||
        (item.moduleKey &&
          item.moduleKey === (module.moduleKey || module.collection)) ||
        // Read an optional imported association without creating a new field.
        (item as Item & { courseModuleId?: string }).courseModuleId ===
          module.id),
  );
}

const advancesModule = (status?: string) =>
  ["learning", "practicing", "revising", "completed", "mastered"].includes(
    status || "",
  );

function progressionWarning(item: Partial<Item>, items: Item[]) {
  const missing = missingModulePrerequisites(item, items);
  const gate = item.requiresGate;
  const blockedGate =
    (gate === "leetcode" || gate === "codeforces" || gate === "icpc") &&
    !platformGateState(items, gate).unlocked;
  if (!missing.length && !blockedGate) return "";
  return [
    missing.length
      ? `Complete or master these prerequisite topic records first: ${missing.map((key) => modulePrerequisiteLabel(key, items, item.course)).join(", ")}.`
      : "",
    blockedGate
      ? `Acknowledge the ${gate} gate after its requirements are met.`
      : "",
    "If you already know a prerequisite, record that prior knowledge explicitly in its own completed topic record.",
  ]
    .filter(Boolean)
    .join(" ");
}

// Course status changes must be validated before persistence. This scoped
// editor also preserves prerequisite arrays independently of the tags parser.
function ModuleEditor({
  initial,
  title,
  onClose,
  onSaved,
}: EditorRequest & { onClose: () => void; onSaved: (item: Item) => void }) {
  const store = useStore();
  const template = PERSONAL_ROADMAP.find(
    (entry) =>
      entry.course === initial.course &&
      (entry.key === (initial.moduleKey || initial.collection) ||
        (initial.roadmapPhase === "scaffold" &&
          !initial.moduleKey &&
          !PERSONAL_ROADMAP.some(
            (candidate) => candidate.key === initial.collection,
          ) &&
          (entry.courseOrder === initial.courseOrder ||
            entry.title === initial.title))),
  );
  const record: Partial<Item> = template
    ? { ...initial, moduleKey: template.key }
    : initial;
  const [values, setValues] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = { title: record.title || "" };
    for (const field of ROADMAP_FIELDS) {
      const value = record[field.key];
      result[field.key] =
        field.key === "prerequisites"
          ? modulePrerequisiteKeys(record).join("\n")
          : Array.isArray(value)
            ? value.join(", ")
            : value === undefined
              ? ""
              : String(value);
    }
    return result;
  });
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const parsePrerequisites = () => [
    ...new Set(
      values.prerequisites
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) =>
          modulePrerequisiteKey(value, store.items, record.course),
        ),
    ),
  ];
  const preview = {
    ...record,
    status: values.status,
    prerequisites: parsePrerequisites(),
  };
  const warning = progressionWarning(preview, store.items);
  const prerequisiteOptions = [
    ...PERSONAL_ROADMAP.filter((entry) => entry.course === record.course).map(
      (entry) => ({
        key: entry.key,
        label: modulePrerequisiteLabel(entry.key, store.items, record.course),
      }),
    ),
    ...store.items
      .filter(
        (item) =>
          item.kind === "topic" &&
          !item.archived &&
          item.course === record.course &&
          item.roadmapPhase === "custom",
      )
      .map((item) => ({
        key: item.moduleKey || item.collection || item.title,
        label: item.title,
      })),
  ].filter((entry) => entry.key !== record.moduleKey);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (store.readOnly) return;
    setError("");
    try {
      const data: Partial<Item> = { ...record, title: values.title.trim() };
      if (!data.title) throw new Error("Give this module a title.");
      if (data.title.length > 240)
        throw new Error("Keep the title under 240 characters.");
      for (const field of ROADMAP_FIELDS) {
        const value = values[field.key] || "";
        let parsed: unknown = value;
        if (field.key === "prerequisites") parsed = parsePrerequisites();
        else if (field.type === "tags")
          parsed = [
            ...new Set(
              value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            ),
          ];
        else if (field.type === "number") {
          parsed = value === "" ? undefined : Number(value);
          if (
            parsed !== undefined &&
            (!Number.isFinite(parsed) || Number(parsed) < (field.min ?? 0))
          )
            throw new Error(`${field.label}: enter a non-negative number.`);
        } else if (field.type === "date" && value && !validDay(value))
          throw new Error(`${field.label} needs a valid date.`);
        (data as Record<string, unknown>)[field.key] = parsed;
      }
      data.prerequisites = modulePrerequisiteKeys(data).map((key) =>
        modulePrerequisiteKey(key, store.items, data.course),
      );
      if (
        (data.prerequisites?.length || 0) > 50 ||
        data.prerequisites?.some((value) => value.length > 300)
      )
        throw new Error(
          "Keep prerequisites to 50 references of at most 300 characters.",
        );
      const blocked = progressionWarning(data, store.items);
      if (
        advancesModule(data.status) &&
        data.status !== record.status &&
        blocked
      )
        throw new Error(blocked);
      if (data.completionCriteria !== record.completionCriteria)
        data.checklist = data.completionCriteria;
      if (!data.moduleKey && !data.collection)
        data.moduleKey = `custom.${crypto.randomUUID()}`;
      let item: Item;
      if (record.id) {
        store.update(record.id, data);
        item = { ...record, ...data } as Item;
      } else item = store.create("topic", data);
      store.notify(
        record.id ? "Module changes saved." : "Custom module created.",
      );
      onSaved(item);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save module.",
      );
    }
  };

  return (
    <Modal title={title || "Edit roadmap module"} onClose={onClose} wide>
      <form onSubmit={save} noValidate className="personal-roadmap-editor">
        <fieldset disabled={store.readOnly} className="editor-fieldset">
          {warning && (
            <div className="personal-roadmap-blocked" role="status">
              <LockKeyhole size={16} />
              <div>
                <strong>Prerequisites required before advancing</strong>
                <span>{warning}</span>
              </div>
            </div>
          )}
          <div className="form-grid">
            <div className="full-width">
              <Field label="Title">
                <input
                  autoFocus
                  value={values.title}
                  maxLength={240}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            {ROADMAP_FIELDS.map((field) => (
              <div key={field.key} className={cx(field.full && "full-width")}>
                <Field label={field.label}>
                  {field.type === "select" ? (
                    <select
                      value={values[field.key] || ""}
                      onChange={(event) =>
                        setValues((previous) => ({
                          ...previous,
                          [field.key]: event.target.value,
                        }))
                      }
                    >
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      rows={field.key === "prerequisites" ? 3 : 4}
                      value={values[field.key] || ""}
                      placeholder={field.placeholder}
                      onChange={(event) =>
                        setValues((previous) => ({
                          ...previous,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <input
                      type={
                        field.type === "tags" ? "text" : field.type || "text"
                      }
                      value={values[field.key] || ""}
                      min={field.min}
                      placeholder={field.placeholder}
                      onChange={(event) =>
                        setValues((previous) => ({
                          ...previous,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  )}
                </Field>
                {field.key === "prerequisites" && (
                  <>
                    <Field label="Add a prerequisite by readable title">
                      <select
                        value=""
                        onChange={(event) => {
                          if (event.target.value)
                            setValues((previous) => ({
                              ...previous,
                              prerequisites: [
                                ...new Set([
                                  ...previous.prerequisites
                                    .split("\n")
                                    .filter(Boolean),
                                  event.target.value,
                                ]),
                              ].join("\n"),
                            }));
                        }}
                      >
                        <option value="">Choose a module…</option>
                        {prerequisiteOptions.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <p className="muted small">
                      {modulePrerequisiteKeys(preview)
                        .map((key) =>
                          modulePrerequisiteLabel(
                            key,
                            store.items,
                            record.course,
                          ),
                        )
                        .join(" · ") || "No prerequisite recorded."}{" "}
                      {template?.key === "java.dp" &&
                        "DP also always requires recursion, backtracking, all core structures, graphs, BFS and DFS."}
                      {template &&
                        " Scaffold predecessors remain required even if their text is cleared; complete their own topic records first."}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </fieldset>
        {store.readOnly && <p className="muted">This tab is read-only.</p>}
        <div className="modal-actions">
          {record.id && (
            <Button
              variant="danger"
              disabled={store.readOnly}
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={14} />
              Delete topic
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={store.readOnly}>
            <Check size={16} />
            {record.id ? "Save changes" : "Create topic"}
          </Button>
        </div>
      </form>
      {deleting && record.id && (
        <Confirm
          title="Delete topic?"
          message={`“${record.title}” will be removed. Other records will be kept.`}
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            store.remove(record.id!);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

function CompletionCriteria({ value }: { value: string }) {
  const lines = value
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*(\[\s*\]\s*)?/, "").trim())
    .filter(Boolean);
  return (
    <ul className="personal-roadmap-checklist">
      {lines.map((line) => (
        <li key={line}>
          <span aria-hidden="true">□</span>
          {line}
        </li>
      ))}
    </ul>
  );
}

function DetailBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="personal-roadmap-detail-block">
      <span className="personal-roadmap-detail-label">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function RoadmapModuleCard({
  template,
  record,
  modules,
  items,
  gateState,
  expanded,
  readOnly,
  onToggle,
  onAdopt,
  onEdit,
  onStatus,
}: {
  template: RoadmapTemplate;
  record?: Item;
  modules: Item[];
  items: Item[];
  gateState: Record<PlatformGate, GateState>;
  expanded: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onAdopt: () => void;
  onEdit: () => void;
  onStatus: (status: string) => void;
}) {
  const store = useStore();
  const missing = missingPrerequisites(record, template, modules);
  const prerequisites = modulePrerequisiteKeys(
    record ? { ...record, moduleKey: template.key } : templateValues(template),
  );
  const blockedByGate = moduleGate(record, gateState);
  const blocked = Boolean(record && (missing.length || blockedByGate));
  const linked = linkedTasks(items, record);
  const criteria = record
    ? (record.completionCriteria ?? record.checklist ?? "")
    : template.completionCriteria.join("\n");
  const platformLabel = blockedByGate
    ? blockedByGate === "leetcode"
      ? "LeetCode readiness"
      : "Codeforces / CP readiness"
    : "";
  const skillLabel = record?.readinessGate
    ? READINESS_SKILLS.find((skill) => skill.id === record.readinessGate)?.label
    : template.readinessGate
      ? READINESS_SKILLS.find((skill) => skill.id === template.readinessGate)
          ?.label
      : undefined;

  return (
    <article
      className={cx(
        "personal-roadmap-module",
        expanded && "is-expanded",
        blocked && "is-blocked",
        record && "is-adopted",
      )}
    >
      <div className="personal-roadmap-module-row">
        <span className="personal-roadmap-order">
          {String(record?.courseOrder ?? template.courseOrder).padStart(2, "0")}
        </span>
        <button
          type="button"
          className="personal-roadmap-module-toggle"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <span className="personal-roadmap-module-heading">
            <strong>{record?.title || template.title}</strong>
            <span>{record?.stage || template.stage}</span>
          </span>
          <span className="personal-roadmap-module-meta">
            {record ? (
              <Badge tone={statusTone(record.status)}>
                {statusLabel(record.status)}
              </Badge>
            ) : (
              <Badge>{COURSE_MAP_LABEL}</Badge>
            )}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>
        {record ? (
          <select
            className="personal-roadmap-status"
            aria-label={`Status for ${record.title}`}
            value={record.status || "not started"}
            disabled={readOnly}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onStatus(event.target.value)}
          >
            {ROADMAP_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        ) : (
          <Button
            variant="primary"
            className="personal-roadmap-adopt"
            disabled={readOnly}
            onClick={onAdopt}
          >
            <Plus size={14} />
            Adopt
          </Button>
        )}
      </div>
      {expanded && (
        <div className="personal-roadmap-module-details">
          <div className="personal-roadmap-module-summary">
            <p>{record ? record.description : template.description}</p>
            <div className="row personal-roadmap-detail-badges">
              <Badge>{COURSE_MAP_LABEL}</Badge>
              {skillLabel && (
                <Badge tone="warning">Gate skill · {skillLabel}</Badge>
              )}
              {record?.nextRevision && (
                <Badge
                  tone={record.nextRevision <= today() ? "warning" : "neutral"}
                >
                  Revision · {formatDate(record.nextRevision)}
                </Badge>
              )}
            </div>
          </div>
          {blocked && (
            <div className="personal-roadmap-blocked" role="status">
              <LockKeyhole size={16} aria-hidden="true" />
              <div>
                <strong>Blocked until prerequisites/gate</strong>
                <span>
                  {missing.length > 0 &&
                    `Complete or master: ${missing.map((key) => modulePrerequisiteLabel(key, modules, template.course)).join(", ")}. `}
                  {blockedByGate &&
                    `Unlock ${platformLabel} manually after its real records are complete.`}{" "}
                  Status cannot advance through missing predecessors. Record
                  prior knowledge in the prerequisite topics themselves.
                </span>
              </div>
            </div>
          )}
          <div className="personal-roadmap-detail-grid">
            <DetailBlock label="Prerequisites">
              {prerequisites.length ? (
                <div className="row personal-roadmap-prerequisites">
                  {prerequisites.map((item) => (
                    <Badge
                      key={item}
                      tone={missing.includes(item) ? "warning" : "success"}
                    >
                      {modulePrerequisiteLabel(item, modules, template.course)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="muted">No prerequisite recorded.</span>
              )}
            </DetailBlock>
            <DetailBlock label="Beginner practice">
              <p className="personal-roadmap-copy">
                {record ? record.examples : template.beginnerPractice}
              </p>
            </DetailBlock>
            <DetailBlock label="Independent exercise">
              <p className="personal-roadmap-copy">
                {record ? record.approach : template.independentExercise}
              </p>
            </DetailBlock>
            <DetailBlock label="Common mistakes">
              <p className="personal-roadmap-copy">
                {record ? record.mistakes : template.commonMistakes}
              </p>
            </DetailBlock>
            <DetailBlock label="Revision notes">
              <p className="personal-roadmap-copy">
                {record ? record.reflection : template.revisionNotes}
              </p>
            </DetailBlock>
            <DetailBlock label="Completion criteria">
              <CompletionCriteria value={criteria} />
            </DetailBlock>
          </div>
          {(record?.body || record?.evidence) && (
            <div className="personal-roadmap-notes-grid">
              {record.body && (
                <DetailBlock label="Notes">
                  <p className="personal-roadmap-copy personal-roadmap-prewrap">
                    {record.body}
                  </p>
                </DetailBlock>
              )}
              {record.evidence && (
                <DetailBlock label="Evidence">
                  <p className="personal-roadmap-copy personal-roadmap-prewrap">
                    {record.evidence}
                  </p>
                </DetailBlock>
              )}
            </div>
          )}
          {linked.length > 0 && (
            <DetailBlock label="Linked planner tasks">
              <div className="personal-roadmap-task-list">
                {linked.map((task) => (
                  <Button
                    key={task.id}
                    variant="ghost"
                    onClick={() => navigate("planner", task.id)}
                  >
                    <Link2 size={14} />
                    <span>{task.title}</span>
                    <Badge tone={isDone(task) ? "success" : "neutral"}>
                      {statusLabel(task.status || "todo")}
                    </Badge>
                    <ArrowRight size={13} />
                  </Button>
                ))}
              </div>
            </DetailBlock>
          )}
          {record && (
            <div className="personal-roadmap-task-list">
              <Button
                disabled={readOnly}
                onClick={() => {
                  const task = store.create("task", {
                    title: `Practice: ${record.title}`,
                    description:
                      record.approach ||
                      record.examples ||
                      "Write and test an independent exercise.",
                    course: record.course,
                    stage: record.stage,
                    moduleKey: record.moduleKey || record.collection,
                    topicId: record.id,
                    prerequisites: modulePrerequisiteKeys(record),
                    completionCriteria: record.completionCriteria,
                    status: "todo",
                    priority: "Medium",
                    duration: 30,
                    dueDate:
                      today() < ROADMAP_START_DATE
                        ? ROADMAP_START_DATE
                        : today(),
                    official: false,
                  });
                  navigate("planner", task.id);
                }}
              >
                {" "}
                <Plus size={13} /> Plan this topic
              </Button>
              <Button
                disabled={readOnly}
                onClick={() => {
                  const note = store.create("note", {
                    title: `Notes: ${record.title}`,
                    topicId: record.id,
                    moduleKey: record.moduleKey || record.collection,
                    course: record.course,
                    body: "",
                    status: "draft",
                    official: false,
                  });
                  navigate("notes", note.id);
                }}
              >
                <Plus size={13} /> Add linked note
              </Button>
              {items
                .filter(
                  (item) =>
                    item.kind === "note" &&
                    !item.archived &&
                    item.topicId === record.id,
                )
                .map((note) => (
                  <Button
                    key={note.id}
                    variant="ghost"
                    onClick={() => navigate("notes", note.id)}
                  >
                    <Link2 size={13} />
                    {note.title}
                  </Button>
                ))}
            </div>
          )}
          <div className="personal-roadmap-module-footer">
            <span className="muted small">
              {record
                ? `Saved locally · updated ${formatDate(record.updatedAt)}`
                : "Not stored yet · adopt this module to start your record"}
            </span>
            {record && (
              <Button variant="ghost" onClick={onEdit} disabled={readOnly}>
                <Edit3 size={14} />
                Edit module
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function ReadinessGateCard({
  platform,
  state,
  readOnly,
  onToggle,
}: {
  platform: PlatformGate;
  state: GateState;
  readOnly: boolean;
  onToggle: () => void;
}) {
  const definition = PLATFORM_GATES.find((gate) => gate.id === platform)!;
  return (
    <article
      className={cx(
        "personal-roadmap-gate-card",
        state.unlocked && "is-unlocked",
      )}
    >
      <div className="personal-roadmap-gate-heading">
        <div className="personal-roadmap-gate-icon">
          {platform === "leetcode" ? (
            <Target size={18} />
          ) : (
            <Trophy size={18} />
          )}
        </div>
        <div>
          <span className="personal-roadmap-eyebrow">
            MANUAL READINESS GATE
          </span>
          <h3>{definition.title}</h3>
        </div>
        <Badge
          tone={
            state.unlocked ? "success" : state.manual ? "warning" : "neutral"
          }
        >
          {state.unlocked
            ? "Ready"
            : state.manual
              ? "Needs records"
              : "Not enabled"}
        </Badge>
      </div>
      <p className="personal-roadmap-gate-description">
        {definition.description}
      </p>
      <ul className="personal-roadmap-gate-list">
        {state.checks.map((check) => (
          <li key={check.id} className={check.complete ? "is-complete" : ""}>
            <span className="personal-roadmap-gate-check" aria-hidden="true">
              {check.complete ? <Check size={12} /> : <span />}
            </span>
            <span>
              <strong>{check.label}</strong>
              <small>{check.detail}</small>
            </span>
          </li>
        ))}
      </ul>
      <label className="personal-roadmap-ready-toggle">
        <input
          type="checkbox"
          checked={state.manual}
          disabled={readOnly}
          onChange={onToggle}
        />
        <span>
          I’m ready for {definition.title} practice
          <small>
            I solve 70–80% of basic exercises independently, without hints or
            editorials. This acknowledgement is shared with the Strategy page.
          </small>
        </span>
      </label>
      {state.manual && !state.requirementsMet && (
        <p className="personal-roadmap-gate-warning">
          Your acknowledgement is saved, but the platform remains gated until
          the missing completion records above are real.
        </p>
      )}
    </article>
  );
}

function ReadinessGates({
  items,
  readOnly,
  onToggle,
}: {
  items: Item[];
  readOnly: boolean;
  onToggle: (platform: PlatformGate) => void;
}) {
  const states = useMemo(
    () => ({
      leetcode: platformGateState(items, "leetcode"),
      codeforces: platformGateState(items, "codeforces"),
    }),
    [items],
  );
  return (
    <Panel
      title="Readiness gates"
      action={<Badge tone="neutral">Status records only</Badge>}
      className="personal-roadmap-readiness"
    >
      <div className="personal-roadmap-readiness-intro">
        <div className="personal-roadmap-readiness-mark">
          <GitBranch size={18} />
        </div>
        <p>
          These cards never mark a platform ready by themselves. They read only
          explicit canonical-key topic records marked completed/mastered and
          your self-assessment. Revising/revised topics and keywords in
          tasks/problems never supply mastery. Toggle “I’m ready” after you have
          made the call yourself.
        </p>
      </div>
      <div className="personal-roadmap-gate-grid">
        <ReadinessGateCard
          platform="leetcode"
          state={states.leetcode}
          readOnly={readOnly}
          onToggle={() => onToggle("leetcode")}
        />
        <ReadinessGateCard
          platform="codeforces"
          state={states.codeforces}
          readOnly={readOnly}
          onToggle={() => onToggle("codeforces")}
        />
      </div>
    </Panel>
  );
}

function CustomModules({
  course,
  items,
  readOnly,
  onAdd,
  onEdit,
  onStatus,
}: {
  course: PersonalCourse;
  items: Item[];
  readOnly: boolean;
  onAdd: () => void;
  onEdit: (item: Item) => void;
  onStatus: (item: Item, status: string) => void;
}) {
  const custom = items.filter(
    (item) =>
      item.kind === "topic" &&
      item.course === course &&
      item.roadmapPhase === "custom" &&
      !item.archived,
  );
  return (
    <Panel
      title="Custom modules"
      action={
        <Button variant="primary" onClick={onAdd} disabled={readOnly}>
          <Plus size={14} />
          Add custom module
        </Button>
      }
      className="personal-roadmap-custom"
    >
      {custom.length ? (
        <div className="personal-roadmap-custom-list">
          <p className="muted small">
            Rename, reorder and edit these local additions. Their status changes
            use the same prerequisite checks as adopted modules.
          </p>
          {[...custom]
            .sort((a, b) => (a.courseOrder || 0) - (b.courseOrder || 0))
            .map((item) => {
              const missing = missingModulePrerequisites(item, items);
              const linked = linkedTasks(items, item);
              return (
                <article
                  key={item.id}
                  className="personal-roadmap-custom-record"
                >
                  <div className="row-between">
                    <Button variant="ghost" onClick={() => onEdit(item)}>
                      <Edit3 size={14} />
                      {item.title}
                    </Button>
                    <select
                      className="personal-roadmap-status"
                      aria-label={`Status for ${item.title}`}
                      value={item.status || "not started"}
                      disabled={readOnly}
                      onChange={(event) => onStatus(item, event.target.value)}
                    >
                      {ROADMAP_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {item.description && (
                    <p className="personal-roadmap-copy">{item.description}</p>
                  )}
                  {missing.length > 0 && (
                    <p className="personal-roadmap-gate-warning">
                      Complete or master first:{" "}
                      {missing
                        .map((key) =>
                          modulePrerequisiteLabel(key, items, item.course),
                        )
                        .join(", ")}
                      . Open the module to edit its notes and prerequisites.
                    </p>
                  )}
                  {linked.length > 0 && (
                    <div className="personal-roadmap-task-list">
                      {linked.map((task) => (
                        <Button
                          key={task.id}
                          variant="ghost"
                          onClick={() => navigate("planner", task.id)}
                        >
                          <Link2 size={14} />
                          {task.title}
                          <ArrowRight size={13} />
                        </Button>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
        </div>
      ) : (
        <Empty
          icon={<Sparkles size={28} />}
          title="Make room for your own modules"
          description="The scaffold stays unchanged until you adopt a module. Add a personal module for a gap, project phase or topic that belongs in your path."
          action={
            <Button variant="primary" onClick={onAdd} disabled={readOnly}>
              <Plus size={14} />
              Create custom module
            </Button>
          }
        />
      )}
    </Panel>
  );
}

function customTopicLinkValues(course: Item): Partial<Item> {
  return {
    course: course.course,
    subjectId: course.id,
    domain: CUSTOM_COURSE_DOMAIN,
    roadmapPhase: CUSTOM_COURSE_ROADMAP_PHASE,
    sourceType: CUSTOM_COURSE_SOURCE_TYPE,
  };
}

function CustomCourseEditor({
  initial,
  items,
  readOnly,
  onClose,
  onSaved,
}: {
  initial?: Item;
  items: Item[];
  readOnly: boolean;
  onClose: () => void;
  onSaved: (course: Item) => void;
}) {
  const store = useStore();
  const [title, setTitle] = useState(initial?.title || "");
  const [error, setError] = useState("");
  const creating = !initial;
  const stableSlug = initial?.course || slugify(title);

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly) return;
    setError("");
    try {
      const nextTitle = title.trim();
      if (!nextTitle) throw new Error("Give this course a title.");
      if (nextTitle.length > 240)
        throw new Error("Keep the course title under 240 characters.");
      if (creating && !stableSlug)
        throw new Error("Give this course a name that can be saved.");
      const proposedSlug = slugify(nextTitle);
      const collision = getCustomCourses(items, true).find(
        (course) =>
          course.id !== initial?.id &&
          (course.course === proposedSlug ||
            course.title.trim().toLocaleLowerCase() ===
              nextTitle.toLocaleLowerCase()),
      );
      if (collision)
        throw new Error(
          `A custom course already uses the name or stable slug “${collision.title}”. Choose a different name.`,
        );
      if (creating) {
        const course = store.create("subject", {
          title: nextTitle,
          course: stableSlug,
          domain: CUSTOM_COURSE_DOMAIN,
          category: CUSTOM_COURSE_CATEGORY,
          sourceType: CUSTOM_COURSE_SOURCE_TYPE,
          archived: false,
          status: CUSTOM_COURSE_STATUS,
        });
        store.notify(`Custom course “${course.title}” created.`, "success");
        onSaved(course);
      } else {
        if (!isCustomCourse(initial))
          throw new Error("That custom course is no longer available.");
        store.update(initial.id, { title: nextTitle });
        store.notify(`Custom course renamed to “${nextTitle}”.`, "success");
        onSaved({ ...initial, title: nextTitle });
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save custom course.",
      );
    }
  };

  return (
    <Modal
      title={creating ? "Create custom course" : "Rename custom course"}
      onClose={onClose}
    >
      <form onSubmit={save} noValidate>
        <fieldset disabled={readOnly} className="editor-fieldset">
          <Field
            label="Course title"
            hint={
              creating
                ? `Stable slug: ${stableSlug || "a name is required"}`
                : `Stable slug: ${initial?.course || "unavailable"} · renaming keeps linked topics attached`
            }
          >
            <input
              autoFocus
              value={title}
              maxLength={240}
              placeholder="e.g. Frontend systems"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </fieldset>
        {readOnly && <p className="muted">This tab is read-only.</p>}
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            disabled={readOnly || !title.trim()}
          >
            <Check size={16} />
            {creating ? "Create course" : "Save course name"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CustomTopicEditor({
  course,
  initial,
  items,
  readOnly,
  onClose,
  onSaved,
}: {
  course: Item;
  initial?: Item;
  items: Item[];
  readOnly: boolean;
  onClose: () => void;
  onSaved: (topic: Item) => void;
}) {
  const store = useStore();
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [body, setBody] = useState(initial?.body || "");
  const [evidence, setEvidence] = useState(initial?.evidence || "");
  const [status, setStatus] = useState(
    initial?.status || CUSTOM_COURSE_TOPIC_STATUS,
  );
  const [error, setError] = useState("");
  const creating = !initial;

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly) return;
    setError("");
    try {
      if (!isCustomCourse(course))
        throw new Error("That custom course is no longer available.");
      const nextTitle = title.trim();
      if (!nextTitle) throw new Error("Give this topic a title.");
      if (nextTitle.length > 240)
        throw new Error("Keep the topic title under 240 characters.");
      const topics = getCustomCourseTopics(items, course.id);
      const duplicate = topics.find(
        (topic) =>
          topic.id !== initial?.id &&
          topic.title.trim().toLocaleLowerCase() ===
            nextTitle.toLocaleLowerCase(),
      );
      if (duplicate)
        throw new Error(
          `A topic named “${duplicate.title}” already exists in this course.`,
        );
      const order =
        initial?.order ??
        Math.max(0, ...topics.map((topic) => topic.order || 0)) + 1;
      const values: Partial<Item> = {
        ...customTopicLinkValues(course),
        title: nextTitle,
        description: description.trim() || undefined,
        body: body.trim() || undefined,
        evidence: evidence.trim() || undefined,
        status,
        order,
      };
      if (initial) {
        if (!isCustomCourseTopic(initial))
          throw new Error("That custom topic is no longer available.");
        store.update(initial.id, values);
        const saved = { ...initial, ...values } as Item;
        store.notify(`Topic “${nextTitle}” updated.`, "success");
        onSaved(saved);
      } else {
        const created = store.create("topic", {
          ...values,
          archived: false,
        });
        store.notify(
          `Topic “${created.title}” added to “${course.title}”.`,
          "success",
        );
        onSaved(created);
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save custom topic.",
      );
    }
  };

  return (
    <Modal
      title={creating ? `Add topic to ${course.title}` : "Edit custom topic"}
      onClose={onClose}
      wide
    >
      <form onSubmit={save} noValidate>
        <fieldset disabled={readOnly} className="editor-fieldset">
          <div className="form-grid">
            <div className="full-width">
              <Field
                label="Topic title"
                hint={`Course: ${course.title} · stable slug: ${course.course}`}
              >
                <input
                  autoFocus
                  value={title}
                  maxLength={240}
                  placeholder="e.g. DOM event delegation"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Field>
            </div>
            <Field label="Status">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {customTopicStatusOptions(status).map((value) => (
                  <option key={value} value={value}>
                    {topicStatusLabel(value)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Description"
              hint="Optional scope or outcome for this topic."
            >
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <div className="full-width">
              <Field label="Notes">
                <textarea
                  rows={4}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Ideas, links or questions"
                />
              </Field>
            </div>
            <div className="full-width">
              <Field label="Evidence">
                <textarea
                  rows={3}
                  value={evidence}
                  onChange={(event) => setEvidence(event.target.value)}
                  placeholder="A saved exercise, explanation or result"
                />
              </Field>
            </div>
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </fieldset>
        {readOnly && <p className="muted">This tab is read-only.</p>}
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            disabled={readOnly || !title.trim()}
          >
            <Check size={16} />
            {creating ? "Add topic" : "Save topic"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

type CustomCourseConfirm =
  | { kind: "archive-course"; course: Item }
  | { kind: "remove-course"; course: Item }
  | { kind: "archive-topic"; course: Item; topic: Item }
  | { kind: "remove-topic"; course: Item; topic: Item };

function CustomCourseCard({
  course,
  items,
  readOnly,
  onAddTopic,
  onRename,
  onArchiveCourse,
  onRemoveCourse,
  onEditTopic,
  onStatus,
  onMove,
  onArchiveTopic,
  onRemoveTopic,
}: {
  course: Item;
  items: Item[];
  readOnly: boolean;
  onAddTopic: () => void;
  onRename: () => void;
  onArchiveCourse: () => void;
  onRemoveCourse: () => void;
  onEditTopic: (topic: Item) => void;
  onStatus: (topic: Item, status: string) => void;
  onMove: (topic: Item, direction: "before" | "after") => void;
  onArchiveTopic: (topic: Item) => void;
  onRemoveTopic: (topic: Item) => void;
}) {
  const topics = getCustomCourseTopics(items, course.id);
  const progress = getCustomCourseProgress(course, topics);

  return (
    <article className="personal-roadmap-custom-course-card">
      <header className="personal-roadmap-custom-course-header">
        <div className="personal-roadmap-custom-course-title">
          <div
            className="personal-roadmap-custom-course-icon"
            aria-hidden="true"
          >
            <Sparkles size={18} />
          </div>
          <div>
            <span className="personal-roadmap-eyebrow">
              ACTIVE CUSTOM COURSE
            </span>
            <h3>{course.title}</h3>
            <p>
              Stable slug <code>{course.course}</code> · assistant-created
              records
            </p>
          </div>
        </div>
        <div className="personal-roadmap-custom-course-actions">
          <Button
            variant="ghost"
            onClick={onRename}
            disabled={readOnly}
            aria-label={`Rename ${course.title}`}
          >
            <Edit3 size={14} />
            Rename
          </Button>
          <Button
            variant="ghost"
            onClick={onArchiveCourse}
            disabled={readOnly}
            aria-label={`Archive ${course.title}`}
          >
            <LockKeyhole size={14} />
            Archive
          </Button>
          <Button
            variant="danger"
            onClick={onRemoveCourse}
            disabled={readOnly}
            aria-label={`Remove ${course.title}`}
          >
            <Trash2 size={14} />
            Remove
          </Button>
        </div>
      </header>
      <div className="personal-roadmap-custom-course-summary">
        <div>
          <strong>
            {progress.completed}/{progress.total}
          </strong>
          <span>topics complete</span>
        </div>
        <div>
          <strong>{progress.percent}%</strong>
          <span>course progress</span>
        </div>
        <Badge tone={progress.total ? "success" : "neutral"}>
          {progress.total} {progress.total === 1 ? "topic" : "topics"}
        </Badge>
      </div>
      <Progress
        value={progress.percent}
        label={`${course.title} custom course progress`}
      />
      <div className="personal-roadmap-custom-topics-heading">
        <div>
          <span className="personal-roadmap-eyebrow">ROADMAP TOPICS</span>
          <h4>Topics in saved order</h4>
        </div>
        <Button variant="primary" onClick={onAddTopic} disabled={readOnly}>
          <Plus size={14} />
          Add topic
        </Button>
      </div>
      {topics.length ? (
        <ol className="personal-roadmap-custom-topic-list">
          {topics.map((topic, index) => {
            const label = topic.title.trim() || "Untitled topic";
            const topicProgress = getTopicProgress(topic);
            return (
              <li key={topic.id} className="personal-roadmap-custom-topic">
                <div className="personal-roadmap-custom-topic-main">
                  <span className="personal-roadmap-order" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{label}</strong>
                    <span>
                      {topicProgress.label} · {topicProgress.percent}%
                    </span>
                  </div>
                </div>
                <div className="personal-roadmap-custom-topic-controls">
                  <select
                    className="personal-roadmap-status"
                    aria-label={`Status for ${label}`}
                    value={topic.status || CUSTOM_COURSE_TOPIC_STATUS}
                    disabled={readOnly}
                    onChange={(event) => onStatus(topic, event.target.value)}
                  >
                    {customTopicStatusOptions(topic.status).map((value) => (
                      <option key={value} value={value}>
                        {topicStatusLabel(value)}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="ghost"
                    onClick={() => onEditTopic(topic)}
                    disabled={readOnly}
                    aria-label={`Edit ${label}`}
                  >
                    <Edit3 size={13} />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onMove(topic, "before")}
                    disabled={readOnly || index === 0}
                    aria-label={`Move ${label} before ${topics[index - 1]?.title || "the previous topic"}`}
                  >
                    <ChevronUp size={13} />
                    Move before
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onMove(topic, "after")}
                    disabled={readOnly || index === topics.length - 1}
                    aria-label={`Move ${label} after ${topics[index + 1]?.title || "the next topic"}`}
                  >
                    <ChevronDown size={13} />
                    Move after
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onArchiveTopic(topic)}
                    disabled={readOnly}
                    aria-label={`Archive topic ${label}`}
                  >
                    <LockKeyhole size={13} />
                    Archive
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => onRemoveTopic(topic)}
                    disabled={readOnly}
                    aria-label={`Remove topic ${label}`}
                  >
                    <Trash2 size={13} />
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <Empty
          icon={<ListChecks size={26} />}
          title="No topics in this course yet"
          description="Add the first topic here or create it through the local assistant. New topics keep this course’s stable slug and record markers."
          action={
            <Button variant="primary" onClick={onAddTopic} disabled={readOnly}>
              <Plus size={14} />
              Add the first topic
            </Button>
          }
        />
      )}
    </article>
  );
}

function CustomCoursesPanel({
  items,
  ready,
  readOnly,
}: {
  items: Item[];
  ready: boolean;
  readOnly: boolean;
}) {
  const store = useStore();
  const courses = useMemo(
    () =>
      getCustomCourses(items)
        .filter(isCustomCourse)
        .sort(
          (left, right) =>
            left.title.localeCompare(right.title) ||
            left.id.localeCompare(right.id),
        ),
    [items],
  );
  const archivedCourseCount = useMemo(
    () => items.filter((item) => isCustomCourse(item) && item.archived).length,
    [items],
  );
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courseEditor, setCourseEditor] = useState<{ initial?: Item } | null>(
    null,
  );
  const [topicEditor, setTopicEditor] = useState<{
    course: Item;
    initial?: Item;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<CustomCourseConfirm | null>(
    null,
  );

  useEffect(() => {
    if (!courses.some((course) => course.id === selectedCourseId))
      setSelectedCourseId(courses[0]?.id || "");
  }, [courses, selectedCourseId]);

  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId,
  );

  const notifyError = (cause: unknown, fallback: string) =>
    store.notify(cause instanceof Error ? cause.message : fallback, "error");

  const updateTopic = (course: Item, topic: Item, patch: Partial<Item>) => {
    if (readOnly) return;
    try {
      store.update(topic.id, { ...customTopicLinkValues(course), ...patch });
    } catch (cause) {
      notifyError(cause, "Unable to update custom topic.");
    }
  };

  const moveTopic = (
    course: Item,
    topic: Item,
    direction: "before" | "after",
  ) => {
    if (readOnly) return;
    const topics = getCustomCourseTopics(items, course.id);
    const index = topics.findIndex((candidate) => candidate.id === topic.id);
    const targetIndex = direction === "before" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= topics.length) return;
    const reordered = [...topics];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    try {
      reordered.forEach((candidate, nextIndex) => {
        if (candidate.order !== nextIndex + 1)
          store.update(candidate.id, {
            ...customTopicLinkValues(course),
            order: nextIndex + 1,
          });
      });
      store.notify(`Moved “${topic.title}” ${direction}.`, "success");
    } catch (cause) {
      notifyError(cause, "Unable to reorder custom topics.");
    }
  };

  const completeConfirmation = () => {
    const request = confirmation;
    setConfirmation(null);
    if (!request || readOnly) return;
    try {
      if (request.kind === "archive-course") {
        const linkedTopics = getCustomCourseTopics(
          items,
          request.course.id,
          true,
        );
        store.update(request.course.id, { archived: true });
        linkedTopics.forEach((topic) => {
          if (!topic.archived)
            store.update(topic.id, {
              ...customTopicLinkValues(request.course),
              archived: true,
            });
        });
        store.notify(
          `Custom course “${request.course.title}” was archived with ${linkedTopics.length} linked topic${linkedTopics.length === 1 ? "" : "s"}.`,
          "success",
        );
      } else if (request.kind === "remove-course") {
        const linkedTopics = getCustomCourseTopics(
          items,
          request.course.id,
          true,
        );
        linkedTopics.forEach((topic) => store.remove(topic.id));
        store.remove(request.course.id);
        store.notify(
          `Custom course “${request.course.title}” was removed.`,
          "success",
        );
      } else if (request.kind === "archive-topic") {
        updateTopic(request.course, request.topic, { archived: true });
        store.notify(`Topic “${request.topic.title}” was archived.`, "success");
      } else {
        store.remove(request.topic.id);
        store.notify(`Topic “${request.topic.title}” was removed.`, "success");
      }
    } catch (cause) {
      notifyError(cause, "Unable to update custom course records.");
    }
  };

  const confirmationCopy = confirmation
    ? confirmation.kind === "archive-course"
      ? {
          title: "Archive custom course?",
          message: `“${confirmation.course.title}” and its linked topics will be hidden from active course tabs. Saved progress stays in your workspace.`,
        }
      : confirmation.kind === "remove-course"
        ? {
            title: "Remove custom course permanently?",
            message: `“${confirmation.course.title}” and all of its linked topics will be permanently removed from this workspace.`,
          }
        : confirmation.kind === "archive-topic"
          ? {
              title: "Archive custom topic?",
              message: `“${confirmation.topic.title}” will leave the active topic list while its saved progress stays in the workspace.`,
            }
          : {
              title: "Remove custom topic permanently?",
              message: `“${confirmation.topic.title}” will be permanently removed from “${confirmation.course.title}”.`,
            }
    : undefined;

  return (
    <Panel
      title="Custom courses"
      action={
        <Button
          variant="primary"
          onClick={() => setCourseEditor({})}
          disabled={readOnly || !ready}
        >
          <Plus size={14} />
          Create course
        </Button>
      }
      className="personal-roadmap-custom-courses"
    >
      <div className="personal-roadmap-custom-courses-intro">
        <div className="personal-roadmap-readiness-mark" aria-hidden="true">
          <Sparkles size={17} />
        </div>
        <p>
          Assistant-created courses live here as ordinary editable roadmap
          records. Their stable course slug and custom markers stay intact when
          you rename, reorder or update a topic.
        </p>
      </div>
      {readOnly && (
        <div className="personal-roadmap-readonly-note" role="status">
          <LockKeyhole size={14} />
          <span>This tab is read-only. Custom course writes are disabled.</span>
        </div>
      )}
      {courses.length ? (
        <>
          <Tabs
            options={courses.map((course) => ({
              id: course.id,
              label: course.title,
              count: getCustomCourseTopics(items, course.id).length,
            }))}
            value={selectedCourse?.id || courses[0].id}
            onChange={setSelectedCourseId}
          />
          {selectedCourse ? (
            <CustomCourseCard
              course={selectedCourse}
              items={items}
              readOnly={readOnly}
              onAddTopic={() => setTopicEditor({ course: selectedCourse })}
              onRename={() => setCourseEditor({ initial: selectedCourse })}
              onArchiveCourse={() =>
                !readOnly &&
                setConfirmation({
                  kind: "archive-course",
                  course: selectedCourse,
                })
              }
              onRemoveCourse={() =>
                !readOnly &&
                setConfirmation({
                  kind: "remove-course",
                  course: selectedCourse,
                })
              }
              onEditTopic={(topic) =>
                setTopicEditor({ course: selectedCourse, initial: topic })
              }
              onStatus={(topic, status) =>
                updateTopic(selectedCourse, topic, { status })
              }
              onMove={(topic, direction) =>
                moveTopic(selectedCourse, topic, direction)
              }
              onArchiveTopic={(topic) =>
                !readOnly &&
                setConfirmation({
                  kind: "archive-topic",
                  course: selectedCourse,
                  topic,
                })
              }
              onRemoveTopic={(topic) =>
                !readOnly &&
                setConfirmation({
                  kind: "remove-topic",
                  course: selectedCourse,
                  topic,
                })
              }
            />
          ) : (
            <Empty
              icon={<CircleAlert size={26} />}
              title="Choose a custom course"
              description="The active course selection is unavailable. Choose another course tab to continue."
            />
          )}
        </>
      ) : (
        <Empty
          icon={<Sparkles size={28} />}
          title="No active custom courses"
          description={
            archivedCourseCount
              ? `${archivedCourseCount} archived custom course${archivedCourseCount === 1 ? " is" : "s are"} still saved. Create a new active course or restore one through the assistant.`
              : "Create a course here or ask the local assistant to create one. The canonical Java and Sigma maps remain unchanged."
          }
          action={
            <Button
              variant="primary"
              onClick={() => setCourseEditor({})}
              disabled={readOnly || !ready}
            >
              <Plus size={14} />
              Create your first course
            </Button>
          }
        />
      )}
      {courseEditor && (
        <CustomCourseEditor
          initial={courseEditor.initial}
          items={items}
          readOnly={readOnly}
          onClose={() => setCourseEditor(null)}
          onSaved={(course) => {
            setSelectedCourseId(course.id);
            setCourseEditor(null);
          }}
        />
      )}
      {topicEditor && (
        <CustomTopicEditor
          course={topicEditor.course}
          initial={topicEditor.initial}
          items={items}
          readOnly={readOnly}
          onClose={() => setTopicEditor(null)}
          onSaved={() => setTopicEditor(null)}
        />
      )}
      {confirmation && confirmationCopy && (
        <Confirm
          title={confirmationCopy.title}
          message={confirmationCopy.message}
          onClose={() => setConfirmation(null)}
          onConfirm={completeConfirmation}
        />
      )}
    </Panel>
  );
}

export default function PersonalRoadmap({ recordId }: PersonalRoadmapProps) {
  const { items, ready, readOnly, create, update, notify, touch } = useStore();
  const [course, setCourse] = useState<PersonalCourse>("java-dsa");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const [missingDeepLink, setMissingDeepLink] = useState(false);
  const [hashRecordId, setHashRecordId] = useState(readRoadmapHash);
  const handledRecord = useRef("");

  const activeRecordId = recordId || hashRecordId;
  const templates = useMemo(
    () =>
      PERSONAL_ROADMAP.filter((template) => template.course === course).sort(
        (a, b) => a.courseOrder - b.courseOrder,
      ),
    [course],
  );
  const modules = useMemo(
    () =>
      items.filter(
        (item) =>
          item.kind === "topic" && item.course === course && !item.archived,
      ),
    [course, items],
  );
  const entries = useMemo(
    () =>
      templates
        .map((template) => ({
          template,
          record: findTemplateRecord(template, modules),
        }))
        .sort(
          (a, b) =>
            (a.record?.courseOrder ?? a.template.courseOrder) -
            (b.record?.courseOrder ?? b.template.courseOrder),
        ),
    [modules, templates],
  );
  const gateState = useMemo(
    () => ({
      leetcode: platformGateState(items, "leetcode"),
      codeforces: platformGateState(items, "codeforces"),
    }),
    [items],
  );
  const adoptedCount = modules.filter(
    (item) => item.roadmapPhase === "scaffold",
  ).length;
  const completedCount = modules.filter(isModuleComplete).length;
  const customCount = modules.filter(
    (item) => item.roadmapPhase === "custom",
  ).length;

  useEffect(() => {
    const onHashChange = () => setHashRecordId(readRoadmapHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!activeRecordId) {
      handledRecord.current = "";
      setMissingDeepLink(false);
      return;
    }
    if (!ready || handledRecord.current === activeRecordId) return;
    if (activeRecordId === "new") {
      const order =
        Math.max(
          0,
          ...items
            .filter((item) => item.kind === "topic" && item.course === course)
            .map((item) => item.courseOrder || 0),
        ) + 1;
      setEditor({
        initial: customModuleValues(course, order),
        title: "Add custom roadmap module",
      });
      handledRecord.current = activeRecordId;
      setMissingDeepLink(false);
      return;
    }
    const record = items.find(
      (item) =>
        item.id === activeRecordId &&
        item.kind === "topic" &&
        isCourse(item.course),
    );
    if (!record) {
      handledRecord.current = activeRecordId;
      setEditor(null);
      setMissingDeepLink(true);
      return;
    }
    handledRecord.current = activeRecordId;
    setCourse(record.course as PersonalCourse);
    setEditor({ initial: record, title: "Edit roadmap module" });
    setMissingDeepLink(false);
    touch(record.id);
  }, [activeRecordId, course, items, ready, touch]);

  const filteredEntries = entries.filter(({ template, record }) => {
    const text = [
      template.title,
      template.stage,
      template.description,
      template.beginnerPractice,
      template.independentExercise,
      record?.title,
      record?.body,
      ...(record?.tags || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (query.trim() && !text.includes(query.trim().toLowerCase()))
      return false;
    if (statusFilter === "available") return !record;
    if (statusFilter === "blocked")
      return Boolean(
        record &&
        (missingPrerequisites(record, template, modules).length ||
          moduleGate(record, gateState)),
      );
    if (statusFilter === "adopted") return Boolean(record);
    return !statusFilter || statusFilter === "all"
      ? true
      : (record?.status || "not started") === statusFilter;
  });

  const groupedTemplates = useMemo(() => {
    const groups: { stage: string; entries: typeof filteredEntries }[] = [];
    filteredEntries.forEach((entry) => {
      const stage = entry.record?.stage ?? entry.template.stage;
      const group = groups.find((candidate) => candidate.stage === stage);
      if (group) group.entries.push(entry);
      else groups.push({ stage, entries: [entry] });
    });
    return groups;
  }, [filteredEntries]);

  const openCustomEditor = () => {
    const order =
      Math.max(
        0,
        ...modules.map((item) => item.courseOrder || 0),
        ...items
          .filter((item) => item.kind === "topic" && item.course === course)
          .map((item) => item.courseOrder || 0),
      ) + 1;
    setEditor({
      initial: customModuleValues(course, order),
      title: "Add custom roadmap module",
    });
  };

  const adopt = (template: RoadmapTemplate) => {
    if (readOnly) return;
    try {
      const item = create("topic", templateValues(template));
      setExpanded((previous) => new Set(previous).add(item.id));
      notify(`${template.title} added to your local roadmap.`, "success");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to add module.",
        "error",
      );
    }
  };

  const toggleReadiness = (platform: PlatformGate) => {
    if (readOnly) return;
    const existing = platformReadinessRecord(items, platform);
    const nextReady = existing?.status !== "ready";
    const values = readinessValues(platform, nextReady);
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
        `${platform === "leetcode" ? "LeetCode" : "Codeforces / CP"} readiness acknowledgement ${nextReady ? "saved" : "cleared"}.`,
        "success",
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Unable to save readiness.",
        "error",
      );
    }
  };

  const changeModuleStatus = (item: Item, status: string) => {
    if (readOnly || status === item.status) return;
    const template = PERSONAL_ROADMAP.find(
      (entry) => findTemplateRecord(entry, modules)?.id === item.id,
    );
    const candidate = template ? { ...item, moduleKey: template.key } : item;
    const warning = progressionWarning(candidate, items);
    if (advancesModule(status) && warning) {
      notify(warning, "error");
      setExpanded((previous) => new Set(previous).add(item.id));
      return;
    }
    update(item.id, {
      status,
      ...(template ? { moduleKey: template.key } : {}),
    });
  };

  const closeEditor = () => {
    setEditor(null);
    if (activeRecordId) navigate("roadmap");
  };

  return (
    <div className="personal-roadmap-page">
      <PageHeader
        eyebrow="PERSONAL COURSE MAP"
        title="A path you can make your own."
        description="Keep the sequence visible, adopt only what you are ready to track, and let real records—not a prefilled syllabus—show your progress."
        actions={
          <Button
            variant="primary"
            onClick={openCustomEditor}
            disabled={readOnly || !ready}
          >
            <Plus size={15} />
            Add custom module
          </Button>
        }
      />
      <div className="personal-roadmap-notice">
        <div className="personal-roadmap-notice-icon">
          <Route size={17} />
        </div>
        <div>
          <strong>{COURSE_MAP_LABEL}</strong>
          <p>
            The labels below are a personal planning scaffold. Nothing is marked
            completed, and no official lecture sequence or course completeness
            is assumed. Adopt a module before it becomes a local record.
          </p>
        </div>
        <Badge tone="neutral">{adoptedCount + customCount} local records</Badge>
      </div>
      <Tabs
        options={COURSE_OPTIONS.map((option) => ({
          id: option.id,
          label: option.label,
          count:
            items.filter(
              (item) =>
                item.kind === "topic" &&
                item.course === option.id &&
                !item.archived,
            ).length || undefined,
        }))}
        value={course}
        onChange={(value) => {
          if (isCourse(value)) {
            setCourse(value);
            setQuery("");
            setStatusFilter("all");
          }
          if (activeRecordId) navigate("roadmap");
        }}
      />
      <div className="personal-roadmap-course-grid">
        <Panel className="personal-roadmap-course-card">
          <div className="personal-roadmap-course-card-top">
            <div className="personal-roadmap-course-icon">
              {course === "java-dsa" ? (
                <Terminal size={20} />
              ) : (
                <Code2 size={20} />
              )}
            </div>
            <Badge tone="success">
              {course === "java-dsa"
                ? "Ordered progression"
                : "Editable sequence"}
            </Badge>
          </div>
          <span className="personal-roadmap-eyebrow">CURRENT MAP</span>
          <h2>{PERSONAL_COURSES[course].title}</h2>
          <p>{PERSONAL_COURSES[course].description}</p>
          <div className="personal-roadmap-progress-row">
            <div>
              <strong>{completedCount}</strong>
              <span>completed records</span>
            </div>
            <div>
              <strong>{adoptedCount + customCount}</strong>
              <span>adopted modules</span>
            </div>
            <div>
              <strong>{templates.length}</strong>
              <span>scaffold labels</span>
            </div>
          </div>
          <Progress
            value={percent(completedCount, adoptedCount + customCount)}
            label={`${PERSONAL_COURSES[course].title} completion`}
          />
          <span className="personal-roadmap-progress-caption">
            {percent(completedCount, adoptedCount + customCount)}% of adopted
            records completed
          </span>
        </Panel>
        <Panel
          className="personal-roadmap-principles"
          title="How this map behaves"
        >
          <div className="personal-roadmap-principle">
            <ListChecks size={16} />
            <div>
              <strong>Adopt before tracking</strong>
              <span>
                Scaffold labels remain local previews until you click Adopt.
              </span>
            </div>
          </div>
          <div className="personal-roadmap-principle">
            <Layers3 size={16} />
            <div>
              <strong>Prerequisites before progression</strong>
              <span>
                Complete or master prerequisite topic records before starting,
                practicing or completing the next module. Use notes and linked
                tasks as your evidence.
              </span>
            </div>
          </div>
          <div className="personal-roadmap-principle">
            <BookOpen size={16} />
            <div>
              <strong>Custom modules are first-class</strong>
              <span>
                Add a missing topic or project phase without changing the
                supplied order.
              </span>
            </div>
          </div>
        </Panel>
      </div>
      {course === "java-dsa" && (
        <ReadinessGates
          items={items}
          readOnly={readOnly}
          onToggle={toggleReadiness}
        />
      )}
      <Panel
        title="Ordered progression"
        action={
          <Button
            variant="ghost"
            onClick={openCustomEditor}
            disabled={readOnly}
          >
            <Plus size={14} />
            Add beside sequence
          </Button>
        }
        className="personal-roadmap-progression"
      >
        <div className="personal-roadmap-progression-intro">
          <p>
            {course === "java-dsa"
              ? "Fundamentals → arrays → searching/sorting/complexity → strings → bit manipulation → OOP → recursion/backtracking → linked lists/stacks/queues → trees/BST → heaps/hashing/tries → graphs/BFS/DFS → DP."
              : "HTML Part 1–4 / HTML levels → CSS Part 1–6 → Mini Project / Bootstrap / Project → JavaScript Part 1–13 → Terminal + Git & GitHub → Backend 1–4 Node/Express/EJS → SQL + MongoDB → Project Phases 1–3 → React Part 1–6 + Major Project."}
          </p>
          <div className="personal-roadmap-filters">
            <label className="personal-roadmap-search">
              <span className="personal-roadmap-sr-only">Search modules</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search modules, practice or notes…"
                aria-label="Search roadmap modules"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter roadmap modules"
            >
              <option value="all">All map entries</option>
              <option value="available">Not adopted</option>
              <option value="adopted">Adopted</option>
              {ROADMAP_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
              <option value="blocked">Blocked until gate</option>
            </select>
            <span className="muted small">
              {filteredEntries.length} of {templates.length} labels
            </span>
          </div>
        </div>
        {missingDeepLink && (
          <div className="personal-roadmap-deep-link" role="status">
            <CircleAlert size={16} />
            <span>
              This roadmap record is no longer available in this workspace.
            </span>
            <Button variant="ghost" onClick={() => navigate("roadmap")}>
              Back to roadmap <ArrowRight size={13} />
            </Button>
          </div>
        )}
        {!filteredEntries.length ? (
          <Empty
            icon={<Target size={28} />}
            title="No map entries match"
            description="Try another search or filter. The scaffold is unchanged, so you can clear the view without losing a record."
            action={
              <Button
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="personal-roadmap-stage-list">
            {groupedTemplates.map((group) => {
              const allInStage = entries.filter(
                (entry) =>
                  (entry.record?.stage ?? entry.template.stage) === group.stage,
              );
              const adoptedInStage = allInStage.filter(
                (entry) => entry.record,
              ).length;
              const completedInStage = allInStage.filter((entry) =>
                isModuleComplete(entry.record),
              ).length;
              return (
                <section className="personal-roadmap-stage" key={group.stage}>
                  <header className="personal-roadmap-stage-heading">
                    <div>
                      <span className="personal-roadmap-eyebrow">STAGE</span>
                      <h3>{group.stage}</h3>
                    </div>
                    <div className="personal-roadmap-stage-progress">
                      <span>
                        {completedInStage}/{allInStage.length} completed ·{" "}
                        {adoptedInStage} adopted
                      </span>
                      <Progress
                        value={percent(completedInStage, allInStage.length)}
                        label={`${group.stage} progress`}
                      />
                    </div>
                  </header>
                  <div className="personal-roadmap-module-list">
                    {group.entries.map(({ template, record }) => {
                      const key = record?.id || template.key;
                      return (
                        <RoadmapModuleCard
                          key={key}
                          template={template}
                          record={record}
                          modules={modules}
                          items={items}
                          gateState={gateState}
                          expanded={expanded.has(key)}
                          readOnly={readOnly}
                          onToggle={() =>
                            setExpanded((previous) => {
                              const next = new Set(previous);
                              if (next.has(key)) next.delete(key);
                              else next.add(key);
                              return next;
                            })
                          }
                          onAdopt={() => adopt(template)}
                          onEdit={() =>
                            record &&
                            setEditor({
                              initial: record,
                              title: "Edit roadmap module",
                            })
                          }
                          onStatus={(status) =>
                            record && changeModuleStatus(record, status)
                          }
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </Panel>
      <CustomModules
        course={course}
        items={items}
        readOnly={readOnly}
        onAdd={openCustomEditor}
        onEdit={(item) => {
          touch(item.id);
          setEditor({ initial: item, title: "Edit custom roadmap module" });
        }}
        onStatus={changeModuleStatus}
      />
      <CustomCoursesPanel items={items} ready={ready} readOnly={readOnly} />
      {editor && (
        <ModuleEditor
          key={editor.initial.id || `${course}-custom`}
          initial={editor.initial}
          onClose={closeEditor}
          onSaved={(item) => {
            if (isCourse(item.course)) setCourse(item.course);
            if (item.id)
              setExpanded((previous) => new Set(previous).add(item.id));
          }}
          title={editor.title}
        />
      )}
    </div>
  );
}
