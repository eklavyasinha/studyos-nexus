import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Filter,
  Flag,
  FolderOpen,
  Layers3,
  LayoutGrid,
  List,
  MoreHorizontal,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Target,
  Terminal,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Confirm,
  Empty,
  Field,
  ItemEditor,
  Markdown,
  Modal,
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
import {
  addDays,
  cx,
  formatDate,
  navigate,
  percent,
  safeUrl,
  today,
} from "../lib/utils";
import {
  CONTEST_STATES,
  curriculumFor,
  DIFFICULTIES,
  DOMAIN_INFO,
  PRACTICE_STATES,
  PROBLEM_STATES,
  tabForRecord,
  TOPIC_STATES,
  type LearningDomain,
} from "./learning-data";
import {
  activityDay,
  buildPlaygroundDocument,
  monthGrid,
  moveMonth,
  PLAYGROUND_STARTER,
  problemMetrics,
  revisionItems,
  tokenizeCode,
  weekBounds,
} from "./learning-helpers";
import "./learning.css";
import { eventFields } from "./planningHelpers";

type EditorRequest = { kind: Kind; initial: Partial<Item>; title?: string };
type OpenEditor = (kind: Kind, initial?: Partial<Item>, title?: string) => void;
type RecordProps = {
  domain: LearningDomain;
  records: Item[];
  openEditor: OpenEditor;
  onDelete: (item: Item) => void;
};
const options = (values: readonly string[]) =>
  values.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  }));
const labels = (value?: string) =>
  (value || "not started").replaceAll("-", " ");
const stateTone = (state?: string) =>
  ["mastered", "solved", "revised", "completed", "active"].includes(state || "")
    ? "success"
    : ["revising", "needs review", "attempted", "registered"].includes(
          state || "",
        )
      ? "warning"
      : "neutral";
const numberTotal = (
  records: Item[],
  key: "actualMinutes" | "solved" | "attempted",
) => records.reduce((sum, item) => sum + Math.max(0, item[key] || 0), 0);

function editorFields(
  kind: Kind,
  domain: LearningDomain,
  items: Item[],
  initial?: Partial<Item>,
): FieldDef[] {
  const topics = items.filter(
    (item) => item.kind === "topic" && item.domain === domain,
  );
  const topic: FieldDef = {
    key: "topicId",
    label: "Roadmap topic",
    type: "select",
    options: [
      { value: "", label: "No linked topic" },
      ...topics.map((item) => ({ value: item.id, label: item.title })),
    ],
  };
  const tags: FieldDef = {
    key: "tags",
    label: "Tags",
    type: "tags",
    placeholder: "Separate tags with commas",
  };
  const revision: FieldDef = {
    key: "nextRevision",
    label: "Next revision",
    type: "date",
  };
  const url: FieldDef = {
    key: "url",
    label: "Resource / problem URL",
    type: "url",
    placeholder: "https://…",
  };
  if (kind === "topic")
    return [
      {
        key: "status",
        label: "Learning state",
        type: "select",
        options: options(TOPIC_STATES),
      },
      {
        key: "category",
        label: "Roadmap section",
        placeholder: "e.g. Foundations",
      },
      {
        key: "explanation",
        label: "Explanation",
        type: "textarea",
        full: true,
        placeholder: "Explain the idea in your own words. Markdown supported.",
      },
      {
        key: "examples",
        label: "Examples",
        type: "code",
        full: true,
        placeholder: "An example, a trace, or a useful code fragment",
      },
      url,
      revision,
      tags,
      { key: "order", label: "Position in roadmap", type: "number", min: 0 },
      { key: "favorite", label: "Bookmark this topic", type: "checkbox" },
      {
        key: "body",
        label: "Notes & additional links",
        type: "textarea",
        full: true,
        placeholder: "Markdown links: [Reference](https://…)",
      },
    ];
  if (kind === "snippet") {
    if (initial?.category === "playground")
      return [
        { key: "html", label: "HTML", type: "code", full: true },
        { key: "css", label: "CSS", type: "code", full: true },
        { key: "javascript", label: "JavaScript", type: "code", full: true },
        {
          key: "description",
          label: "Experiment notes",
          type: "textarea",
          full: true,
        },
        tags,
      ];
    return [
      {
        key: "language",
        label: "Language",
        type: "select",
        options: options(
          domain === "java"
            ? ["Java"]
            : [
                "HTML",
                "CSS",
                "JavaScript",
                "TypeScript",
                "JSX",
                "SQL",
                "Other",
              ],
        ),
      },
      {
        key: "category",
        label: "Collection",
        placeholder:
          domain === "java"
            ? "e.g. Collections, I/O, OOP"
            : "e.g. Layouts, Components, Patterns",
      },
      topic,
      tags,
      {
        key: "code",
        label: "Source code",
        type: "code",
        required: true,
        full: true,
      },
      {
        key: "explanation",
        label: "How it works",
        type: "textarea",
        full: true,
      },
      {
        key: "examples",
        label: "Usage example / expected output",
        type: "textarea",
        full: true,
      },
      { key: "url", label: "Reference URL", type: "url" },
      revision,
    ];
  }
  if (kind === "problem")
    return [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: options(PROBLEM_STATES),
      },
      {
        key: "difficulty",
        label: "Difficulty",
        type: "select",
        options: [{ value: "", label: "Unrated" }, ...options(DIFFICULTIES)],
      },
      {
        key: "solveMethod",
        label: "Solution assistance",
        type: "select",
        options: [
          {
            value: "unrecorded",
            label: "Not recorded · never assumed independent",
          },
          {
            value: "independent",
            label: "Solved independently · no hints or editorial",
          },
          { value: "hints", label: "Solved with hints" },
          { value: "editorial", label: "Editorial-assisted solution" },
        ],
      },
      {
        key: "platform",
        label: "Platform",
        placeholder: "LeetCode, Codeforces, a book…",
      },
      url,
      topic,
      tags,
      {
        key: "language",
        label: "Solution language",
        placeholder: "Java, C++, Python…",
      },
      { key: "date", label: "Last practiced / solved on", type: "date" },
      { key: "attempts", label: "Attempts", type: "number", min: 0 },
      {
        key: "actualMinutes",
        label: "Total time spent (minutes)",
        type: "number",
        min: 0,
      },
      {
        key: "approach",
        label: "Approach & reasoning",
        type: "textarea",
        full: true,
      },
      {
        key: "complexity",
        label: "Time & space complexity",
        placeholder: "Time O(n), space O(1)",
        full: true,
      },
      {
        key: "code",
        label: "Saved solution (not executed)",
        type: "code",
        full: true,
      },
      {
        key: "mistakes",
        label: "Mistakes & lessons",
        type: "textarea",
        full: true,
      },
      revision,
      { key: "body", label: "Additional notes", type: "textarea", full: true },
    ];
  if (kind === "practice")
    return [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: options(PRACTICE_STATES),
      },
      ...(domain === "cp"
        ? [
            {
              key: "category",
              label: "Practice type",
              type: "select",
              options: [
                { value: "practice", label: "Regular practice" },
                { value: "upsolve", label: "Contest upsolve" },
                { value: "virtual", label: "Virtual practice" },
              ],
            } as FieldDef,
            {
              key: "collection",
              label: "Related contest",
              type: "select",
              options: [
                { value: "", label: "Independent practice" },
                ...items
                  .filter(
                    (item) => item.kind === "contest" && item.domain === "cp",
                  )
                  .map((item) => ({ value: item.id, label: item.title })),
              ],
            } as FieldDef,
            { key: "platform", label: "Platform" } as FieldDef,
            {
              key: "value",
              label: "Problem rating (optional)",
              type: "number",
              min: 0,
            } as FieldDef,
          ]
        : []),
      topic,
      { key: "date", label: "Practice date", type: "date" },
      {
        key: "actualMinutes",
        label: "Time spent (minutes)",
        type: "number",
        min: 0,
      },
      { key: "attempts", label: "Attempts", type: "number", min: 0 },
      url,
      {
        key: "approach",
        label: "Exercise & approach",
        type: "textarea",
        full: true,
      },
      {
        key: "code",
        label: "Solution / snippet (not executed)",
        type: "code",
        full: true,
      },
      {
        key: "mistakes",
        label: "What went wrong?",
        type: "textarea",
        full: true,
      },
      {
        key: "reflection",
        label: "What will you try next?",
        type: "textarea",
        full: true,
      },
      revision,
      tags,
    ];
  if (kind === "contest")
    return [
      {
        key: "mode",
        label: "Contest format",
        type: "select",
        options: [
          { value: "live", label: "Live contest (manual tracking)" },
          { value: "virtual", label: "Virtual contest practice" },
        ],
      },
      {
        key: "platform",
        label: "Platform",
        placeholder: "Codeforces, AtCoder, CodeChef…",
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: options(CONTEST_STATES),
      },
      { key: "date", label: "Contest date", type: "date", required: true },
      { key: "startTime", label: "Start time (your local time)", type: "time" },
      { key: "duration", label: "Duration (minutes)", type: "number", min: 1 },
      { key: "url", label: "Contest URL", type: "url" },
      { key: "attempted", label: "Problems attempted", type: "number", min: 0 },
      { key: "solved", label: "Problems solved", type: "number", min: 0 },
      { key: "rank", label: "Final rank (manual)", type: "number", min: 1 },
      {
        key: "penalty",
        label: "Penalty / contest scoring units",
        type: "number",
        min: 0,
      },
      {
        key: "reflection",
        label: "Contest reflection & scoring rules",
        type: "textarea",
        full: true,
      },
      {
        key: "mistakes",
        label: "Mistakes to revisit",
        type: "textarea",
        full: true,
      },
      revision,
      tags,
    ];
  if (kind === "goal")
    return [
      {
        key: "category",
        label: "Measure",
        type: "select",
        options: [
          { value: "solves", label: "Completed practice problems" },
          { value: "minutes", label: "Practice minutes" },
          { value: "contests", label: "Completed contests" },
        ],
      },
      {
        key: "target",
        label: "Weekly target",
        type: "number",
        min: 1,
        required: true,
      },
      { key: "startDate", label: "Week starts", type: "date", required: true },
      { key: "targetDate", label: "Week ends", type: "date", required: true },
      {
        key: "description",
        label: "Your intention for the week",
        type: "textarea",
        full: true,
      },
    ];
  return [
    {
      key: "description",
      label: "What are you building?",
      type: "textarea",
      full: true,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: options(["idea", "active", "paused", "completed"]),
    },
    {
      key: "technologies",
      label: "Technologies",
      placeholder: "React, TypeScript, CSS…",
    },
    { key: "url", label: "Live site URL", type: "url" },
    { key: "repository", label: "Repository URL", type: "url" },
    { key: "targetDate", label: "Target date", type: "date" },
    tags,
    { key: "goals", label: "Learning goals", type: "textarea", full: true },
    { key: "body", label: "Project notes", type: "textarea", full: true },
  ];
}

function newRecord(kind: Kind, domain: LearningDomain): Partial<Item> {
  const week = weekBounds(today());
  const initial: Partial<Item> = { domain };
  if (kind === "topic")
    return { ...initial, status: "not started", category: "My roadmap" };
  if (kind === "snippet")
    return {
      ...initial,
      language: domain === "java" ? "Java" : "JavaScript",
      category: domain === "java" ? "My snippets" : "Patterns",
    };
  if (kind === "problem")
    return { ...initial, status: "not started", attempts: 0 };
  if (kind === "contest")
    return { ...initial, status: "planned", date: today() };
  if (kind === "practice")
    return {
      ...initial,
      status: "planned",
      date: today(),
      category: "practice",
      language: domain === "java" ? "Java" : undefined,
    };
  if (kind === "goal")
    return {
      ...initial,
      category: "solves",
      target: 5,
      startDate: week.start,
      targetDate: week.end,
      period: "weekly",
      status: "active",
    };
  return { ...initial, status: "idea" };
}

