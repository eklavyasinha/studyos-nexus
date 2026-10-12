import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ChevronLeft,
  Circle,
  Code2,
  FileText,
  Flame,
  FolderKanban,
  GraduationCap,
  Headphones,
  Layers3,
  Plus,
  Settings2,
  Sparkles,
  Target,
  Terminal,
  Trophy,
} from "lucide-react";
import {
  Badge,
  Button,
  Empty,
  Field,
  ItemEditor,
  Modal,
  Panel,
  Progress,
  Stat,
  type FieldDef,
} from "../components/ui";
import { useStore } from "../lib/store";
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
import { dailySeries, streak } from "../lib/logic";
import { validDay } from "../lib/logic";
import { activeRecord, dashboardProgress } from "../lib/study-progress";
import { isModuleComplete, progressionError } from "../lib/readiness";
import { useClock } from "../lib/hooks";
import { occurrencesFor } from "./planningHelpers";
import { STRATEGY_PHASES } from "./strategy-roadmap-data";
import type { Item } from "../lib/types";

const tracks = [
  {
    domain: "java",
    title: "Java Studio",
    caption: "Think in objects",
    route: "java",
    icon: Terminal,
    color: "amber",
  },
  {
    domain: "dsa",
    title: "DSA & algorithms",
    caption: "Build your intuition",
    route: "dsa",
    icon: Layers3,
    color: "blue",
  },
  {
    domain: "cp",
    title: "Competitive",
    caption: "Practice under pressure",
    route: "competitive",
    icon: Trophy,
    color: "violet",
  },
  {
    domain: "web",
    title: "Web development",
    caption: "Bring ideas to the browser",
    route: "web",
    icon: Code2,
    color: "green",
  },
  {
    domain: "college",
    title: "College & subjects",
    caption: "Stay a chapter ahead",
    route: "college",
    icon: GraduationCap,
    color: "pink",
  },
  {
    domain: "projects",
    title: "Your projects",
    caption: "Learn by shipping",
    route: "projects",
    icon: FolderKanban,
    color: "orange",
  },
];
const goalFields: FieldDef[] = [
  {
    key: "period",
    label: "Period",
    type: "select",
    options: [
      { value: "daily", label: "Daily" },
      { value: "weekly", label: "Weekly" },
    ],
  },
  { key: "date", label: "Starting on", type: "date" },
  { key: "target", label: "Target", type: "number", min: 1, required: true },
  { key: "value", label: "Current progress (manual)", type: "number", min: 0 },
  {
    key: "description",
    label: "What does progress look like?",
    type: "textarea",
    full: true,
  },
];
export default function Dashboard({ recordId }: { recordId?: string }) {
  const {
    items,
    settings,
    setSettings,
    timer,
    completeTask,
    create,
    update,
    touch,
    readOnly,
  } = useStore();
  const now = useClock(),
    currentDay = today(now),
    [selectedDay, setDay] = useState(currentDay),
    [customize, setCustomize] = useState(false),
    [goal, setGoal] = useState<Partial<Item> | null>(null),
    [reviewOpen, setReviewOpen] = useState(false),
    [reflection, setReflection] = useState(""),
    [agendaFilter, setAgendaFilter] = useState("all");
  const day = selectedDay;
  const browsingDate = useRef(false);
  useEffect(() => {
    if (!browsingDate.current) setDay(currentDay);
  }, [currentDay]);
  const browseTo = (value: string) => {
    browsingDate.current = value !== currentDay;
    setDay(value);
  };
  useEffect(() => {
    const item = items.find((i) => i.id === recordId && i.kind === "goal");
    if (item) setGoal(item);
  }, [recordId]);
  const tasks = items.filter((i) => i.kind === "task" && activeRecord(i)),
    todayTasks = tasks.filter((i) => i.dueDate === day),
    doneToday = todayTasks.filter(isDone).length;
  const sessions = items.filter((i) => i.kind === "session" && activeRecord(i)),
    minutes = sessions
      .filter((i) => i.date === day)
      .reduce((n, i) => n + (i.actualMinutes || 0), 0);
  const dueCards = items.filter(
    (i) => i.kind === "card" && (!i.dueDate || i.dueDate <= day),
  );
  const next = tasks
    .filter((i) => !isDone(i) && !i.sessionType?.startsWith("optional"))
    .sort(
      (a, b) =>
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
        Number(b.priority === "High") - Number(a.priority === "High"),
    )[0];
  const agenda = occurrencesFor(
    items.filter(
      (i) =>
        activeRecord(i) &&
        ["task", "event", "exam", "assignment", "contest"].includes(i.kind),
    ),
    [selectedDay],
  );
  const weekly = dailySeries(items, addDays(day, -6), 7),
    weekMinutes = weekly.reduce((n, d) => n + d.minutes, 0);
  const goals = items.filter(
      (i) =>
        i.kind === "goal" &&
        !i.domain &&
        !i.sourceType &&
        i.course !== "roadmap-readiness",
    ),
    review = items.find(
      (i) => i.kind === "review" && i.domain === "daily" && i.date === day,
    );
  const recent = settings.recent
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is Item => !!i);
  const open = (item: Item) => {
    touch(item.id);
    navigate(routeFor(item), item.id);
  };
  const phase =
    STRATEGY_PHASES.find(
      (entry) => day >= entry.startDate && day <= entry.endDate,
    ) ||
    STRATEGY_PHASES.find((entry) => day < entry.startDate) ||
    STRATEGY_PHASES.at(-1)!;
  const phaseItems = items.filter(
    (item) =>
      item.roadmapPhase === phase.id &&
      activeRecord(item) &&
      ["milestone", "task"].includes(item.kind),
  );
  const phaseProgress = percent(
    phaseItems.filter(isDone).length,
    phaseItems.length,
  );
  const scheduledNext = items
    .filter(
      (item) =>
        item.kind === "task" &&
        activeRecord(item) &&
        item.moduleKey &&
        item.dueDate &&
        !isDone(item),
    )
    .sort((a, b) =>
      `${a.dueDate} ${a.startTime || "99:99"}`.localeCompare(
        `${b.dueDate} ${b.startTime || "99:99"}`,
      ),
    )[0];
  const scheduleInstalled = items.some(
    (item) =>
      item.sourceType === "schedule-installation" ||
      item.scheduleId?.startsWith("study-schedule-"),
  );
  const nextRevision = items
    .filter((item) => activeRecord(item) && item.nextRevision)
    .sort((a, b) =>
      (a.nextRevision || "9999").localeCompare(b.nextRevision || "9999"),
    )[0];
  const gsocRecords = items.filter(
    (item) =>
      item.sourceType?.startsWith("strategy-gsoc") ||
      item.sourceType === "strategy-contribution-prep",
  );
  const icpcRecords = items.filter(
    (item) =>
      item.sourceType === "strategy-icpc-contest" || item.domain === "cp",
  );
  const ring = Math.min(100, percent(minutes, settings.dailyGoal));
  const summary = dashboardProgress(items, day, settings.weekStart);
  const visibleAgenda = agenda.filter(
    ({ record }) =>
      agendaFilter === "all" ||
      (agendaFilter === "completed" ? isDone(record) : !isDone(record)),
  );
  const widgets: Record<string, React.ReactNode> = {
    agenda: (
      <Panel
        title="Your day, intentionally"
        action={
          <Button variant="ghost" onClick={() => navigate("planner")}>
            Planner <ArrowRight size={14} />
          </Button>
        }
      >
        <div className="day-switcher">
          {Array.from({ length: 7 }, (_, n) => addDays(day, n - 1)).map((d) => (
            <button
              key={d}
              className={cx(
                d === selectedDay && "selected",
                d === currentDay && "is-today",
              )}
              onClick={() => browseTo(d)}
            >
              <span>
                {new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
                  weekday: "short",
                })}
              </span>
              <strong>{Number(d.slice(-2))}</strong>
              <i />
            </button>
          ))}
        </div>
        <div
          className="dashboard-agenda-filters"
          role="group"
          aria-label="Agenda status"
        >
          {[
            ["all", "All"],
            ["remaining", "Remaining"],
            ["completed", "Completed"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={agendaFilter === value}
              onClick={() => setAgendaFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {visibleAgenda.length ? (
          <div className="dashboard-agenda">
            {visibleAgenda.slice(0, 6).map(({ record: i, key }) => (
              <div className="agenda-row" key={key}>
                <span className="mono muted">{i.startTime || "Anytime"}</span>
                {i.kind === "task" ? (
                  <button
                    className={cx("task-check", isDone(i) && "checked")}
                    disabled={readOnly}
                    aria-label={`${isDone(i) ? "Reopen" : "Complete"} ${i.title}`}
                    onClick={() => completeTask(i.id)}
                  >
                    {isDone(i) ? <Check size={12} /> : <Circle size={15} />}
                  </button>
                ) : (
                  <CalendarDays size={16} className="text-accent" />
                )}
                <button className="agenda-title" onClick={() => open(i)}>
                  <strong className={isDone(i) ? "strike" : ""}>
                    {i.title}
                  </strong>
                  <small>
                    {i.course || i.category || i.kind}
                    {i.duration ? ` · ${i.duration} min` : ""}
                    {progressionError(i, items)
                      ? " · prerequisites pending"
                      : ""}
                  </small>
                </button>
                {i.priority === "High" && (
                  <span className="priority-dot" title="High priority" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title={
              selectedDay === day
                ? "A little room to breathe"
                : "Nothing planned for this day"
            }
            description="Give one important thing a place in your day."
            action={
              <Button
                variant="ghost"
                onClick={() => navigate("planner", "new")}
              >
                <Plus size={14} />
                Plan a task
              </Button>
            }
          />
        )}
        {visibleAgenda.length > 6 && (
          <Button variant="ghost" onClick={() => navigate("planner")}>
            View all {visibleAgenda.length} records in Planner{" "}
            <ArrowRight size={13} />
          </Button>
        )}
        <div className="panel-foot">
          <span>
            {agenda.filter((i) => isDone(i.record)).length} of {agenda.length}{" "}
            complete
          </span>
          <Progress
            value={percent(
              agenda.filter((i) => isDone(i.record)).length,
              agenda.length,
            )}
            label="Scheduled work completed"
          />
        </div>
      </Panel>
    ),
    tracks: (
      <Panel
        title="Your learning paths"
        action={<span className="micro-label">BUILD A LITTLE, EVERY DAY</span>}
      >
        <div className="track-grid">
          {tracks.map(
            ({ domain, title, caption, route, icon: Icon, color }) => {
              const records = items.filter(
                  (i) =>
                    activeRecord(i) &&
                    (domain === "projects"
                      ? i.kind === "project" &&
                        i.sourceType !== "strategy-phase"
                      : i.kind === "topic" && i.domain === domain),
                ),
                done = records.filter((i) =>
                  i.kind === "topic" ? isModuleComplete(i) : isDone(i),
                ).length;
              return (
                <button
                  className="track-card"
                  key={domain}
                  onClick={() => navigate(route)}
                >
                  <span className={`track-icon ${color}`}>
                    <Icon size={18} />
                  </span>
                  <span className="track-copy">
                    <strong>{title}</strong>
                    <small>
                      {records.length
                        ? `${done} / ${records.length} ${domain === "projects" ? "shipped" : "mastered"}`
                        : caption}
                    </small>
                    <Progress
                      value={percent(done, records.length)}
                      label={`${title} mastery`}
                    />
                  </span>
                  <ChevronRight size={14} />
                </button>
              );
            },
          )}
        </div>
      </Panel>
    ),
    focus: (
      <Panel
        title="Make room for deep work"
        action={<Headphones size={17} className="muted" />}
      >
        <div className="dashboard-focus">
          <div className="mini-orbit">
            <Headphones size={27} />
            <i />
            <i />
          </div>
          <span className="micro-label">
            {timer.running
              ? "FOCUS IN PROGRESS"
              : timer.startedAt
                ? "YOUR SESSION IS PAUSED"
                : "A QUIETER KIND OF PRODUCTIVITY"}
          </span>
          <h3>
            {timer.running
              ? "Stay with your one thing."
              : "One task. Your full attention."}
          </h3>
          <p>
            {timer.running
              ? "Your timer keeps going as you move around."
              : "Settle in, close the extra tabs, and take the next small step."}
          </p>
          <Button variant="primary" onClick={() => navigate("focus")}>
            <span className="play-triangle" />
            {timer.startedAt
              ? "Return to focus"
              : `Start a ${settings.focusMinutes}-min session`}
            <ArrowRight size={15} />
          </Button>
          <span className="small muted">
            {Math.floor(minutes)} minutes of intentional work today
          </span>
        </div>
      </Panel>
    ),
    goals: (
      <Panel
        title="Small promises to yourself"
        action={
          <Button
            variant="ghost"
            aria-label="Add goal"
            disabled={readOnly}
            onClick={() =>
              setGoal({ period: "daily", date: day, target: 1, value: 0 })
            }
          >
            <Plus size={17} />
          </Button>
        }
      >
        <div className="goal-row">
          <span className="goal-mark">
            <Headphones size={16} />
          </span>
          <div>
            <div className="row-between">
              <strong>Daily focus</strong>
              <span className="mono">
                {Math.floor(minutes)} / {settings.dailyGoal}m
              </span>
            </div>
            <Progress value={ring} label="Daily focus goal" />
          </div>
        </div>
        <div className="goal-row">
          <span className="goal-mark violet">
            <Layers3 size={16} />
          </span>
          <div>
            <div className="row-between">
              <strong>Keep it fresh</strong>
              <span className="mono">{dueCards.length} due</span>
            </div>
            <button className="inline-link" onClick={() => navigate("cards")}>
              {dueCards.length
                ? "Review your flashcards"
                : "Create a revision habit"}{" "}
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
        {goals.map((g) => (
          <button
            className="goal-row goal-edit"
            key={g.id}
            onClick={() => setGoal(g)}
          >
            <span className="goal-mark">
              <Target size={16} />
            </span>
            <div>
              <div className="row-between">
                <strong>{g.title}</strong>
                <span className="mono">
                  {g.value || 0}/{g.target || 1}
                </span>
              </div>
              <Progress
                value={percent(g.value || 0, g.target || 1)}
                label={g.title}
              />
              <small className="muted">{g.period} · manually tracked</small>
            </div>
          </button>
        ))}
        {!goals.length && (
          <button
            className="dashed-action"
            disabled={readOnly}
            onClick={() =>
              setGoal({ period: "weekly", date: day, target: 3, value: 0 })
            }
          >
            <Plus size={15} />
            Add a weekly intention
          </button>
        )}
      </Panel>
    ),
    activity: (
      <Panel
        title="Consistency over intensity"
        action={
          <Button variant="ghost" onClick={() => navigate("analytics")}>
            Insights <ArrowRight size={14} />
          </Button>
        }
      >
        <div className="activity-summary">
          <strong>
            {(weekMinutes / 60).toFixed(1)}
            <span>hrs</span>
          </strong>
          <div>
            <span>Focused this week</span>
            <small>Your actual sessions, not estimates</small>
          </div>
          <Badge tone="success">
            <Flame size={12} />
            {streak(items)} day streak
          </Badge>
        </div>
        <div
          className="weekly-chart"
          role="img"
          aria-label={`Last 7 days: ${weekly.map((d) => `${d.date}: ${Math.round(d.minutes)} minutes`).join(", ")}`}
        >
          {weekly.map((d) => (
            <div
              key={d.date}
              className={cx(d.date === day && "today-bar")}
              title={`${formatDate(d.date)}: ${Math.round(d.minutes)} minutes`}
            >
              <div className="bar-track">
                <span
                  style={{
                    height: `${percent(d.minutes, Math.max(settings.dailyGoal, ...weekly.map((x) => x.minutes)))}%`,
                  }}
                />
              </div>
              <small>
                {new Date(d.date + "T12:00:00").toLocaleDateString("en-GB", {
                  weekday: "short",
                })}
              </small>
            </div>
          ))}
        </div>
        <p className="chart-caption">
          {weekMinutes
            ? "Showing up matters more than perfect days."
            : "Your first session will put this chart in motion."}
        </p>
      </Panel>
    ),
    review: (
      <Panel
        title="Close the loop"
        action={<BookOpen size={17} className="muted" />}
      >
        <div className="review-prompt">
          <span className="review-quote">“</span>
          <h3>What moved you forward today?</h3>
          <p>
            {review
              ? review.body
              : "One insight. One small win. One thing to try tomorrow. A little reflection makes learning stick."}
          </p>
          <Button
            onClick={() => {
              setReflection(review?.body || "");
              setReviewOpen(true);
            }}
            disabled={readOnly}
          >
            <FileText size={15} />
            {review ? "Edit daily reflection" : "Write a daily reflection"}
          </Button>
        </div>
        {recent.length > 0 && (
          <div className="recent-list">
            <p className="micro-label">PICK UP WHERE YOU LEFT OFF</p>
            {recent.slice(0, 3).map((i) => (
              <button key={i.id} onClick={() => open(i)}>
                <FileText size={13} />
                <span>{i.title}</span>
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
        )}
      </Panel>
    ),
  };
  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">
            <span className="live-dot" />
            YOUR PERSONAL OPERATING SYSTEM
          </p>
          <h1>
            {now.getHours() < 12
              ? "Good morning"
              : now.getHours() < 17
                ? "Good afternoon"
                : "Good evening"}
            {settings.name ? `, ${settings.name}` : ""}
            <span className="heading-dot">.</span>
          </h1>
          <p className="muted">
            A clear mind. A little momentum. Let’s make today count.
          </p>
        </div>
        <Button onClick={() => setCustomize(true)}>
          <Settings2 size={15} />
          Customize
        </Button>
      </div>
      <div className="dashboard-hero">
        <div className="hero-copy">
          <div className="hero-topline">
            <span className="micro-label">
              {now.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
            <span className="hero-time mono">
              {now.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: settings.timeFormat === "12",
              })}
            </span>
          </div>
          <h2>
            Big ambitions.
            <br />
            <span>Small, deliberate steps.</span>
          </h2>
          <p>
            {next
              ? `Next up: ${next.title}`
              : "Your next chapter starts with one focused moment."}
          </p>
          <Button
            variant="primary"
            onClick={() => (next ? open(next) : navigate("planner", "new"))}
          >
            {next ? "Take the next step" : "Plan your first task"}
            <ArrowRight size={16} />
          </Button>
          <span className="hero-rule">
            <Sparkles size={13} />
            {next
              ? "Suggested from your open tasks and due dates"
              : "A workspace built around you. Not the other way around."}
          </span>
        </div>
        <div className="hero-orbit" aria-label={`${ring}% of daily focus goal`}>
          <div className="orbit-line orbit-one" />
          <div className="orbit-line orbit-two" />
          <div className="orbit-line orbit-three" />
          <div className="orbit-core">
            <svg viewBox="0 0 160 160" aria-hidden="true">
              <circle cx="80" cy="80" r="70" />
              <circle
                className="orbit-progress"
                cx="80"
                cy="80"
                r="70"
                strokeDasharray="439.8"
                strokeDashoffset={439.8 * (1 - ring / 100)}
              />
            </svg>
            <Target size={20} />
            <strong>
              {ring}
              <small>%</small>
            </strong>
            <span>DAILY FOCUS</span>
          </div>
          <span className="orbit-label label-top">
            <span />
            LEARN
          </span>
          <span className="orbit-label label-right">
            <span />
            BUILD
          </span>
          <span className="orbit-label label-bottom">
            <span />
            BECOME
          </span>
        </div>
      </div>
      <div className="dashboard-stats">
        <Stat
          label="Tasks completed"
          value={
            <>
              {doneToday}
              <span className="stat-unit"> / {todayTasks.length}</span>
            </>
          }
          hint={day === currentDay ? "On today’s list" : "On the selected date"}
          icon={<Check size={16} />}
        />
        <Stat
          label="Focus time"
          value={
            <>
              {Math.floor(minutes)}
              <span className="stat-unit"> min</span>
            </>
          }
          hint={`Daily goal · ${settings.dailyGoal} min`}
          icon={<Headphones size={16} />}
        />
        <Stat
          label="Ready for revision"
          value={dueCards.length}
          hint="Cards waiting for a fresh look"
          icon={<Layers3 size={16} />}
        />
        <Stat
          label="Learning streak"
          value={
            <>
              {streak(items)}
              <span className="stat-unit"> days</span>
            </>
          }
          hint="Built from your real activity"
          icon={<Flame size={16} />}
        />
      </div>
      <Panel
        title="Date-aware study overview"
        className="dashboard-date-panel"
        action={
          <div className="dashboard-date-controls">
            <Button
              variant="ghost"
              className="icon-button"
              aria-label="Previous dashboard date"
              onClick={() => browseTo(addDays(day, -1))}
            >
              <ChevronLeft size={15} />
            </Button>
            <input
              type="date"
              aria-label="Dashboard date"
              value={day}
              onChange={(event) =>
                validDay(event.target.value) && browseTo(event.target.value)
              }
            />
            <Button
              variant="ghost"
              className="icon-button"
              aria-label="Next dashboard date"
              onClick={() => browseTo(addDays(day, 1))}
            >
              <ChevronRight size={15} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                browsingDate.current = false;
                setDay(currentDay);
              }}
            >
              Today
            </Button>
          </div>
        }
      >
        <p className="dashboard-selected-date">
          {new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {day !== currentDay && <Badge>Browsing saved plan</Badge>}
        </p>
        <div className="dashboard-plan-metrics">
          <div>
            <span>Remaining tasks</span>
            <strong>{summary.remaining.length}</strong>
            <small>
              {summary.complete} completed / {summary.total} planned
            </small>
          </div>
          <div>
            <span>Planned / actual effort</span>
            <strong>
              {summary.planned} / {Math.round(summary.actual)}
              <small> min</small>
            </strong>
            <small>
              Linked focus logs take precedence over manual task effort.
            </small>
          </div>
          <div>
            <span>This calendar week</span>
            <strong>
              {percent(summary.weekly.complete, summary.weekly.total)}
              <small>%</small>
            </strong>
            <Progress
              value={percent(summary.weekly.complete, summary.weekly.total)}
              label="Weekly task progress"
            />
            <small>
              {summary.weekly.complete}/{summary.weekly.total} tasks ·{" "}
              {Math.round(summary.weekly.actual)} actual min
            </small>
          </div>
          <div>
            <span>This calendar month</span>
            <strong>
              {percent(summary.monthly.complete, summary.monthly.total)}
              <small>%</small>
            </strong>
            <Progress
              value={percent(summary.monthly.complete, summary.monthly.total)}
              label="Monthly task progress"
            />
            <small>
              {summary.monthly.complete}/{summary.monthly.total} tasks ·{" "}
              {Math.round(summary.monthly.actual)} actual min
            </small>
          </div>
        </div>
        <div className="dashboard-attention-grid">
          {[
            {
              title: "Overdue · do not double tomorrow",
              records: summary.overdue,
              empty: "No overdue study tasks.",
            },
            {
              title: "Rescheduled · original dates retained",
              records: summary.rescheduled,
              empty: "No rescheduled tasks yet.",
            },
            {
              title: "College assignments",
              records: summary.assignments,
              empty: "Add actual assignments in College; none are invented.",
            },
          ].map(({ title, records, empty }) => (
            <section key={title}>
              <h3>
                {title}
                <Badge>{records.length}</Badge>
              </h3>
              {records.length ? (
                records.slice(0, 3).map((record) => (
                  <button key={record.id} onClick={() => open(record)}>
                    <span>{record.title}</span>
                    <small>
                      {record.originalDate &&
                      record.originalDate !== record.dueDate
                        ? `${formatDate(record.originalDate)} → `
                        : ""}
                      {formatDate(record.dueDate || record.date)}
                      <ArrowRight size={12} />
                    </small>
                  </button>
                ))
              ) : (
                <p>{empty}</p>
              )}
              {records.length > 3 && (
                <Button
                  variant="ghost"
                  onClick={() =>
                    navigate(
                      title.startsWith("College") ? "college" : "planner",
                    )
                  }
                >
                  View all {records.length}
                </Button>
              )}
            </section>
          ))}
        </div>
      </Panel>
      <div className="quick-capture">
        <span className="micro-label">MAKE A LITTLE PROGRESS</span>
        {[
          { label: "Task", route: "planner", icon: Plus },
          { label: "Note", route: "notes", icon: FileText },
          { label: "Flashcard", route: "cards", icon: Layers3 },
          { label: "Problem", route: "dsa", icon: Code2 },
          { label: "Project", route: "projects", icon: FolderKanban },
        ].map(({ label, route, icon: Icon }) => (
          <button key={route} onClick={() => navigate(route, "new")}>
            <Icon size={14} />
            {label}
          </button>
        ))}
        <button onClick={() => navigate("focus")}>
          <Headphones size={14} />
          Focus
        </button>
      </div>
      <Panel
        title="Your next horizon"
        action={
          <Button variant="ghost" onClick={() => navigate("strategy")}>
            Open six-month plan <ArrowRight size={14} />
          </Button>
        }
        className="dashboard-briefing"
      >
        <div className="briefing-grid">
          <div className="briefing-phase">
            <span className="micro-label">CURRENT ROADMAP PHASE</span>
            <strong>{phase.title}</strong>
            <span>
              {phase.month} · {phase.summary}
            </span>
            <Progress value={phaseProgress} label="Roadmap phase progress" />
            <small>
              {phaseItems.length
                ? `${phaseProgress}% from ${phaseItems.length} real phase records.`
                : "No phase records yet; this is a planning scaffold."}
            </small>
          </div>
          <div className="briefing-next">
            <span className="micro-label">NEXT LESSON / REVISION</span>
            {scheduledNext ? (
              <button onClick={() => open(scheduledNext)}>
                <strong>{scheduledNext.title}</strong>
                <small>
                  {formatDate(scheduledNext.dueDate)} ·{" "}
                  {scheduledNext.course || "scheduled study"}
                  {progressionError(scheduledNext, items)
                    ? " · prerequisites pending; revise first"
                    : ""}
                </small>
                <ArrowRight size={14} />
              </button>
            ) : nextRevision ? (
              <button onClick={() => open(nextRevision)}>
                <strong>{nextRevision.title}</strong>
                <small>
                  Revision due {formatDate(nextRevision.nextRevision)}
                </small>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={() =>
                  navigate(scheduleInstalled ? "roadmap" : "schedule")
                }
              >
                <strong>
                  {scheduleInstalled
                    ? "Choose your next evidence-based lesson"
                    : "Apply your stable starting schedule"}
                </strong>
                <small>
                  {scheduleInstalled
                    ? "Your saved schedule stays intact; dates never grant mastery."
                    : "Starts Sunday 11 October 2026 · no pre-start backlog"}
                </small>
                <ArrowRight size={14} />
              </button>
            )}
            {scheduledNext && nextRevision && (
              <button
                className="briefing-revision"
                onClick={() => open(nextRevision)}
              >
                <strong>Revision: {nextRevision.title}</strong>
                <small>Due {formatDate(nextRevision.nextRevision)}</small>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
          <div className="briefing-lane">
            <span className="micro-label">GSOC / OPEN SOURCE</span>
            <strong>
              {gsocRecords.length
                ? `${gsocRecords.filter(isDone).length} of ${gsocRecords.length} records complete`
                : "Research starts with evidence"}
            </strong>
            <small>
              {gsocRecords.length
                ? "Open your actual research notes and milestones."
                : "Create 3–5 real organization research records; no invented contributions."}
            </small>
            <Button variant="ghost" onClick={() => navigate("strategy")}>
              Go to GSoC plan <ArrowRight size={13} />
            </Button>
          </div>
          <div className="briefing-lane">
            <span className="micro-label">ICPC / CONTESTS</span>
            <strong>
              {icpcRecords.length
                ? `${icpcRecords.filter((item) => item.kind === "contest" && isDone(item)).length} completed records`
                : "Readiness before ratings"}
            </strong>
            <small>
              {icpcRecords.length
                ? "Use real contest records and upsolve notes."
                : "Start contests only after the manual readiness gate is satisfied."}
            </small>
            <Button variant="ghost" onClick={() => navigate("competitive")}>
              Open competitive workspace <ArrowRight size={13} />
            </Button>
          </div>
        </div>
      </Panel>
      <div className="dashboard-widgets">
        {settings.widgets
          .filter((w) => w.visible)
          .map((w) => (
            <div
              key={w.id}
              className={cx(
                "dashboard-widget",
                w.size === "wide" && "widget-wide",
              )}
            >
              {widgets[w.id]}
            </div>
          ))}
      </div>
      {customize && (
        <Modal
          title="Make this space yours"
          onClose={() => setCustomize(false)}
        >
          <p className="muted small">
            Choose what stays in view. Use arrows to change the order.
          </p>
          <div className="widget-config">
            {settings.widgets.map((w, index) => (
              <div className="widget-config-row" key={w.id}>
                <label>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={w.visible}
                    onChange={(e) =>
                      setSettings({
                        widgets: settings.widgets.map((x) =>
                          x.id === w.id
                            ? { ...x, visible: e.target.checked }
                            : x,
                        ),
                      })
                    }
                  />
                  <span>
                    {
                      (
                        {
                          agenda: "Your schedule",
                          tracks: "Learning paths",
                          focus: "Focus room",
                          goals: "Goals & revision",
                          activity: "Consistency",
                          review: "Daily reflection",
                        } as Record<string, string>
                      )[w.id]
                    }
                  </span>
                </label>
                <select
                  disabled={readOnly}
                  aria-label={`${w.id} widget size`}
                  value={w.size}
                  onChange={(e) =>
                    setSettings({
                      widgets: settings.widgets.map((x) =>
                        x.id === w.id
                          ? { ...x, size: e.target.value as "normal" | "wide" }
                          : x,
                      ),
                    })
                  }
                >
                  <option value="normal">Half width</option>
                  <option value="wide">Full width</option>
                </select>
                {[-1, 1].map((direction) => (
                  <Button
                    variant="ghost"
                    className="icon-button"
                    disabled={
                      readOnly ||
                      index + direction < 0 ||
                      index + direction >= settings.widgets.length
                    }
                    key={direction}
                    aria-label={`Move ${w.id} ${direction === -1 ? "up" : "down"}`}
                    onClick={() => {
                      const copy = [...settings.widgets];
                      [copy[index], copy[index + direction]] = [
                        copy[index + direction],
                        copy[index],
                      ];
                      setSettings({ widgets: copy });
                    }}
                  >
                    {direction === -1 ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    )}
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </Modal>
      )}
      {goal && (
        <ItemEditor
          kind="goal"
          allowDelete
          initial={goal}
          fields={goalFields}
          onClose={() => {
            setGoal(null);
            if (recordId) navigate("dashboard");
          }}
        />
      )}
      {reviewOpen && (
        <Modal title="A moment to reflect" onClose={() => setReviewOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!reflection.trim()) return;
              const data = {
                title: `Daily reflection · ${formatDate(day)}`,
                body: reflection,
                date: day,
                domain: "daily",
                period: "daily",
              };
              review ? update(review.id, data) : create("review", data);
              setReviewOpen(false);
            }}
          >
            <Field label="What did you learn, and what’s next?">
              <textarea
                autoFocus
                required
                rows={7}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="A small win…\nSomething I learned…\nTomorrow I will…"
              />
            </Field>
            <div className="modal-actions">
              <Button variant="primary" type="submit">
                Save reflection
                <Check size={15} />
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
