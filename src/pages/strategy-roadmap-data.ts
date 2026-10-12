import type { Item } from "../lib/types";
import { platformGateState, type ReadinessPlatform } from "../lib/readiness";

export type StrategyTab = "timeline" | "gsoc" | "icpc" | "gates" | "mba";

export type StrategyPhase = {
  id: string;
  month: string;
  title: string;
  startDate: string;
  endDate: string;
  summary: string;
  priorities: string[];
  suggestedMilestones: { title: string; description: string }[];
};

export const STRATEGY_START_DATE = "2026-10-11";
export const STRATEGY_END_DATE = "2027-03-31";
export const OFFICIAL_TIMELINE_NOTE =
  "Use the official Google GSoC program and timeline pages for published information. This plan imports no assumed 2027 dates or participating organizations.";

/**
 * This is a planning scaffold, not a forecast of official GSoC dates, orgs,
 * selection, contest results or course content. A phase only has progress after
 * the person creates real local records and links milestones to that phase.
 */
export const STRATEGY_PHASES: StrategyPhase[] = [
  {
    id: "october-foundations",
    month: "October 2026",
    title: "GSoC foundations and evidence",
    startDate: "2026-10-11",
    endDate: "2026-10-31",
    summary:
      "Make GSoC/open-source the first focused priority: build a safe Git habit, inspect real repositories and create an honest evidence trail without inventing organizations or dates.",
    priorities: [
      "GSoC/open source first: local Git, repository maps, README/docs, test commands, issue reading and source-backed questions.",
      "Java + DSA second: variables, I/O, operators, conditionals, loops, arrays, searching, sorting, strings and readiness evidence.",
      "Web third: actual HTML/CSS/Bootstrap material plus a small independent implementation; Hacktoberfest remains optional.",
      "Maintain Maths for ML / college with vectors, matrices and the first eigenanalysis practice; protect routine blocks.",
      "No LeetCode, Codeforces or ICPC block is treated as ready from a date. Use the visible manual gates before optional competitive practice.",
    ],
    suggestedMilestones: [
      {
        title: "Safe repository and Git evidence",
        description:
          "Record commands, a useful README/test note and the boundary between local practice and a real remote.",
      },
      {
        title: "Java / DSA baseline",
        description:
          "Record what is comfortable, what is not, and one independently tested example without marking the topic complete automatically.",
      },
      {
        title: "Small explainable Web slice",
        description:
          "Build one narrow slice that can be explained, debugged and tested from a blank start.",
      },
    ],
  },
  {
    id: "november-expansion",
    month: "November 2026",
    title: "Research and narrow the open-source search",
    startDate: "2026-11-01",
    endDate: "2026-11-30",
    summary:
      "Turn GSoC exploration into a small, source-backed research set while continuing the Java sequence and moving Web practice into JavaScript and Git.",
    priorities: [
      "GSoC/open source: inspect 3–5 real project sources, repositories, docs, tests, issue trackers and community guidance; narrow only when evidence supports it.",
      "Java + DSA: recursion/backtracking, linked lists, stacks and queues with retrieval and revision days.",
      "Web: JavaScript progression plus Terminal/Git practice; keep every course label editable and non-official.",
      "Maintain Maths / college and write debugging, testing and technical communication notes.",
      "LeetCode/Codeforces remain gated by explicit records and acknowledgement; no contest quota is assumed.",
    ],
    suggestedMilestones: [
      {
        title: "Evidence-backed research set",
        description:
          "Create research records for real sources, preserving URLs, source dates, open questions and an honest status.",
      },
      {
        title: "Core data-structure practice record",
        description:
          "Keep an explanation, tests and mistake note for recursion, lists, stacks and queues.",
      },
      {
        title: "JavaScript / Git practice slice",
        description:
          "Trace one covered Web behavior, make a meaningful local commit and save the debugging note.",
      },
    ],
  },
  {
    id: "december-contribution-prep",
    month: "December 2026",
    title: "Repository, docs, tests and issue preparation",
    startDate: "2026-12-01",
    endDate: "2026-12-31",
    summary:
      "Use the narrow research set to reproduce repository setup, read contribution guidance, run tests and prepare a small respectful change without claiming acceptance.",
    priorities: [
      "GSoC/open source first: repository setup, README/docs improvements, test execution, issue reproduction and a bounded contribution plan.",
      "Java + DSA second: trees/BST, heaps, hashing and tries, with explicit prerequisite and revision checks.",
      "Web third: Node/Express, SQL/Mongo and the next project phase from actual course material.",
      "Maintain Maths / college, linear algebra and eigenanalysis; record community questions and technical explanations.",
      "Competitive platforms remain gated. A planned practice date is never evidence of readiness or a result.",
    ],
    suggestedMilestones: [
      {
        title: "Selected repository set up",
        description:
          "Save the actual repository, setup steps, docs and tests you inspected.",
      },
      {
        title: "Small fix or documentation change prepared",
        description:
          "Describe the change and test evidence; do not claim a PR, merge or acceptance without a real record.",
      },
      {
        title: "Backend and data-layer slice",
        description:
          "Complete one small backend / SQL / Mongo flow and record its failure cases.",
      },
    ],
  },
  {
    id: "january-depth",
    month: "January 2027",
    title: "Small contributions and project ownership",
    startDate: "2027-01-01",
    endDate: "2027-01-31",
    summary:
      "Make a small contribution when the repository evidence supports it, deepen DSA and begin the later Web project/React work without dropping the GSoC research thread.",
    priorities: [
      "GSoC/open source first: a narrow docs/test/issue contribution, review loop and repository communication based on actual records.",
      "Java + DSA second: graphs, BFS, DFS and dynamic programming foundations plus deliberate revision.",
      "Web third, now later in the sequence: React and a narrow major-project slice with tests and a useful README.",
      "Maintain Maths / college and continue linear algebra/eigenanalysis retrieval.",
      "Only after explicit readiness may short LeetCode practice appear; Codeforces/ICPC stay later and gated.",
    ],
    suggestedMilestones: [
      {
        title: "Contribution evidence",
        description:
          "Record the actual issue, discussion, code or docs work and outcome without assuming selection.",
      },
      {
        title: "Graphs / DP prerequisite review",
        description:
          "Explain the relevant invariant, test the implementation and note what is still not ready.",
      },
      {
        title: "Major Web project slice",
        description:
          "Build a tested React slice with a clear problem statement and a useful README explanation.",
      },
    ],
  },
  {
    id: "february-qualification",
    month: "February 2027",
    title: "Proposal research and gated practice",
    startDate: "2027-02-01",
    endDate: "2027-02-28",
    summary:
      "Turn repository evidence into a proposal problem and scope while revising DSA, testing the Web project and using competitive practice only after its gate is real.",
    priorities: [
      "GSoC/open source first: problem statement, project fit, community questions, scope and validation evidence from real sources.",
      "Java + DSA second: dynamic programming and mixed revision; use LeetCode/Codeforces/ICPC only through their manual gates.",
      "Web third: deploy/test the project only when there is a real URL and evidence; preserve a known-limitation note.",
      "Maintain Maths / college and use eigenanalysis revision as a deliberate low-energy option.",
      "Verify official 2027 information only when the official pages publish it; do not infer dates or organization participation.",
    ],
    suggestedMilestones: [
      {
        title: "Graphs / DP revision evidence",
        description:
          "Keep a revision note, implementation tests and the next weak area.",
      },
      {
        title: "Web project deployed",
        description:
          "Record the actual live URL, test the important path and document a known limitation.",
      },
      {
        title: "Official information checked when published",
        description:
          "When available, verify organization and qualification information from a primary source; otherwise leave the record explicitly pending.",
      },
    ],
  },
  {
    id: "march-april-proposal",
    month: "March 2027",
    title: "Proposal draft, feedback and maintenance",
    startDate: "2027-03-01",
    endDate: "2027-03-31",
    summary:
      "Turn real research and community context into a proposal draft while keeping Maths, college, Java/DSA revision and Web maintenance visible through the end of March.",
    priorities: [
      "GSoC/open source first: draft goals, methodology, milestones, validation and a sustainable proposal schedule from real repository evidence.",
      "Keep community conversations, review feedback and small maintenance work honest and linked to actual sources.",
      "Java + DSA revision remains second; gated competitive practice is optional after readiness, never a quota.",
      "Web project polish and interview-oriented explanation come later in the sequence, with real tests and limitations.",
      "Preserve Maths for ML / college. Use the official timeline only after verifying it when published; no selection guarantee is implied.",
    ],
    suggestedMilestones: [
      {
        title: "Proposal research and scope",
        description:
          "Use real repository and community evidence to define a problem, scope and validation plan.",
      },
      {
        title: "Proposal draft reviewed",
        description:
          "Record feedback, open questions and changes without claiming an outcome.",
      },
      {
        title: "Maths / college maintenance protected",
        description:
          "Keep a visible study or review record for the ongoing Maths and college obligations.",
      },
    ],
  },
];

