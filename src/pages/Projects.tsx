import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Flag,
  FolderKanban,
  Github,
  List,
  Milestone,
  Pencil,
  Plus,
  Rocket,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Confirm,
  Empty,
  ItemEditor,
  Markdown,
  Modal,
  PageHeader,
  Panel,
  Progress,
  Stat,
  Tabs,
  type FieldDef,
} from "../components/ui";
import { useStore } from "../lib/store";
import type { Item, Kind } from "../lib/types";
import { cx, formatDate, isDone, navigate, percent, today } from "../lib/utils";
import {
  minutesLabel,
  projectStatuses,
  recordOptions,
  statusOptions,
  taskFields,
} from "./planningHelpers";
import {
  PlanningRecord,
  SafeRecordLink,
  usePlanningHash,
} from "./PlanningShared";
import "./planning.css";

type ProjectTemplate = {
  id: string;
  title: string;
  description: string;
  technologies: string;
  goals: string;
  milestones: string[];
};
const templates: ProjectTemplate[] = [
  {
    id: "dsa",
    title: "DSA practice collection",
    description:
      "Build a well-tested library of algorithms and lessons from deliberate practice.",
    technologies: "Java, JUnit",
    goals:
      "Choose a small group of patterns.\nExplain each algorithm and its complexity.\nWrite boundary tests and a revision note for every mistake.",
    milestones: [
      "Choose patterns and representative problems",
      "Implement and test each solution",
      "Review mistakes and solve variants",
    ],
  },
  {
    id: "web",
    title: "Web application",
    description:
      "Take an idea from a clear problem to a usable, deployed product.",
    technologies: "HTML, CSS, JavaScript",
    goals:
      "Who is this for?\nWhat problem will it solve?\nWhat does the smallest useful version include?",
    milestones: [
      "Define the problem and acceptance criteria",
      "Build the core user flow",
      "Test, polish, and deploy",
    ],
  },
  {
    id: "java",
    title: "Java application",
    description: "Practice clean design with a focused, testable Java project.",
    technologies: "Java",
    goals:
      "Define the inputs and expected outputs.\nIdentify the core classes and responsibilities.\nWrite down the edge cases to verify.",
    milestones: [
      "Design the model and project structure",
      "Implement the core functionality",
      "Test edge cases and document usage",
    ],
  },
  {
    id: "research",
    title: "Research & coursework",
    description:
      "Organize a question, reliable sources, and a considered final submission.",
    technologies: "",
    goals:
      "State the research question.\nDefine the deliverable and evaluation criteria.\nIdentify the sources and evidence needed.",
    milestones: [
      "Frame the question and gather sources",
      "Develop the analysis and first draft",
      "Review references and submit",
    ],
  },
  {
    id: "portfolio",
    title: "Portfolio project",
    description: "Turn your work into a case study that shows how you think.",
    technologies: "",
    goals:
      "Define the audience.\nChoose the work and decisions to highlight.\nExplain the outcome with real evidence.",
    milestones: [
      "Select work and outline the story",
      "Build and write the case study",
      "Review accessibility and publish",
    ],
  },
];
const projectFields: FieldDef[] = [
  {
    key: "description",
    label: "Short description",
    type: "textarea",
    full: true,
  },
  {
    key: "status",
    label: "Stage",
    type: "select",
    options: statusOptions(projectStatuses),
    required: true,
  },
  {
    key: "priority",
    label: "Priority",
    type: "select",
    options: statusOptions(["High", "Medium", "Low"]),
  },
  { key: "startDate", label: "Start date", type: "date" },
  { key: "targetDate", label: "Target date", type: "date" },
  {
    key: "technologies",
    label: "Technologies (comma separated)",
    type: "text",
    full: true,
  },
  {
    key: "goals",
    label: "Goals & acceptance criteria",
    type: "textarea",
    full: true,
  },
  {
    key: "body",
    label: "Project brief (Markdown supported)",
    type: "textarea",
    full: true,
  },
  { key: "repository", label: "Repository URL", type: "url" },
  { key: "url", label: "Live / reference URL", type: "url" },
  {
    key: "localPath",
    label: "Local folder path (reference only)",
    type: "text",
    full: true,
  },
  { key: "tags", label: "Tags", type: "tags", full: true },
];
const milestoneFields: FieldDef[] = [
  {
    key: "description",
    label: "Success criteria",
    type: "textarea",
    full: true,
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: statusOptions(["planned", "in-progress", "completed"]),
    required: true,
  },
  { key: "dueDate", label: "Target date", type: "date" },
  { key: "order", label: "Position", type: "number", min: 0 },
];
const noteFields: FieldDef[] = [
  {
    key: "body",
    label: "Note (Markdown supported)",
    type: "textarea",
    full: true,
  },
  { key: "notebook", label: "Notebook", type: "text" },
  { key: "tags", label: "Tags", type: "tags" },
  { key: "url", label: "Reference URL", type: "url", full: true },
];
const columns = [
  { id: "planned", label: "Backlog", subtitle: "A good place to begin" },
  { id: "in-progress", label: "In progress", subtitle: "Ideas becoming real" },
  { id: "paused", label: "On hold", subtitle: "Room to come back to" },
  { id: "completed", label: "Completed", subtitle: "Look what you built" },
];
type EditorState = { kind: Kind; initial: Partial<Item> };

