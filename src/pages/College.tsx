import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardList,
  GraduationCap,
  Pencil,
  Plus,
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
  isDone,
  navigate,
  percent,
  today,
} from "../lib/utils";
import {
  attendanceSummary,
  classesNeeded,
  marksSummary,
  recordOptions,
  statusOptions,
  taskFields,
} from "./planningHelpers";
import { SafeRecordLink, usePlanningHash } from "./PlanningShared";
import "./planning.css";

const subjectFields: FieldDef[] = [
  {
    key: "description",
    label: "Course description",
    type: "textarea",
    full: true,
  },
  { key: "category", label: "Semester / term", type: "text" },
  { key: "credits", label: "Credits", type: "number", min: 0 },
  { key: "platform", label: "Course code", type: "text" },
  { key: "language", label: "Instructor", type: "text" },
  {
    key: "target",
    label: "Attendance target (%)",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    key: "status",
    label: "Course status",
    type: "select",
    options: statusOptions(["active", "completed", "planned"]),
  },
  { key: "goals", label: "Learning outcomes", type: "textarea", full: true },
  { key: "url", label: "Course / syllabus URL", type: "url", full: true },
  { key: "tags", label: "Tags", type: "tags", full: true },
];
const tabKind: Record<string, Kind> = {
  syllabus: "topic",
  assignments: "assignment",
  exams: "exam",
  attendance: "attendance",
  marks: "grade",
};
const kindTab: Partial<Record<Kind, string>> = {
  topic: "syllabus",
  assignment: "assignments",
  exam: "exams",
  attendance: "attendance",
  grade: "marks",
};
const assignmentDone = (item: Item) =>
  isDone(item) || item.status === "submitted";

