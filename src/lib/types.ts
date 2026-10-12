export const KINDS = [
  "task",
  "event",
  "topic",
  "snippet",
  "problem",
  "contest",
  "project",
  "note",
  "session",
  "card",
  "subject",
  "assignment",
  "exam",
  "attendance",
  "grade",
  "goal",
  "review",
  "practice",
  "milestone",
] as const;
export type Kind = (typeof KINDS)[number];
export type Item = {
  id: string;
  kind: Kind;
  title: string;
  createdAt: string;
  updatedAt: string;
  status?: string;
  tags?: string[];
  body?: string;
  description?: string;
  category?: string;
  subjectId?: string;
  projectId?: string;
  noteId?: string;
  topicId?: string;
  cardId?: string;
  taskId?: string;
  problemId?: string;
  dueDate?: string;
  date?: string;
  startDate?: string;
  targetDate?: string;
  startTime?: string;
  endTime?: string;
  priority?: string;
  duration?: number;
  actualMinutes?: number;
  recurrence?: string;
  seriesId?: string;
  scheduleId?: string;
  completedAt?: string;
  postponed?: number;
  url?: string;
  repository?: string;
  localPath?: string;
  technologies?: string;
  goals?: string;
  difficulty?: string;
  platform?: string;
  solveMethod?: string;
  language?: string;
  attempts?: number;
  approach?: string;
  complexity?: string;
  mistakes?: string;
  nextRevision?: string;
  code?: string;
  rank?: number;
  penalty?: number;
  attempted?: number;
  solved?: number;
  reflection?: string;
  checklist?: string;
  domain?: string;
  order?: number;
  notebook?: string;
  collection?: string;
  pinned?: boolean;
  favorite?: boolean;
  archived?: boolean;
  question?: string;
  answer?: string;
  cardType?: string;
  interval?: number;
  ease?: number;
  reviews?: number;
  reviewHistory?: { date: string; rating: string; interval: number }[];
  attended?: number;
  total?: number;
  marks?: number;
  maxMarks?: number;
  credits?: number;
  interruptions?: number;
  mode?: string;
  target?: number;
  value?: number;
  period?: string;
  html?: string;
  css?: string;
  javascript?: string;
  examples?: string;
  explanation?: string;
  course?: string;
  moduleKey?: string;
  stage?: string;
  courseOrder?: number;
  prerequisites?: string[];
  completionCriteria?: string;
  readinessGate?: string;
  requiresGate?: string;
  roadmapPhase?: string;
  milestone?: string;
  sourceType?: string;
  sourceUrl?: string;
  sourceDate?: string;
  official?: boolean;
  evidence?: string;
  estimatedHours?: number;
  scheduleWeek?: number;
  sessionType?: string;
  originalDate?: string;
  rescheduledAt?: string;
  rescheduleCount?: number;
};
export type WidgetConfig = {
  id: string;
  visible: boolean;
  size: "normal" | "wide";
};
export type Settings = {
  name: string;
  theme: "dark" | "light" | "system";
  accent: "lime" | "blue" | "violet";
  density: "comfortable" | "compact";
  reducedMotion: boolean;
  weekStart: number;
  dateFormat: "short" | "long";
  timeFormat: "12" | "24";
  focusMinutes: number;
  shortBreak: number;
  longBreak: number;
  dailyGoal: number;
  sound: boolean;
  welcomed: boolean;
  sidebarCollapsed: boolean;
  widgets: WidgetConfig[];
  categories: string[];
  priorities: string[];
  recent: string[];
  problemOfDay?: string;
  demo: boolean;
};
export type TimerState = {
  mode: "focus" | "short" | "long";
  running: boolean;
  remaining: number;
  endAt: number | null;
  duration: number;
  linkedId: string;
  interruptions: number;
  cycles: number;
  startedAt: string | null;
  elapsed: number;
};
export type Snapshot = {
  version: 1;
  items: Item[];
  settings: Settings;
  timer: TimerState;
  savedAt: string;
};
export const DEFAULT_SETTINGS: Settings = {
  name: "",
  theme: "dark",
  accent: "lime",
  density: "comfortable",
  reducedMotion: false,
  weekStart: 1,
  dateFormat: "short",
  timeFormat: "24",
  focusMinutes: 25,
  shortBreak: 5,
  longBreak: 15,
  dailyGoal: 120,
  sound: false,
  welcomed: false,
  sidebarCollapsed: false,
  demo: false,
  widgets: ["agenda", "tracks", "focus", "goals", "activity", "review"].map(
    (id) => ({ id, visible: true, size: "normal" }),
  ),
  categories: ["Learning", "Practice", "College", "Project", "Personal"],
  priorities: ["High", "Medium", "Low"],
  recent: [],
};
export const DEFAULT_TIMER: TimerState = {
  mode: "focus",
  running: false,
  remaining: 1500,
  endAt: null,
  duration: 1500,
  linkedId: "",
  interruptions: 0,
  cycles: 0,
  startedAt: null,
  elapsed: 0,
};
