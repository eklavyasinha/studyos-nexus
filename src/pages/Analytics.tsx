import { useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CheckCheck,
  Clock3,
  Code2,
  Flame,
  Info,
  Lightbulb,
  Target,
} from "lucide-react";
import {
  Badge,
  Button,
  Empty,
  PageHeader,
  Panel,
  Progress,
  Stat,
  Tabs,
} from "../components/ui";
import { useStore } from "../lib/store";
import {
  addDays,
  formatDate,
  isDone,
  navigate,
  percent,
  today,
} from "../lib/utils";
import { activityDate, dailySeries, streak } from "../lib/logic";

export default function Analytics() {
  const { items, settings } = useStore(),
    [range, setRange] = useState("week"),
    [end, setEnd] = useState(today),
    [subject, setSubject] = useState(""),
    [category, setCategory] = useState("");
  const length = range === "day" ? 1 : range === "week" ? 7 : 30,
    start = addDays(end, 1 - length);
  const matches = items.filter(
    (i) =>
      (!subject || i.subjectId === subject || i.id === subject) &&
      (!category || i.category === category || i.domain === category),
  );
  const data = matches.filter(
      (i) => activityDate(i) >= start && activityDate(i) <= end,
    ),
    series = dailySeries(matches, start, length);
  const sessions = data.filter((i) => i.kind === "session"),
    minutes = sessions.reduce((n, i) => n + (i.actualMinutes || 0), 0),
    tasks = data.filter((i) => i.kind === "task" && isDone(i)),
    problems = data.filter(
      (i) =>
        i.kind === "problem" && ["solved", "revised"].includes(i.status || ""),
    );
  const topics = matches.filter((i) => i.kind === "topic"),
    projects = matches.filter((i) => i.kind === "project");
  const activeDays = series.filter(
    (s) => s.minutes > 0 || s.tasks > 0 || s.problems > 0,
  ).length;
  const observations: string[] = [];
  const overdue = matches.filter(
    (i) => i.kind === "task" && !isDone(i) && i.dueDate && i.dueDate < today(),
  );
  if (overdue.length)
    observations.push(
      `${overdue.length} overdue ${overdue.length === 1 ? "task needs" : "tasks need"} a fresh plan. Reschedule deliberately instead of letting them drift.`,
    );
  const postponed = matches.filter(
    (i) => (i.postponed || 0) >= 2 && !isDone(i),
  );
  if (postponed.length)
    observations.push(
      `${postponed.length} open ${postponed.length === 1 ? "task has" : "tasks have"} been postponed at least twice. Try a smaller next step.`,
    );
  const neglected = topics.filter(
    (i) =>
      !isDone(i) &&
      i.status !== "not started" &&
      i.updatedAt.slice(0, 10) < addDays(today(), -14),
  );
  if (neglected.length)
    observations.push(
      `${neglected.length} active ${neglected.length === 1 ? "topic hasn’t" : "topics haven’t"} been updated in 14 days. A brief revision may help.`,
    );
  if (minutes && minutes < settings.dailyGoal * length)
    observations.push(
      `You logged ${Math.round(minutes)} of ${settings.dailyGoal * length} target minutes in this range. Protect one small focus block tomorrow.`,
    );
  if (!observations.length)
    observations.push(
      items.length
        ? "No overdue or repeatedly postponed work stands out. Keep building a rhythm that works for you."
        : "Once you log some activity, this space will surface useful patterns. No invented insights, just your own progress.",
    );
  const chart = (key: "minutes" | "tasks" | "problems", label: string) => {
    const max = Math.max(1, ...series.map((s) => s[key]));
    return (
      <>
        <div
          className="analytics-bars"
          style={{ "--bar-count": length } as React.CSSProperties}
          role="img"
          aria-label={`${label}: ${series.map((s) => `${s.date}: ${Math.round(s[key])}`).join(", ")}`}
        >
          {series.map((s, n) => (
            <div
              key={s.date}
              title={`${formatDate(s.date)}: ${Math.round(s[key])} ${label}`}
            >
              <span className="analytics-value">
                {s[key] > 0 ? Math.round(s[key]) : ""}
              </span>
              <div className="analytics-bar-track">
                <span style={{ height: `${percent(s[key], max)}%` }} />
              </div>
              <small>
                {length <= 7
                  ? formatDate(s.date)
                  : n % 5 === 0
                    ? Number(s.date.slice(-2))
                    : ""}
              </small>
            </div>
          ))}
        </div>
        <details className="chart-data">
          <summary>View exact chart data</summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>{label}</th>
                </tr>
              </thead>
              <tbody>
                {series.map((s) => (
                  <tr key={s.date}>
                    <td>{s.date}</td>
                    <td>{Math.round(s[key] * 100) / 100}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </>
    );
  };
  return (
    <div className="stack analytics-page">
      <PageHeader
        eyebrow="THE LONG GAME"
        title="See how far you’ve come"
        description="Less comparison. More perspective. A clear picture of your own progress."
        actions={
          <Tabs
            options={[
              { id: "day", label: "Daily" },
              { id: "week", label: "Weekly" },
              { id: "month", label: "Monthly" },
            ]}
            value={range}
            onChange={setRange}
          />
        }
      />
      <div className="toolbar analytics-filters">
        <span className="muted small">
          {formatDate(start)} — {formatDate(end)}
        </span>
        <label>
          Through{" "}
          <input
            aria-label="Analytics ending date"
            type="date"
            value={end}
            onChange={(e) => e.target.value && setEnd(e.target.value)}
          />
        </label>
        <select
          aria-label="Analytics subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="">All subjects</option>
          {items
            .filter((i) => i.kind === "subject")
            .map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
        </select>
        <select
          aria-label="Analytics category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {[
            ...new Set(
              items
                .flatMap((i) => [i.category, i.domain])
                .filter((i): i is string => !!i),
            ),
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </div>
      <div className="stats-grid">
        <Stat
          label="Intentional focus"
          value={
            <>
              {(minutes / 60).toFixed(1)}
              <span className="stat-unit">hrs</span>
            </>
          }
          hint={`${sessions.length} actual sessions`}
          icon={<Clock3 size={17} />}
        />
        <Stat
          label="Tasks completed"
          value={tasks.length}
          hint="By completion date"
          icon={<CheckCheck size={17} />}
        />
        <Stat
          label="Problems solved"
          value={problems.length}
          hint="Manually entered results"
          icon={<Code2 size={17} />}
        />
        <Stat
          label="Active days"
          value={`${activeDays}/${length}`}
          hint={`${streak(matches)}-day current streak`}
          icon={<Flame size={17} />}
        />
      </div>
      <div className="grid-2">
        <Panel title="Time well spent" action={<Badge>Focused minutes</Badge>}>
          {chart("minutes", "Minutes")}
        </Panel>
        <Panel
          title="One thing finished at a time"
          action={<Badge>Completed tasks</Badge>}
        >
          {chart("tasks", "Tasks")}
        </Panel>
        <Panel
          title="Problem-solving rhythm"
          action={<Code2 size={17} className="muted" />}
        >
          {chart("problems", "Solved problems")}
        </Panel>
        <Panel
          title="Knowledge, taking shape"
          action={<Badge>Current snapshot</Badge>}
        >
          {topics.length ? (
            <div className="mastery-list">
              {["java", "dsa", "cp", "web", "college"].map((domain) => {
                const all = topics.filter((i) => i.domain === domain),
                  mastered = all.filter(isDone).length;
                return all.length ? (
                  <div key={domain}>
                    <div className="row-between">
                      <strong>
                        {
                          (
                            {
                              java: "Java",
                              dsa: "Data structures & algorithms",
                              cp: "Competitive programming",
                              web: "Web development",
                              college: "College subjects",
                            } as Record<string, string>
                          )[domain]
                        }
                      </strong>
                      <span className="small mono">
                        {mastered}/{all.length}
                      </span>
                    </div>
                    <Progress
                      value={percent(mastered, all.length)}
                      label={`${domain} mastery`}
                    />
                  </div>
                ) : null;
              })}
              <p className="small muted">
                Mastery is self-assessed. These counts include all current
                topics, not just the selected date range.
              </p>
            </div>
          ) : (
            <Empty
              icon={<Target size={23} />}
              title="Your knowledge has room to grow"
              description="Add a curriculum in any learning studio and update topics as you learn."
              action={
                <Button onClick={() => navigate("java")}>
                  Open Java Studio <ArrowUpRight size={14} />
                </Button>
              }
            />
          )}
        </Panel>
      </div>
      <div className="grid-2">
        <Panel
          title="Things you’re bringing to life"
          action={<Badge>Current projects</Badge>}
        >
          {projects.length ? (
            <div className="mastery-list">
              {projects.map((p) => {
                const work = items.filter(
                    (i) =>
                      i.projectId === p.id &&
                      ["task", "milestone"].includes(i.kind),
                  ),
                  done = work.filter(isDone).length;
                return (
                  <button
                    className="project-insight"
                    key={p.id}
                    onClick={() => navigate("projects", p.id)}
                  >
                    <div className="row-between">
                      <strong>{p.title}</strong>
                      <span className="small">
                        {done}/{work.length} work items
                      </span>
                    </div>
                    <Progress
                      value={percent(done, work.length)}
                      label={p.title}
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty
              title="Ideas become evidence"
              description="Create a project and break it into tasks. Track actual milestones, not a guessed percentage."
              action={
                <Button onClick={() => navigate("projects", "new")}>
                  Start a project
                </Button>
              }
            />
          )}
        </Panel>
        <Panel
          title="A few things worth noticing"
          action={<Lightbulb size={18} className="text-accent" />}
        >
          <div className="observation-list">
            {observations.map((o, n) => (
              <div key={n}>
                <span>{String(n + 1).padStart(2, "0")}</span>
                <p>{o}</p>
              </div>
            ))}
          </div>
          <p className="insight-disclaimer">
            <Info size={13} />
            Local rules, not AI predictions.
          </p>
        </Panel>
      </div>
      <div className="analytics-footnote">
        <BarChart3 size={15} />
        <span>
          Charts are calculated from your records. Manual results are labelled;
          no external platform data is fetched. Empty charts mean no activity
          was recorded in this range.
        </span>
      </div>
    </div>
  );
}