function ResourceLink({
  url,
  children = "Open resource",
}: {
  url?: string;
  children?: ReactNode;
}) {
  const href = safeUrl(url);
  return href ? (
    <a
      className="learning-resource"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={13} />
    </a>
  ) : null;
}

function CodeBlock({
  code,
  language = "java",
  compact = false,
}: {
  code: string;
  language?: string;
  compact?: boolean;
}) {
  const tokens = useMemo(() => tokenizeCode(code, language), [code, language]);
  return (
    <pre
      className={cx("learning-code", compact && "learning-code-compact")}
      tabIndex={0}
      aria-label={`${language} code example`}
    >
      <code>
        {tokens.map((token, i) => (
          <span className={`learning-token-${token.kind}`} key={i}>
            {token.text}
          </span>
        ))}
      </code>
    </pre>
  );
}

export default function Learning(props: {
  domain: LearningDomain;
  recordId?: string;
}) {
  return <LearningWorkspace key={props.domain} {...props} />;
}

function LearningWorkspace({
  domain,
  recordId,
}: {
  domain: LearningDomain;
  recordId?: string;
}) {
  const { items, ready, readOnly, touch, remove } = useStore();
  const info = DOMAIN_INFO[domain];
  const [tab, setTab] = useState<string>(info.defaultTab);
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [curriculum, setCurriculum] = useState(false);
  const handledRecord = useRef("");
  const records = items.filter(
    (item) => item.domain === domain && !item.archived,
  );
  const topics = records.filter((item) => item.kind === "topic");
  const mastered = topics.filter((item) => item.status === "mastered").length;
  const openEditor: OpenEditor = (kind, initial, title) =>
    setEditor({
      kind,
      initial: { ...newRecord(kind, domain), ...initial },
      title,
    });
  const closeEditor = () => {
    setEditor(null);
    if (recordId) navigate(info.route);
  };

  useEffect(() => {
    if (!recordId) {
      handledRecord.current = "";
      return;
    }
    if (!ready || handledRecord.current === recordId) return;
    if (recordId === "new") {
      const kind =
        domain === "dsa"
          ? "problem"
          : domain === "cp"
            ? "contest"
            : domain === "java"
              ? "topic"
              : "snippet";
      setEditor({ kind, initial: newRecord(kind, domain) });
      setTab(
        kind === "topic"
          ? "roadmap"
          : kind === "problem"
            ? "problems"
            : kind === "contest"
              ? "contests"
              : "snippets",
      );
      handledRecord.current = recordId;
      return;
    }
    const selected = items.find(
      (item) => item.id === recordId && item.domain === domain,
    );
    if (!selected) {
      setEditor(null);
      return;
    }
    handledRecord.current = recordId;
    setTab(tabForRecord(domain, selected));
    // These lists already resolve hash IDs through the shared CRUD component.
    if (
      selected.kind !== "practice" &&
      selected.kind !== "goal" &&
      !(selected.kind === "snippet" && selected.category === "playground")
    ) {
      setEditor({ kind: selected.kind, initial: selected });
    }
    touch(selected.id);
  }, [domain, recordId, ready, items, touch]);

  const props: RecordProps = {
    domain,
    records,
    openEditor,
    onDelete: setDeleting,
  };
  return (
    <div className={`learning-page learning-${domain}`}>
      <PageHeader
        eyebrow={info.eyebrow}
        title={info.title}
        description={info.description}
        actions={
          <Button onClick={() => setCurriculum(true)} disabled={readOnly}>
            <BookOpen size={15} /> Add curriculum
          </Button>
        }
      />
      {ready &&
        recordId &&
        recordId !== "new" &&
        !items.some(
          (item) => item.id === recordId && item.domain === domain,
        ) && (
          <div className="learning-record-notice" role="status">
            <span>This record is no longer available in this workspace.</span>
            <Button variant="ghost" onClick={() => navigate(info.route)}>
              Back to workspace <ArrowRight size={13} />
            </Button>
          </div>
        )}
      <div className="learning-track-strip">
        <div className="learning-track-mark">
          {domain === "java" ? (
            <Terminal size={19} />
          ) : domain === "dsa" ? (
            <Layers3 size={19} />
          ) : domain === "cp" ? (
            <Trophy size={19} />
          ) : (
            <Code2 size={19} />
          )}
        </div>
        <div className="learning-track-copy">
          <span className="learning-kicker">
            YOUR LEARNING TRACK · {info.number}
          </span>
          <strong>
            {topics.length
              ? `${mastered} of ${topics.length} topics mastered`
              : "Your next chapter starts here"}
          </strong>
        </div>
        <div className="learning-track-progress">
          <Progress
            value={percent(mastered, topics.length)}
            label="Roadmap mastery"
          />
          <span>{percent(mastered, topics.length)}% mastered</span>
        </div>
        <div className="learning-track-note">
          <span className="learning-live-dot" />
          {domain === "cp"
            ? "Manually tracked. Intentionally practiced."
            : "Small steps. Lasting understanding."}
        </div>
      </div>
      <Tabs
        options={info.tabs.map((option) => ({ ...option }))}
        value={tab}
        onChange={(value) => {
          setTab(value);
          if (recordId) navigate(info.route);
        }}
      />
      <div className="learning-tab-content" key={`${tab}-${recordId || ""}`}>
        {tab === "roadmap" && (
          <Roadmap {...props} onCurriculum={() => setCurriculum(true)} />
        )}
        {tab === "snippets" && <SnippetLibrary {...props} />}
        {tab === "practice" && <PracticeWorkspace {...props} />}
        {tab === "problems" && <ProblemTracker {...props} />}
        {tab === "revisions" && (
          <RevisionQueue
            records={records.filter((item) => item.kind === "problem")}
            openEditor={openEditor}
          />
        )}
        {tab === "calendar" && (
          <PracticeCalendar
            records={records.filter((item) => item.kind === "problem")}
            openEditor={openEditor}
          />
        )}
        {tab === "contests" && <ContestWorkspace {...props} />}
        {tab === "goals" && <WeeklyGoals {...props} />}
        {tab === "schedule" && (
          <RecordManager
            kind="event"
            title="Protect time for practice"
            description="Weekly time blocks also appear in the main planner, where calendar views and conflict checks keep the whole week connected."
            fields={eventFields(items)}
            defaults={{
              domain: "cp",
              category: "time-block",
              status: "scheduled",
              recurrence: "weekly",
              date: today(),
              startTime: "18:00",
              endTime: "19:00",
              duration: 60,
            }}
            filter={(item) => item.domain === "cp"}
            statuses={["scheduled", "completed", "cancelled"]}
            empty="Give deliberate practice a regular place in your week."
          />
        )}
        {tab === "playground" && (
          <Playground
            records={records.filter(
              (item) =>
                item.kind === "snippet" && item.category === "playground",
            )}
            recordId={recordId}
            onDelete={setDeleting}
          />
        )}
        {tab === "projects" && <WebProjects {...props} />}
      </div>
      {editor && (
        <ItemEditor
          key={
            editor.initial.id ||
            `${editor.kind}-${editor.initial.category || ""}`
          }
          kind={editor.kind}
          initial={editor.initial}
          fields={editorFields(editor.kind, domain, items, editor.initial)}
          onClose={closeEditor}
          title={editor.title}
        />
      )}
      {curriculum && (
        <CurriculumPicker
          domain={domain}
          topics={topics}
          onClose={() => setCurriculum(false)}
          onAdded={() => {
            setCurriculum(false);
            setTab("roadmap");
            if (recordId) navigate(info.route);
          }}
        />
      )}
      {deleting && (
        <Confirm
          title={`Delete “${deleting.title}”?`}
          message="This record will be removed from this workspace. Export a backup in Settings if you want to keep a copy."
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            remove(deleting.id);
            setDeleting(null);
            if (recordId === deleting.id) navigate(info.route);
          }}
        />
      )}
    </div>
  );
}

