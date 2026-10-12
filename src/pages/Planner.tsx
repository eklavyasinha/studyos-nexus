import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListTodo,
  Plus,
  Sparkles,
  Timer,
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
  Stat,
  Tabs,
} from "../components/ui";
import { useStore } from "../lib/store";
import type { Item } from "../lib/types";
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
  calendarDays,
  eventFields,
  findConflicts,
  minutesLabel,
  occurrencesFor,
  reviewFields,
  scheduledDate,
  shiftMonth,
  taskFields,
  timeLabel,
  weekStart,
  type Occurrence,
} from "./planningHelpers";
import { PlanningRecord, usePlanningHash } from "./PlanningShared";
import "./planning.css";

type View = "day" | "week" | "month" | "agenda";
type EditState = { kind: "task" | "event" | "review"; initial: Partial<Item> };
const views = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "agenda", label: "Agenda" },
];
const buckets = [
  { id: "all", label: "All plans" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
];

export default function Planner({ recordId }: { recordId?: string }) {
  const { items, settings, ready, readOnly, remove, completeTask, touch } =
    useStore();
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(today);
  const [bucket, setBucket] = useState("all");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("");
  const [editor, setEditor] = useState<EditState | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [reviewPeriod, setReviewPeriod] = useState("daily");
  const hashId = usePlanningHash("planner", recordId);
  const lastHash = useRef("");
  const now = today();
  const records = items.filter(
    (item) => ["task", "event"].includes(item.kind) && !item.archived,
  );
  const tasks = records.filter((item) => item.kind === "task");
  const subjects = items.filter((item) => item.kind === "subject");
  const week = weekStart(date, settings.weekStart);
  const dates = useMemo(
    () =>
      view === "month"
        ? calendarDays(date, settings.weekStart)
        : view === "week"
          ? Array.from({ length: 7 }, (_, index) => addDays(week, index))
          : [date],
    [date, week, settings.weekStart, view],
  );

  useEffect(() => {
    if (!hashId) {
      lastHash.current = "";
      return;
    }
    if (hashId === lastHash.current || !ready) return;
    if (hashId === "new") {
      lastHash.current = hashId;
      setEditor({
        kind: "task",
        initial: {
          dueDate: today(),
          status: "todo",
          priority: settings.priorities[1] || settings.priorities[0],
        },
      });
      return;
    }
    const item = items.find(
      (record) =>
        record.id === hashId &&
        ["task", "event", "review"].includes(record.kind),
    );
    if (item) {
      lastHash.current = hashId;
      setEditor({ kind: item.kind as EditState["kind"], initial: item });
      if (scheduledDate(item)) setDate(scheduledDate(item)!);
      touch(item.id);
    }
  }, [hashId, items, ready, touch, settings.priorities]);

  const allOccurrences = useMemo(() => {
    if (view !== "agenda") return occurrencesFor(records, dates);
    const recurring = records.filter(
      (item) =>
        item.kind === "event" &&
        ["daily", "weekly", "monthly"].includes(item.recurrence || "") &&
        !isDone(item) &&
        item.status !== "cancelled",
    );
    const single = records.filter((item) => !recurring.includes(item));
    const singleDates = [
      ...new Set(
        single.map(scheduledDate).filter((day): day is string => !!day),
      ),
    ];
    return [
      ...occurrencesFor(single, singleDates),
      ...occurrencesFor(
        recurring,
        Array.from({ length: 31 }, (_, index) => addDays(now, index)),
      ),
    ].sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        (a.record.startTime || "99").localeCompare(b.record.startTime || "99"),
    );
  }, [records, dates, view, now]);
  const matchesRecord = (item: Item) =>
    (!query ||
      `${item.title} ${item.description || ""} ${(item.tags || []).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase())) &&
    (!priority || item.priority === priority) &&
    (!subject || item.subjectId === subject) &&
    (!type || item.kind === type);
  const matchesBucket = (item: Item, day?: string) =>
    bucket === "all" ||
    (bucket === "completed" && isDone(item)) ||
    (bucket === "today" && day === now) ||
    (bucket === "overdue" &&
      !item.sessionType?.startsWith("optional") &&
      item.kind === "task" &&
      !isDone(item) &&
      !!day &&
      day < now) ||
    (bucket === "upcoming" &&
      !isDone(item) &&
      item.status !== "cancelled" &&
      !!day &&
      day > now);
  const visible = allOccurrences.filter(
    ({ record, day }) => matchesRecord(record) && matchesBucket(record, day),
  );
  const unscheduled = tasks.filter(
    (item) => !item.dueDate && matchesRecord(item) && matchesBucket(item),
  );
  const conflicts = findConflicts(allOccurrences);
  const conflictingKeys = new Set(
    conflicts.flatMap((conflict) => [conflict.first.key, conflict.second.key]),
  );
  const todayTasks = tasks.filter((item) => item.dueDate === now);
  const overdue = tasks.filter(
    (item) =>
      !isDone(item) &&
      !item.archived &&
      item.status !== "cancelled" &&
      !item.sessionType?.startsWith("optional") &&
      !!item.dueDate &&
      item.dueDate < now,
  );
  const todayPlanned = occurrencesFor(records, [now])
    .filter(({ record }) => record.status !== "cancelled")
    .reduce((sum, { record }) => sum + (record.duration || 0), 0);
  const weekTasks = tasks.filter(
    (item) =>
      !!item.dueDate &&
      item.dueDate >= week &&
      item.dueDate <= addDays(week, 6),
  );
  const completedWeek = weekTasks.filter(isDone).length;
  const reviewStart = reviewPeriod === "weekly" ? week : date;
  const reviewEnd = reviewPeriod === "weekly" ? addDays(week, 6) : date;
  const reviewTasks = tasks.filter(
    (item) =>
      !!item.dueDate &&
      item.dueDate >= reviewStart &&
      item.dueDate <= reviewEnd,
  );
  const review = items.find(
    (item) =>
      item.kind === "review" &&
      item.period === reviewPeriod &&
      item.date === reviewStart,
  );
  const reviewEstimate = reviewTasks.reduce(
    (sum, item) => sum + (item.duration || 0),
    0,
  );
  const reviewActual = reviewTasks.reduce(
    (sum, item) => sum + (item.actualMinutes || 0),
    0,
  );
  const activeFilter = !!(
    query ||
    priority ||
    subject ||
    type ||
    bucket !== "all"
  );

  const edit = (item: Item) => {
    touch(item.id);
    setEditor({ kind: item.kind as EditState["kind"], initial: item });
  };
  const create = (kind: "task" | "event", day = date, timeBlock = false) =>
    setEditor({
      kind,
      initial: {
        ...(kind === "task"
          ? {
              dueDate: day,
              status: "todo",
              priority: settings.priorities[1] || settings.priorities[0],
            }
          : {
              date: day,
              status: "scheduled",
              category: timeBlock ? "time-block" : "event",
              ...(timeBlock
                ? { startTime: "09:00", endTime: "10:00", duration: 60 }
                : {}),
            }),
        ...(subject ? { subjectId: subject } : {}),
      },
    });
  const closeEditor = () => {
    setEditor(null);
    if (hashId) navigate("planner");
  };
  const changeDate = (direction: number) =>
    setDate((value) =>
      view === "month"
        ? shiftMonth(value, direction)
        : addDays(value, direction * (view === "week" ? 7 : 1)),
    );
  const openDay = (day: string) => {
    setDate(day);
    setView("day");
    setBucket("all");
  };
  const resetFilters = () => {
    setQuery("");
    setPriority("");
    setSubject("");
    setType("");
    setBucket("all");
  };
  const renderRecord = (occurrence: Occurrence, compact = false) => (
    <PlanningRecord
      key={occurrence.key}
      item={occurrence.record}
      occurrenceDate={occurrence.day}
      items={items}
      settings={settings}
      readOnly={readOnly}
      onEdit={edit}
      onDelete={setDeleting}
      onComplete={(item) => completeTask(item.id)}
      compact={compact}
      conflict={conflictingKeys.has(occurrence.key)}
    />
  );
  const dateTitle =
    view === "week"
      ? `${formatDate(week)} – ${formatDate(addDays(week, 6))}, ${date.slice(0, 4)}`
      : view === "day"
        ? new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
        : view === "agenda"
          ? "Your full agenda"
          : new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            });
  const agendaGroups = [...new Set(visible.map((item) => item.day))].sort();

  return (
    <div className="planning-page planner-page">
      <PageHeader
        eyebrow="PLAN WITH INTENTION"
        title="Planner"
        description="A little structure. A lot more headspace."
        actions={
          <>
            <Button onClick={() => create("event")} disabled={readOnly}>
              <CalendarDays size={16} />
              Add event
            </Button>
            <Button
              variant="primary"
              onClick={() => create("task")}
              disabled={readOnly}
            >
              <Plus size={16} />
              New task
            </Button>
          </>
        }
      />
      {hashId &&
        hashId !== "new" &&
        ready &&
        !items.some((item) => item.id === hashId) && (
          <div className="planning-notice">
            This record is no longer available. Your other plans are below.
          </div>
        )}
      <div className="stats-grid planning-stats">
        <Stat
          label="Today's tasks"
          value={`${todayTasks.filter(isDone).length}/${todayTasks.length}`}
          hint={
            todayTasks.length
              ? "completed · keep your momentum"
              : "Your day is a blank canvas"
          }
          icon={<ListTodo size={18} />}
        />
        <Stat
          label="Planned today"
          value={minutesLabel(todayPlanned)}
          hint="From entered time estimates"
          icon={<Clock3 size={18} />}
        />
        <Stat
          label="Overdue"
          value={overdue.length}
          hint={
            overdue.length ? "Ready to reschedule or finish" : "A clean slate"
          }
          icon={<Timer size={18} />}
        />
        <Stat
          label="This selected week"
          value={`${completedWeek}/${weekTasks.length}`}
          hint="Scheduled tasks completed"
          icon={<CheckCheck size={18} />}
        />
      </div>

      <section className="panel pl-workspace" aria-label="Calendar and tasks">
        <div className="pl-calendar-toolbar">
          <div className="pl-date-navigation">
            <div className="pl-calendar-emblem">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2>{dateTitle}</h2>
              <p>
                {view === "agenda"
                  ? "All dated records · repeating events for the next 30 days"
                  : "Give your priorities a place in your day"}
              </p>
            </div>
          </div>
          <div className="pl-calendar-controls">
            {view !== "agenda" && (
              <>
                <Button
                  variant="ghost"
                  aria-label={`Previous ${view}`}
                  onClick={() => changeDate(-1)}
                >
                  <ChevronLeft size={17} />
                </Button>
                <Button onClick={() => setDate(now)}>Today</Button>
                <Button
                  variant="ghost"
                  aria-label={`Next ${view}`}
                  onClick={() => changeDate(1)}
                >
                  <ChevronRight size={17} />
                </Button>
                <label className="pl-date-picker">
                  <span className="planning-sr-only">Jump to date</span>
                  <input
                    aria-label="Jump to date"
                    type="date"
                    value={date}
                    onChange={(event) =>
                      event.target.value && setDate(event.target.value)
                    }
                  />
                </label>
              </>
            )}
            <Tabs
              options={views}
              value={view}
              onChange={(value) => setView(value as View)}
            />
          </div>
        </div>
        <div className="pl-filterbar">
          <Tabs
            options={buckets.map((option) => ({
              ...option,
              ...(option.id === "overdue" ? { count: overdue.length } : {}),
            }))}
            value={bucket}
            onChange={(value) => {
              setBucket(value);
              if (value !== "all") setView("agenda");
            }}
          />
          <div className="pl-filter-inputs">
            <input
              aria-label="Search plans"
              type="search"
              placeholder="Search plans…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              aria-label="Filter by priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="">All priorities</option>
              {[
                ...new Set([
                  ...settings.priorities,
                  ...tasks
                    .map((task) => task.priority)
                    .filter((value): value is string => !!value),
                ]),
              ].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            >
              <option value="">All subjects</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by record type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">Tasks & events</option>
              <option value="task">Tasks</option>
              <option value="event">Events</option>
            </select>
            {activeFilter && (
              <Button variant="ghost" onClick={resetFilters}>
                Reset
              </Button>
            )}
          </div>
        </div>

        {view === "week" && (
          <div className="pl-week-scroll">
            <div className="pl-week-grid">
              {dates.map((day) => {
                const daily = visible.filter((item) => item.day === day);
                return (
                  <section
                    key={day}
                    className={cx(
                      "pl-week-day",
                      day === now && "pl-current-day",
                    )}
                  >
                    <button
                      className="pl-week-heading"
                      onClick={() => openDay(day)}
                    >
                      <span>
                        {new Date(`${day}T12:00:00`).toLocaleDateString(
                          "en-GB",
                          { weekday: "short" },
                        )}
                      </span>
                      <b>{Number(day.slice(8))}</b>
                      <small>
                        {daily.length ? `${daily.length} planned` : "Open day"}
                      </small>
                    </button>
                    <div className="pl-week-records">
                      {daily.map((item) => renderRecord(item, true))}
                    </div>
                    <button
                      type="button"
                      className="pl-add-in-day"
                      disabled={readOnly}
                      onClick={() => create("task", day)}
                      aria-label={`Add task on ${formatDate(day, true)}`}
                    >
                      <Plus size={14} />
                      Add task
                    </button>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {view === "month" && (
          <div className="pl-month-scroll">
            <div className="pl-month-grid">
              {dates.slice(0, 7).map((day) => (
                <div key={`label-${day}`} className="pl-month-weekday">
                  {new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", {
                    weekday: "short",
                  })}
                </div>
              ))}
              {dates.map((day) => {
                const daily = visible.filter((item) => item.day === day);
                return (
                  <section
                    key={day}
                    className={cx(
                      "pl-month-day",
                      day.slice(0, 7) !== date.slice(0, 7) &&
                        "pl-outside-month",
                      day === now && "pl-current-day",
                    )}
                  >
                    <div className="row-between">
                      <button
                        type="button"
                        className="pl-month-date"
                        onClick={() => openDay(day)}
                        aria-label={`View ${formatDate(day, true)}`}
                      >
                        {Number(day.slice(8))}
                      </button>
                      <button
                        type="button"
                        className="pl-month-add"
                        disabled={readOnly}
                        onClick={() => create("task", day)}
                        aria-label={`Add task on ${formatDate(day, true)}`}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    {daily.slice(0, 3).map((occurrence) => (
                      <button
                        key={occurrence.key}
                        type="button"
                        className={cx(
                          "pl-month-chip",
                          isDone(occurrence.record) && "pl-month-chip-done",
                          occurrence.record.kind === "event" &&
                            "pl-month-chip-event",
                          conflictingKeys.has(occurrence.key) &&
                            "pl-month-chip-conflict",
                        )}
                        onClick={() => edit(occurrence.record)}
                        title={occurrence.record.title}
                      >
                        {occurrence.record.startTime && (
                          <span>
                            {timeLabel(
                              occurrence.record.startTime,
                              settings.timeFormat,
                            )}
                          </span>
                        )}
                        {occurrence.record.title}
                      </button>
                    ))}
                    {daily.length > 3 && (
                      <button
                        className="pl-month-more"
                        type="button"
                        onClick={() => openDay(day)}
                      >
                        +{daily.length - 3} more
                      </button>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {view === "day" && (
          <div className="pl-day-layout">
            <div className="pl-day-timeline">
              <div className="row-between">
                <h3>
                  <Clock3 size={16} />
                  Time blocks
                </h3>
                <Button
                  variant="ghost"
                  disabled={readOnly}
                  onClick={() => create("event", date, true)}
                >
                  <Plus size={14} />
                  Block time
                </Button>
              </div>
              {visible.filter((item) => item.record.startTime).length ? (
                <div className="pl-timeline-list">
                  {visible
                    .filter((item) => item.record.startTime)
                    .map((occurrence) => (
                      <div className="pl-timeline-entry" key={occurrence.key}>
                        <span className="mono pl-timeline-time">
                          {timeLabel(
                            occurrence.record.startTime,
                            settings.timeFormat,
                          )}
                        </span>
                        {renderRecord(occurrence)}
                      </div>
                    ))}
                </div>
              ) : (
                <Empty
                  icon={<Clock3 size={25} />}
                  title="Space to focus"
                  description="Add a start time to a task, or reserve a time block for deep work."
                  action={
                    <Button
                      disabled={readOnly}
                      onClick={() => create("event", date, true)}
                    >
                      Create time block
                    </Button>
                  }
                />
              )}
            </div>
            <div className="pl-day-flexible">
              <div className="row-between">
                <h3>
                  <ListTodo size={16} />
                  Any-time plans
                </h3>
                <Badge>
                  {visible.filter((item) => !item.record.startTime).length}
                </Badge>
              </div>
              {visible.filter((item) => !item.record.startTime).length ? (
                <div className="stack-sm">
                  {visible
                    .filter((item) => !item.record.startTime)
                    .map((item) => renderRecord(item))}
                </div>
              ) : (
                <Empty
                  title="Nothing else on the list"
                  description="Tasks without a start time will appear here."
                  action={
                    <Button disabled={readOnly} onClick={() => create("task")}>
                      Add task
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        )}

        {view === "agenda" && (
          <div className="pl-agenda">
            {visible.length ? (
              agendaGroups.map((day) => (
                <section className="pl-agenda-group" key={day}>
                  <div className="pl-agenda-date">
                    <b>{day === now ? "Today" : formatDate(day, true)}</b>
                    <span>
                      {new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", {
                        weekday: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="stack-sm">
                    {visible
                      .filter((item) => item.day === day)
                      .map((item) => renderRecord(item))}
                  </div>
                </section>
              ))
            ) : (
              <Empty
                icon={<CalendarDays size={28} />}
                title={
                  activeFilter ? "No matching plans" : "Start with one thing"
                }
                description={
                  activeFilter
                    ? "Try another filter, or clear your filters to see all plans."
                    : "Create a task or event. Your real schedule will take shape here."
                }
                action={
                  activeFilter ? (
                    <Button onClick={resetFilters}>Clear filters</Button>
                  ) : (
                    <Button
                      variant="primary"
                      disabled={readOnly}
                      onClick={() => create("task")}
                    >
                      Create a task
                    </Button>
                  )
                }
              />
            )}
          </div>
        )}
        <div className="pl-calendar-footer">
          <span>
            <i className="pl-legend-task" />
            Task
          </span>
          <span>
            <i className="pl-legend-event" />
            Event / time block
          </span>
          <span className="pl-footer-count">
            {visible.length} scheduled {visible.length === 1 ? "item" : "items"}{" "}
            in this view
          </span>
        </div>
      </section>

      {conflicts.length > 0 && (
        <div className="pl-conflict-panel" role="status">
          <AlertTriangle size={19} />
          <div>
            <strong>
              {conflicts.length} scheduling{" "}
              {conflicts.length === 1 ? "conflict" : "conflicts"} in this view
            </strong>
            <p>
              These active time blocks overlap. Edit either record to make room.
            </p>
            <div className="stack-sm">
              {conflicts.slice(0, 5).map(({ first, second }) => (
                <div
                  className="pl-conflict-pair"
                  key={`${first.key}-${second.key}`}
                >
                  <span>{formatDate(first.day)}</span>
                  <button onClick={() => edit(first.record)}>
                    {first.record.title}
                  </button>
                  <span>overlaps</span>
                  <button onClick={() => edit(second.record)}>
                    {second.record.title}
                  </button>
                </div>
              ))}
              {conflicts.length > 5 && (
                <span className="small">
                  Plus {conflicts.length - 5} more. Conflicting records are
                  marked in the calendar.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pl-bottom-grid">
        <Panel title="Unscheduled" action={<Badge>{unscheduled.length}</Badge>}>
          <p className="muted small">
            A place for tasks that haven’t found their day yet.
          </p>
          {unscheduled.length ? (
            <div className="stack-sm">
              {unscheduled.map((item) => (
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
              title={
                activeFilter
                  ? "No matching unscheduled tasks"
                  : "Everything has its place"
              }
              description="Tasks without a due date appear here."
              action={
                <Button
                  variant="ghost"
                  disabled={readOnly}
                  onClick={() =>
                    setEditor({ kind: "task", initial: { status: "todo" } })
                  }
                >
                  <Plus size={14} />
                  Add to inbox
                </Button>
              }
            />
          )}
        </Panel>
        <Panel
          title="Close the loop"
          action={<Sparkles size={17} className="text-accent" />}
        >
          <div className="pl-review-heading">
            <Tabs
              options={[
                { id: "daily", label: "Daily review" },
                { id: "weekly", label: "Weekly review" },
              ]}
              value={reviewPeriod}
              onChange={setReviewPeriod}
            />
            <label>
              <span className="planning-sr-only">Review date</span>
              <input
                aria-label="Review date"
                type="date"
                value={date}
                onChange={(event) =>
                  event.target.value && setDate(event.target.value)
                }
              />
            </label>
          </div>
          <p className="muted small">
            {formatDate(reviewStart, true)}
            {reviewPeriod === "weekly"
              ? ` – ${formatDate(reviewEnd, true)}`
              : ""}{" "}
            · based on tasks scheduled in this period
          </p>
          <Progress
            value={percent(
              reviewTasks.filter(isDone).length,
              reviewTasks.length,
            )}
            label={`${reviewTasks.filter(isDone).length} of ${reviewTasks.length} tasks completed`}
          />
          <div className="pl-review-stats">
            <div>
              <span>Estimated</span>
              <strong>{minutesLabel(reviewEstimate)}</strong>
            </div>
            <div>
              <span>Actual entered</span>
              <strong>{minutesLabel(reviewActual)}</strong>
            </div>
            <div>
              <span>Tasks with time logged</span>
              <strong>
                {
                  reviewTasks.filter((item) => item.actualMinutes !== undefined)
                    .length
                }
                /{reviewTasks.length}
              </strong>
            </div>
          </div>
          {review ? (
            <div className="pl-review-copy">
              {review.body && (
                <>
                  <h4>What went well</h4>
                  <Markdown>{review.body}</Markdown>
                </>
              )}
              {review.reflection && (
                <>
                  <h4>Lessons & reflections</h4>
                  <Markdown>{review.reflection}</Markdown>
                </>
              )}
              {review.goals && (
                <>
                  <h4>Next focus</h4>
                  <Markdown>{review.goals}</Markdown>
                </>
              )}
              {!review.body && !review.reflection && !review.goals && (
                <p className="muted">
                  Your review is saved. Add a reflection when you’re ready.
                </p>
              )}
              <div className="row-between">
                <Button onClick={() => edit(review)}>
                  Edit review
                  <ArrowRight size={14} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label="Delete review"
                  disabled={readOnly}
                  onClick={() => setDeleting(review)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="pl-review-prompt">
              <p>
                What worked? What could feel easier? Take a moment before your
                next step.
              </p>
              <Button
                disabled={readOnly}
                onClick={() =>
                  setEditor({
                    kind: "review",
                    initial: {
                      title: `${reviewPeriod === "weekly" ? "Weekly" : "Daily"} review · ${formatDate(reviewStart)}`,
                      date: reviewStart,
                      period: reviewPeriod,
                    },
                  })
                }
              >
                Write a reflection
                <ArrowRight size={14} />
              </Button>
            </div>
          )}
        </Panel>
      </div>
      {editor && (
        <ItemEditor
          kind={editor.kind}
          initial={editor.initial}
          fields={
            editor.kind === "task"
              ? taskFields(items, settings)
              : editor.kind === "event"
                ? eventFields(items)
                : reviewFields
          }
          onClose={closeEditor}
          onSaved={closeEditor}
          title={
            editor.initial.id
              ? `Edit ${editor.kind}${editor.kind === "event" && editor.initial.recurrence ? " series" : ""}`
              : editor.kind === "event" &&
                  editor.initial.category === "time-block"
                ? "Reserve a time block"
                : `New ${editor.kind}`
          }
        />
      )}
      {deleting && (
        <Confirm
          title={`Delete ${deleting.kind}?`}
          message={`“${deleting.title}” will be permanently deleted.${deleting.kind === "event" && deleting.recurrence ? " This removes the entire recurring series." : ""}`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            remove(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
