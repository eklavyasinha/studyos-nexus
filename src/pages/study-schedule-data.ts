import type { Item } from "../lib/types";
import { addDays } from "../lib/utils";
import { PERSONAL_ROADMAP } from "./personal-roadmap-data";

/**
 * The dated plan is deliberately versioned.  A workspace that already has the
 * The legacy October 4 scaffold keeps those records (including completed/deleted history)
 * and gets a separate, explicitly applied set of records for this plan.
 */
export const SCHEDULE_VERSION = "2026-10-11-to-2027-03-31-v2";
export const SCHEDULE_PREFIX = "study-schedule-v2";
export const LEGACY_SCHEDULE_PREFIX = "study-schedule";
export const START_DATE = "2026-10-11";
export const END_DATE = "2027-03-31";
export const SCHEDULE_WEEKS = 25;
export const INSTALLATION_ID = `study-plan-installation-${SCHEDULE_VERSION}`;

export const ROUTINE_BLOCKS = [
  {
    label: "Gym + breakfast",
    start: "06:30",
    end: "09:00",
    note: "Protected every day, including weekends",
  },
  {
    label: "College + lunch",
    start: "09:00",
    end: "16:30",
    note: "Protected every day; no unverified weekend absence is assumed",
  },
  {
    label: "Dinner",
    start: "20:00",
    end: "21:00",
    note: "Protected every day",
  },
] as const;

export const STUDY_WINDOWS = [
  {
    label: "GSoC / open source first",
    start: "17:30",
    end: "18:15",
    note: "Git, repository, docs, tests, issues and proposal evidence as the current phase requires.",
  },
  {
    label: "Java + DSA spine",
    start: "18:20",
    end: "19:30",
    note: "The linked canonical topic is practice evidence; it never completes the course topic automatically.",
  },
  {
    label: "Maths maintenance",
    start: "17:30",
    end: "18:15",
    note: "Tuesday/Thursday and weekend rotations keep linear algebra and eigenanalysis active.",
  },
  {
    label: "Web / project third",
    start: "21:00",
    end: "22:15",
    note: "Use the actual enrolled material, then implement and test one small independent outcome.",
  },
  {
    label: "Daily review",
    start: "22:30",
    end: "22:45",
    note: "Recall, record the first error and choose one next action; missed work is not doubled.",
  },
] as const;

export type ScheduleSeed = Omit<Partial<Item>, "kind" | "scheduleId"> & {
  kind: "task";
  title: string;
  scheduleId: string;
  date: string;
  dueDate: string;
  originalDate: string;
  scheduleWeek: number;
  sessionType: string;
  course: string;
  stage: string;
  description: string;
  completionCriteria: string;
  prerequisites: string[];
  startTime: string;
  endTime: string;
  duration: number;
  priority: string;
  milestone: string;
  sourceType: string;
  official: false;
  roadmapPhase: string;
};

type SessionInput = Pick<
  ScheduleSeed,
  | "title"
  | "course"
  | "stage"
  | "sessionType"
  | "description"
  | "completionCriteria"
  | "startTime"
  | "endTime"
> & {
  slot: string;
  moduleKey?: string;
  prerequisites?: string[];
  priority?: string;
  milestone?: string;
  requiresGate?: "leetcode" | "codeforces" | "icpc";
  roadmapPhase?: string;
  sourceType?: string;
  sourceUrl?: string;
  tags?: string[];
};

const MODULE_PREREQUISITES: Record<string, string[]> = Object.fromEntries(
  PERSONAL_ROADMAP.map((module) => [module.key, [...module.prerequisites]]),
);
const MODULE_TITLES = new Map(
  PERSONAL_ROADMAP.map((module) => [module.key, module.title]),
);

const PHASES = [
  {
    id: "october-gsoc-foundations",
    start: "2026-10-11",
    end: "2026-10-31",
    title: "GSoC foundations and evidence",
  },
  {
    id: "november-gsoc-research",
    start: "2026-11-01",
    end: "2026-11-30",
    title: "Research and narrow the open-source search",
  },
  {
    id: "december-repository-prep",
    start: "2026-12-01",
    end: "2026-12-31",
    title: "Repository, docs, tests and issue preparation",
  },
  {
    id: "january-contribution",
    start: "2027-01-01",
    end: "2027-01-31",
    title: "Small contributions and project ownership",
  },
  {
    id: "february-proposal-prep",
    start: "2027-02-01",
    end: "2027-02-28",
    title: "Proposal research and gated practice",
  },
  {
    id: "march-proposal-maintenance",
    start: "2027-03-01",
    end: "2027-03-31",
    title: "Proposal draft, feedback and maintenance",
  },
] as const;

