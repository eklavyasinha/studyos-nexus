import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  Command,
  FileText,
  Flag,
  FolderKanban,
  GraduationCap,
  Headphones,
  HelpCircle,
  LayoutDashboard,
  Layers3,
  Leaf,
  LockKeyhole,
  Menu,
  Moon,
  Plus,
  Search,
  Route,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Terminal,
  Trophy,
  WifiOff,
  X,
  Code2,
  ChartNoAxesCombined,
} from "lucide-react";
import { useStore } from "./lib/store";
import { useRoute } from "./lib/hooks";
import {
  cx,
  download,
  formatDate,
  isDone,
  navigate,
  routeFor,
  today,
} from "./lib/utils";
import { serializeBackup } from "./lib/logic";
import { Button, Empty, Field, Modal } from "./components/ui";
import StudyAssistant from "./components/StudyAssistant";
import Dashboard from "./pages/Dashboard";
import Focus, { TimerEngine } from "./pages/Focus";
const Planner = lazy(() => import("./pages/Planner")),
  StudySchedule = lazy(() => import("./pages/StudySchedule")),
  Learning = lazy(() => import("./pages/Learning")),
  PersonalRoadmap = lazy(() => import("./pages/PersonalRoadmap")),
  StrategyRoadmap = lazy(() => import("./pages/StrategyRoadmap")),
  Projects = lazy(() => import("./pages/Projects")),
  Notes = lazy(() => import("./pages/Notes")),
  Cards = lazy(() => import("./pages/Cards")),
  College = lazy(() => import("./pages/College")),
  Analytics = lazy(() => import("./pages/Analytics")),
  Settings = lazy(() => import("./pages/Settings"));