export default function Projects({ recordId }: { recordId?: string }) {
  const {
    items,
    settings,
    ready,
    readOnly,
    create,
    update,
    remove,
    touch,
    completeTask,
  } = useStore();
  const [view, setView] = useState("board");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detailTab, setDetailTab] = useState("overview");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [includeMilestones, setIncludeMilestones] = useState(true);
  const [pendingTemplate, setPendingTemplate] =
    useState<ProjectTemplate | null>(null);
  const hashId = usePlanningHash("projects", recordId);
  const lastHash = useRef("");
  const projects = items.filter(
    (item) => item.kind === "project" && !item.archived,
  );
  const selected = items.find(
    (item) => item.kind === "project" && item.id === selectedId,
  );

  useEffect(() => {
    if (!hashId) {
      lastHash.current = "";
      setSelectedId("");
      return;
    }
    if (lastHash.current === hashId || !ready) return;
    if (hashId === "new") {
      lastHash.current = hashId;
      setEditor({
        kind: "project",
        initial: { status: "planned", startDate: today() },
      });
      return;
    }
    const record = items.find((item) => item.id === hashId);
    if (record?.kind === "project") {
      lastHash.current = hashId;
      setSelectedId(record.id);
      setDetailTab("overview");
      touch(record.id);
    } else if (record?.kind === "milestone") {
      lastHash.current = hashId;
      setSelectedId(record.projectId || "");
      setDetailTab("milestones");
      setEditor({ kind: "milestone", initial: record });
      touch(record.id);
    }
  }, [hashId, items, ready, touch]);

  const open = (project: Item) => {
    setSelectedId(project.id);
    setDetailTab("overview");
    navigate("projects", project.id);
    touch(project.id);
  };
  const back = () => {
    setSelectedId("");
    navigate("projects");
  };
  const edit = (item: Item) => {
    setPendingTemplate(null);
    setEditor({ kind: item.kind, initial: item });
    touch(item.id);
  };
  const newProject = (stage = "planned") => {
    setPendingTemplate(null);
    setEditor({
      kind: "project",
      initial: { status: stage, startDate: today() },
    });
  };
  const closeEditor = () => {
    setEditor(null);
    setPendingTemplate(null);
    const stillAtTarget =
      window.location.hash.replace(/^#\/?/, "") === `projects/${hashId}`;
    if (
      stillAtTarget &&
      (hashId === "new" ||
        items.find((item) => item.id === hashId)?.kind === "milestone")
    )
      navigate("projects", selectedId || undefined);
  };
  const saved = (item: Item) => {
    if (
      item.kind === "project" &&
      pendingTemplate &&
      !editor?.initial.id &&
      includeMilestones
    ) {
      pendingTemplate.milestones.forEach((title, order) =>
        create("milestone", {
          title,
          projectId: item.id,
          order: order + 1,
          status: "planned",
        }),
      );
    }
    setEditor(null);
    setPendingTemplate(null);
    if (item.kind === "project") open(item);
    else if (
      hashId &&
      items.find((record) => record.id === hashId)?.kind === "milestone"
    )
      navigate("projects", item.projectId);
  };
  const projectTasks = (id: string) =>
    items.filter((item) => item.kind === "task" && item.projectId === id);
  const projectMilestones = (id: string) =>
    items
      .filter((item) => item.kind === "milestone" && item.projectId === id)
      .sort(
        (a, b) =>
          (a.order ?? 0) - (b.order ?? 0) ||
          (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
      );
  const filtered = projects.filter(
    (item) =>
      (!status ||
        (status === "planned"
          ? !projectStatuses.slice(1).includes(item.status || "")
          : item.status === status)) &&
      (!query ||
        `${item.title} ${item.description || ""} ${item.technologies || ""} ${(item.tags || []).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const linkedTasks = selected ? projectTasks(selected.id) : [];
  const milestones = selected ? projectMilestones(selected.id) : [];
  const notes = selected
    ? items.filter(
        (item) =>
          item.kind === "note" &&
          item.projectId === selected.id &&
          !item.archived,
      )
    : [];
  const estimated = linkedTasks.reduce(
    (sum, item) => sum + (item.duration || 0),
    0,
  );
  const actual = linkedTasks.reduce(
    (sum, item) => sum + (item.actualMinutes || 0),
    0,
  );
  const createLinked = (kind: "task" | "note" | "milestone") => {
    if (!selected) return;
    setPendingTemplate(null);
    setEditor({
      kind,
      initial: {
        projectId: selected.id,
        ...(kind === "task"
          ? {
              status: "todo",
              priority: settings.priorities[1] || settings.priorities[0],
            }
          : kind === "milestone"
            ? { status: "planned", order: milestones.length + 1 }
            : { notebook: "Projects" }),
      },
    });
  };

  const projectCard = (project: Item, list = false) => {
    const tasks = projectTasks(project.id);
    const done = tasks.filter(isDone).length;
    const stage = projectStatuses.includes(project.status || "")
      ? project.status
      : "planned";
    return (
      <article
        key={project.id}
        className={cx("pj-card", list && "pj-card-list")}
      >
        <div className="pj-card-main">
          <div className="row-between">
            <span className={`pj-project-icon pj-icon-${stage}`}>
              <FolderKanban size={19} />
            </span>
            <div className="planning-record-actions">
              <Button
                variant="ghost"
                onClick={() => edit(project)}
                aria-label={`Edit ${project.title}`}
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                disabled={readOnly}
                onClick={() => setDeleting(project)}
                aria-label={`Delete ${project.title}`}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
          <button
            className="pj-card-title"
            type="button"
            onClick={() => open(project)}
          >
            {project.title}
            <ArrowRight size={15} />
          </button>
          <p>
            {project.description ||
              "Add a brief, define your next step, and make it yours."}
          </p>
          <div className="pj-technology-tags">
            {project.technologies
              ?.split(",")
              .map((value) => value.trim())
              .filter(Boolean)
              .slice(0, 4)
              .map((technology, index) => (
                <Badge key={`${technology}-${index}`}>{technology}</Badge>
              ))}
          </div>
        </div>
        <div className="pj-card-progress">
          <Progress
            value={percent(done, tasks.length)}
            label={
              tasks.length
                ? `${done} of ${tasks.length} tasks complete`
                : "No tasks added yet"
            }
          />
        </div>
        <div className="pj-card-footer">
          <select
            aria-label={`Stage for ${project.title}`}
            value={stage}
            disabled={readOnly}
            onChange={(event) =>
              update(project.id, { status: event.target.value })
            }
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.label}
              </option>
            ))}
          </select>
          <span
            className={
              project.targetDate &&
              project.targetDate < today() &&
              !isDone(project)
                ? "text-danger"
                : ""
            }
          >
            {project.targetDate ? (
              <>
                <Flag size={12} />
                {formatDate(project.targetDate)}
              </>
            ) : (
              "No target date"
            )}
          </span>
        </div>
      </article>
    );
  };

  return (
    <div className="planning-page projects-page">
      {selected ? (
        <>
          <button className="planning-back" type="button" onClick={back}>
            <ArrowLeft size={15} />
            All projects
          </button>
          <PageHeader
            eyebrow="PROJECT WORKSPACE"
            title={selected.title}
            description={
              selected.description || "One purposeful step at a time."
            }
            actions={
              <>
                <Button onClick={() => edit(selected)}>
                  <Pencil size={15} />
                  Edit project
                </Button>
                <Button
                  variant="primary"
                  disabled={readOnly}
                  onClick={() => createLinked("task")}
                >
                  <Plus size={16} />
                  Add task
                </Button>
              </>
            }
          />
          <div className="pj-detail-meta">
            <Badge tone={isDone(selected) ? "success" : "accent"}>
              {selected.status?.replaceAll("-", " ") || "planned"}
            </Badge>
            {selected.priority && <Badge>{selected.priority} priority</Badge>}
            {selected.targetDate && (
              <span>
                <Flag size={14} />
                Target {formatDate(selected.targetDate, true)}
              </span>
            )}
            <SafeRecordLink url={selected.repository}>
              <Github size={14} />
              Repository
            </SafeRecordLink>
            <SafeRecordLink url={selected.url}>Live / reference</SafeRecordLink>
          </div>
          <div className="stats-grid planning-stats">
            <Stat
              label="Tasks completed"
              value={`${linkedTasks.filter(isDone).length}/${linkedTasks.length}`}
              icon={<Check size={18} />}
            />
            <Stat
              label="Milestones"
              value={`${milestones.filter(isDone).length}/${milestones.length}`}
              icon={<Milestone size={18} />}
            />
            <Stat
              label="Estimated effort"
              value={minutesLabel(estimated)}
              hint="From linked tasks"
            />
            <Stat
              label="Actual effort"
              value={minutesLabel(actual)}
              hint="From linked task entries"
            />
          </div>
          <Tabs
            options={[
              { id: "overview", label: "Overview" },
              { id: "tasks", label: "Tasks", count: linkedTasks.length },
              {
                id: "milestones",
                label: "Milestones",
                count: milestones.length,
              },
              { id: "notes", label: "Notes", count: notes.length },
            ]}
            value={detailTab}
            onChange={setDetailTab}
          />

          {detailTab === "overview" && (
            <div className="pj-overview-grid">
              <div className="stack">
                <Panel title="The bigger picture" action={<Target size={17} />}>
                  {selected.goals ? (
                    <div className="pj-goals">
                      <h3>Goals & acceptance criteria</h3>
                      <Markdown>{selected.goals}</Markdown>
                    </div>
                  ) : (
                    <p className="muted">
                      What would make this project a success? Add goals in the
                      project editor.
                    </p>
                  )}
                  {selected.body && (
                    <div className="pj-brief">
                      <h3>Project brief</h3>
                      <Markdown>{selected.body}</Markdown>
                    </div>
                  )}
                  {selected.technologies && (
                    <div className="pj-technology-tags">
                      {selected.technologies
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean)
                        .map((technology, index) => (
                          <Badge key={`${technology}-${index}`}>
                            {technology}
                          </Badge>
                        ))}
                    </div>
                  )}
                  {selected.localPath && (
                    <div className="pj-local-path">
                      <span>Local folder · reference</span>
                      <code>{selected.localPath}</code>
                    </div>
                  )}
                  <div className="pj-project-dates">
                    <span>
                      Started{" "}
                      <b>
                        {selected.startDate
                          ? formatDate(selected.startDate, true)
                          : "Not set"}
                      </b>
                    </span>
                    <span>
                      Target{" "}
                      <b>
                        {selected.targetDate
                          ? formatDate(selected.targetDate, true)
                          : "Not set"}
                      </b>
                    </span>
                  </div>
                </Panel>
                <Panel
                  title="Next up"
                  action={
                    <Button
                      variant="ghost"
                      onClick={() => setDetailTab("tasks")}
                    >
                      All tasks
                      <ArrowRight size={14} />
                    </Button>
                  }
                >
                  {linkedTasks.filter((item) => !isDone(item)).length ? (
                    <div className="stack-sm">
                      {linkedTasks
                        .filter((item) => !isDone(item))
                        .sort((a, b) =>
                          (a.dueDate || "9999").localeCompare(
                            b.dueDate || "9999",
                          ),
                        )
                        .slice(0, 4)
                        .map((item) => (
                          <PlanningRecord
                            key={item.id}
                            item={item}
                            items={items}
                            settings={settings}
                            readOnly={readOnly}
                            onEdit={edit}
                            onDelete={setDeleting}
                            onComplete={(item) => completeTask(item.id)}
                            hideLinks
                          />
                        ))}
                    </div>
                  ) : (
                    <Empty
                      title={
                        linkedTasks.length
                          ? "All caught up"
                          : "Make the next step clear"
                      }
                      description={
                        linkedTasks.length
                          ? "Every linked task is complete. Nice work."
                          : "Break the work into small, doable tasks."
                      }
                      action={
                        <Button
                          disabled={readOnly}
                          onClick={() => createLinked("task")}
                        >
                          Add a task
                        </Button>
                      }
                    />
                  )}
                </Panel>
              </div>
              <div className="stack">
                <Panel
                  title="Milestone map"
                  action={
                    <Button
                      variant="ghost"
                      onClick={() => setDetailTab("milestones")}
                    >
                      View all
                      <ArrowRight size={14} />
                    </Button>
                  }
                >
                  {milestones.length ? (
                    <div className="pj-milestone-map">
                      {milestones.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          className={cx(
                            "pj-milestone-step",
                            isDone(item) && "pj-milestone-done",
                          )}
                          onClick={() => edit(item)}
                        >
                          <span className="pj-milestone-number">
                            {isDone(item) ? <Check size={14} /> : index + 1}
                          </span>
                          <span>
                            <strong>{item.title}</strong>
                            <small>
                              {item.dueDate
                                ? formatDate(item.dueDate)
                                : item.status?.replaceAll("-", " ") ||
                                  "planned"}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="Your checkpoints go here"
                      description="Milestones keep a bigger project grounded."
                      action={
                        <Button
                          disabled={readOnly}
                          onClick={() => createLinked("milestone")}
                        >
                          Add milestone
                        </Button>
                      }
                    />
                  )}
                  {milestones.length > 0 && (
                    <Progress
                      value={percent(
                        milestones.filter(isDone).length,
                        milestones.length,
                      )}
                      label={`${milestones.filter(isDone).length} of ${milestones.length} reached`}
                    />
                  )}
                </Panel>
                <Panel title="Project notes">
                  <p className="muted">
                    Keep decisions, resources, and the things you learned close
                    to the work.
                  </p>
                  <Button
                    disabled={readOnly}
                    onClick={() => createLinked("note")}
                  >
                    <BookOpen size={15} />
                    Capture a note
                  </Button>
                  {notes.length > 0 && (
                    <div className="pj-note-links">
                      {notes.slice(0, 4).map((note) => (
                        <button
                          key={note.id}
                          onClick={() => {
                            touch(note.id);
                            navigate("notes", note.id);
                          }}
                        >
                          {note.title}
                          <ArrowRight size={13} />
                        </button>
                      ))}
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          )}

          {detailTab === "tasks" && (
            <Panel
              title="Linked tasks"
              action={
                <Button
                  disabled={readOnly}
                  onClick={() => createLinked("task")}
                >
                  <Plus size={15} />
                  Add task
                </Button>
              }
            >
              {linkedTasks.length ? (
                <div className="stack-sm">
                  {linkedTasks
                    .sort(
                      (a, b) =>
                        Number(isDone(a)) - Number(isDone(b)) ||
                        (a.dueDate || "9999").localeCompare(
                          b.dueDate || "9999",
                        ),
                    )
                    .map((item) => (
                      <PlanningRecord
                        key={item.id}
                        item={item}
                        items={items}
                        settings={settings}
                        readOnly={readOnly}
                        onEdit={edit}
                        onDelete={setDeleting}
                        onComplete={(item) => completeTask(item.id)}
                      />
                    ))}
                </div>
              ) : (
                <Empty
                  icon={<List size={26} />}
                  title="Small steps, real progress"
                  description="Create a task here, or link an existing task to this project in Planner."
                  action={
                    <Button
                      variant="primary"
                      disabled={readOnly}
                      onClick={() => createLinked("task")}
                    >
                      Create first task
                    </Button>
                  }
                />
              )}
            </Panel>
          )}

          {detailTab === "milestones" && (
            <Panel
              title="Milestones"
              action={
                <Button
                  disabled={readOnly}
                  onClick={() => createLinked("milestone")}
                >
                  <Plus size={15} />
                  Add milestone
                </Button>
              }
            >
              {milestones.length ? (
                <div className="pj-milestone-list">
                  {milestones.map((item, index) => (
                    <article className="pj-milestone-row" key={item.id}>
                      <button
                        className={cx(
                          "planning-check",
                          isDone(item) && "is-checked",
                        )}
                        type="button"
                        disabled={readOnly}
                        aria-label={`${isDone(item) ? "Reopen" : "Complete"} milestone: ${item.title}`}
                        aria-pressed={isDone(item)}
                        onClick={() =>
                          update(item.id, {
                            status: isDone(item) ? "planned" : "completed",
                            completedAt: isDone(item)
                              ? undefined
                              : new Date().toISOString(),
                          })
                        }
                      >
                        {isDone(item) ? (
                          <Check size={14} />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </button>
                      <div>
                        <button
                          className="planning-record-title"
                          onClick={() => edit(item)}
                        >
                          {item.title}
                        </button>
                        {item.description && <p>{item.description}</p>}
                        <span className="muted small">
                          {item.dueDate
                            ? `Target ${formatDate(item.dueDate, true)}`
                            : "No target date"}
                        </span>
                      </div>
                      <Badge tone={isDone(item) ? "success" : "neutral"}>
                        {item.status?.replaceAll("-", " ") || "planned"}
                      </Badge>
                      <div className="planning-record-actions">
                        <Button
                          variant="ghost"
                          onClick={() => edit(item)}
                          aria-label={`Edit milestone ${item.title}`}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={readOnly}
                          onClick={() => setDeleting(item)}
                          aria-label={`Delete milestone ${item.title}`}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={<Milestone size={26} />}
                  title="Define your first checkpoint"
                  description="A milestone marks a meaningful outcome, not just a busy day."
                  action={
                    <Button
                      disabled={readOnly}
                      onClick={() => createLinked("milestone")}
                    >
                      Create milestone
                    </Button>
                  }
                />
              )}
            </Panel>
          )}

          {detailTab === "notes" && (
            <Panel
              title="Project notes"
              action={
                <Button
                  disabled={readOnly}
                  onClick={() => createLinked("note")}
                >
                  <Plus size={15} />
                  Add note
                </Button>
              }
            >
              {notes.length ? (
                <div className="pj-notes-grid">
                  {notes.map((note) => (
                    <article className="pj-note-card" key={note.id}>
                      <div className="row-between">
                        <BookOpen size={18} />
                        <div className="planning-record-actions">
                          <Button
                            variant="ghost"
                            onClick={() => edit(note)}
                            aria-label={`Edit ${note.title}`}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={readOnly}
                            onClick={() => setDeleting(note)}
                            aria-label={`Delete ${note.title}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      <button
                        className="pj-card-title"
                        onClick={() => {
                          touch(note.id);
                          navigate("notes", note.id);
                        }}
                      >
                        {note.title}
                        <ArrowRight size={14} />
                      </button>
                      <p>
                        {note.body?.slice(0, 180) || "No content yet."}
                        {(note.body?.length || 0) > 180 ? "…" : ""}
                      </p>
                      <SafeRecordLink url={note.url}>Reference</SafeRecordLink>
                      <small className="muted">
                        Updated {formatDate(note.updatedAt)}
                      </small>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={<BookOpen size={26} />}
                  title="Keep the context"
                  description="Capture a decision or resource. These notes also appear in your Notes workspace."
                  action={
                    <Button
                      disabled={readOnly}
                      onClick={() => createLinked("note")}
                    >
                      Write a note
                    </Button>
                  }
                />
              )}
            </Panel>
          )}
          <div className="pj-detail-bottom">
            <span className="muted small">
              Created {formatDate(selected.createdAt, true)} · updated{" "}
              {formatDate(selected.updatedAt, true)}
            </span>
            <Button
              variant="ghost"
              disabled={readOnly}
              onClick={() => setDeleting(selected)}
            >
              <Trash2 size={14} />
              Delete project
            </Button>
          </div>
        </>
      ) : (
        <>
          <PageHeader
            eyebrow="LEARN BY BUILDING"
            title="Projects"
            description="Turn what you’re learning into something real."
            actions={
              <>
                <Button
                  disabled={readOnly}
                  onClick={() => setShowTemplates(true)}
                >
                  <Sparkles size={16} />
                  Templates
                </Button>
                <Button
                  variant="primary"
                  disabled={readOnly}
                  onClick={() => newProject()}
                >
                  <Plus size={16} />
                  New project
                </Button>
              </>
            }
          />
          {hashId &&
            hashId !== "new" &&
            ready &&
            !items.some((item) => item.id === hashId) && (
              <div className="planning-notice">
                This project or milestone is no longer available.
              </div>
            )}
          <div className="stats-grid planning-stats">
            <Stat
              label="All projects"
              value={projects.length}
              icon={<FolderKanban size={18} />}
            />
            <Stat
              label="In progress"
              value={
                projects.filter((item) => item.status === "in-progress").length
              }
              icon={<Rocket size={18} />}
            />
            <Stat
              label="Completed"
              value={projects.filter(isDone).length}
              icon={<Check size={18} />}
            />
            <Stat
              label="Open milestones"
              value={
                items.filter(
                  (item) =>
                    item.kind === "milestone" &&
                    !isDone(item) &&
                    projects.some((project) => project.id === item.projectId),
                ).length
              }
              icon={<Flag size={18} />}
            />
          </div>
          <div className="pj-toolbar">
            <div className="row">
              <input
                aria-label="Search projects"
                type="search"
                placeholder="Find a project…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                aria-label="Filter projects by stage"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All stages</option>
                {columns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.label}
                  </option>
                ))}
              </select>
              {(query || status) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQuery("");
                    setStatus("");
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
            <Tabs
              options={[
                { id: "board", label: "Board" },
                { id: "list", label: "List" },
              ]}
              value={view}
              onChange={setView}
            />
          </div>
          {!projects.length ? (
            <div className="panel pj-empty-panel">
              <Empty
                icon={<FolderKanban size={34} />}
                title="Your next idea belongs here"
                description="Start from a blank canvas or choose a template. Add real tasks, track milestones, and keep your learning connected."
                action={
                  <div className="row">
                    <Button
                      variant="primary"
                      disabled={readOnly}
                      onClick={() => newProject()}
                    >
                      Create a project
                    </Button>
                    <Button
                      disabled={readOnly}
                      onClick={() => setShowTemplates(true)}
                    >
                      Explore templates
                    </Button>
                  </div>
                }
              />
            </div>
          ) : !filtered.length ? (
            <Empty
              title="No projects match"
              description="Try a different search or stage."
              action={
                <Button
                  onClick={() => {
                    setQuery("");
                    setStatus("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : view === "board" ? (
            <div className="pj-board">
              {columns.map((column) => {
                const columnProjects = filtered.filter((project) =>
                  column.id === "planned"
                    ? !projectStatuses.slice(1).includes(project.status || "")
                    : project.status === column.id,
                );
                return (
                  <section
                    className={`pj-board-column pj-column-${column.id}`}
                    key={column.id}
                  >
                    <div className="pj-column-header">
                      <div>
                        <h2>
                          <i />
                          {column.label}
                          <span>{columnProjects.length}</span>
                        </h2>
                        <p>{column.subtitle}</p>
                      </div>
                      <Button
                        variant="ghost"
                        disabled={readOnly}
                        onClick={() => newProject(column.id)}
                        aria-label={`New project in ${column.label}`}
                      >
                        <Plus size={15} />
                      </Button>
                    </div>
                    <div className="pj-column-cards">
                      {columnProjects.map((project) => projectCard(project))}
                      {!columnProjects.length && (
                        <button
                          className="pj-empty-column"
                          disabled={readOnly}
                          onClick={() => newProject(column.id)}
                        >
                          <Plus size={18} />
                          <span>Add a project</span>
                        </button>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="pj-list">
              {filtered.map((project) => projectCard(project, true))}
            </div>
          )}
        </>
      )}

      {showTemplates && (
        <Modal
          wide
          title="A starting point for your next project"
          onClose={() => setShowTemplates(false)}
        >
          <p className="muted">
            Templates add an editable brief and optional planned milestones.
            Progress starts at zero.
          </p>
          <label className="pj-template-checkbox">
            <input
              type="checkbox"
              checked={includeMilestones}
              onChange={(event) => setIncludeMilestones(event.target.checked)}
            />
            Include the suggested milestones
          </label>
          <div className="pj-template-grid">
            {templates.map((template) => (
              <article className="pj-template-card" key={template.id}>
                <span className="pj-project-icon">
                  <Sparkles size={19} />
                </span>
                <h3>{template.title}</h3>
                <p>{template.description}</p>
                <ul>
                  {template.milestones.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
                <Button
                  disabled={readOnly}
                  onClick={() => {
                    setShowTemplates(false);
                    setPendingTemplate(template);
                    setEditor({
                      kind: "project",
                      initial: {
                        status: "planned",
                        startDate: today(),
                        technologies: template.technologies,
                        goals: template.goals,
                      },
                    });
                  }}
                >
                  Use template
                  <ArrowRight size={14} />
                </Button>
              </article>
            ))}
          </div>
        </Modal>
      )}
      {editor && (
        <ItemEditor
          kind={editor.kind}
          initial={editor.initial}
          fields={
            editor.kind === "project"
              ? projectFields
              : editor.kind === "milestone"
                ? [
                    {
                      key: "projectId",
                      label: "Project",
                      type: "select",
                      options: recordOptions(items, "project"),
                      required: projects.length > 0,
                    },
                    ...milestoneFields,
                  ]
                : editor.kind === "task"
                  ? taskFields(items, settings)
                  : noteFields
          }
          onClose={closeEditor}
          onSaved={saved}
          title={`${editor.initial.id ? "Edit" : "New"} ${editor.kind}${pendingTemplate ? ` · ${pendingTemplate.title}` : ""}`}
        />
      )}
      {deleting && (
        <Confirm
          title={`Delete ${deleting.kind}?`}
          message={`“${deleting.title}” will be permanently deleted.${deleting.kind === "project" ? " Linked tasks, notes, and milestones will remain as separate records." : ""}`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            remove(deleting.id);
            if (deleting.id === selectedId) back();
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