function phaseFor(date: string) {
  return (
    PHASES.find((phase) => date >= phase.start && date <= phase.end) ||
    PHASES[PHASES.length - 1]
  );
}

function dayOfWeek(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function elapsed(start: string, end: string) {
  const value = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  };
  return value(end) - value(start);
}

function session(date: string, input: SessionInput): ScheduleSeed {
  const { slot, ...values } = input;
  const phase = phaseFor(date);
  const moduleKey = input.moduleKey;
  return {
    ...values,
    kind: "task",
    // A date/slot identity is stable across reloads and copy edits.  A moved
    // record keeps this identity while its originalDate/history are preserved.
    scheduleId: `${SCHEDULE_PREFIX}-${date}-${slot}`,
    date,
    dueDate: date,
    originalDate: date,
    scheduleWeek: scheduleWeekFor(date),
    status: "todo",
    duration: elapsed(input.startTime, input.endTime),
    priority: input.priority || "Medium",
    moduleKey,
    prerequisites: [
      ...new Set(
        input.prerequisites ??
          (moduleKey ? MODULE_PREREQUISITES[moduleKey] : []),
      ),
    ],
    milestone: input.milestone || `${phase.title} · independent evidence`,
    sourceType: input.sourceType || "study-plan-scaffold-v2",
    official: false,
    roadmapPhase: input.roadmapPhase || phase.id,
    tags: [
      "study-plan-v2",
      "starting-scaffold",
      phase.id,
      input.course,
      ...(input.tags || []),
    ],
  };
}

function courseSession(
  slot: string,
  title: string,
  moduleKey: string,
  startTime: string,
  endTime: string,
  description: string,
  completionCriteria: string,
  extra: Partial<SessionInput> = {},
): SessionInput {
  const module = PERSONAL_ROADMAP.find((item) => item.key === moduleKey);
  if (!module) throw new Error(`Unknown canonical roadmap key: ${moduleKey}`);
  return {
    slot,
    title,
    moduleKey,
    course: module.course,
    stage: module.stage,
    sessionType: module.course === "java-dsa" ? "java-dsa" : "web-practice",
    startTime,
    endTime,
    description,
    completionCriteria,
    priority: module.course === "java-dsa" ? "High" : "Medium",
    ...extra,
  };
}

const JAVA_KEYS = PERSONAL_ROADMAP.filter(
  (module) => module.course === "java-dsa",
).map((module) => module.key);
const JAVA_CORE_SEQUENCE = JAVA_KEYS.flatMap((key) => [key, key]);
const JAVA_REVISION_SEQUENCE = [
  "java.arrays",
  "java.arrays-2d",
  "java.searching",
  "java.sorting",
  "java.complexity",
  "java.strings",
  "java.bits",
  "java.oop",
  "java.recursion",
  "java.backtracking",
  "java.linked-lists",
  "java.stacks",
  "java.queues",
  "java.trees",
  "java.bst",
  "java.heaps",
  "java.hashing",
  "java.tries",
  "java.graphs",
  "java.bfs",
  "java.dfs",
  "java.dp",
];

function javaKeyFor(index: number) {
  if (index < JAVA_CORE_SEQUENCE.length) return JAVA_CORE_SEQUENCE[index];
  return JAVA_REVISION_SEQUENCE[
    (index - JAVA_CORE_SEQUENCE.length) % JAVA_REVISION_SEQUENCE.length
  ];
}

const JAVA_FOCI = [
  "concept trace and worked example",
  "independent blank-file implementation",
  "boundary tests and first-error repair",
  "closed-book retrieval and explanation",
  "small mixed exercise with time/space note",
];