export const NAV = [
  {
    section: "WORKSPACE",
    items: [
      { id: "dashboard", label: "Overview", icon: LayoutDashboard },
      { id: "planner", label: "Planner", icon: CalendarDays },
      { id: "schedule", label: "Study schedule", icon: CalendarClock },
      { id: "focus", label: "Focus room", icon: Headphones },
      { id: "notes", label: "Notes & knowledge", icon: FileText },
      { id: "cards", label: "Flashcards", icon: Layers3 },
    ],
  },
  {
    section: "LEARN & BUILD",
    items: [
      { id: "java", label: "Java Studio", icon: Terminal, mark: "orange" },
      { id: "dsa", label: "DSA & algorithms", icon: Code2, mark: "blue" },
      {
        id: "competitive",
        label: "Competitive & ICPC",
        icon: Trophy,
        mark: "violet",
      },
      { id: "web", label: "Web development", icon: BookOpen, mark: "green" },
      { id: "projects", label: "Projects", icon: FolderKanban },
      { id: "college", label: "College & subjects", icon: GraduationCap },
      { id: "roadmap", label: "Personal course map", icon: Route },
      { id: "strategy", label: "GSoC & six-month plan", icon: Flag },
    ],
  },
  {
    section: "REFLECT",
    items: [
      {
        id: "analytics",
        label: "Insights & progress",
        icon: ChartNoAxesCombined,
      },
    ],
  },
];
const flatNav = NAV.flatMap((g) => g.items);
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <path d="M7 24V8h5l8 11V8h5v16h-5L12 13v11Z" fill="currentColor" />
        </svg>
      </span>
      <div>
        <strong>
          StudyOS<span>Nexus</span>
        </strong>
        <small>YOUR NEXT CHAPTER.</small>
      </div>
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const { items, touch } = useStore();
  const [query, setQuery] = useState(""),
    [index, setIndex] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const actions = [
    {
      id: "task",
      label: "Create a task",
      meta: "Quick action",
      run: () => navigate("planner", "new"),
      icon: Plus,
    },
    {
      id: "note",
      label: "Capture a note",
      meta: "Quick action",
      run: () => navigate("notes", "new"),
      icon: FileText,
    },
    {
      id: "card",
      label: "Create a flashcard",
      meta: "Quick action",
      run: () => navigate("cards", "new"),
      icon: Layers3,
    },
    {
      id: "problem",
      label: "Log a coding problem",
      meta: "Quick action",
      run: () => navigate("dsa", "new"),
      icon: Code2,
    },
    {
      id: "project",
      label: "Start a project",
      meta: "Quick action",
      run: () => navigate("projects", "new"),
      icon: FolderKanban,
    },
    {
      id: "focus",
      label: "Start a focus session",
      meta: "Quick action",
      run: () => navigate("focus"),
      icon: Headphones,
    },
    ...flatNav.map((n) => ({
      id: `nav-${n.id}`,
      label: n.label,
      meta: "Go to",
      run: () => navigate(n.id),
      icon: n.icon,
    })),
    ...["appearance", "preferences", "organize", "data"].map((id) => ({
      id: `settings-${id}`,
      label: `Settings · ${{ appearance: "Theme & appearance", preferences: "Study preferences", organize: "Categories, tags & priorities", data: "Data, export & restore" }[id]}`,
      meta: "Settings",
      run: () => navigate("settings", id),
      icon: Settings2,
    })),
  ];
  const words = query.toLowerCase().trim().split(/\s+/);
  const matching = items
    .filter(
      (i) =>
        i.sourceType !== "schedule-installation" &&
        words.every((q) =>
          [
            i.title,
            i.kind,
            i.body,
            i.description,
            i.question,
            i.answer,
            i.code,
            i.platform,
            i.category,
            i.domain,
            i.course,
            i.stage,
            i.moduleKey,
            i.completionCriteria,
            i.milestone,
            i.evidence,
            ...(i.prerequisites || []),
            ...(i.tags || []),
          ]
            .join(" ")
            .toLowerCase()
            .includes(q),
        ),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 30)
    .map((i) => ({
      id: i.id,
      label: i.title,
      meta: `${i.kind}${i.archived ? " · archived" : ""}`,
      icon:
        i.kind === "note"
          ? FileText
          : i.kind === "project"
            ? FolderKanban
            : i.kind === "card"
              ? Layers3
              : BookOpen,
      run: () => {
        touch(i.id);
        navigate(routeFor(i), i.id);
      },
    }));
  const results = query.trim()
    ? [
        ...matching,
        ...actions.filter((a) =>
          words.every((q) =>
            (a.label + " " + a.meta).toLowerCase().includes(q),
          ),
        ),
      ]
    : actions.slice(0, 10);
  useEffect(() => {
    setIndex(0);
  }, [query]);
  useEffect(() => {
    list.current
      ?.querySelector(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);
  const choose = (n: number) => {
    results[n]?.run();
    onClose();
  };
  return (
    <Modal title="Go anywhere. Do anything." onClose={onClose} wide>
      <div className="command-search">
        <Search size={22} />
        <input
          autoFocus
          placeholder="Search your workspace or type a command…"
          aria-label="Search all records and commands"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          role="combobox"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={
            results[index] ? `result-${results[index].id}` : undefined
          }
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setIndex(
                (n) =>
                  (n +
                    (e.key === "ArrowDown" ? 1 : -1) +
                    Math.max(1, results.length)) %
                  Math.max(1, results.length),
              );
            }
            if (e.key === "Enter") {
              e.preventDefault();
              choose(index);
            }
          }}
        />
        <kbd>esc</kbd>
      </div>
      <div
        className="command-results"
        id="command-results"
        role="listbox"
        ref={list}
      >
        <p className="micro-label">
          {query ? "YOUR WORKSPACE" : "QUICK ACTIONS & PLACES"}
        </p>
        {results.map((r, n) => (
          <button
            role="option"
            aria-selected={n === index}
            id={`result-${r.id}`}
            data-index={n}
            className={cx(n === index && "selected")}
            key={r.id}
            onMouseMove={() => setIndex(n)}
            onClick={() => choose(n)}
          >
            <span className="command-icon">
              <r.icon size={17} />
            </span>
            <span>
              <strong>{r.label}</strong>
              <small>{r.meta}</small>
            </span>
            <ArrowUpRight size={14} />
          </button>
        ))}
        {!results.length && (
          <Empty
            title="Nothing here by that name"
            description="Try a different word, tag, or record title."
          />
        )}
      </div>
      <div className="command-footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> navigate
        </span>
        <span>
          <kbd>↵</kbd> open
        </span>
        <span>YOUR DATA. ON YOUR DEVICE.</span>
      </div>
    </Modal>
  );
}