export default function College({ recordId }: { recordId?: string }) {
  const { items, settings, ready, readOnly, update, remove, touch } =
    useStore();
  const [tab, setTab] = useState("overview");
  const [subjectId, setSubjectId] = useState("");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{
    kind: Kind;
    initial: Partial<Item>;
  } | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const hashId = usePlanningHash("college", recordId);
  const lastHash = useRef("");
  const subjects = items.filter(
    (item) => item.kind === "subject" && !item.archived,
  );
  const selected = subjects.find((item) => item.id === subjectId);
  const now = today();
  const hasSubject = (item: Item) =>
    !subjectId ||
    (subjectId === "unassigned"
      ? !subjects.some((subject) => subject.id === item.subjectId)
      : item.subjectId === subjectId);
  const isChapter = (item: Item) =>
    item.kind === "topic" && item.domain === "college";
  const chapters = items.filter(
    (item) => isChapter(item) && hasSubject(item) && !item.archived,
  );
  const assignments = items.filter(
    (item) => item.kind === "assignment" && hasSubject(item) && !item.archived,
  );
  const exams = items.filter(
    (item) => item.kind === "exam" && hasSubject(item) && !item.archived,
  );
  const attendance = items.filter(
    (item) => item.kind === "attendance" && hasSubject(item),
  );
  const grades = items.filter(
    (item) => item.kind === "grade" && hasSubject(item),
  );
  const attendanceTotals = attendanceSummary(attendance);
  const gradeTotals = marksSummary(grades);
  const upcoming = [
    ...assignments.filter((item) => !assignmentDone(item) && item.dueDate),
    ...exams.filter((item) => !isDone(item) && item.date),
  ].sort((a, b) =>
    (a.dueDate || a.date || "").localeCompare(b.dueDate || b.date || ""),
  );
  const pendingAssignments = assignments.filter(
    (item) => !assignmentDone(item),
  );
  const attendanceTarget = selected?.target ?? 75;
  const requiredClasses = classesNeeded(
    attendanceTotals.attended,
    attendanceTotals.total,
    attendanceTarget,
  );

  useEffect(() => {
    if (!hashId) {
      lastHash.current = "";
      return;
    }
    if (!ready || lastHash.current === hashId) return;
    if (hashId === "new") {
      lastHash.current = hashId;
      setTab("overview");
      setEditor({ kind: "subject", initial: { status: "active", target: 75 } });
      return;
    }
    const record = items.find((item) => item.id === hashId);
    if (!record) return;
    if (record.kind === "subject") {
      lastHash.current = hashId;
      setSubjectId(record.id);
      setTab("overview");
      touch(record.id);
    } else if (
      kindTab[record.kind] &&
      (record.kind !== "topic" || record.domain === "college")
    ) {
      lastHash.current = hashId;
      setSubjectId(record.subjectId || "unassigned");
      setTab(kindTab[record.kind]!);
      touch(record.id);
    }
  }, [hashId, items, ready, touch]);

  const subjectField: FieldDef = {
    key: "subjectId",
    label: "Subject",
    type: "select",
    required: subjects.length > 0,
    options: recordOptions(items, "subject"),
  };
  const fieldsFor = (kind: Kind): FieldDef[] => {
    if (kind === "subject") return subjectFields;
    if (kind === "task") return taskFields(items, settings);
    if (kind === "topic")
      return [
        subjectField,
        {
          key: "order",
          label: "Chapter / unit number",
          type: "number",
          min: 0,
        },
        {
          key: "status",
          label: "Progress",
          type: "select",
          options: statusOptions(["not-started", "in-progress", "completed"]),
          required: true,
        },
        {
          key: "duration",
          label: "Estimated study minutes",
          type: "number",
          min: 0,
        },
        {
          key: "actualMinutes",
          label: "Actual study minutes",
          type: "number",
          min: 0,
        },
        { key: "nextRevision", label: "Next revision", type: "date" },
        {
          key: "body",
          label: "Syllabus points / notes",
          type: "textarea",
          full: true,
        },
        {
          key: "url",
          label: "Reading / reference URL",
          type: "url",
          full: true,
        },
        { key: "tags", label: "Tags", type: "tags", full: true },
      ];
    if (kind === "assignment")
      return [
        subjectField,
        { key: "dueDate", label: "Due date", type: "date", required: true },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: statusOptions([
            "todo",
            "in-progress",
            "submitted",
            "completed",
          ]),
          required: true,
        },
        {
          key: "priority",
          label: "Priority",
          type: "select",
          options: statusOptions(settings.priorities),
        },
        { key: "duration", label: "Estimated minutes", type: "number", min: 0 },
        {
          key: "actualMinutes",
          label: "Actual minutes",
          type: "number",
          min: 0,
        },
        {
          key: "description",
          label: "Requirements",
          type: "textarea",
          full: true,
        },
        {
          key: "url",
          label: "Submission / reference URL",
          type: "url",
          full: true,
        },
        {
          key: "noteId",
          label: "Reference note",
          type: "select",
          options: recordOptions(items, "note"),
        },
        { key: "tags", label: "Tags", type: "tags" },
      ];
    if (kind === "exam")
      return [
        subjectField,
        { key: "date", label: "Exam date", type: "date", required: true },
        { key: "startTime", label: "Starts", type: "time" },
        { key: "endTime", label: "Ends", type: "time" },
        {
          key: "category",
          label: "Exam type",
          type: "select",
          options: statusOptions([
            "quiz",
            "midterm",
            "final",
            "practical",
            "other",
          ]),
        },
        {
          key: "status",
          label: "Preparation status",
          type: "select",
          options: statusOptions(["upcoming", "preparing", "completed"]),
        },
        { key: "maxMarks", label: "Maximum marks", type: "number", min: 1 },
        {
          key: "description",
          label: "Room / instructions",
          type: "textarea",
          full: true,
        },
        {
          key: "body",
          label: "Syllabus coverage & preparation plan",
          type: "textarea",
          full: true,
        },
        { key: "url", label: "Reference URL", type: "url", full: true },
      ];
    if (kind === "attendance")
      return [
        subjectField,
        {
          key: "date",
          label: "Date / period ending",
          type: "date",
          required: true,
        },
        {
          key: "attended",
          label: "Classes attended",
          type: "number",
          min: 0,
          required: true,
        },
        {
          key: "total",
          label: "Classes held",
          type: "number",
          min: 1,
          required: true,
        },
        {
          key: "body",
          label: "Notes about this entry",
          type: "textarea",
          full: true,
        },
      ];
    return [
      subjectField,
      { key: "date", label: "Assessment date", type: "date", required: true },
      {
        key: "category",
        label: "Assessment type",
        type: "select",
        options: statusOptions([
          "assignment",
          "quiz",
          "midterm",
          "final",
          "practical",
          "other",
        ]),
      },
      {
        key: "marks",
        label: "Marks earned",
        type: "number",
        min: 0,
        required: true,
      },
      {
        key: "maxMarks",
        label: "Marks possible",
        type: "number",
        min: 1,
        required: true,
      },
      {
        key: "body",
        label: "Feedback / reflection",
        type: "textarea",
        full: true,
      },
    ];
  };
  const defaultsFor = (kind: Kind): Partial<Item> => ({
    ...(selected ? { subjectId: selected.id } : {}),
    ...(kind === "topic"
      ? { domain: "college", status: "not-started", order: chapters.length + 1 }
      : kind === "assignment"
        ? {
            status: "todo",
            dueDate: now,
            priority: settings.priorities[1] || settings.priorities[0],
          }
        : kind === "exam"
          ? { status: "upcoming", date: now }
          : kind === "attendance"
            ? { date: now, attended: 1, total: 1 }
            : kind === "grade"
              ? { date: now, maxMarks: 100 }
              : {}),
  });
  const newSubject = () =>
    setEditor({ kind: "subject", initial: { status: "active", target: 75 } });
  const openSubject = (item: Item) => {
    setSubjectId(item.id);
    setTab("overview");
    navigate("college", item.id);
    touch(item.id);
  };
  const changeTab = (value: string) => {
    setTab(value);
    if (hashId) navigate("college");
  };
  const closeEditor = () => {
    setEditor(null);
    if (
      hashId === "new" &&
      window.location.hash.replace(/^#\/?/, "") === "college/new"
    )
      navigate("college");
  };
  const edit = (item: Item) => {
    setEditor({ kind: item.kind, initial: item });
    touch(item.id);
  };
  const resetSubject = () => {
    setSubjectId("");
    if (hashId) navigate("college");
  };
  const managerTitle: Record<string, string> = {
    syllabus: "Syllabus chapters",
    assignments: "Assignments",
    exams: "Exams",
    attendance: "Attendance entries",
    marks: "Marks & assessments",
  };
  const managerDescription: Record<string, string> = {
    syllabus:
      "Break each subject into chapters. Mark progress as you study and set your next revision.",
    assignments: "Track requirements, due dates, submissions, and time spent.",
    exams:
      "Plan exam dates, syllabus coverage, and preparation. Enter results in Marks.",
    attendance:
      "Enter each class or a non-overlapping period once. Totals sum your manual entries.",
    marks:
      "Record each assessment once. Overall percentage is total earned marks ÷ total possible marks.",
  };
  const managerStatuses: Record<string, string[]> = {
    syllabus: ["not-started", "in-progress", "completed"],
    assignments: ["todo", "in-progress", "submitted", "completed"],
    exams: ["upcoming", "preparing", "completed"],
  };

  return (
    <div className="planning-page college-page">
      <PageHeader
        eyebrow="YOUR ACADEMIC HOME"
        title="College"
        description="Less scattered coursework. More space to learn."
        actions={
          <>
            <Button
              disabled={readOnly || !subjects.length}
              onClick={() =>
                setEditor({
                  kind: "assignment",
                  initial: defaultsFor("assignment"),
                })
              }
            >
              <ClipboardList size={16} />
              Add assignment
            </Button>
            <Button variant="primary" disabled={readOnly} onClick={newSubject}>
              <Plus size={16} />
              New subject
            </Button>
          </>
        }
      />
      {hashId &&
        hashId !== "new" &&
        ready &&
        !items.some((item) => item.id === hashId) && (
          <div className="planning-notice">
            This academic record is no longer available.
          </div>
        )}
      <div className="co-scope-bar">
        <div>
          <GraduationCap size={19} />
          <select
            aria-label="Select subject"
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              if (hashId) navigate("college");
            }}
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.title}
              </option>
            ))}
            <option value="unassigned">Unassigned records</option>
          </select>
        </div>
        <span className="muted small">
          {selected
            ? `${selected.category || "No term set"}${selected.credits !== undefined ? ` · ${selected.credits} credits` : ""}`
            : `${subjects.length} ${subjects.length === 1 ? "subject" : "subjects"} · your entered data, in one place`}
        </span>
        {selected && (
          <Button variant="ghost" onClick={resetSubject}>
            Clear selection
          </Button>
        )}
      </div>
      <div className="stats-grid planning-stats">
        <Stat
          label="Syllabus progress"
          value={
            chapters.length
              ? `${percent(chapters.filter(isDone).length, chapters.length)}%`
              : "—"
          }
          hint={`${chapters.filter(isDone).length} of ${chapters.length} chapters complete`}
          icon={<BookOpen size={18} />}
        />
        <Stat
          label="Open assignments"
          value={pendingAssignments.length}
          hint={`${pendingAssignments.filter((item) => item.dueDate && item.dueDate < now).length} overdue · ${pendingAssignments.filter((item) => item.dueDate && item.dueDate >= now && item.dueDate <= addDays(now, 7)).length} due in 7 days`}
          icon={<ClipboardList size={18} />}
        />
        <Stat
          label="Attendance"
          value={
            attendanceTotals.percentage === null
              ? "—"
              : `${attendanceTotals.percentage}%`
          }
          hint={
            attendanceTotals.total
              ? `${attendanceTotals.attended} of ${attendanceTotals.total} classes attended`
              : "No attendance entered"
          }
          icon={<Check size={18} />}
        />
        <Stat
          label="Marks earned"
          value={
            gradeTotals.percentage === null ? "—" : `${gradeTotals.percentage}%`
          }
          hint={
            gradeTotals.maximum
              ? `${gradeTotals.marks} / ${gradeTotals.maximum} total points`
              : "No assessments entered"
          }
          icon={<Target size={18} />}
        />
      </div>
      <Tabs
        options={[
          { id: "overview", label: "Overview" },
          { id: "syllabus", label: "Syllabus", count: chapters.length },
          {
            id: "assignments",
            label: "Assignments",
            count: assignments.length,
          },
          { id: "exams", label: "Exams", count: exams.length },
          { id: "attendance", label: "Attendance" },
          { id: "marks", label: "Marks" },
        ]}
        value={tab}
        onChange={changeTab}
      />

      {tab === "overview" && (
        <>
          {selected ? (
            <div className="co-subject-detail">
              <Panel
                title={selected.title}
                action={
                  <div className="row">
                    <Button variant="ghost" onClick={() => edit(selected)}>
                      <Pencil size={14} />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={readOnly}
                      aria-label={`Delete ${selected.title}`}
                      onClick={() => setDeleting(selected)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                }
              >
                <div className="co-subject-meta">
                  {selected.platform && <Badge>{selected.platform}</Badge>}
                  <Badge tone={isDone(selected) ? "success" : "accent"}>
                    {selected.status || "active"}
                  </Badge>
                  {selected.language && (
                    <span className="muted small">
                      Instructor: {selected.language}
                    </span>
                  )}
                  <SafeRecordLink url={selected.url}>
                    Course material
                  </SafeRecordLink>
                </div>
                {selected.description && (
                  <p className="co-subject-description">
                    {selected.description}
                  </p>
                )}
                {selected.goals && (
                  <div className="co-learning-goals">
                    <h3>Learning outcomes</h3>
                    <Markdown>{selected.goals}</Markdown>
                  </div>
                )}
                <div className="co-subject-quick-actions">
                  <Button
                    disabled={readOnly}
                    onClick={() =>
                      setEditor({
                        kind: "topic",
                        initial: defaultsFor("topic"),
                      })
                    }
                  >
                    <Plus size={14} />
                    Add chapter
                  </Button>
                  <Button
                    disabled={readOnly}
                    onClick={() =>
                      setEditor({
                        kind: "task",
                        initial: {
                          subjectId: selected.id,
                          status: "todo",
                          dueDate: now,
                        },
                      })
                    }
                  >
                    <CalendarDays size={14} />
                    Plan study task
                  </Button>
                  <Button onClick={() => changeTab("marks")}>
                    View assessments
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </Panel>
              <Panel title="Attendance outlook" action={<Check size={17} />}>
                <div className="co-attendance-value">
                  {attendanceTotals.percentage === null
                    ? "—"
                    : `${attendanceTotals.percentage}%`}
                  <span>target {attendanceTarget}%</span>
                </div>
                <Progress
                  value={attendanceTotals.percentage || 0}
                  label={`${attendanceTotals.attended} attended / ${attendanceTotals.total} held`}
                />
                <p
                  className={
                    attendanceTotals.percentage !== null &&
                    attendanceTotals.percentage < attendanceTarget
                      ? "co-attendance-warning"
                      : "muted"
                  }
                >
                  {!attendanceTotals.total
                    ? "Add attendance entries to see where you stand."
                    : requiredClasses === Infinity
                      ? "Past absences mean a cumulative 100% target cannot be reached by adding future classes."
                      : requiredClasses > 0
                        ? `Attend the next ${requiredClasses} ${requiredClasses === 1 ? "class" : "classes"} consecutively to reach your ${attendanceTarget}% target.`
                        : "You’re meeting your attendance target. Keep it steady."}
                </p>
                <Button
                  disabled={readOnly}
                  onClick={() =>
                    setEditor({
                      kind: "attendance",
                      initial: defaultsFor("attendance"),
                    })
                  }
                >
                  Log attendance
                  <ArrowRight size={14} />
                </Button>
              </Panel>
            </div>
          ) : (
            <Panel
              title={
                subjectId === "unassigned"
                  ? "Unassigned coursework"
                  : "Your subjects"
              }
              action={
                subjects.length > 0 && subjectId !== "unassigned" ? (
                  <input
                    aria-label="Search subjects"
                    type="search"
                    placeholder="Find a subject…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                ) : undefined
              }
            >
              {subjectId === "unassigned" ? (
                <Empty
                  title="Keep your coursework connected"
                  description="Use the tabs above to find records without a subject, then edit them to choose a subject."
                  action={
                    <Button onClick={() => changeTab("syllabus")}>
                      Browse unassigned chapters
                    </Button>
                  }
                />
              ) : subjects.length ? (
                <div className="co-subject-grid">
                  {subjects
                    .filter((subject) =>
                      `${subject.title} ${subject.category || ""} ${subject.platform || ""}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((subject) => {
                      const subjectChapters = items.filter(
                        (item) =>
                          isChapter(item) &&
                          item.subjectId === subject.id &&
                          !item.archived,
                      );
                      const completed = subjectChapters.filter(isDone).length;
                      const attendance = attendanceSummary(
                        items.filter(
                          (item) =>
                            item.kind === "attendance" &&
                            item.subjectId === subject.id,
                        ),
                      );
                      const openAssignments = items.filter(
                        (item) =>
                          item.kind === "assignment" &&
                          item.subjectId === subject.id &&
                          !assignmentDone(item) &&
                          !item.archived,
                      ).length;
                      return (
                        <article className="co-subject-card" key={subject.id}>
                          <div className="row-between">
                            <span className="co-subject-icon">
                              <BookOpen size={20} />
                            </span>
                            <div className="planning-record-actions">
                              <Button
                                variant="ghost"
                                onClick={() => edit(subject)}
                                aria-label={`Edit ${subject.title}`}
                              >
                                <Pencil size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                disabled={readOnly}
                                onClick={() => setDeleting(subject)}
                                aria-label={`Delete ${subject.title}`}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                          <div className="co-subject-label">
                            {subject.platform || subject.category || "SUBJECT"}
                            {subject.credits !== undefined && (
                              <span>{subject.credits} credits</span>
                            )}
                          </div>
                          <button
                            className="pj-card-title"
                            onClick={() => openSubject(subject)}
                          >
                            {subject.title}
                            <ArrowRight size={15} />
                          </button>
                          <p>
                            {subject.description ||
                              "Your syllabus, deadlines, and progress in one place."}
                          </p>
                          <Progress
                            value={percent(completed, subjectChapters.length)}
                            label={
                              subjectChapters.length
                                ? `${completed} / ${subjectChapters.length} chapters complete`
                                : "No syllabus chapters yet"
                            }
                          />
                          <div className="co-subject-card-footer">
                            <span>
                              {openAssignments} open{" "}
                              {openAssignments === 1
                                ? "assignment"
                                : "assignments"}
                            </span>
                            <span>
                              {attendance.percentage === null
                                ? "Attendance —"
                                : `${attendance.percentage}% attendance`}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  {!subjects.some((subject) =>
                    `${subject.title} ${subject.category || ""} ${subject.platform || ""}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  ) && (
                    <Empty
                      title="No subjects match"
                      action={
                        <Button onClick={() => setQuery("")}>
                          Clear search
                        </Button>
                      }
                    />
                  )}
                </div>
              ) : (
                <Empty
                  icon={<GraduationCap size={32} />}
                  title="Make this semester yours"
                  description="Add your first subject, then bring its syllabus, assignments, exams, and results together."
                  action={
                    <Button
                      variant="primary"
                      disabled={readOnly}
                      onClick={newSubject}
                    >
                      Add first subject
                    </Button>
                  }
                />
              )}
            </Panel>
          )}
          <div className="co-overview-bottom">
            <Panel title="On the horizon" action={<CalendarDays size={17} />}>
              {upcoming.length ? (
                <div className="co-deadline-list">
                  {upcoming.slice(0, 6).map((item) => {
                    const due = item.dueDate || item.date!;
                    const subject = subjects.find(
                      (subject) => subject.id === item.subjectId,
                    );
                    return (
                      <button
                        key={item.id}
                        className="co-deadline"
                        onClick={() => {
                          setTab(kindTab[item.kind]!);
                          navigate("college", item.id);
                        }}
                      >
                        <span
                          className={cx(
                            "co-deadline-date",
                            due < now && "co-deadline-overdue",
                          )}
                        >
                          <b>{Number(due.slice(8))}</b>
                          <small>
                            {new Date(`${due}T12:00:00`).toLocaleDateString(
                              "en-GB",
                              { month: "short" },
                            )}
                          </small>
                        </span>
                        <span>
                          <strong>{item.title}</strong>
                          <small>
                            {subject?.title || "Unassigned"} ·{" "}
                            {item.kind === "exam" ? "Exam" : "Assignment"}
                            {due < now
                              ? " · overdue"
                              : due === now
                                ? " · today"
                                : ""}
                          </small>
                        </span>
                        <ArrowRight size={15} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  title="A little breathing room"
                  description="Your open assignment deadlines and exam dates will appear here."
                  action={
                    <Button
                      disabled={readOnly || !subjects.length}
                      onClick={() =>
                        setEditor({
                          kind: "exam",
                          initial: defaultsFor("exam"),
                        })
                      }
                    >
                      Add an exam
                    </Button>
                  }
                />
              )}
              {upcoming.length > 6 && (
                <p className="muted small">
                  {upcoming.length - 6} more deadlines in Assignments and Exams.
                </p>
              )}
            </Panel>
            <Panel
              title="Syllabus check-in"
              action={
                <Button variant="ghost" onClick={() => changeTab("syllabus")}>
                  All chapters
                  <ArrowRight size={14} />
                </Button>
              }
            >
              {chapters.length ? (
                <>
                  <Progress
                    value={percent(
                      chapters.filter(isDone).length,
                      chapters.length,
                    )}
                    label={`${chapters.filter(isDone).length} of ${chapters.length} chapters completed`}
                  />
                  <div className="co-chapter-list">
                    {chapters
                      .filter((item) => !isDone(item))
                      .sort((a, b) => (a.order || 0) - (b.order || 0))
                      .slice(0, 5)
                      .map((item) => (
                        <div className="co-chapter-row" key={item.id}>
                          <button
                            className="planning-check"
                            type="button"
                            disabled={readOnly}
                            aria-label={`Complete chapter: ${item.title}`}
                            onClick={() =>
                              update(item.id, {
                                status: "completed",
                                completedAt: new Date().toISOString(),
                              })
                            }
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="planning-record-title"
                            onClick={() => {
                              setTab("syllabus");
                              navigate("college", item.id);
                            }}
                          >
                            {item.title}
                          </button>
                          {item.nextRevision && (
                            <span className="muted small">
                              Revise {formatDate(item.nextRevision)}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                  {chapters.every(isDone) && (
                    <p className="co-syllabus-complete">
                      <Check size={16} />
                      Every entered chapter is complete. Time for a revision?
                    </p>
                  )}
                </>
              ) : (
                <Empty
                  title="Break it down into chapters"
                  description="Small, visible units make a long syllabus feel manageable."
                  action={
                    <Button
                      disabled={readOnly || !subjects.length}
                      onClick={() =>
                        setEditor({
                          kind: "topic",
                          initial: defaultsFor("topic"),
                        })
                      }
                    >
                      Add a chapter
                    </Button>
                  }
                />
              )}
            </Panel>
          </div>
        </>
      )}

      {tab !== "overview" && (
        <>
          {tab === "attendance" && attendance.length > 0 && (
            <div className="co-calculation-note">
              <Check size={18} />
              <div>
                <strong>
                  {attendanceTotals.attended} attended ÷{" "}
                  {attendanceTotals.total} held = {attendanceTotals.percentage}%
                </strong>
                <p>
                  These are manually entered totals. Avoid entering the same
                  class or overlapping periods twice.
                  {selected
                    ? ` Target: ${attendanceTarget}%.`
                    : " Select a subject for its individual attendance target."}
                </p>
              </div>
            </div>
          )}
          {tab === "marks" && grades.length > 0 && (
            <div className="co-calculation-note">
              <Target size={18} />
              <div>
                <strong>
                  {gradeTotals.marks} earned ÷ {gradeTotals.maximum} possible ={" "}
                  {gradeTotals.percentage}%
                </strong>
                <p>
                  Assessments contribute by their maximum marks. This is a
                  points percentage, not an inferred GPA or institution-specific
                  grade.
                </p>
              </div>
            </div>
          )}
          {subjects.length > 0 ||
          items.some(
            (item) =>
              item.kind === tabKind[tab] &&
              (tab !== "syllabus" || item.domain === "college"),
          ) ? (
            <RecordManager
              key={`${tab}-${subjectId}`}
              kind={tabKind[tab]}
              title={managerTitle[tab]}
              description={managerDescription[tab]}
              fields={fieldsFor(tabKind[tab])}
              defaults={defaultsFor(tabKind[tab])}
              statuses={managerStatuses[tab]}
              filter={(item) =>
                hasSubject(item) &&
                (tab !== "syllabus" || item.domain === "college")
              }
              empty={`No ${tab === "marks" ? "assessments" : tab === "syllabus" ? "chapters" : tab === "attendance" ? "attendance entries" : tab} ${selected ? `for ${selected.title}` : "yet"}. Add an entry to get started.`}
            />
          ) : (
            <Panel>
              <Empty
                icon={<GraduationCap size={28} />}
                title="Start with a subject"
                description="Create a subject to give your coursework a home."
                action={
                  <Button
                    variant="primary"
                    disabled={readOnly}
                    onClick={newSubject}
                  >
                    Add a subject
                  </Button>
                }
              />
            </Panel>
          )}
          {tab === "syllabus" && chapters.length > 0 && (
            <div className="co-calculation-note">
              <BookOpen size={18} />
              <p>
                Progress is calculated from the chapters you have entered. Each
                chapter counts equally. Add your full syllabus for a complete
                picture.
              </p>
            </div>
          )}
        </>
      )}

      {editor && (
        <ItemEditor
          kind={editor.kind}
          initial={editor.initial}
          fields={fieldsFor(editor.kind)}
          onClose={closeEditor}
          onSaved={(item) => {
            closeEditor();
            if (item.kind === "subject") openSubject(item);
          }}
          title={`${editor.initial.id ? "Edit" : "New"} ${editor.kind === "topic" ? "syllabus chapter" : editor.kind === "grade" ? "assessment" : editor.kind}`}
        />
      )}
      {deleting && (
        <Confirm
          title="Delete subject?"
          message={`“${deleting.title}” will be permanently deleted. Its coursework and results will remain under Unassigned records.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            remove(deleting.id);
            if (subjectId === deleting.id) resetSubject();
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