const WEB_KEYS = [
  "sigma.html-1",
  "sigma.html-2",
  "sigma.html-3",
  "sigma.html-4",
  "sigma.html-levels",
  "sigma.css-1",
  "sigma.css-2",
  "sigma.css-3",
  "sigma.css-4",
  "sigma.css-5",
  "sigma.css-6",
  "sigma.mini-project",
  "sigma.bootstrap",
  "sigma.project",
  "sigma.javascript-1",
  "sigma.javascript-2",
  "sigma.javascript-3",
  "sigma.javascript-4",
  "sigma.javascript-5",
  "sigma.javascript-6",
  "sigma.javascript-7",
  "sigma.javascript-8",
  "sigma.javascript-9",
  "sigma.javascript-10",
  "sigma.javascript-11",
  "sigma.javascript-12",
  "sigma.javascript-13",
  "sigma.git",
  "sigma.backend-1",
  "sigma.backend-2",
  "sigma.backend-3",
  "sigma.backend-4",
  "sigma.sql-mongodb",
  "sigma.phase-1",
  "sigma.phase-2",
  "sigma.phase-3",
  "sigma.react-1",
  "sigma.react-2",
  "sigma.react-3",
  "sigma.react-4",
  "sigma.react-5",
  "sigma.react-6",
  "sigma.major-project",
];
const WEB_SEQUENCE = WEB_KEYS.flatMap((key) => [key, key, key]);

function webKeyFor(index: number) {
  if (index < WEB_SEQUENCE.length) return WEB_SEQUENCE[index];
  const later = [
    "sigma.react-1",
    "sigma.react-2",
    "sigma.react-3",
    "sigma.major-project",
    "sigma.phase-1",
    "sigma.phase-2",
    "sigma.phase-3",
    "sigma.git",
  ];
  return later[(index - WEB_SEQUENCE.length) % later.length];
}

const MATH_TOPICS = [
  [
    "Vectors and geometric notation",
    "Compute addition, scaling, magnitude and a dot product for small vectors; label the geometry.",
  ],
  [
    "Matrix shapes and linear systems",
    "Multiply small matrices, track row/column dimensions and solve one two-variable linear system with a checked substitution.",
  ],
  [
    "Linear transformations",
    "Apply a 2D transformation matrix to basis vectors and describe what changes in the plane.",
  ],
  [
    "Basis, span and rank",
    "Decide whether two or three vectors span a small space and justify one dependence or independence claim.",
  ],
  [
    "Eigenvalues and eigenvectors",
    "Find eigenvalues/eigenvectors for a small 2×2 matrix, then verify Av = λv by direct multiplication.",
  ],
  [
    "Eigenanalysis retrieval",
    "Redo one characteristic-polynomial calculation without notes and explain an eigen-direction in plain language.",
  ],
  [
    "Diagonalisation conditions",
    "Check whether a small matrix has enough independent eigenvectors and state what diagonalisation would buy you.",
  ],
  [
    "Orthogonality and projections",
    "Compute a projection onto a simple vector and check the residual dot product.",
  ],
  [
    "Least squares intuition",
    "Set up a tiny overdetermined linear fit and connect the normal-equation residual to orthogonality.",
  ],
  [
    "Mixed linear algebra revision",
    "Choose one vector, matrix and eigenanalysis problem; mark the first uncertain step and write a repair question.",
  ],
] as const;

function mathTopicFor(index: number) {
  return MATH_TOPICS[index % MATH_TOPICS.length];
}

const GSOC_SOURCE_URL = "https://summerofcode.withgoogle.com/";
const GSOC_TIMELINE_URL =
  "https://developers.google.com/open-source/gsoc/timeline";