export const GSOC_STATUSES = [
  "research",
  "shortlisted",
  "contacted",
  "contributing",
  "paused",
] as const;

export const CONTRIBUTION_STATUSES = [
  "todo",
  "in-progress",
  "completed",
  "blocked",
] as const;

export const PROPOSAL_STATUSES = [
  "planned",
  "in-progress",
  "completed",
  "paused",
] as const;

export const ICPC_STATUSES = [
  "planned",
  "completed",
  "reviewed",
  "paused",
] as const;

export type PlatformGateId = ReadinessPlatform;

export type PlatformGate = {
  id: PlatformGateId;
  title: string;
  description: string;
  checks: { id: string; label: string; detail: string }[];
};

export const PLATFORM_GATES: PlatformGate[] = [
  {
    id: "leetcode",
    title: "LeetCode basics",
    description:
      "A practice gate, not an automatic recommendation. Decide manually when arrays, strings, searching and sorting feel comfortable.",
    checks: platformGateState([], "leetcode").checks.map(
      ({ id, label, detail }) => ({ id, label, detail }),
    ),
  },
  {
    id: "codeforces",
    title: "Codeforces / competitive practice",
    description:
      "Add basic complexity and recursion after the LeetCode fundamentals. The ready control remains manual.",
    checks: platformGateState([], "codeforces").checks.map(
      ({ id, label, detail }) => ({ id, label, detail }),
    ),
  },
  {
    id: "icpc",
    title: "ICPC virtual contests",
    description:
      "Complete or master every core-structure topic, graphs, BFS and DFS; log real practice on three different dates, then make your own ready call.",
    checks: platformGateState([], "icpc").checks.map(
      ({ id, label, detail }) => ({ id, label, detail }),
    ),
  },
];