function Welcome() {
  const { setSettings, readOnly } = useStore();
  const [name, setName] = useState(""),
    [goal, setGoal] = useState(120);
  return (
    <Modal
      title="A new chapter starts here."
      onClose={() => {
        if (!readOnly) setSettings({ welcomed: true });
      }}
      wide
    >
      <div className="welcome-layout">
        <div className="welcome-art">
          <span className="welcome-n">N</span>
          <div className="welcome-orbit" />
          <span className="micro-label">LEARN. BUILD. BECOME.</span>
        </div>
        <div className="welcome-copy">
          <BadgeWelcome />
          <h2>
            A home for your
            <br />
            ambitious mind.
          </h2>
          <p>
            Your learning, projects, and best ideas. Finally in one thoughtful
            space. No setup maze. No account. Just you, moving forward.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSettings({
                name: name.trim(),
                dailyGoal: goal,
                welcomed: true,
              });
            }}
          >
            <Field label="First name (optional)">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How should we greet you?"
                maxLength={60}
              />
            </Field>
            <Field label="An achievable daily focus goal">
              <div className="welcome-goals">
                {[30, 60, 120, 180].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={goal === n}
                    className={cx(goal === n && "selected")}
                    onClick={() => setGoal(n)}
                  >
                    {n} min
                  </button>
                ))}
              </div>
            </Field>
            <Button variant="primary" type="submit" disabled={readOnly}>
              Make this my space
              <ArrowRight size={16} />
            </Button>
          </form>
          <p className="welcome-privacy">
            <ShieldCheck size={14} />
            Starts empty. Your work stays on this device.
          </p>
        </div>
      </div>
    </Modal>
  );
}
function BadgeWelcome() {
  return (
    <span className="welcome-badge">
      <Sparkles size={12} />
      WELCOME TO STUDYOS NEXUS
    </span>
  );
}

class PageBoundary extends Component<
  { children: ReactNode; onBackup: () => void },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="page-failure">
        <h1>This view hit a snag.</h1>
        <p>
          Your saved workspace is still in browser storage. Export a copy before
          reloading if you have unsaved changes.
        </p>
        <Button onClick={this.props.onBackup}>Export current data</Button>
        <Button onClick={() => location.reload()}>Reload app</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}