function gsocPlanFor(date: string) {
  if (date <= "2026-10-31")
    return {
      title: "Git foundations and an honest open-source working log",
      stage: "Git / repository foundations",
      description:
        "Inspect a local practice repository, use status/diff/log deliberately, write a small README or test note, and record the next question. Check the official GSoC program pages for context only; no 2027 date or organization is assumed.",
      criteria:
        "Keep the command or document outcome, explain what changed, and write one unresolved question without claiming a contribution or selection.",
      sourceUrl: GSOC_SOURCE_URL,
    };
  if (date <= "2026-11-30")
    return {
      title: "GSoC research: compare real project evidence",
      stage: "Open-source research",
      description:
        "Use primary project sources you actually inspect to compare a small research set: repository health, documentation, issue labels, tests, community channels and fit with your skills. Do not invent an organization list.",
      criteria:
        "Save source URLs, the evidence inspected, one open question and an honest research status; no organization is treated as participating until a primary source verifies it.",
      sourceUrl: GSOC_SOURCE_URL,
    };
  if (date <= "2026-12-31")
    return {
      title: "Repository setup, docs, tests and issue reading",
      stage: "Repository contribution preparation",
      description:
        "For a repository you really selected, reproduce setup locally, read contribution guidance, run available tests, inspect documentation gaps and read issues before proposing a small change.",
      criteria:
        "Retain setup notes, commands actually run, test results, one issue/question and a bounded candidate change. Do not claim a PR, merge or mentor response.",
      sourceUrl: GSOC_SOURCE_URL,
    };
  if (date <= "2027-01-31")
    return {
      title: "Small open-source contribution and review loop",
      stage: "Contribution evidence",
      description:
        "Choose a small docs, test or issue-supporting change only after understanding the repository. Ask a focused question when needed, keep the diff narrow and write down review feedback or the honest pending state.",
      criteria:
        "Keep a real issue/commit/patch link or a clear local pending note, test evidence and the next revision step; never infer acceptance.",
      sourceUrl: GSOC_SOURCE_URL,
    };
  if (date <= "2027-02-28")
    return {
      title: "Proposal problem, scope and community evidence",
      stage: "Proposal research",
      description:
        "From the repository and community evidence you actually have, write a problem statement, user impact, constraints, validation approach and questions for maintainers. Verify the official timeline page when it has published the relevant year.",
      criteria:
        "Save a bounded problem statement, evidence links, risks and questions. No official 2027 deadline, participating organization or selection outcome is assumed.",
      sourceUrl: GSOC_TIMELINE_URL,
    };
  return {
    title: "Proposal draft, feedback and maintenance",
    stage: "Proposal drafting and community maintenance",
    description:
      "Draft goals, methodology, milestones and a sustainable weekly plan from real project evidence. Request feedback through the project’s actual channels, incorporate what you receive and keep a small maintenance contribution if appropriate.",
    criteria:
      "Keep the current draft section, source-backed feedback and one concrete revision. Mark unknowns as unknowns; a draft is not an application or selection result.",
    sourceUrl: GSOC_TIMELINE_URL,
  };
}

const HACKTOBERFEST_DATES = new Set(["2026-10-17", "2026-10-24", "2026-10-31"]);

const LEETCODE_PREREQUISITES = [
  "java.arrays",
  "java.strings",
  "java.searching",
  "java.sorting",
];
const CODEFORCES_PREREQUISITES = [
  ...LEETCODE_PREREQUISITES,
  "java.complexity",
  "java.recursion",
];
const ICPC_PREREQUISITES = [
  "java.arrays",
  "java.linked-lists",
  "java.stacks",
  "java.queues",
  "java.trees",
  "java.bst",
  "java.heaps",
  "java.hashing",
  "java.tries",
  "java.graphs",
  "java.bfs",
  "java.dfs",
];

function gatedPlatformFor(date: string, week: number) {
  // These records are visible before readiness but cannot be completed until
  // the corresponding manual gate and real topic records are satisfied.
  const weekday = dayOfWeek(date);
  if (date >= "2027-01-14" && weekday === 4 && week % 2 === 1)
    return "leetcode" as const;
  if (date >= "2027-02-06" && weekday === 6 && week % 2 === 0)
    return "codeforces" as const;
  if (date === "2027-02-28" || date === "2027-03-28") return "icpc" as const;
  return undefined;
}