export const WEEKLY_REVIEW_COPY =
  "Use the Planner for a weekly review: name the evidence you have, the clearest gap, the next small action and what must stay protected.";

export const MICRO_MBA_COPY =
  "Micro MBA stays pending until you save actual course content and explicitly mark its activation record active. Start with two 30-minute maintenance tasks per week only after coursework begins; no class sessions or tasks are seeded automatically.";

export function microMbaContentValues(): Partial<Item> {
  return {
    title: "Micro MBA coursework",
    status: "pending",
    course: "micro-mba",
    roadmapPhase: "strategy-micro-mba",
    sourceType: "strategy-micro-mba-content",
    category: "Micro MBA",
    body: "",
    official: false,
    tags: ["strategy-roadmap", "micro-mba", "course-content"],
  };
}

export function microMbaMaintenanceValues(
  content: Item,
  date: string,
  position: number,
): Partial<Item> {
  return {
    title: `${content.title} · maintenance ${position}`,
    status: "todo",
    dueDate: date,
    duration: 30,
    recurrence: "weekly",
    noteId: content.id,
    course: "micro-mba",
    roadmapPhase: "strategy-micro-mba",
    sourceType: "strategy-micro-mba",
    sessionType: "maintenance",
    category: "Micro MBA",
    description:
      "Review actual material from the linked coursework record. Adjust this small maintenance scope as the course progresses.",
    official: false,
    tags: ["strategy-roadmap", "micro-mba", "maintenance"],
  };
}

export function strategyPhaseValues(phase: StrategyPhase): Partial<Item> {
  return {
    title: phase.title,
    description: phase.summary,
    status: "planned",
    startDate: phase.startDate,
    targetDate: phase.endDate,
    goals: phase.priorities.join("\n"),
    checklist: phase.suggestedMilestones
      .map((milestone) => `- [ ] ${milestone.title}`)
      .join("\n"),
    body: phase.priorities.map((priority) => `- ${priority}`).join("\n"),
    roadmapPhase: phase.id,
    sourceType: "strategy-phase",
    official: false,
    tags: ["strategy-roadmap", "phase"],
  };
}

export function strategyMilestoneValues(
  phase: StrategyPhase,
  phaseRecord: Item,
  suggested?: { title: string; description: string },
  order = 1,
): Partial<Item> {
  return {
    title: suggested?.title || `${phase.month} strategy milestone`,
    description:
      suggested?.description ||
      "Describe the evidence that would make this milestone meaningful.",
    status: "planned",
    dueDate: phase.endDate,
    order,
    projectId: phaseRecord.id,
    roadmapPhase: phase.id,
    sourceType: "strategy-milestone",
    official: false,
    tags: ["strategy-roadmap", "milestone"],
  };
}