function CurriculumPicker({
  domain,
  topics,
  onClose,
  onAdded,
}: {
  domain: LearningDomain;
  topics: Item[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const { create, notify, readOnly } = useStore();
  const existing = new Set(
    topics.map((item) => item.title.trim().toLowerCase()),
  );
  const templates = curriculumFor(domain);
  const available = templates.filter(
    (item) => !existing.has(item.title!.toLowerCase()),
  );
  const [selected, setSelected] = useState(
    () => new Set(available.map((item) => item.title!)),
  );
  const groups = [...new Set(templates.map((item) => item.category!))];
  const add = () => {
    const chosen = available.filter((item) => selected.has(item.title!));
    const offset = Math.max(-1, ...topics.map((item) => item.order ?? 0)) + 1;
    chosen.forEach((item, index) =>
      create("topic", { ...item, order: offset + index }),
    );
    notify(
      `Added ${chosen.length} ${chosen.length === 1 ? "topic" : "topics"} to your roadmap.`,
      "success",
    );
    onAdded();
  };
  return (
    <Modal
      wide
      title={`Build your ${domain === "cp" ? "competitive programming" : domain === "dsa" ? "DSA" : domain === "java" ? "Java" : "web"} curriculum`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={readOnly || !selected.size}
            onClick={add}
          >
            <Plus size={15} />
            Add {selected.size} topics
          </Button>
        </>
      }
    >
      <p className="muted">
        A starting structure, not a fixed syllabus. Choose topics to add, then
        rename, rearrange, or remove anything. Each begins as “not started” with
        an explanation, example, and reference.
      </p>
      <div className="learning-selection-bar">
        <span>
          {selected.size} selected · {templates.length - available.length}{" "}
          already in your roadmap
        </span>
        <Button
          variant="ghost"
          onClick={() =>
            setSelected(
              new Set(
                selected.size === available.length
                  ? []
                  : available.map((item) => item.title!),
              ),
            )
          }
          disabled={!available.length}
        >
          {selected.size === available.length
            ? "Clear selection"
            : "Select all available"}
        </Button>
      </div>
      <div className="learning-curriculum-groups">
        {groups.map((group) => (
          <div key={group} className="learning-curriculum-group">
            <h3>{group}</h3>
            {templates
              .filter((item) => item.category === group)
              .map((item) => {
                const exists = existing.has(item.title!.toLowerCase());
                return (
                  <label
                    key={item.title}
                    className={cx(
                      "learning-curriculum-option",
                      exists && "is-existing",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={exists || selected.has(item.title!)}
                      disabled={exists}
                      onChange={() =>
                        setSelected((previous) => {
                          const next = new Set(previous);
                          if (next.has(item.title!)) next.delete(item.title!);
                          else next.add(item.title!);
                          return next;
                        })
                      }
                    />
                    <span>
                      {item.title}
                      {exists && <small>Already added</small>}
                    </span>
                  </label>
                );
              })}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function Roadmap({
  domain,
  records,
  openEditor,
  onDelete,
  onCurriculum,
}: RecordProps & { onCurriculum: () => void }) {
  const { update, readOnly, items } = useStore();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [bookmarked, setBookmarked] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const topics = records
    .filter((item) => item.kind === "topic")
    .sort(
      (a, b) =>
        (a.order ?? 9999) - (b.order ?? 9999) ||
        a.createdAt.localeCompare(b.createdAt),
    );
  const filtered = topics.filter(
    (item) =>
      (state === "all" || (item.status || "not started") === state) &&
      (!bookmarked || item.favorite) &&
      `${item.title} ${item.category || ""} ${item.explanation || ""} ${(item.tags || []).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const groups = [
    ...new Set(filtered.map((item) => item.category || "My roadmap")),
  ];
  const reorder = (item: Item, direction: -1 | 1) => {
    const group = topics.filter(
      (topic) =>
        (topic.category || "My roadmap") === (item.category || "My roadmap"),
    );
    const target =
      group[group.findIndex((topic) => topic.id === item.id) + direction];
    if (!target) return;
    const all = [...topics];
    const from = all.findIndex((topic) => topic.id === item.id);
    const to = all.findIndex((topic) => topic.id === target.id);
    [all[from], all[to]] = [all[to], all[from]];
    all.forEach((topic, order) => {
      if (topic.order !== order) update(topic.id, { order });
    });
  };
  return (
    <div className="stack learning-roadmap">
      <div className="learning-section-heading">
        <div>
          <h2>Your path, your pace.</h2>
          <p>Learn it. Apply it. Make it stick.</p>
        </div>
        <Button
          variant="primary"
          disabled={readOnly}
          onClick={() =>
            openEditor("topic", {
              order: Math.max(-1, ...topics.map((item) => item.order ?? 0)) + 1,
            })
          }
        >
          <Plus size={15} />
          Add topic
        </Button>
      </div>
      {topics.length > 0 && (
        <div className="learning-state-summary">
          {TOPIC_STATES.map((status) => (
            <button
              key={status}
              type="button"
              className={cx(
                "learning-state-chip",
                state === status && "is-selected",
              )}
              onClick={() => setState(state === status ? "all" : status)}
              aria-pressed={state === status}
            >
              <span
                className={`learning-state-dot state-${status.replaceAll(" ", "-")}`}
              />
              <span>{labels(status)}</span>
              <strong>
                {
                  topics.filter(
                    (item) => (item.status || "not started") === status,
                  ).length
                }
              </strong>
            </button>
          ))}
        </div>
      )}
      {topics.length > 0 && (
        <div className="learning-toolbar">
          <label className="learning-search">
            <Search size={16} />
            <input
              aria-label="Search roadmap topics"
              placeholder="Find a topic, idea, or tag…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            aria-label="Filter by learning state"
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            <option value="all">All learning states</option>
            {TOPIC_STATES.map((value) => (
              <option key={value} value={value}>
                {labels(value)}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            aria-pressed={bookmarked}
            onClick={() => setBookmarked(!bookmarked)}
          >
            <Flag size={14} />
            {bookmarked ? "Bookmarked only" : "Bookmarks"}
          </Button>
          <span className="muted small">{filtered.length} topics</span>
        </div>
      )}
      {!topics.length ? (
        <Empty
          icon={<BookOpen size={30} />}
          title="A roadmap you can make your own."
          description="Add a curated curriculum or start with one topic. Your progress comes only from the work you record."
          action={
            <Button
              variant="primary"
              onClick={onCurriculum}
              disabled={readOnly}
            >
              <Sparkles size={15} />
              Choose a curriculum
            </Button>
          }
        />
      ) : !filtered.length ? (
        <Empty
          title="No topics match."
          description="Try another search or learning state."
          action={
            <Button
              onClick={() => {
                setQuery("");
                setState("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        groups.map((group, groupIndex) => {
          const groupTopics = filtered.filter(
            (item) => (item.category || "My roadmap") === group,
          );
          const complete = groupTopics.filter(
            (item) => item.status === "mastered",
          ).length;
          const siblings = topics.filter(
            (item) => (item.category || "My roadmap") === group,
          );
          return (
            <section className="learning-roadmap-section" key={group}>
              <div className="learning-roadmap-heading">
                <span className="learning-section-number">
                  {String(groupIndex + 1).padStart(2, "0")}
                </span>
                <h3>{group}</h3>
                <span>
                  {complete}/{groupTopics.length} mastered
                </span>
                <div className="learning-mini-progress">
                  <i
                    style={{
                      width: `${percent(complete, groupTopics.length)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="learning-topics">
                {groupTopics.map((item) => {
                  const isExpanded = expanded.has(item.id);
                  const position = siblings.findIndex(
                    (topic) => topic.id === item.id,
                  );
                  return (
                    <article
                      className={cx(
                        "learning-topic",
                        item.status === "mastered" && "is-mastered",
                        isExpanded && "is-open",
                      )}
                      key={item.id}
                    >
                      <div className="learning-topic-row">
                        <div
                          className={`learning-topic-node state-${(item.status || "not started").replaceAll(" ", "-")}`}
                        >
                          {item.status === "mastered" ? (
                            <Check size={13} />
                          ) : (
                            <span />
                          )}
                        </div>
                        <button
                          className="learning-topic-title"
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() =>
                            setExpanded((previous) => {
                              const next = new Set(previous);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              return next;
                            })
                          }
                        >
                          <strong>{item.title}</strong>
                          {item.explanation && <span>{item.explanation}</span>}
                        </button>
                        {item.nextRevision && (
                          <span
                            className={cx(
                              "learning-review-date",
                              item.nextRevision <= today() && "is-due",
                            )}
                          >
                            <RotateCcw size={11} />
                            {formatDate(item.nextRevision)}
                          </span>
                        )}
                        <select
                          className="learning-status-select"
                          aria-label={`Learning state of ${item.title}`}
                          value={item.status || "not started"}
                          disabled={readOnly}
                          onChange={(event) =>
                            update(item.id, { status: event.target.value })
                          }
                        >
                          {TOPIC_STATES.map((status) => (
                            <option key={status} value={status}>
                              {labels(status)}
                            </option>
                          ))}
                        </select>
                        <button
                          className="icon-button"
                          aria-label={`Edit ${item.title}`}
                          title="Edit topic"
                          onClick={() => openEditor("topic", item)}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="learning-topic-details">
                          {item.explanation && (
                            <Markdown>{item.explanation}</Markdown>
                          )}
                          {item.examples && (
                            <div>
                              <div className="learning-detail-label">
                                EXAMPLE / MENTAL MODEL
                              </div>
                              <CodeBlock
                                code={item.examples}
                                language={
                                  domain === "java" ? "java" : "javascript"
                                }
                              />
                            </div>
                          )}
                          {item.body && <Markdown>{item.body}</Markdown>}
                          {items.some(
                            (task) =>
                              task.kind === "task" && task.topicId === item.id,
                          ) && (
                            <div className="stack-sm">
                              <span className="learning-detail-label">
                                LINKED PRACTICE TASKS
                              </span>
                              {items
                                .filter(
                                  (task) =>
                                    task.kind === "task" &&
                                    task.topicId === item.id,
                                )
                                .map((task) => (
                                  <Button
                                    key={task.id}
                                    variant="ghost"
                                    onClick={() => navigate("planner", task.id)}
                                  >
                                    <ArrowUpRight size={13} />
                                    {task.title}
                                    <Badge>{task.status || "todo"}</Badge>
                                  </Button>
                                ))}
                            </div>
                          )}
                          {!!item.tags?.length && (
                            <div className="row">
                              <Button
                                variant="ghost"
                                disabled={readOnly}
                                aria-pressed={Boolean(item.favorite)}
                                onClick={() =>
                                  update(item.id, { favorite: !item.favorite })
                                }
                              >
                                <Flag size={14} />
                                {item.favorite ? "Bookmarked" : "Bookmark"}
                              </Button>
                              {item.tags.map((tag) => (
                                <Badge key={tag}>{tag}</Badge>
                              ))}
                            </div>
                          )}
                          <div className="learning-topic-footer">
                            <ResourceLink url={item.url}>
                              Learning reference
                            </ResourceLink>
                            <div className="row">
                              <Button
                                variant="ghost"
                                disabled={
                                  readOnly ||
                                  position === 0 ||
                                  state !== "all" ||
                                  !!query
                                }
                                onClick={() => reorder(item, -1)}
                                aria-label={`Move ${item.title} up`}
                              >
                                <ArrowUp size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                disabled={
                                  readOnly ||
                                  position === siblings.length - 1 ||
                                  state !== "all" ||
                                  !!query
                                }
                                onClick={() => reorder(item, 1)}
                                aria-label={`Move ${item.title} down`}
                              >
                                <ArrowDown size={14} />
                              </Button>
                              <Button onClick={() => openEditor("topic", item)}>
                                Edit topic
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => onDelete(item)}
                                disabled={readOnly}
                                aria-label={`Delete ${item.title}`}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
      {domain === "java" && (
        <div className="learning-footnote">
          <Terminal size={14} />
          Java examples are for reading and copying. Java code is not executable
          in this workspace.
        </div>
      )}
    </div>
  );
}

function SnippetLibrary({
  domain,
  records,
  openEditor,
  onDelete,
}: RecordProps) {
  const { notify, readOnly } = useStore();
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const snippets = records
    .filter((item) => item.kind === "snippet" && item.category !== "playground")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const collections = [
    ...new Set(snippets.map((item) => item.category || "Unsorted")),
  ];
  const filtered = snippets.filter(
    (item) =>
      (collection === "all" || (item.category || "Unsorted") === collection) &&
      `${item.title} ${item.code || ""} ${item.explanation || ""} ${(item.tags || []).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const selected =
    filtered.find((item) => item.id === selectedId) || filtered[0];
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      notify("Snippet copied.", "success");
    } catch {
      notify(
        "Clipboard access is unavailable. Select the code to copy it.",
        "error",
      );
    }
  };
  return (
    <div className="stack">
      <div className="learning-section-heading">
        <div>
          <h2>
            {domain === "java"
              ? "A library that thinks like you."
              : "Good patterns are worth keeping."}
          </h2>
          <p>
            {domain === "java"
              ? "Reusable ideas, explained in your own words. Java code is not executable here."
              : "Save the layouts, interactions, and techniques you want to use again."}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => openEditor("snippet")}
          disabled={readOnly}
        >
          <Plus size={15} />
          Save a snippet
        </Button>
      </div>
      <div className="learning-toolbar">
        <label className="learning-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search snippets"
            placeholder="Search code, titles, and tags…"
          />
        </label>
        <select
          value={collection}
          onChange={(event) => setCollection(event.target.value)}
          aria-label="Filter snippet collection"
        >
          <option value="all">All collections</option>
          {collections.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <Badge>{snippets.length} saved</Badge>
      </div>
      {!snippets.length ? (
        <Empty
          icon={<Code2 size={30} />}
          title="Your personal code bookshelf."
          description="Save a snippet with its explanation and a usage example. Every entry here is one you choose to keep."
          action={
            <Button
              variant="primary"
              disabled={readOnly}
              onClick={() => openEditor("snippet")}
            >
              <Plus size={15} />
              Create your first snippet
            </Button>
          }
        />
      ) : !filtered.length ? (
        <Empty
          title="No snippets match."
          action={
            <Button
              onClick={() => {
                setQuery("");
                setCollection("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="learning-snippet-layout">
          <div
            className="learning-snippet-list"
            role="list"
            aria-label="Saved snippets"
          >
            {filtered.map((item) => (
              <button
                role="listitem"
                type="button"
                className={cx(
                  "learning-snippet-card",
                  selected?.id === item.id && "is-selected",
                )}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                aria-pressed={selected?.id === item.id}
              >
                <span className="learning-snippet-card-top">
                  <Code2 size={16} />
                  <span>
                    {item.language || (domain === "java" ? "Java" : "Code")}
                  </span>
                  <ChevronRight size={14} />
                </span>
                <strong>{item.title}</strong>
                <span className="learning-snippet-collection">
                  {item.category || "Unsorted"}
                </span>
                <span className="learning-snippet-preview">
                  {item.code?.split("\n").slice(0, 3).join("\n") ||
                    "No source saved"}
                </span>
                <span className="learning-snippet-date">
                  Updated {formatDate(item.updatedAt)}
                </span>
              </button>
            ))}
          </div>
          {selected && (
            <Panel className="learning-snippet-detail">
              <div className="learning-snippet-detail-head">
                <div>
                  <div className="learning-kicker">
                    {selected.category || "MY LIBRARY"}
                  </div>
                  <h3>{selected.title}</h3>
                </div>
                <div className="row">
                  <Button
                    variant="ghost"
                    onClick={() => copy(selected.code || "")}
                    aria-label={`Copy ${selected.title}`}
                  >
                    <Copy size={15} />
                  </Button>
                  <Button onClick={() => openEditor("snippet", selected)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onDelete(selected)}
                    disabled={readOnly}
                    aria-label={`Delete ${selected.title}`}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
              <div className="learning-code-header">
                <span>
                  <span className="learning-code-dot" />
                  {selected.language || "Source code"}
                </span>
                <span>
                  {domain === "java"
                    ? "READ ONLY · NOT EXECUTABLE"
                    : "SAVED SOURCE · NOT EXECUTED"}
                </span>
              </div>
              <CodeBlock
                code={selected.code || "// No code saved yet."}
                language={selected.language || "java"}
              />
              <div className="learning-snippet-notes">
                {selected.explanation && (
                  <div>
                    <h4>How it works</h4>
                    <Markdown>{selected.explanation}</Markdown>
                  </div>
                )}
                {selected.examples && (
                  <div>
                    <h4>Example / expected output</h4>
                    <CodeBlock
                      code={selected.examples}
                      language={selected.language || "java"}
                    />
                  </div>
                )}
                {!!selected.tags?.length && (
                  <div className="row">
                    {selected.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>
                )}
                <ResourceLink url={selected.url}>View reference</ResourceLink>
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

function PracticeWorkspace({ domain, records, openEditor }: RecordProps) {
  const { items, readOnly } = useStore();
  const [view, setView] = useState("log");
  const practice = records.filter((item) => item.kind === "practice");
  const done = practice.filter((item) => item.status === "completed");
  const mistakes = practice.filter((item) => item.mistakes?.trim());
  const upsolves = practice.filter(
    (item) => item.category === "upsolve" && item.status !== "completed",
  );
  return (
    <div className="stack">
      <div className="learning-metrics-grid">
        <Stat
          label="Practice entries"
          value={practice.length}
          icon={<Terminal size={16} />}
        />
        <Stat
          label="Completed"
          value={done.length}
          icon={<CheckCheck size={16} />}
        />
        <Stat
          label="Minutes practiced"
          value={numberTotal(practice, "actualMinutes")}
          hint="Time you have logged"
          icon={<Target size={16} />}
        />
        <Stat
          label={domain === "java" ? "Mistakes captured" : "Pending upsolves"}
          value={domain === "java" ? mistakes.length : upsolves.length}
          icon={<RotateCcw size={16} />}
        />
      </div>
      <div
        className="learning-view-toggle"
        role="group"
        aria-label="Practice views"
      >
        {[
          { id: "log", label: "Practice log" },
          { id: "mistakes", label: "Mistake notebook" },
          { id: "reviews", label: "Revision queue" },
          ...(domain === "cp"
            ? [
                { id: "upsolve", label: "Upsolve queue" },
                { id: "weak", label: "Weak topics" },
              ]
            : []),
        ].map((option) => (
          <button
            key={option.id}
            className={cx(view === option.id && "is-active")}
            onClick={() => setView(option.id)}
            aria-pressed={view === option.id}
          >
            {option.label}
          </button>
        ))}
      </div>
      {view === "log" && (
        <RecordManager
          kind="practice"
          title={
            domain === "java"
              ? "Practice, with a purpose."
              : "Train beyond the contest."
          }
          description={
            domain === "java"
              ? "Log an exercise, your approach, and what you learned. Saved Java is not executable."
              : "Add regular practice, virtual practice, or a problem to upsolve. Results are entered manually."
          }
          fields={editorFields("practice", domain, items)}
          filter={(item) => item.domain === domain && !item.archived}
          defaults={newRecord("practice", domain)}
          statuses={PRACTICE_STATES}
          empty="Your first deliberate practice session starts here. Record an exercise and come back to the lesson."
        />
      )}
      {view === "weak" && (
        <Panel
          title="Turn weak spots into next steps"
          action={<Badge>Local rules</Badge>}
        >
          <p className="muted small">
            Topics marked revising, or linked to a practice entry with a
            recorded mistake. This is a transparent checklist, not a skill
            prediction.
          </p>
          {records.filter(
            (topic) =>
              topic.kind === "topic" &&
              (topic.status === "revising" ||
                practice.some(
                  (p) => p.topicId === topic.id && p.mistakes?.trim(),
                )),
          ).length ? (
            <div className="stack-sm" style={{ marginTop: 18 }}>
              {records
                .filter(
                  (topic) =>
                    topic.kind === "topic" &&
                    (topic.status === "revising" ||
                      practice.some(
                        (p) => p.topicId === topic.id && p.mistakes?.trim(),
                      )),
                )
                .map((topic) => (
                  <div className="list-row" key={topic.id}>
                    <div className="record-main">
                      <strong>{topic.title}</strong>
                      <span className="small muted">
                        {
                          practice.filter(
                            (p) => p.topicId === topic.id && p.mistakes?.trim(),
                          ).length
                        }{" "}
                        linked mistake entries · {topic.status}
                      </span>
                    </div>
                    <Button onClick={() => openEditor("topic", topic)}>
                      Review topic
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={readOnly}
                      onClick={() =>
                        openEditor("practice", { topicId: topic.id })
                      }
                    >
                      Plan practice
                    </Button>
                  </div>
                ))}
            </div>
          ) : (
            <Empty
              title="No weak topics flagged yet"
              description="Mark a roadmap topic as revising, or link a mistake in your practice log. Your next steps will appear here."
            />
          )}
        </Panel>
      )}
      {view === "mistakes" && (
        <div className="stack">
          <div className="learning-section-heading">
            <div>
              <h2>The mistakes are the material.</h2>
              <p>A useful record of what to notice next time.</p>
            </div>
          </div>
          {!mistakes.length ? (
            <Empty
              title="No mistakes recorded yet."
              description="Add a lesson to the “What went wrong?” field in a practice entry."
              action={
                <Button
                  disabled={readOnly}
                  onClick={() => openEditor("practice")}
                >
                  <Plus size={15} />
                  Record practice
                </Button>
              }
            />
          ) : (
            <div className="learning-mistake-grid">
              {mistakes.map((item) => (
                <Panel key={item.id} className="learning-mistake-card">
                  <div className="learning-mistake-label">
                    <RotateCcw size={14} />
                    <span>{formatDate(item.date)}</span>
                    <Badge tone={stateTone(item.status)}>
                      {labels(item.status)}
                    </Badge>
                  </div>
                  <h3>{item.title}</h3>
                  <Markdown>{item.mistakes!}</Markdown>
                  {item.reflection && (
                    <div className="learning-next-time">
                      <strong>Next time</strong>
                      <Markdown>{item.reflection}</Markdown>
                    </div>
                  )}
                  <div className="row-between">
                    <span className="muted small">
                      {item.nextRevision
                        ? `Review ${formatDate(item.nextRevision)}`
                        : "No review scheduled"}
                    </span>
                    <Button onClick={() => openEditor("practice", item)}>
                      Open entry <ArrowUpRight size={13} />
                    </Button>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}
      {view === "reviews" && (
        <RevisionQueue records={practice} openEditor={openEditor} />
      )}
      {view === "upsolve" && (
        <Panel
          title="Unfinished business"
          action={
            <Button
              onClick={() => openEditor("practice", { category: "upsolve" })}
              disabled={readOnly}
            >
              <Plus size={14} />
              Add upsolve
            </Button>
          }
        >
          <p className="muted small">
            One record per problem. Link the contest, work through the idea, and
            mark the entry completed when you have solved it.
          </p>
          {!upsolves.length ? (
            <Empty
              title="Your upsolve queue is clear."
              description="Add a missed problem from a contest or create one here."
            />
          ) : (
            <div className="learning-compact-list">
              {upsolves.map((item) => (
                <div className="learning-compact-row" key={item.id}>
                  <span className="learning-outline-icon">
                    <Flag size={16} />
                  </span>
                  <div>
                    <button
                      className="learning-text-button"
                      onClick={() => openEditor("practice", item)}
                    >
                      {item.title}
                    </button>
                    <span className="muted small">
                      {items.find((contest) => contest.id === item.collection)
                        ?.title || "Independent practice"}
                      {item.value ? ` · ${item.value} rating` : ""}
                    </span>
                  </div>
                  <Badge tone={stateTone(item.status)}>
                    {labels(item.status)}
                  </Badge>
                  <ResourceLink url={item.url}>Problem</ResourceLink>
                  <Button onClick={() => openEditor("practice", item)}>
                    Continue <ArrowRight size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function RevisionQueue({
  records,
  openEditor,
}: {
  records: Item[];
  openEditor: OpenEditor;
}) {
  const { update, create, notify, readOnly } = useStore();
  const [scope, setScope] = useState("due");
  const [interval, setInterval] = useState(7);
  const queue = revisionItems(records);
  const shown = queue.filter(
    (entry) => scope === "all" || entry.due || !entry.item.nextRevision,
  );
  const review = (item: Item) => {
    update(item.id, { nextRevision: addDays(today(), interval) });
    create("review", {
      title: `Review: ${item.title}`,
      domain: item.domain,
      problemId: item.kind === "problem" ? item.id : undefined,
      topicId: item.topicId,
      collection: item.id,
      date: today(),
      status: "completed",
    });
    notify(
      `Review recorded. Next revision ${formatDate(addDays(today(), interval))}.`,
      "success",
    );
  };
  return (
    <div className="stack">
      <div className="learning-section-heading">
        <div>
          <h2>Understanding needs a second visit.</h2>
          <p>
            Scheduled revisions and lessons worth revisiting. Mark a review only
            after you do the work.
          </p>
        </div>
        <Badge tone="warning">
          {queue.filter((entry) => entry.due).length} due
        </Badge>
      </div>
      <div className="learning-toolbar">
        <select
          aria-label="Revision queue scope"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
        >
          <option value="due">Due & unscheduled</option>
          <option value="all">All planned revisions</option>
        </select>
        <label className="learning-inline-field">
          After a review, remind me in{" "}
          <select
            value={interval}
            aria-label="Days until next revision"
            onChange={(event) => setInterval(Number(event.target.value))}
          >
            {[1, 3, 7, 14, 30].map((days) => (
              <option key={days} value={days}>
                {days} {days === 1 ? "day" : "days"}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!shown.length ? (
        <Empty
          icon={<CheckCheck size={30} />}
          title={
            queue.length
              ? "You’re caught up for now."
              : "Give your learning another pass."
          }
          description={
            queue.length
              ? "Future reviews are waiting in All planned revisions."
              : "Set a revision date or record a mistake on a problem or practice entry to bring it here."
          }
          action={
            queue.length ? (
              <Button onClick={() => setScope("all")}>
                View upcoming reviews
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="learning-revision-list">
          {shown.map(({ item, due }) => (
            <Panel className="learning-revision-card" key={item.id}>
              <div className="learning-revision-icon">
                <RotateCcw size={19} />
              </div>
              <div className="learning-revision-copy">
                <div className="row">
                  <h3>{item.title}</h3>
                  <Badge tone={due ? "warning" : "neutral"}>
                    {item.nextRevision
                      ? `${due ? "Due" : "Review"} ${formatDate(item.nextRevision)}`
                      : "Unscheduled"}
                  </Badge>
                </div>
                <p>
                  {item.mistakes ||
                    item.approach ||
                    "Revisit the approach and explain it without looking at your solution."}
                </p>
                <div className="row">
                  <Badge>{item.difficulty || labels(item.status)}</Badge>
                  {item.platform && (
                    <span className="muted small">{item.platform}</span>
                  )}
                  <ResourceLink url={item.url}>Open problem</ResourceLink>
                </div>
              </div>
              <div className="learning-revision-actions">
                <Button onClick={() => openEditor(item.kind, item)}>
                  Review notes
                </Button>
                <Button
                  variant="primary"
                  disabled={readOnly}
                  onClick={() => review(item)}
                >
                  <Check size={14} />
                  Reviewed
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function ProblemTracker({ records, openEditor, onDelete }: RecordProps) {
  const { update, settings, setSettings, readOnly } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [topic, setTopic] = useState("all");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("list");
  const [filters, setFilters] = useState(false);
  const problems = records.filter((item) => item.kind === "problem");
  const topics = records.filter((item) => item.kind === "topic");
  const metrics = problemMetrics(problems);
  const platforms = [
    ...new Set(
      problems
        .map((item) => item.platform)
        .filter((value): value is string => !!value),
    ),
  ].sort();
  const dailyProblem = problems.find(
    (item) => item.id === settings.problemOfDay,
  );
  const filtered = problems
    .filter(
      (item) =>
        `${item.title} ${item.platform || ""} ${(item.tags || []).join(" ")} ${item.approach || ""} ${topics.find((candidate) => candidate.id === item.topicId)?.title || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (status === "all" || (item.status || "not started") === status) &&
        (difficulty === "all" || (item.difficulty || "") === difficulty) &&
        (platform === "all" || item.platform === platform) &&
        (topic === "all" || (item.topicId || "unassigned") === topic),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "difficulty"
          ? (DIFFICULTIES.indexOf(a.difficulty || "") < 0
              ? 3
              : DIFFICULTIES.indexOf(a.difficulty!)) -
            (DIFFICULTIES.indexOf(b.difficulty || "") < 0
              ? 3
              : DIFFICULTIES.indexOf(b.difficulty!))
          : sort === "attempts"
            ? (b.attempts || 0) - (a.attempts || 0)
            : sort === "time"
              ? (b.actualMinutes || 0) - (a.actualMinutes || 0)
              : sort === "revision"
                ? (a.nextRevision || "9999").localeCompare(
                    b.nextRevision || "9999",
                  )
                : b.createdAt.localeCompare(a.createdAt),
    );
  const activeFilters = [status, difficulty, platform, topic].filter(
    (value) => value !== "all",
  ).length;
  const clear = () => {
    setQuery("");
    setStatus("all");
    setDifficulty("all");
    setPlatform("all");
    setTopic("all");
  };
  const markSolved = (item: Item) =>
    update(item.id, {
      status: "solved",
      date: today(),
      completedAt: new Date().toISOString(),
      attempts: Math.max(1, item.attempts || 0),
    });
  const problemRow = (item: Item) => (
    <tr key={item.id}>
      <td>
        <button
          className={cx(
            "learning-solve-toggle",
            ["solved", "revised"].includes(item.status || "") && "is-solved",
          )}
          aria-label={
            ["solved", "revised"].includes(item.status || "")
              ? `${item.title} is solved; edit record`
              : `Mark ${item.title} solved`
          }
          title={
            ["solved", "revised"].includes(item.status || "")
              ? "Edit solved record"
              : "Mark solved today"
          }
          disabled={readOnly}
          onClick={() =>
            ["solved", "revised"].includes(item.status || "")
              ? openEditor("problem", item)
              : markSolved(item)
          }
        >
          {["solved", "revised"].includes(item.status || "") && (
            <Check size={12} />
          )}
        </button>
      </td>
      <td className="learning-problem-name">
        <button
          className="learning-text-button"
          onClick={() => openEditor("problem", item)}
        >
          {item.title}
        </button>
        <span>
          {topics.find((candidate) => candidate.id === item.topicId)?.title ||
            (item.tags || []).slice(0, 2).join(" · ") ||
            "No topic linked"}
          {item.platform ? ` · ${item.platform}` : ""}
        </span>
      </td>
      <td>
        <span
          className={`learning-difficulty difficulty-${(item.difficulty || "unrated").toLowerCase()}`}
        >
          {item.difficulty || "Unrated"}
        </span>
      </td>
      <td>
        <Badge tone={stateTone(item.status)}>{labels(item.status)}</Badge>
      </td>
      <td className="learning-table-number">{item.attempts ?? "—"}</td>
      <td className="learning-table-number">
        {item.actualMinutes != null ? `${item.actualMinutes}m` : "—"}
      </td>
      <td
        className={cx(
          "small",
          item.nextRevision &&
            item.nextRevision <= today() &&
            "learning-due-text",
        )}
      >
        {item.nextRevision ? formatDate(item.nextRevision) : "—"}
      </td>
      <td>
        <div className="row">
          <button
            className="icon-button"
            title="Edit problem"
            aria-label={`Edit ${item.title}`}
            onClick={() => openEditor("problem", item)}
          >
            <MoreHorizontal size={17} />
          </button>
          <button
            className="icon-button"
            title="Delete problem"
            aria-label={`Delete ${item.title}`}
            disabled={readOnly}
            onClick={() => onDelete(item)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
  return (
    <div className="stack">
      <div className="learning-metrics-grid">
        <Stat
          label="Problems solved"
          value={
            <>
              {metrics.solved}
              <span className="learning-stat-denominator">
                {" "}
                / {metrics.total}
              </span>
            </>
          }
          hint="From your saved problem records"
          icon={<CheckCheck size={16} />}
        />
        <Stat
          label="Problems attempted"
          value={metrics.attempted}
          hint="Includes solved and revising"
          icon={<Target size={16} />}
        />
        <Stat
          label="Solve rate"
          value={metrics.successRate === null ? "—" : `${metrics.successRate}%`}
          hint="Solved ÷ attempted problems"
          icon={<Layers3 size={16} />}
        />
        <Stat
          label="Ready to revisit"
          value={metrics.due}
          hint="Revision date is today or earlier"
          icon={<RotateCcw size={16} />}
        />
      </div>
      <Panel title="Independent solving, not just green ticks">
        <div className="problem-assistance-grid">
          {[
            ["Independent", metrics.independent],
            ["With hints", metrics.withHints],
            ["Editorial-assisted", metrics.editorialAssisted],
            ["Assistance unrecorded", metrics.assistanceUnrecorded],
            ["Attempted, unsolved", metrics.unsolved],
            ["Not attempted", metrics.unattempted],
          ].map(([label, count]) => (
            <div key={label}>
              <strong>{count}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="muted small">
          Set “Solution assistance” on each problem. Existing solves are
          unrecorded, never automatically independent. Revision and solve rate
          do not unlock readiness gates.
        </p>
      </Panel>
      <div className="learning-dsa-top">
        <Panel className="learning-daily-problem">
          <div className="learning-daily-label">
            <span className="learning-icon-tile">
              <Target size={18} />
            </span>
            <div>
              <span className="learning-kicker">YOUR PROBLEM OF THE DAY</span>
              <span className="muted small">
                Picked by you. No external feed.
              </span>
            </div>
            <Badge>Manual pick</Badge>
          </div>
          {dailyProblem ? (
            <>
              <h3>{dailyProblem.title}</h3>
              <div className="row">
                <span
                  className={`learning-difficulty difficulty-${(dailyProblem.difficulty || "").toLowerCase()}`}
                >
                  {dailyProblem.difficulty || "Unrated"}
                </span>
                <span className="muted small">
                  {dailyProblem.platform || "Your problem collection"}
                </span>
                <Badge tone={stateTone(dailyProblem.status)}>
                  {labels(dailyProblem.status)}
                </Badge>
              </div>
              <div className="learning-daily-actions">
                <Button
                  variant="primary"
                  onClick={() => openEditor("problem", dailyProblem)}
                >
                  Open problem <ArrowUpRight size={14} />
                </Button>
                <ResourceLink url={dailyProblem.url}>
                  Solve on platform
                </ResourceLink>
              </div>
            </>
          ) : (
            <>
              <h3>One good problem. Full attention.</h3>
              <p className="muted">
                Choose a problem from your collection to keep it in focus.
              </p>
            </>
          )}
          <label className="learning-daily-select">
            <span>
              {dailyProblem ? "Change your pick" : "Choose a saved problem"}
            </span>
            <select
              aria-label="Problem of the day"
              value={dailyProblem?.id || ""}
              disabled={readOnly || !problems.length}
              onChange={(event) =>
                setSettings({ problemOfDay: event.target.value || undefined })
              }
            >
              <option value="">
                {problems.length
                  ? "No problem selected"
                  : "Add a problem to get started"}
              </option>
              {problems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
        </Panel>
        <Panel className="learning-difficulty-panel">
          <div className="learning-panel-heading">
            <h3>Find your balance</h3>
            <span className="muted small">Solved by difficulty</span>
          </div>
          {metrics.difficulty.map((item) => (
            <div className="learning-difficulty-stat" key={item.name}>
              <div>
                <span
                  className={`learning-difficulty difficulty-${item.name.toLowerCase()}`}
                >
                  {item.name}
                </span>
                <strong>{item.total}</strong>
              </div>
              <Progress
                value={percent(item.total, metrics.solved)}
                label={`${item.name} solved`}
              />
            </div>
          ))}
          <div className="learning-difficulty-total">
            <span className="muted small">Logged problem-solving time</span>
            <strong>
              {metrics.minutes} <span>min</span>
            </strong>
          </div>
        </Panel>
      </div>
      <Panel className="learning-problem-panel">
        <div className="learning-section-heading">
          <div>
            <h2>Your problem collection</h2>
            <p>Keep the approach, not just the accepted submission.</p>
          </div>
          <Button
            variant="primary"
            disabled={readOnly}
            onClick={() => openEditor("problem")}
          >
            <Plus size={15} />
            Add problem
          </Button>
        </div>
        <div className="learning-toolbar">
          <label className="learning-search">
            <Search size={16} />
            <input
              aria-label="Search problems"
              value={query}
              placeholder="Search problems, patterns, tags…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <Button
            variant={filters ? "primary" : "secondary"}
            onClick={() => setFilters(!filters)}
            aria-expanded={filters}
          >
            <Filter size={14} />
            Filters{activeFilters ? ` (${activeFilters})` : ""}
          </Button>
          <select
            aria-label="Sort problems"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="newest">Newest added</option>
            <option value="title">Title A–Z</option>
            <option value="difficulty">Difficulty</option>
            <option value="attempts">Most attempts</option>
            <option value="time">Most time spent</option>
            <option value="revision">Next revision</option>
          </select>
          <div
            className="learning-layout-toggle"
            role="group"
            aria-label="Problem layout"
          >
            <button
              className={cx(view === "list" && "is-active")}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              aria-label="List view"
              title="List view"
            >
              <List size={17} />
            </button>
            <button
              className={cx(view === "topics" && "is-active")}
              onClick={() => setView("topics")}
              aria-pressed={view === "topics"}
              aria-label="Topic view"
              title="Topic view"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
        {filters && (
          <div className="learning-filter-grid">
            <Field label="Status">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">All statuses</option>
                {PROBLEM_STATES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="Difficulty">
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="all">All difficulties</option>
                {DIFFICULTIES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
                <option value="">Unrated</option>
              </select>
            </Field>
            <Field label="Platform">
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
              >
                <option value="all">All platforms</option>
                {platforms.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="Roadmap topic">
              <select
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
              >
                <option value="all">All topics</option>
                {topics.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
                <option value="unassigned">No linked topic</option>
              </select>
            </Field>
          </div>
        )}
        {!problems.length ? (
          <Empty
            icon={<Layers3 size={30} />}
            title="The first problem is a beginning."
            description="Record a problem, its approach, and the part that challenged you. Your real progress will take shape here."
            action={
              <Button
                onClick={() => openEditor("problem")}
                variant="primary"
                disabled={readOnly}
              >
                <Plus size={15} />
                Add your first problem
              </Button>
            }
          />
        ) : !filtered.length ? (
          <Empty
            title="No problems match your filters."
            action={<Button onClick={clear}>Clear filters</Button>}
          />
        ) : view === "list" ? (
          <div className="table-wrap learning-problem-table">
            <table>
              <thead>
                <tr>
                  <th aria-label="Solved" />
                  <th>Problem</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Time</th>
                  <th>Revision</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>{filtered.map(problemRow)}</tbody>
            </table>
          </div>
        ) : (
          <div className="learning-problem-groups">
            {[
              ...new Set(filtered.map((item) => item.topicId || "unassigned")),
            ].map((id) => {
              const group = filtered.filter(
                (item) => (item.topicId || "unassigned") === id,
              );
              const completed = group.filter((item) =>
                ["solved", "revised"].includes(item.status || ""),
              ).length;
              return (
                <div className="learning-problem-group" key={id}>
                  <div className="learning-panel-heading">
                    <h3>
                      {topics.find((item) => item.id === id)?.title ||
                        (id === "unassigned"
                          ? "No linked topic"
                          : "Removed topic")}
                    </h3>
                    <Badge>
                      {completed}/{group.length} solved
                    </Badge>
                  </div>
                  <Progress value={percent(completed, group.length)} />
                  {group.map((item) => (
                    <button
                      className="learning-problem-group-item"
                      key={item.id}
                      onClick={() => openEditor("problem", item)}
                    >
                      <span
                        className={cx(
                          "learning-solve-toggle",
                          ["solved", "revised"].includes(item.status || "") &&
                            "is-solved",
                        )}
                      >
                        {["solved", "revised"].includes(item.status || "") && (
                          <Check size={11} />
                        )}
                      </span>
                      <span>{item.title}</span>
                      <span
                        className={`learning-difficulty difficulty-${(item.difficulty || "").toLowerCase()}`}
                      >
                        {item.difficulty || "—"}
                      </span>
                      <ArrowUpRight size={12} />
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {!!problems.length && (
          <div className="learning-table-footer">
            <span>
              {filtered.length} of {problems.length} problems
            </span>
            {(activeFilters > 0 || query) && (
              <button className="learning-text-button" onClick={clear}>
                Clear filters <X size={12} />
              </button>
            )}
            <span>Every number reflects your saved work.</span>
          </div>
        )}
      </Panel>
    </div>
  );
}

function LearningCalendar({
  records,
  month,
  selected,
  onMonth,
  onSelect,
  contest = false,
}: {
  records: Item[];
  month: string;
  selected: string;
  onMonth: (month: string) => void;
  onSelect: (day: string) => void;
  contest?: boolean;
}) {
  const { settings } = useStore();
  const days = monthGrid(month, settings.weekStart);
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const names = Array.from(
    { length: 7 },
    (_, index) => weekdayNames[(index + settings.weekStart) % 7],
  );
  const date = new Date(`${month.slice(0, 7)}-01T12:00:00`);
  return (
    <div className="learning-calendar">
      <div className="learning-calendar-heading">
        <h3>
          {date.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <div className="row">
          <Button
            variant="ghost"
            onClick={() => onMonth(moveMonth(month, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft size={15} />
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onMonth(today());
              onSelect(today());
            }}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            onClick={() => onMonth(moveMonth(month, 1))}
            aria-label="Next month"
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>
      <div className="learning-calendar-weekdays">
        {names.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      <div className="learning-calendar-days">
        {days.map((day) => {
          const entries = records.filter((item) => activityDay(item) === day);
          const completed = entries.filter((item) =>
            ["solved", "revised", "completed"].includes(item.status || ""),
          ).length;
          return (
            <button
              key={day}
              type="button"
              className={cx(
                "learning-calendar-day",
                day.slice(0, 7) !== month.slice(0, 7) && "is-outside",
                day === today() && "is-today",
                day === selected && "is-selected",
                entries.length > 0 && "has-records",
              )}
              onClick={() => onSelect(day)}
              aria-pressed={day === selected}
              aria-label={`${formatDate(day, true)}, ${entries.length} ${contest ? "contests" : "practice records"}`}
            >
              <span>{Number(day.slice(8))}</span>
              {entries.length > 0 && (
                <span className="learning-calendar-count">
                  <i className={cx(completed > 0 && "is-completed")} />
                  {entries.length}
                  <span className="learning-calendar-count-label">
                    {" "}
                    {contest
                      ? entries.length === 1
                        ? "contest"
                        : "contests"
                      : "practiced"}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="learning-calendar-key">
        <span>
          <i className="is-completed" />
          {contest ? "Completed contest" : "Includes solved problems"}
        </span>
        <span>
          <i />
          {contest ? "Scheduled / other result" : "Attempted / revising"}
        </span>
      </div>
    </div>
  );
}

function PracticeCalendar({
  records,
  openEditor,
}: {
  records: Item[];
  openEditor: OpenEditor;
}) {
  const [month, setMonth] = useState(today());
  const [selected, setSelected] = useState(today());
  const activity = records.filter(
    (item) =>
      activityDay(item) &&
      (["solved", "revised", "attempted", "revising"].includes(
        item.status || "",
      ) ||
        (item.attempts || 0) > 0),
  );
  const monthly = activity.filter((item) =>
    activityDay(item)?.startsWith(month.slice(0, 7)),
  );
  const selectedRecords = activity.filter(
    (item) => activityDay(item) === selected,
  );
  const activeDays = new Set(monthly.map((item) => activityDay(item))).size;
  return (
    <div className="stack">
      <div className="learning-section-heading">
        <div>
          <h2>Make room for consistency.</h2>
          <p>
            A calendar of your recorded practice, using each problem’s last
            practiced / solved date.
          </p>
        </div>
        <Badge>
          {activeDays} active {activeDays === 1 ? "day" : "days"} this month
        </Badge>
      </div>
      <div className="learning-calendar-layout">
        <Panel>
          <LearningCalendar
            records={activity}
            month={month}
            selected={selected}
            onMonth={(value) => {
              setMonth(value);
              setSelected(value);
            }}
            onSelect={(day) => {
              setSelected(day);
              if (day.slice(0, 7) !== month.slice(0, 7)) setMonth(day);
            }}
          />
        </Panel>
        <Panel className="learning-calendar-detail">
          <div className="learning-kicker">THE WORK YOU RECORDED</div>
          <h3>{formatDate(selected, true)}</h3>
          <p className="muted small">
            {selectedRecords.length} practice{" "}
            {selectedRecords.length === 1 ? "record" : "records"}
          </p>
          {!selectedRecords.length ? (
            <Empty
              icon={<CalendarDays size={24} />}
              title="A little space for progress."
              description="No practiced problems are dated on this day."
              action={
                <Button
                  onClick={() =>
                    openEditor("problem", {
                      date: selected,
                      status: "attempted",
                      attempts: 1,
                    })
                  }
                >
                  Record practice
                </Button>
              }
            />
          ) : (
            <div className="learning-calendar-entry-list">
              {selectedRecords.map((item) => (
                <button
                  className="learning-calendar-entry"
                  key={item.id}
                  onClick={() => openEditor("problem", item)}
                >
                  <span className="learning-outline-icon">
                    {["solved", "revised"].includes(item.status || "") ? (
                      <Check size={15} />
                    ) : (
                      <Code2 size={15} />
                    )}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {item.difficulty || "Unrated"} · {labels(item.status)}
                      {item.actualMinutes
                        ? ` · ${item.actualMinutes} min total`
                        : ""}
                    </small>
                  </span>
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
          )}
          <div className="learning-footnote">
            Dates reflect your saved records, not an imported submission feed.
            Re-practicing a problem moves its most recent practice date.
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ContestWorkspace({ records, openEditor, onDelete }: RecordProps) {
  const { readOnly } = useStore();
  const [month, setMonth] = useState(today());
  const [selected, setSelected] = useState(today());
  const [dateFilter, setDateFilter] = useState(false);
  const [scope, setScope] = useState("all");
  const [query, setQuery] = useState("");
  const contests = records
    .filter((item) => item.kind === "contest")
    .sort(
      (a, b) =>
        (a.date || "").localeCompare(b.date || "") ||
        (a.startTime || "").localeCompare(b.startTime || ""),
    );
  const completed = contests.filter((item) => item.status === "completed");
  const upcoming = contests.filter(
    (item) =>
      item.date &&
      item.date >= today() &&
      ["planned", "registered"].includes(item.status || "planned"),
  );
  const next = upcoming[0];
  const shown = contests.filter(
    (item) =>
      (!dateFilter || item.date === selected) &&
      (scope === "all" ||
        (scope === "upcoming"
          ? upcoming.some((candidate) => candidate.id === item.id)
          : item.status === "completed")) &&
      `${item.title} ${item.platform || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="stack">
      <div className="learning-metrics-grid">
        <Stat
          label="Contests completed"
          value={completed.length}
          icon={<Trophy size={16} />}
        />
        <Stat
          label="Problems solved"
          value={numberTotal(completed, "solved")}
          hint="Manual completed-contest results"
          icon={<CheckCheck size={16} />}
        />
        <Stat
          label="Upcoming contests"
          value={upcoming.length}
          hint="From your calendar"
          icon={<CalendarDays size={16} />}
        />
        <Stat
          label="Awaiting upsolve"
          value={
            records.filter(
              (item) =>
                item.kind === "practice" &&
                item.category === "upsolve" &&
                item.status !== "completed",
            ).length
          }
          icon={<Flag size={16} />}
        />
      </div>
      <div className="learning-section-heading">
        <div>
          <h2>Show up with a plan.</h2>
          <p>
            Your local contest calendar. Add schedules and results manually, in
            your local time.
          </p>
        </div>
        <Button
          variant="primary"
          disabled={readOnly}
          onClick={() =>
            openEditor("contest", dateFilter ? { date: selected } : undefined)
          }
        >
          <Plus size={15} />
          Add contest
        </Button>
      </div>
      <div className="learning-calendar-layout">
        <Panel>
          <LearningCalendar
            contest
            records={contests}
            month={month}
            selected={dateFilter ? selected : ""}
            onMonth={setMonth}
            onSelect={(day) => {
              setSelected(day);
              setDateFilter(true);
              if (day.slice(0, 7) !== month.slice(0, 7)) setMonth(day);
            }}
          />
        </Panel>
        <Panel className="learning-next-contest">
          <div className="learning-next-contest-icon">
            <Trophy size={28} />
          </div>
          <div className="learning-kicker">NEXT ON YOUR CALENDAR</div>
          {next ? (
            <>
              <h3>{next.title}</h3>
              <p>{next.platform || "Independent contest"}</p>
              <div className="learning-contest-time">
                <CalendarDays size={15} />
                {formatDate(next.date, true)}
                {next.startTime ? ` · ${next.startTime}` : ""}
              </div>
              {next.duration && (
                <span className="muted small">
                  {next.duration} minutes · local time
                </span>
              )}
              <Badge tone={stateTone(next.status)}>{labels(next.status)}</Badge>
              <Button
                variant="primary"
                onClick={() => openEditor("contest", next)}
              >
                Contest details <ArrowUpRight size={14} />
              </Button>
              <ResourceLink url={next.url}>Visit contest page</ResourceLink>
            </>
          ) : (
            <>
              <h3>The next challenge is yours to choose.</h3>
              <p>
                Add a contest you want to show up for. Keep the schedule and
                your reflection in one place.
              </p>
              <Button
                disabled={readOnly}
                variant="primary"
                onClick={() => openEditor("contest")}
              >
                <Plus size={15} />
                Plan a contest
              </Button>
            </>
          )}
          <div className="learning-footnote">
            No live rankings or automatic platform sync. Your own results tell
            the story.
          </div>
        </Panel>
      </div>
      <Panel>
        <div className="learning-panel-heading">
          <h3>
            {dateFilter
              ? `Contests · ${formatDate(selected, true)}`
              : "Your contest journal"}
          </h3>
          {dateFilter && (
            <Button variant="ghost" onClick={() => setDateFilter(false)}>
              All dates <X size={13} />
            </Button>
          )}
        </div>
        <div className="learning-toolbar">
          <label className="learning-search">
            <Search size={15} />
            <input
              value={query}
              placeholder="Search contests or platforms…"
              aria-label="Search contests"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            value={scope}
            aria-label="Filter contests"
            onChange={(event) => setScope(event.target.value)}
          >
            <option value="all">All contests</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        {!shown.length ? (
          <Empty
            title={
              contests.length
                ? "No contests in this view."
                : "Your contest journal starts here."
            }
            description={
              contests.length
                ? "Choose another date or clear the filters."
                : "Plan a contest and return afterward to record the result and what you learned."
            }
            action={
              contests.length ? (
                <Button
                  onClick={() => {
                    setDateFilter(false);
                    setScope("all");
                    setQuery("");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button
                  disabled={readOnly}
                  onClick={() => openEditor("contest")}
                >
                  Add first contest
                </Button>
              )
            }
          />
        ) : (
          <div className="learning-contest-list">
            {shown.map((item) => (
              <article className="learning-contest-card" key={item.id}>
                <div className="learning-date-tile">
                  <strong>
                    {item.date ? Number(item.date.slice(8)) : "—"}
                  </strong>
                  <span>
                    {item.date
                      ? new Date(`${item.date}T12:00:00`).toLocaleDateString(
                          undefined,
                          { month: "short" },
                        )
                      : "No date"}
                  </span>
                </div>
                <div className="learning-contest-body">
                  <div className="learning-contest-title">
                    <button
                      className="learning-text-button"
                      onClick={() => openEditor("contest", item)}
                    >
                      {item.title}
                    </button>
                    <Badge tone={stateTone(item.status)}>
                      {labels(item.status)}
                    </Badge>
                  </div>
                  <p>
                    {item.platform || "Contest"}
                    {item.startTime ? ` · ${item.startTime} local` : ""}
                    {item.duration ? ` · ${item.duration} min` : ""}
                  </p>
                  {item.status === "completed" && (
                    <div className="learning-contest-results">
                      <span>
                        Solved{" "}
                        <strong>
                          {item.solved ?? "—"}
                          {item.attempted != null ? ` / ${item.attempted}` : ""}
                        </strong>
                      </span>
                      <span>
                        Rank{" "}
                        <strong>
                          {item.rank != null ? `#${item.rank}` : "—"}
                        </strong>
                      </span>
                      <span>
                        Penalty <strong>{item.penalty ?? "—"}</strong>
                      </span>
                    </div>
                  )}
                  {item.reflection && (
                    <p className="learning-contest-reflection">
                      {item.reflection}
                    </p>
                  )}
                </div>
                <div className="learning-contest-actions">
                  <Button onClick={() => openEditor("contest", item)}>
                    {item.status === "completed" ? "Edit result" : "Details"}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={readOnly}
                    onClick={() =>
                      openEditor("practice", {
                        category: "upsolve",
                        collection: item.id,
                        platform: item.platform,
                      })
                    }
                  >
                    <RotateCcw size={13} />
                    Upsolve
                  </Button>
                  <button
                    className="icon-button"
                    disabled={readOnly}
                    aria-label={`Delete ${item.title}`}
                    onClick={() => onDelete(item)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function WeeklyGoals({ domain, records }: RecordProps) {
  const { items, settings } = useStore();
  const week = weekBounds(today(), settings.weekStart);
  const goals = records
    .filter((item) => item.kind === "goal")
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  const progressFor = (goal: Item) => {
    const matching = records.filter((item) => {
      const day = activityDay(item);
      return (
        day &&
        goal.startDate &&
        goal.targetDate &&
        day >= goal.startDate &&
        day <= goal.targetDate
      );
    });
    if (goal.category === "contests")
      return matching.filter(
        (item) => item.kind === "contest" && item.status === "completed",
      ).length;
    if (goal.category === "minutes")
      return numberTotal(
        matching.filter((item) => item.kind === "practice"),
        "actualMinutes",
      );
    return matching.filter(
      (item) => item.kind === "practice" && item.status === "completed",
    ).length;
  };
  return (
    <div className="stack">
      <div className="learning-section-heading">
        <div>
          <h2>A good week has a direction.</h2>
          <p>
            Choose a target. Progress is calculated from dated practice and
            contest records.
          </p>
        </div>
        <Badge>
          {formatDate(week.start)} – {formatDate(week.end)}
        </Badge>
      </div>
      {!!goals.length && (
        <div className="learning-goals-grid">
          {goals.map((goal) => {
            const current = progressFor(goal);
            const target = goal.target || 0;
            const ended = !!goal.targetDate && goal.targetDate < today();
            return (
              <Panel key={goal.id} className="learning-goal-card">
                <div className="learning-goal-icon">
                  <Target size={20} />
                </div>
                <div className="learning-goal-period">
                  {formatDate(goal.startDate)} – {formatDate(goal.targetDate)}
                  <Badge
                    tone={
                      target > 0 && current >= target ? "success" : "neutral"
                    }
                  >
                    {target > 0 && current >= target
                      ? "Target met"
                      : ended
                        ? "Past week"
                        : "In progress"}
                  </Badge>
                </div>
                <h3>{goal.title}</h3>
                {goal.description && (
                  <p className="muted small">{goal.description}</p>
                )}
                <div className="learning-goal-numbers">
                  <strong>
                    {current}
                    <span> / {target}</span>
                  </strong>
                  <span>
                    {goal.category === "contests"
                      ? "completed contests"
                      : goal.category === "minutes"
                        ? "practice minutes"
                        : "completed practice problems"}
                  </span>
                </div>
                <Progress value={Math.min(100, percent(current, target))} />
              </Panel>
            );
          })}
        </div>
      )}
      <RecordManager
        kind="goal"
        title="Weekly intentions"
        description="Define the measure and date range. One completed practice entry counts as one problem; minutes are summed from logged practice time."
        fields={editorFields("goal", domain, items)}
        defaults={{
          ...newRecord("goal", domain),
          startDate: week.start,
          targetDate: week.end,
        }}
        filter={(item) => item.domain === domain && !item.archived}
        empty="Create a weekly goal for completed practice, practice minutes, or contests. Progress starts at zero until you record the work."
      />
    </div>
  );
}

type PlaygroundSource = { html: string; css: string; javascript: string };
function Playground({
  records,
  recordId,
  onDelete,
}: {
  records: Item[];
  recordId?: string;
  onDelete: (item: Item) => void;
}) {
  const { readOnly, notify } = useStore();
  const [source, setSource] = useState<PlaygroundSource>({
    ...PLAYGROUND_STARTER,
  });
  const [baseline, setBaseline] = useState(JSON.stringify(PLAYGROUND_STARTER));
  const [activeId, setActiveId] = useState("");
  const [language, setLanguage] = useState<keyof PlaygroundSource>("html");
  const [preview, setPreview] = useState<{ html: string; id: string } | null>(
    null,
  );
  const [previewStatus, setPreviewStatus] = useState("");
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [viewport, setViewport] = useState("desktop");
  const [saveMode, setSaveMode] = useState<"save" | "copy" | null>(null);
  const [replaceAction, setReplaceAction] = useState<{
    kind: "starter" | "blank" | "load";
    id?: string;
  } | null>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const lineNumbers = useRef<HTMLDivElement>(null);
  const loadedRecord = useRef("");
  const active = records.find((item) => item.id === activeId);
  const dirty = JSON.stringify(source) !== baseline;
  const applySource = (next: PlaygroundSource, id = "") => {
    setSource(next);
    setBaseline(JSON.stringify(next));
    setActiveId(id);
    setPreview(null);
    setPreviewStatus("");
    setPreviewErrors([]);
  };
  const performReplace = (action: {
    kind: "starter" | "blank" | "load";
    id?: string;
  }) => {
    if (action.kind === "starter") applySource({ ...PLAYGROUND_STARTER });
    else if (action.kind === "blank")
      applySource({ html: "", css: "", javascript: "" });
    else {
      const item = records.find((record) => record.id === action.id);
      if (item)
        applySource(
          {
            html: item.html || "",
            css: item.css || "",
            javascript: item.javascript || "",
          },
          item.id,
        );
    }
    setReplaceAction(null);
  };
  const replace = (action: {
    kind: "starter" | "blank" | "load";
    id?: string;
  }) => (dirty ? setReplaceAction(action) : performReplace(action));
  useEffect(() => {
    if (!recordId) {
      loadedRecord.current = "";
      return;
    }
    if (loadedRecord.current === recordId) return;
    const item = records.find((record) => record.id === recordId);
    if (item) {
      applySource(
        {
          html: item.html || "",
          css: item.css || "",
          javascript: item.javascript || "",
        },
        item.id,
      );
      loadedRecord.current = recordId;
    }
  }, [recordId, records]);
  useEffect(() => {
    if (activeId && !records.some((item) => item.id === activeId))
      setActiveId("");
  }, [activeId, records]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        !preview ||
        event.source !== iframe.current?.contentWindow ||
        event.origin !== "null"
      )
        return;
      const data = event.data;
      if (
        data &&
        data.type === "studyos-preview-error" &&
        data.runId === preview.id &&
        typeof data.message === "string"
      )
        setPreviewErrors((previous) => [
          ...previous.slice(-9),
          data.message.slice(0, 500),
        ]);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [preview]);
  const run = () => {
    const id = crypto.randomUUID();
    setPreviewErrors([]);
    setPreviewStatus("Loading preview…");
    setPreview({
      id,
      html: buildPlaygroundDocument(
        source.html,
        source.css,
        source.javascript,
        id,
      ),
    });
  };
  const initial: Partial<Item> = {
    ...(saveMode === "save" ? active : undefined),
    title:
      saveMode === "copy" && active
        ? `${active.title} — copy`
        : active?.title || "Untitled experiment",
    domain: "web",
    category: "playground",
    language: "HTML / CSS / JavaScript",
    ...source,
  };
  return (
    <div className="stack">
      <div className="learning-section-heading">
        <div>
          <h2>Your next idea, in miniature.</h2>
          <p>
            Edit local HTML, CSS, and vanilla JavaScript. This is a browser
            preview only.
          </p>
        </div>
        <div className="row">
          <Button disabled={readOnly} onClick={() => setSaveMode("save")}>
            <Save size={14} />
            {active ? "Save changes" : "Save experiment"}
          </Button>
          <Button variant="primary" onClick={run}>
            <Play size={14} />
            Run preview
          </Button>
        </div>
      </div>
      <div className="learning-playground-toolbar">
        <label className="learning-inline-field">
          <FolderOpen size={15} />
          <select
            aria-label="Open saved experiment"
            value={active?.id || ""}
            onChange={(event) =>
              event.target.value &&
              replace({ kind: "load", id: event.target.value })
            }
          >
            <option value="">
              {active ? "Open saved experiment…" : "Scratchpad · not saved"}
            </option>
            {records.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <span className={cx("learning-save-state", dirty && "is-dirty")}>
          <span />
          {dirty
            ? "Unsaved changes"
            : active
              ? "Saved experiment"
              : "Unsaved starter / scratchpad"}
        </span>
        <div className="row">
          <Button variant="ghost" onClick={() => replace({ kind: "starter" })}>
            <Sparkles size={13} />
            Starter
          </Button>
          <Button variant="ghost" onClick={() => replace({ kind: "blank" })}>
            <Plus size={13} />
            Blank
          </Button>
          {active && (
            <>
              <Button
                variant="ghost"
                disabled={readOnly}
                onClick={() => setSaveMode("copy")}
              >
                Save a copy
              </Button>
              <Button
                variant="ghost"
                disabled={readOnly}
                onClick={() => onDelete(active)}
                aria-label={`Delete experiment ${active.title}`}
              >
                <Trash2 size={13} />
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="learning-playground-grid">
        <section
          className="learning-editor-pane"
          aria-label="Playground source editor"
        >
          <div
            className="learning-editor-tabs"
            role="tablist"
            aria-label="Source language"
          >
            {(["html", "css", "javascript"] as const).map((value) => (
              <button
                role="tab"
                id={`learning-source-tab-${value}`}
                aria-controls="learning-source-panel"
                aria-selected={language === value}
                key={value}
                className={cx(language === value && "is-active")}
                onClick={() => setLanguage(value)}
              >
                <span className={`learning-language-dot dot-${value}`} />
                {value === "javascript" ? "JavaScript" : value.toUpperCase()}
              </button>
            ))}
            <span className="learning-editor-file">
              {language === "javascript"
                ? "script.js"
                : language === "html"
                  ? "index.html"
                  : "style.css"}
            </span>
          </div>
          <div
            className="learning-editor-body"
            role="tabpanel"
            id="learning-source-panel"
            aria-labelledby={`learning-source-tab-${language}`}
            key={language}
          >
            <div
              className="learning-editor-line-numbers"
              ref={lineNumbers}
              aria-hidden="true"
            >
              {Array.from(
                { length: Math.max(18, source[language].split("\n").length) },
                (_, index) => (
                  <span key={index}>{index + 1}</span>
                ),
              )}
            </div>
            <textarea
              spellCheck={false}
              aria-label={`${language === "javascript" ? "JavaScript" : language.toUpperCase()} source`}
              value={source[language]}
              placeholder={
                language === "html"
                  ? "<h1>Your idea starts here.</h1>"
                  : language === "css"
                    ? "/* Make it yours. */"
                    : "// Vanilla browser JavaScript only."
              }
              onScroll={(event) => {
                if (lineNumbers.current)
                  lineNumbers.current.scrollTop = event.currentTarget.scrollTop;
              }}
              onChange={(event) =>
                setSource((previous) => ({
                  ...previous,
                  [language]: event.target.value,
                }))
              }
              onKeyDown={(event) => {
                if (event.key === "Tab" && !event.shiftKey) {
                  event.preventDefault();
                  const element = event.currentTarget;
                  const start = element.selectionStart;
                  const end = element.selectionEnd;
                  const next = `${source[language].slice(0, start)}  ${source[language].slice(end)}`;
                  setSource((previous) => ({ ...previous, [language]: next }));
                  requestAnimationFrame(() => {
                    element.selectionStart = element.selectionEnd = start + 2;
                  });
                }
              }}
            />
          </div>
          <div className="learning-editor-status">
            <span>UTF-8 · 2 space indent</span>
            <span>
              {source[language].split("\n").length} lines ·{" "}
              {source[language].length} characters
            </span>
          </div>
        </section>
        <section className="learning-preview-pane" aria-label="Browser preview">
          <div className="learning-preview-toolbar">
            <span>
              <span className="learning-live-dot" />
              Browser preview
            </span>
            <div
              className="learning-layout-toggle"
              role="group"
              aria-label="Preview width"
            >
              <button
                className={cx(viewport === "desktop" && "is-active")}
                onClick={() => setViewport("desktop")}
                aria-pressed={viewport === "desktop"}
              >
                Fluid
              </button>
              <button
                className={cx(viewport === "mobile" && "is-active")}
                onClick={() => setViewport("mobile")}
                aria-pressed={viewport === "mobile"}
              >
                375px
              </button>
            </div>
            {preview && (
              <button
                className="icon-button"
                title="Stop preview"
                aria-label="Stop preview"
                onClick={() => {
                  setPreview(null);
                  setPreviewStatus("Preview stopped");
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
          <div
            className={cx(
              "learning-preview-canvas",
              viewport === "mobile" && "is-mobile",
            )}
          >
            {preview ? (
              <iframe
                ref={iframe}
                key={preview.id}
                title="Isolated HTML CSS JavaScript browser preview"
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
                srcDoc={preview.html}
                onLoad={() =>
                  setPreviewStatus("Preview loaded · rerun to see changes")
                }
              />
            ) : (
              <div className="learning-preview-empty">
                <div>
                  <Code2 size={31} />
                </div>
                <h3>A little space to experiment.</h3>
                <p>
                  Your source stays separate from this app. Run the preview to
                  see it come to life.
                </p>
                <Button variant="primary" onClick={run}>
                  <Play size={14} />
                  Run browser preview
                </Button>
              </div>
            )}
          </div>
          <div className="learning-preview-status" role="status">
            {previewStatus || "Ready when you are. Nothing has run yet."}
          </div>
        </section>
      </div>
      {!!previewErrors.length && (
        <div className="learning-preview-errors" role="alert">
          <strong>JavaScript feedback</strong>
          {previewErrors.map((error, index) => (
            <pre key={index}>{error}</pre>
          ))}
        </div>
      )}
      <div className="learning-playground-note">
        <span className="learning-outline-icon">
          <Code2 size={15} />
        </span>
        <div>
          <strong>Browser preview only · isolated sandbox</strong>
          <p>
            No same-origin access. The preview’s content policy blocks network
            resources, fetch, imports, and external assets. Use the JavaScript
            panel for scripts; inline HTML event handlers are removed. Java,
            Node.js, backend code, and TypeScript compilation are not supported
            here. Shift+Tab leaves the code editor.
          </p>
        </div>
      </div>
      {saveMode && (
        <ItemEditor
          kind="snippet"
          title={
            saveMode === "copy"
              ? "Save experiment as a copy"
              : active
                ? "Save experiment"
                : "Name your experiment"
          }
          initial={initial}
          fields={editorFields("snippet", "web", [], initial)}
          onClose={() => setSaveMode(null)}
          onSaved={(item) => {
            applySource(
              {
                html: item.html || "",
                css: item.css || "",
                javascript: item.javascript || "",
              },
              item.id,
            );
            setSaveMode(null);
            notify("Experiment saved to your web workspace.", "success");
          }}
        />
      )}
      {replaceAction && (
        <Confirm
          title="Replace your unsaved source?"
          message="Your current edits have not been saved. Replacing the source will discard those edits."
          onClose={() => setReplaceAction(null)}
          onConfirm={() => performReplace(replaceAction)}
        />
      )}
    </div>
  );
}

function WebProjects({ records, openEditor }: RecordProps) {
  const { items, update, readOnly, notify } = useStore();
  const [linking, setLinking] = useState(false);
  const [linkId, setLinkId] = useState("");
  const [unlinking, setUnlinking] = useState<Item | null>(null);
  const [query, setQuery] = useState("");
  const projects = records.filter((item) => item.kind === "project");
  const available = items.filter(
    (item) =>
      item.kind === "project" && item.domain !== "web" && !item.archived,
  );
  const shown = projects.filter((item) =>
    `${item.title} ${item.description || ""} ${item.technologies || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="stack">
      <div className="learning-section-heading">
        <div>
          <h2>Put the pieces together.</h2>
          <p>
            Keep the projects that turn your learning into something you can
            open, share, and improve.
          </p>
        </div>
        <div className="row">
          <Button
            disabled={readOnly || !available.length}
            onClick={() => {
              setLinkId(available[0]?.id || "");
              setLinking(true);
            }}
          >
            <FolderOpen size={14} />
            Link existing project
          </Button>
          <Button
            variant="primary"
            disabled={readOnly}
            onClick={() => openEditor("project")}
          >
            <Plus size={15} />
            New web project
          </Button>
        </div>
      </div>
      <div className="learning-toolbar">
        <label className="learning-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search web projects"
            placeholder="Find a project or technology…"
          />
        </label>
        <Button variant="ghost" onClick={() => navigate("projects")}>
          All projects <ArrowUpRight size={14} />
        </Button>
      </div>
      {!projects.length ? (
        <Empty
          icon={<FolderOpen size={30} />}
          title="Build something that matters to you."
          description="Start a small project or link one from your Projects workspace. Add a live URL, repository, and what you want to learn."
          action={
            <Button
              variant="primary"
              onClick={() => openEditor("project")}
              disabled={readOnly}
            >
              <Plus size={15} />
              Start a web project
            </Button>
          }
        />
      ) : !shown.length ? (
        <Empty
          title="No projects match."
          action={<Button onClick={() => setQuery("")}>Clear search</Button>}
        />
      ) : (
        <div className="learning-web-projects">
          {shown.map((item) => (
            <Panel className="learning-web-project" key={item.id}>
              <div className="learning-web-project-top">
                <span className="learning-icon-tile">
                  <Code2 size={21} />
                </span>
                <Badge tone={stateTone(item.status)}>
                  {labels(item.status)}
                </Badge>
                <button
                  className="icon-button"
                  title="Edit web project"
                  aria-label={`Edit ${item.title}`}
                  onClick={() => openEditor("project", item)}
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
              <h3>{item.title}</h3>
              <p>
                {item.description ||
                  "Add a short description of what you’re making."}
              </p>
              {item.technologies && (
                <div className="learning-technology-list">
                  {item.technologies
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .map((value) => (
                      <Badge key={value}>{value}</Badge>
                    ))}
                </div>
              )}
              {item.goals && (
                <div className="learning-project-goals">
                  <span className="learning-kicker">LEARNING INTENTION</span>
                  <p>{item.goals}</p>
                </div>
              )}
              <div className="learning-project-links">
                <ResourceLink url={item.url}>Live site</ResourceLink>
                <ResourceLink url={item.repository}>Repository</ResourceLink>
                {!safeUrl(item.url) && !safeUrl(item.repository) && (
                  <span className="muted small">
                    Add a site or repository link in Edit.
                  </span>
                )}
              </div>
              <div className="learning-web-project-footer">
                <span>
                  {item.targetDate
                    ? `Target ${formatDate(item.targetDate)}`
                    : "No target date"}
                </span>
                <button
                  className="learning-text-button"
                  onClick={() => navigate("projects", item.id)}
                >
                  Project workspace <ArrowUpRight size={12} />
                </button>
                <button
                  className="icon-button"
                  title="Unlink from web workspace"
                  aria-label={`Unlink ${item.title} from web workspace`}
                  disabled={readOnly}
                  onClick={() => setUnlinking(item)}
                >
                  <X size={13} />
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}
      {linking && (
        <Modal
          title="Link an existing project"
          onClose={() => setLinking(false)}
          footer={
            <>
              <Button onClick={() => setLinking(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!linkId || readOnly}
                onClick={() => {
                  update(linkId, { domain: "web" });
                  setLinking(false);
                  notify("Project linked to the web workspace.", "success");
                }}
              >
                Link project
              </Button>
            </>
          }
        >
          <p className="muted">
            The same project remains available in Projects. Its links and
            details will be shared between both views.
          </p>
          <Field label="Project">
            <select
              value={linkId}
              onChange={(event) => setLinkId(event.target.value)}
            >
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </Field>
        </Modal>
      )}
      {unlinking && (
        <Confirm
          title={`Unlink “${unlinking.title}”?`}
          message="This removes the project from the web workspace. The project and its records remain in Projects."
          onClose={() => setUnlinking(null)}
          onConfirm={() => {
            update(unlinking.id, { domain: undefined });
            setUnlinking(null);
          }}
        />
      )}
    </div>
  );
}