function buildJavaSession(date: string, index: number) {
  const weekday = dayOfWeek(date);
  const key = javaKeyFor(index);
  const title = MODULE_TITLES.get(key) || key;
  const focus = JAVA_FOCI[index % JAVA_FOCI.length];
  const monthEnds = addDays(date, 1).slice(0, 7) !== date.slice(0, 7);
  const revision =
    index >= JAVA_CORE_SEQUENCE.length || weekday === 6 || monthEnds;
  const start = weekday === 0 ? "18:10" : "18:20";
  const end = weekday === 0 ? "19:25" : "19:30";
  const phase = phaseFor(date);
  return courseSession(
    "java-dsa",
    `Java + DSA · ${title} · ${revision ? "revision" : "progression"}`,
    key,
    start,
    end,
    `${focus}. Keep the work bounded to this session, use a blank file or paper before checking notes, and record the first wrong assumption. This dated task is practice evidence only; it does not complete the linked topic.`,
    `Retain an independent attempt, checked boundary input/output and one explanation or repair note for ${title}. Leave the linked course topic incomplete until its own criteria have real evidence.`,
    {
      sessionType: revision ? "java-revision" : "java-dsa",
      priority: "High",
      milestone: `${phase.title} · Java/DSA ${revision ? "retrieval and repair" : "sequence"}`,
    },
  );
}

function buildWebSession(date: string, index: number) {
  const key = webKeyFor(index);
  const title = MODULE_TITLES.get(key) || key;
  const later = index >= WEB_SEQUENCE.length;
  const interview = date >= "2027-03-01";
  const phase = phaseFor(date);
  return courseSession(
    "web",
    `Web · ${title} · ${interview ? "interview/project explanation" : later ? "project/retrieval" : "progression"}`,
    key,
    "21:00",
    "22:15",
    `Use the actual enrolled ${title} material for the first part, then implement one small independent outcome and inspect its empty/error or responsive state. This is a personal practice prompt, not an invented official lecture title.`,
    `Save the real concepts or deliverable covered, a working independent result and at least one relevant test or viewport check. Do not mark the course module complete from this dated task alone.`,
    {
      sessionType: interview
        ? "interview-prep"
        : later
          ? "project-build"
          : "web-practice",
      milestone: `${phase.title} · Web progression and explainable implementation`,
    },
  );
}