export default function App() {
  const store = useStore(),
    { settings, setSettings, items, ready, readOnly, error, saving } = store,
    { page, recordId } = useRoute();
  const [palette, setPalette] = useState(false),
    [mobile, setMobile] = useState(false),
    [help, setHelp] = useState(false),
    [notifications, setNotifications] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  const main = useRef<HTMLElement>(null);
  const currentNav = flatNav.find((n) => n.id === page);
  const collapsed = settings.sidebarCollapsed;
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : settings.theme;
      document.documentElement.dataset.accent = settings.accent;
      document.documentElement.dataset.density = settings.density;
      document.documentElement.dataset.motion = settings.reducedMotion
        ? "reduce"
        : "auto";
      document.documentElement.dataset.dateFormat = settings.dateFormat;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [
    settings.theme,
    settings.accent,
    settings.density,
    settings.reducedMotion,
    settings.dateFormat,
  ]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      const typing = (e.target as HTMLElement)?.closest(
        "input,textarea,select,[contenteditable]",
      );
      if (
        e.key === "?" &&
        !typing &&
        !document.querySelector('[role="dialog"]')
      ) {
        e.preventDefault();
        setHelp(true);
      }
      if (e.key === "Escape") setMobile(false);
    };
    const net = () => setOnline(navigator.onLine);
    window.addEventListener("keydown", key);
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
    };
  }, []);
  useEffect(() => {
    setMobile(false);
    document.title = `${currentNav?.label || "Settings"} · StudyOS Nexus`;
    main.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [page]);
  const alerts = items
    .filter(
      (i) =>
        (i.kind === "task" &&
          !i.archived &&
          i.status !== "cancelled" &&
          !i.sessionType?.startsWith("optional") &&
          !isDone(i) &&
          i.dueDate &&
          i.dueDate <= today()) ||
        (i.kind === "card" && (!i.dueDate || i.dueDate <= today())) ||
        (i.kind === "exam" && i.date && i.date >= today()),
    )
    .slice(0, 20);
  const pageContent =
    page === "dashboard" ? (
      <Dashboard recordId={recordId} />
    ) : page === "planner" ? (
      <Planner recordId={recordId} />
    ) : page === "schedule" ? (
      <StudySchedule recordId={recordId} />
    ) : ["java", "dsa", "competitive", "web"].includes(page) ? (
      <Learning
        domain={
          page === "competitive" ? "cp" : (page as "java" | "dsa" | "web")
        }
        recordId={recordId}
      />
    ) : page === "roadmap" ? (
      <PersonalRoadmap recordId={recordId} />
    ) : page === "strategy" ? (
      <StrategyRoadmap recordId={recordId} />
    ) : page === "projects" ? (
      <Projects recordId={recordId} />
    ) : page === "notes" ? (
      <Notes recordId={recordId} />
    ) : page === "focus" ? (
      <Focus recordId={recordId} />
    ) : page === "cards" ? (
      <Cards recordId={recordId} />
    ) : page === "college" ? (
      <College recordId={recordId} />
    ) : page === "analytics" ? (
      <Analytics />
    ) : page === "settings" ? (
      <Settings recordId={recordId} />
    ) : (
      <Empty
        title="That page isn’t in this workspace"
        action={
          <Button onClick={() => navigate("dashboard")}>
            Back to overview
          </Button>
        }
      />
    );
  return (
    <div className={cx("app", collapsed && "sidebar-collapsed")}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to main content
      </a>
      {mobile && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={cx("sidebar", mobile && "mobile-open")}
        aria-label="Main navigation"
      >
        <button
          className="brand-button"
          onClick={() => navigate("dashboard")}
          aria-label="StudyOS Nexus overview"
        >
          <Brand />
        </button>
        <div className="workspace-switch">
          <span className="workspace-avatar">
            {settings.name?.[0]?.toUpperCase() || "Y"}
          </span>
          <div>
            <strong>
              {settings.name ? `${settings.name}’s workspace` : "My workspace"}
            </strong>
            <span>Personal · local-first</span>
          </div>
          <LockKeyhole size={13} />
        </div>
        <button
          className="sidebar-search"
          onClick={() => setPalette(true)}
          title="Search workspace (⌘K / Ctrl K)"
        >
          <Search size={16} />
          <span>Search anything</span>
          <kbd>⌘ K</kbd>
        </button>
        <nav>
          {NAV.map((group) => (
            <div className="nav-group" key={group.section}>
              <p>{group.section}</p>
              {group.items.map((n) => (
                <a
                  href={`#${n.id}`}
                  className={cx("nav-link", page === n.id && "active")}
                  key={n.id}
                  aria-current={page === n.id ? "page" : undefined}
                  title={n.label}
                  aria-label={n.label}
                >
                  <n.icon size={17} strokeWidth={1.7} />
                  <span>{n.label}</span>
                  {n.id === "cards" &&
                    items.some(
                      (i) =>
                        i.kind === "card" &&
                        (!i.dueDate || i.dueDate <= today()),
                    ) && (
                      <small>
                        {
                          items.filter(
                            (i) =>
                              i.kind === "card" &&
                              (!i.dueDate || i.dueDate <= today()),
                          ).length
                        }
                      </small>
                    )}
                  {"mark" in n && <i className={`nav-dot ${n.mark}`} />}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <span className="local-leaf">
              <Leaf size={18} />
            </span>
            <div>
              <strong>A space that’s truly yours.</strong>
              <span>No cloud. No noise. Just progress.</span>
            </div>
          </div>
          <a
            className={cx("nav-link", page === "settings" && "active")}
            href="#settings"
            title="Settings"
          >
            <Settings2 size={17} />
            <span>Settings & preferences</span>
          </a>
          <div className="sidebar-user">
            <span className="user-avatar">
              {settings.name?.[0]?.toUpperCase() || "N"}
            </span>
            <div>
              <strong>{settings.name || "Your personal space"}</strong>
              <span>
                <span className="live-dot" />
                {readOnly ? "Read-only tab" : "On this device"}
              </span>
            </div>
            <button
              className="collapse-button"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSettings({ sidebarCollapsed: !collapsed })}
              disabled={readOnly}
            >
              <ChevronsLeft size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              className="mobile-menu icon-button"
              variant="ghost"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={19} />
            </Button>
            <span className="breadcrumb-home">My workspace</span>
            <ChevronRight size={12} />
            <strong>{currentNav?.label || "Settings"}</strong>
            {recordId && recordId !== "new" && (
              <>
                <ChevronRight size={12} />
                <span className="breadcrumb-record">
                  {items.find((i) => i.id === recordId)?.title || recordId}
                </span>
              </>
            )}
          </div>
          <div className="topbar-actions">
            <span className="save-indicator">
              <span className={cx("live-dot", saving && "pulse")} />
              {error
                ? "Save needs attention"
                : !ready
                  ? "Opening workspace…"
                  : saving
                    ? "Saving…"
                    : online
                      ? "Saved locally"
                      : "Offline · local data"}
            </span>
            <Button
              className="icon-button topbar-search"
              variant="ghost"
              aria-label="Global search"
              onClick={() => setPalette(true)}
            >
              <Search size={17} />
            </Button>
            <Button
              className="icon-button"
              variant="ghost"
              title="Toggle light and dark theme"
              aria-label="Toggle theme"
              disabled={readOnly}
              onClick={() =>
                setSettings({
                  theme:
                    document.documentElement.dataset.theme === "dark"
                      ? "light"
                      : "dark",
                })
              }
            >
              {document.documentElement.dataset.theme === "light" ? (
                <Moon size={17} />
              ) : (
                <Sun size={17} />
              )}
            </Button>
            <button
              className="notification-button"
              aria-label="Open reminders"
              title="Local reminders"
              onClick={() => setNotifications(true)}
            >
              <Bell size={17} />
              {alerts.length > 0 && <i />}
            </button>
            <span className="topbar-divider" />
            <button
              className="header-avatar"
              title="Personal preferences"
              aria-label="Personal preferences"
              onClick={() => navigate("settings", "preferences")}
            >
              {settings.name?.[0]?.toUpperCase() || "N"}
            </button>
          </div>
        </header>
        {!online && (
          <div className="status-banner">
            <WifiOff size={15} />
            You’re offline. Open views and your local records still work; the
            local server must remain running for uncached pages.
          </div>
        )}
        {readOnly && ready && (
          <div className="status-banner">
            <LockKeyhole size={15} />
            Read-only tab: another tab owns editing. Close it and reload this
            tab to make changes.
            <Button variant="ghost" onClick={() => location.reload()}>
              Reload
            </Button>
          </div>
        )}
        {error && (
          <div className="status-banner error-banner" role="alert">
            {error}
            <Button onClick={store.retry}>Retry save</Button>
            <Button
              onClick={() =>
                download(
                  `studyos-recovery-${today()}.json`,
                  serializeBackup(store.snapshot()),
                )
              }
            >
              Export current copy
            </Button>
          </div>
        )}
        <main
          id="main-content"
          className="main-content"
          ref={main}
          tabIndex={-1}
        >
          {!ready ? (
            <div
              className="loading-layout"
              role="status"
              aria-label="Opening your workspace"
            >
              <div />
              <div />
              <div />
              <div />
            </div>
          ) : (
            <PageBoundary
              key={page}
              onBackup={() =>
                download(
                  `studyos-recovery-${today()}.json`,
                  serializeBackup(store.snapshot()),
                )
              }
            >
              <Suspense
                fallback={
                  <div
                    className="loading-layout"
                    role="status"
                    aria-label="Loading workspace view"
                  >
                    <div />
                    <div />
                    <div />
                  </div>
                }
              >
                {pageContent}
              </Suspense>
            </PageBoundary>
          )}
        </main>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={12} />
            Private by design. Progress by intention.
          </span>
          <button onClick={() => setHelp(true)}>
            <HelpCircle size={13} />
            Shortcuts & help<kbd>?</kbd>
          </button>
          <span>
            STUDYOS NEXUS <b>1.0</b>
          </span>
        </footer>
      </div>
      <TimerEngine />
      {ready && <StudyAssistant />}
      {palette && <CommandPalette onClose={() => setPalette(false)} />}{" "}
      {ready && !settings.welcomed && !readOnly && <Welcome />}
      {notifications && (
        <Modal title="A gentle nudge" onClose={() => setNotifications(false)}>
          <p className="muted small">
            Local reminders from your own records. No background notifications
            or platform feeds.
          </p>
          {alerts.length ? (
            <div className="reminder-list">
              {alerts.map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    navigate(routeFor(i), i.id);
                    setNotifications(false);
                  }}
                >
                  <span>
                    <strong>{i.title}</strong>
                    <small>
                      {i.kind === "card"
                        ? "Flashcard ready to review"
                        : `${i.kind} · ${formatDate(i.dueDate || i.date)}`}
                    </small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              icon={<Bell size={25} />}
              title="A clear horizon"
              description="Tasks due today, revision cards, and upcoming exams will appear here."
            />
          )}
        </Modal>
      )}
      {help && (
        <Modal
          title="Move at the speed of thought"
          onClose={() => setHelp(false)}
        >
          <div className="shortcut-list">
            <div>
              <span>Search everything & quick actions</span>
              <kbd>⌘ K / Ctrl K</kbd>
            </div>
            <div>
              <span>Show this guide (outside text fields)</span>
              <kbd>?</kbd>
            </div>
            <div>
              <span>Move through tabs / search results</span>
              <kbd>← → / ↑ ↓</kbd>
            </div>
            <div>
              <span>Close a dialog</span>
              <kbd>Esc</kbd>
            </div>
            <div>
              <span>Flashcards · reveal / rate</span>
              <kbd>Space / 1–4</kbd>
            </div>
          </div>
          <div className="help-note">
            <ShieldCheck size={20} />
            <p>
              Your browser is your workspace. Export a JSON backup regularly,
              and before clearing browser data. No external services are needed.
            </p>
          </div>
          <Button
            onClick={() => {
              navigate("settings", "data");
              setHelp(false);
            }}
          >
            Data & backups
            <ArrowRight size={14} />
          </Button>
        </Modal>
      )}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {store.toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <span className="toast-icon">
              {t.tone === "error" ? "!" : <Check size={15} />}
            </span>
            <span>{t.message}</span>
            <button
              onClick={() => store.dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