function buildDay(date: string, index: number): ScheduleSeed[] {
  const weekday = dayOfWeek(date);
  const week = scheduleWeekFor(date);
  const phase = phaseFor(date);
  const records: ScheduleSeed[] = [];

  // GSoC/open source is the first focused block on four days.  Maths is kept
  // on the other weekday pair and on both weekend days; Java remains daily.
  const gsocDay =
    weekday === 0 || weekday === 1 || weekday === 3 || weekday === 5;
  const mathsDay =
    weekday === 0 || weekday === 2 || weekday === 4 || weekday === 6;
  const gsoc = gsocPlanFor(date);
  if (gsocDay) {
    const sunday = weekday === 0;
    records.push(
      session(date, {
        slot: "gsoc",
        title: `GSoC / open source · ${gsoc.title}`,
        course: "gsoc-open-source",
        stage: gsoc.stage,
        sessionType: "gsoc-open-source",
        startTime: sunday ? "16:45" : "17:30",
        endTime: sunday ? "17:15" : "18:15",
        description: gsoc.description,
        completionCriteria: gsoc.criteria,
        priority: "High",
        milestone: `${phase.title} · real repository/community evidence`,
        sourceUrl: gsoc.sourceUrl,
        tags: ["gsoc-first", "open-source"],
      }),
    );
  }

  if (mathsDay) {
    const [topic, practice] = mathTopicFor(Math.floor(index / 1));
    const sunday = weekday === 0;
    const saturday = weekday === 6;
    records.push(
      session(date, {
        slot: "maths",
        title: `Maths / linear algebra · ${topic}`,
        course: "maths-ml",
        stage: topic,
        sessionType: "maths-practice",
        startTime: sunday ? "17:20" : saturday ? "16:45" : "17:30",
        endTime: sunday ? "18:05" : saturday ? "17:30" : "18:15",
        description: `Work for 45 focused minutes. ${practice} Keep the calculation and one precise uncertainty for the next revision; Maths/college maintenance stays visible throughout the plan.`,
        completionCriteria:
          "Retain a checked worked example, the notation/assumption used and one specific question or correction; this practice does not claim course completion.",
        priority: "Medium",
        milestone: `${phase.title} · four-spaced-session Maths maintenance`,
        tags: ["maths-maintenance", "linear-algebra", "college-maintenance"],
      }),
    );
  }

  records.push(session(date, buildJavaSession(date, index)));

  const gate = gatedPlatformFor(date, week);
  if (gate) {
    const prerequisites =
      gate === "leetcode"
        ? LEETCODE_PREREQUISITES
        : gate === "codeforces"
          ? CODEFORCES_PREREQUISITES
          : ICPC_PREREQUISITES;
    const label =
      gate === "leetcode"
        ? "LeetCode basic practice"
        : gate === "codeforces"
          ? "Codeforces practice"
          : "ICPC virtual practice";
    records.push(
      session(date, {
        slot: "gated-platform",
        title: `${label} · readiness-gated retrieval`,
        course: gate,
        stage: `${label} after manual readiness`,
        sessionType: `${gate}-gated`,
        startTime: "21:00",
        endTime: "22:15",
        description: `Only use this block after the ${label} readiness gate is genuinely satisfied. Attempt a bounded set, record assistance honestly, and upsolve one mistake; the workspace never infers readiness from a calendar date.`,
        completionCriteria: `Save the actual problem/contest source, attempted and solved work, assistance level and one upsolve or next step. The ${gate} gate and canonical prerequisites must be real before completion.`,
        priority: "Low",
        prerequisites,
        requiresGate: gate,
        milestone: `${phase.title} · gated competitive practice only after readiness`,
        tags: ["gated-practice", gate, "no-automatic-readiness"],
      }),
    );
  } else if (HACKTOBERFEST_DATES.has(date)) {
    records.push(
      session(date, {
        slot: "optional-hacktoberfest",
        title: "Optional Hacktoberfest / open-source check-in · 15m",
        course: "gsoc-open-source",
        stage: "Optional community participation",
        sessionType: "optional-hacktoberfest",
        startTime: "21:00",
        endTime: "21:15",
        description:
          "Optional only: check the current official event guidance and inspect one issue or repository you genuinely understand. Never invent eligibility, an issue, a PR or a deadline; skip without creating backlog.",
        completionCriteria:
          "If chosen, retain the actual page/repository checked and one honest note. If skipped, leave this optional record incomplete and do not catch it up.",
        priority: "Low",
        milestone: `${phase.title} · optional community exploration`,
        tags: ["optional", "hacktoberfest"],
      }),
    );
    records.push(
      session(date, {
        ...buildWebSession(date, index),
        startTime: "21:20",
        endTime: "22:15",
      }),
    );
  } else {
    records.push(session(date, buildWebSession(date, index)));
  }

  if (weekday === 0) {
    records.push(
      session(date, {
        slot: "weekly-planning",
        title: "Weekly evidence review and recovery choice · 25m",
        course: "weekly-review",
        stage: "Weekly planning and recovery",
        sessionType: "weekly-planning",
        startTime: "19:30",
        endTime: "19:55",
        description:
          "Review the actual evidence from the previous week, name one weak area, and choose one bounded action. If something was missed, move one item, reduce scope or release it; never double the next day or borrow college, dinner or sleep time.",
        completionCriteria:
          "Write one evidence note, one blocker, one named repair/reschedule decision and a sustainable next action. A calendar week alone never marks a topic complete.",
        priority: "High",
        milestone: `${phase.title} · honest weekly review and recovery semantics`,
        tags: ["weekly-review", "recovery", "no-catch-up-doubling"],
      }),
    );
  }

  records.push(
    session(date, {
      slot: "daily-review",
      title: "Daily recall, error log and next smallest action · 15m",
      course: "weekly-review",
      stage: "Daily retrieval and recovery",
      sessionType: "daily-review",
      startTime: "22:30",
      endTime: "22:45",
      description:
        "Recall one idea from today, record the first error or unanswered question and choose tomorrow’s smallest action. When a block is missed, this note is the visible place to reduce scope or explicitly move one record; no catch-up doubling is expected.",
      completionCriteria:
        "Write one recalled idea, one mistake/question, actual minutes and one specific next action. Stop at 22:45 and protect sleep.",
      priority: "Medium",
      milestone: `${phase.title} · daily evidence and sustainable stopping time`,
      tags: ["daily-review", "recovery"],
    }),
  );

  return records.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

const totalDays = (() => {
  const start = Date.parse(`${START_DATE}T12:00:00Z`);
  const end = Date.parse(`${END_DATE}T12:00:00Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
})();

export const STARTING_SCHEDULE: ScheduleSeed[] = Array.from(
  { length: totalDays },
  (_, index) => buildDay(addDays(START_DATE, index), index),
).flat();

export type WeekendTarget = {
  date: string;
  week: number;
  label: string;
  title: string;
  target: string;
  support: string;
};

export const WEEKEND_TARGETS: WeekendTarget[] = Array.from(
  { length: totalDays },
  (_, index) => addDays(START_DATE, index),
)
  .filter((date) => dayOfWeek(date) === 0)
  .map((date) => {
    const records = STARTING_SCHEDULE.filter((item) => item.date === date);
    const planned = records.reduce((sum, item) => sum + item.duration, 0);
    return {
      date,
      week: scheduleWeekFor(date),
      label: "Sunday target",
      title: "Review evidence, protect the routine and choose one next move",
      target: `${Math.floor(planned / 60)}h ${planned % 60}m planned. Keep the GSoC/open-source evidence first, then Java/DSA and Maths; Web remains bounded at night.`,
      support:
        "This is an aspiration, not a quota. If energy or college work changes the day, reduce scope or reschedule one named item. Do not duplicate the whole day, borrow dinner/sleep, or turn optional work into debt.",
    };
  });

export type ChecklistItem = { id: string; label: string; detail: string };
export const WEEKLY_CHECKLIST: ChecklistItem[] = [
  {
    id: "gsoc-open-source",
    label: "Keep real GSoC / open-source evidence",
    detail:
      "Record Git, repository, docs, tests, issues, contribution or proposal work from sources and repositories you actually inspected.",
  },
  {
    id: "java-dsa",
    label: "Follow the Java / DSA sequence and revisions",
    detail:
      "Check an independent attempt, boundary tests and the first error; a schedule task never completes its linked topic by itself.",
  },
  {
    id: "web",
    label: "Keep Web progression and project evidence",
    detail:
      "Record actual enrolled concepts plus a working independent build, relevant tests and an honest remaining issue.",
  },
  {
    id: "maths",
    label: "Maintain four spaced Maths sessions when the week is complete",
    detail:
      "Vectors, matrices, linear algebra and eigenanalysis remain visible alongside college; partial weeks use the sessions that fit.",
  },
  {
    id: "gates",
    label: "Use LeetCode / Codeforces / ICPC only after readiness",
    detail:
      "Manual gates and real canonical topic records decide access. Practice evidence never infers mastery or readiness.",
  },
  {
    id: "recovery",
    label: "Protect routine and record one recovery decision",
    detail:
      "Move one item, reduce scope or release it explicitly. Never catch up by doubling, moving protected blocks or assuming a weekend absence.",
  },
];

export const DEFAULT_RECOVERY_RULES = {
  firstMove: "move-one",
  lowEnergy: true,
  protectSleep: true,
  optionalOnlyAfterCore: true,
};

export const weekStartFor = (date: string) =>
  addDays(date, -new Date(`${date}T12:00:00Z`).getUTCDay());

export function scheduleWeekFor(date: string) {
  if (date < START_DATE) return 0;
  const dayNumber = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day) / 86_400_000;
  };
  return Math.floor((dayNumber(date) - dayNumber(START_DATE)) / 7) + 1;
}

export const scheduleDate = (item: Partial<Item>) => item.dueDate || item.date;

/** Only the current version is applied/displayed as the new schedule. */
export const isScheduleItem = (item: Item) =>
  Boolean(item.scheduleId?.startsWith(`${SCHEDULE_PREFIX}-`));

/** Useful to explain why an older October installation is left untouched. */
export const isLegacyScheduleItem = (item: Item) =>
  Boolean(
    item.scheduleId?.startsWith(`${LEGACY_SCHEDULE_PREFIX}-`) &&
    !isScheduleItem(item),
  );

export const scheduleForDate = (items: Item[], date: string) =>
  items.filter(
    (item) =>
      isScheduleItem(item) &&
      item.kind === "task" &&
      !item.archived &&
      scheduleDate(item) === date,
  );
export const weekendTargetFor = (date: string) =>
  WEEKEND_TARGETS.find((target) => target.date === date);
