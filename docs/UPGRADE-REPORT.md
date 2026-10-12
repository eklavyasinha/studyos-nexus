# StudyOS Nexus — personalized upgrade report

Delivered in place, 11 October 2026. **The current implementation, local assistant, redesigned production package and verification are complete; public publication is still pending a signed-in hosting workflow. No hosted URL is claimed.**

## Preserved and added

The existing `studyos-nexus/` app, source tree, dark/green identity, sidebar, hash routing and local-first IndexedDB architecture were upgraded rather than replaced. No separate project, backend, login, API key, synchronization or telemetry was added. The incorrect course-photo PDF was not used.

All original workspaces remain: dashboard, daily/calendar Planner, Java Studio, DSA, Competitive/ICPC, Web playground, Projects, Notes/resources, Focus, Flashcards/revision, College assignments/attendance/marks, Analytics, search, theme/settings, JSON backup/recovery and CSV export. Existing user browser storage was not opened or populated by tests. Older v1 records and focus-session timestamp formats remain supported.

Added:

- **Study schedule:** 741 stable, timed, initially incomplete records across 172 dates from 11 October 2026 through 31 March 2027. Each has date, time, duration, title, actionable description, course/topic, priority, criteria, prerequisite keys, milestone, phase and self-study classification. Versioned `study-schedule-v2` IDs preserve any prior October-4 data without rewriting it.
- **Personal course map:** 72 editable module definitions across Java/DSA and Sigma, with practice, independent exercises, mistakes, revision notes, gates, evidence, topic notes and linked Planner tasks. Adoption is explicit; no sample mastery is inserted.
- **GSoC & six-month plan:** October–early April phases, real organization research records, contribution-preparation tasks, proposal milestones, shared platform gates and ICPC virtual-contest logs. Micro MBA stays pending until actual content/start date and explicit activation are recorded; then two 30-minute weekly maintenance tasks can be planned.
- **Date-aware overview:** previous/today/future browsing, remaining/completed work, overdue core tasks, original reschedule dates, college deadlines, planned/actual minutes, weekly/monthly progress, phase and next lesson/revision.
- **Honest solving:** independent, hints, editorial-assisted, assistance-unrecorded and attempted-unsolved counts are distinct. Earlier solves are never assumed independent.
- **Data safety:** validated atomic schedule batch, persistent installation marker, additive backup fields, cross-surface progress checks and Planner reschedule history. No date change creates or completes records.
- **Local assistant:** a visible deterministic fallback, not a language model. It performs registered validated theme, accent, density, reduced-motion, daily-goal, focus-duration, dashboard-widget visibility/size/order, progress, plan, completion, rescheduling, recovery, balancing, priority, revision, focus, deletion and custom-course/topic actions against the real local Store. Custom course names retain stable slugs; topic IDs, progress, notes, evidence and links survive renames/reordering; archive/removal is confirmation-gated. Writes wait for IndexedDB persistence and compare the saved snapshot before showing a **Saved and verified** receipt; reads/no-ops are not presented as writes. Destructive/bulk actions require confirmation; unsupported questions and source-code requests are disclosed honestly and handed to the coding-agent workflow rather than hallucinated.

## Course progression and gates

### Java + DSA

1. Fundamentals: variables/types, I/O, operators, conditionals, loops, patterns, functions/methods. Gate: approximately 10–20 basic programs without copying.
2. Arrays and 2D arrays: creation/input/traversal, max/min/sum/reverse, rectangular traversal. Gate: approximately 15–20 basic array questions.
3. Searching, sorting and complexity: linear/binary search, basic sorts, O(n), O(log n), O(n²), auxiliary space and relevant bounds.
4. Strings: operations, counting/frequency and patterns. Gate: at least ten basic string questions.
5. Bit manipulation: binary/bitwise operations and traces, not memorized outputs.
6. OOP: classes/objects, constructors, inheritance, polymorphism and interfaces where covered; independent small programs.
7. Recursion/backtracking: base cases, trees, combinations/permutations and choose/explore/undo.
8. Core structures: linked lists, stacks and queues implemented from scratch with tests.
9. Advanced: trees/BST, heaps, hashing, tries, graphs/BFS/DFS and then DP. DP requires real recursion/backtracking, core-structure and graph-traversal mastery; a date alone cannot unlock it.

Run Java in **VS Code with your JDK**. The website saves/highlights Java and evidence; it does not execute Java.

### Sigma 8.0 Web Development

**HTML Part 1–4 / HTML levels → CSS Part 1–6 → Mini Project / Bootstrap / Project → JavaScript Part 1–13 → Terminal + Git & GitHub → Backend 1–4 (Node/Express/EJS) → SQL + MongoDB → Project Phases 1–3 → React Part 1–6 + Major Project.**

These are the supplied verified module labels, not a claim that every official lecture/assignment is represented. Individual records and additional modules are editable. Practice prompts are suggestions, not invented lecture titles. Web blocks split learning/retrieval from implementation.

### Platforms

- **LeetCode:** completed/mastered canonical arrays, strings, searching and sorting topics plus your explicit 70–80% independent-basic-solving acknowledgement. Start around three Easy problems/week only when ready.
- **Codeforces:** the same foundations plus complexity and recursion, and an explicit acknowledgement. Begin with one beginner contest/week; rating is secondary and upsolving is expected.
- **ICPC virtual:** core-structure mastery, graphs/BFS/DFS, actual practice on three different dates and explicit readiness. Begin at one/month; two/month only later when sustainable.
- Both roadmap pages share the latest readiness state. Revised/archived topics, task/problem keywords and calendar phases do not grant mastery. Logging actual earlier practice is allowed; no platform is connected automatically.

## Daily plan and routine adjustments

Plan range: **Sunday 11 October 2026 through Wednesday 31 March 2027**. No missed pre-start days are generated. All scaffold work is extra self-study; actual official assignments are entered separately in College.

| Date       | Required work retained                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| Sun 4 Oct  | 90m fundamentals revision/self-assessment; 60m CSS implementation/project; Maths45; weekly weak-area planning30; review15. |
| Mon 5 Oct  | Arrays creation/input/traversal and five exercises; CSS Part 2; review.                                                    |
| Tue 6 Oct  | Max/min/sum/reverse; CSS Part 3; Maths45; review.                                                                          |
| Wed 7 Oct  | 2D arrays/traversal plus four timed course-practice questions; CSS Part 4; review.                                         |
| Thu 8 Oct  | Searching/sorting/complexity; CSS Part 5; Maths45; review.                                                                 |
| Fri 9 Oct  | Sorting practice plus four–five timed questions; CSS Part 6; review.                                                       |
| Sat 10 Oct | Closed-book arrays/sorting test; CSS mini-project; Maths45; mistake/next-week review; optional Git practice.               |

Later dates conditionally cover strings, bits, OOP, recursion/backtracking and deliberate revision; CSS/Bootstrap/project practice precedes JavaScript Parts 1–13. If a prerequisite is incomplete, the date/task stays intact and the app points back to the incomplete topic instead of claiming advancement.

Protected every day: gym/breakfast 06:30–09:00, college/lunch 09:00–16:30 and dinner 20:00–21:00. No unverified weekend absence is assumed.

- Weekdays: Java 17:30–19:30; on Tue/Thu Maths17:30–18:15, break, Java18:20–19:30.
- Dinner conflicts with the requested nominal Web window, so Web is adjusted to **21:00–22:15**: 45m learning/retrieval, 30m implementation.
- Wednesday/Friday question sets use distinct timed portions of Java work. There is no overlapping extra late-night block.
- Maths has four separate 45-minute sessions/week on Sun/Tue/Thu/Sat, 16 total. All 28 dates end with a 22:30–22:45 review.
- Weekend targets are aspirational. Saved blocks use genuinely available 16:45–20:00 and 21:00–22:45; optional solving/cleanup is reduced rather than borrowing meals, college or sleep. Four Saturday Git/README blocks are optional 15m introductions, not claims of official Sigma Git-module completion.
- Study stops at 22:45. A usual 01:00 bedtime with early gym leaves a short sleep window; do not fill the wind-down period with compensatory coding. The schedule cannot guarantee sleep or health.

Complete portable task detail is regenerated by `npm run export:plan` into **`docs/PERSONAL-PLAN.csv`**. Full module exercises/gates are in **`docs/COURSE-MAPS.md`**. These exports contain scaffold definitions only, never browser notes/progress.

## Six-month strategy

| Phase             | Outcome, conditional on real progress                                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| October           | Foundations, CSS/Bootstrap then JS, Git/repository cleanup, one explainable project and consistent Maths. Optional ready-gated LC3 Easy/week and CF1/week.                                                             |
| November          | Recursion/backtracking and core structures; JS/Terminal/Git then Node/Express. Research 3–5 previous relevant GSoC organizations and narrow to 1–2. If sustainable: LC≈4/week, CF1–2/week.                             |
| December          | Lists/stacks/queues toward trees/BST; backend/databases/project phases. Set up chosen repositories and prepare docs/tests/small fixes with real evidence. LC≈5/week and contests/upsolving only when ready.            |
| January           | Trees/BST/heaps/hashing/tries then graphs; React/major project after prerequisites. Continue meaningful contributions and architecture/project-idea understanding. Optional LC5–7/week and CF≈2/week.                  |
| February          | Graphs/DP/revision after gates, project polishing/deployment, official organization-list comparison when published, 1–2 serious targets and qualification tasks. Ready-gated ICPC virtual practice starts small.       |
| March–early April | Maintain DSA/competitive revision, Web, Maths and college. Discuss real ideas, draft goals/methodology/milestones/weekly proposal schedule and refine from feedback. Follow verified official application rules/dates. |

Google's primary [timeline](https://developers.google.com/open-source/gsoc/timeline) was checked on **3 October 2026** and returned a **2026 timeline**, not 2027 application dates. The app links the official program/timeline/rules and explicitly leaves 2027 deadlines unfilled. Personal roadmap dates, including the 10 April planning horizon, are not official GSoC deadlines. No organization, contribution, PR, acceptance or selection guarantee is fabricated.

## Daily behavior, recovery and getting started

1. Open the existing app, then **Study schedule → Apply starting schedule** to install the incomplete 11 October–31 March plan once. Browse **Start date**, Today or the date input. You can preview the 25-week scaffold before applying.
2. In **Personal course map**, adopt relevant modules and record genuine prior mastery/evidence. A saved practice task is not automatic topic mastery. Create linked notes/tasks from expanded modules or use existing studios.
3. Complete/reschedule real tasks. The same record ID is retained; `originalDate`, timestamps, count and appended history preserve moves. Timed reschedules reject protected windows and collisions. Generic Planner date edits retain history too.
4. Use **Weekly checklist** for lessons, independent code, practice, Web build, Maths, conditional platforms/upsolving, Git/GSoC evidence and biggest-mistake/next-task reflection. Reviews are real saved records, including future weeks outside October.
5. Keep **Settings → Data & backups** exports outside browser storage. JSON imports validate, preview and require confirmation. Destructive reset/replace keeps a transactional recovery copy; CSV remains an analysis export, not an app backup.

Recovery: one missed day—continue without doubling; two/three days—drop optional platforms and protect Java/Web/Maths; a week—resume the last incomplete Java topic; exams—prioritize college/Maths with a bounded DSA/Web minimum on available days. Never repay backlog with lost sleep. Optional skipped work remains incomplete, but does not become a compulsory overdue alert. Catch-up is explicit, named, timed and linked to actual unfinished work.

The dashboard updates the **view** by device-local date. It does not rewrite the plan, advance modules or copy incomplete tasks into today. Explicit historical/future browsing is retained across midnight. Planned/actual summaries prioritize linked focus-session logs over a task's manual effort to avoid double counting; manual-only effort is attributed to its completion/planned day. Calendar task-progress totals include all planned records, including optional work, not a mandatory-hours target.

## Verification and security

## Redesign and interaction layer

The visual pass now uses a clearly different ink, warm-paper, copper/cyan and lime signal system: stronger display typography, squared editorial controls, grid/grain/scanline texture, deeper surface rails, progress-aware bars, phase rails, timeline markers, calendar lanes and visible perspective/depth on meaningful surfaces. Dashboard, Planner/College, Study Schedule, Personal Roadmap, Strategy, Learning, Notes and Focus use distinct treatments rather than one repeated card animation. Hover depth is stateful and subtle; no purple-gradient/glassmorphism/emoji treatment was introduced. A final global cascade layer fixed the earlier blanket `transform: none !important` override that had cancelled hover depth. `prefers-reduced-motion` and `data-motion="reduce"` disable transitions/animations, and the updated dark/light/mobile screenshots and axe checks passed.

- `npm run typecheck`: strict TypeScript passed.
- `npm test`: **207 logic checks passed**, including all 46 original regressions, assistant persistence/parser coverage, and custom-course/topic behavior.
- `npm run test:e2e`: **28 development checks passed and 2 production-only checks were skipped**; the production-specific checks run separately, not falsely reported as development passes.
- `npm run test:production`: production build and **all 30 browser checks passed** with the exact hosting CSP/headers applied. Real IndexedDB CRUD, date transitions, completion/rescheduling, course gates, custom-course/topic editing, notes, flashcards, focus, search, exports/import/recovery, original modules, routing and refresh were exercised.
- `npm run format:check`: passed. There is no separate ESLint configuration; none is claimed.
- `npm audit --omit=dev`: zero reported production dependency vulnerabilities, a point-in-time result, not certification.
- Desktop/tablet/mobile at 1440×1000, 834×1112 and 390×844; axe checks in exercised dark/light states passed. Updated dashboard/schedule screenshots were inspected. No physical mobile, Firefox/Safari or screen-reader certification is claimed.
- Static output inventory and private-key/API-token pattern scan found no matching credentials, source maps, development runtime, private notes/backups or unnecessary test/report files in `dist/`.

No backend or app telemetry exists. Browser data stays in its origin/profile; public visitors do not receive your IndexedDB contents. The bundled generic routine/course scaffold is public after deployment, and the host can log ordinary asset requests. JSON/IndexedDB are unencrypted. Browser extensions/profile access, storage eviction and cleared site data remain real risks.

Headers provide defense in depth (`nosniff`, restricted permissions/network/frame policy, anti-framing and referrer policy), but the shell CSP permits inline compatibility for inherited `srcdoc` sandbox execution; it is not a strict nonce CSP. The playground remains two opaque-origin `allow-scripts` frames with denied network/storage capability, verified under production headers. It is not a CPU/memory-limited runner. No JVM execution, remote AI, platform feeds, file ingestion, PWA or guaranteed closed-tab alarms were added.

## Changed files

All paths below are relative to `studyos-nexus/`; original unrelated project files and browser data were preserved.

- Shell: `src/App.tsx`, `src/pages/Dashboard.tsx`, `src/styles.css`.
- Shared data/control: `src/lib/types.ts`, `logic.ts`, `store.tsx`, `utils.ts`; new `src/lib/readiness.ts`, `src/lib/study-progress.ts`; `src/components/ui.tsx`.
- Courses: new `src/pages/PersonalRoadmap.tsx`, `personal-roadmap-data.ts`, `personal-roadmap.css`; custom-course helpers in `src/lib/course-customization.ts`.
- Dated plan: new `src/pages/StudySchedule.tsx`, `study-schedule-data.ts`, `study-schedule-helpers.ts`, `study-schedule.css`.
- Strategy: new `src/pages/StrategyRoadmap.tsx`, `strategy-roadmap-data.ts`, `strategy-roadmap.css`.
- Original integration: `src/pages/Planner.tsx`, `Learning.tsx`, `learning-helpers.ts`, `learning.css`, `Settings.tsx`.
- Verification: new `src/tests/upgrade.test.ts`, `e2e/upgrade.spec.ts`, `e2e/hosting.spec.ts`; custom-course/topic unit and browser coverage; origin-portability improvement in `e2e/workflows.spec.ts` preserved all assertions; `playwright.config.ts`.
- Production/tooling: `vite.config.ts`, `package.json`, new `netlify.toml`, `public/_headers`, `public/_redirects`, `scripts/serve-production-test.mjs`, `scripts/export-plan.mjs`; regenerated `dist/`.
- Documentation/artifacts: `README.md`, `docs/ARCHITECTURE.md`, `docs/QA.md`, `docs/SECURITY.md`, this report, `docs/PERSONAL-PLAN.csv`, `docs/COURSE-MAPS.md`.

## Production output and single remaining external action

**Exact output:** `studyos-nexus/dist/` (absolute: `/Users/eklavyasinha/omnirush.ai/studyos-nexus/dist`). It contains the static bundle, `_headers` and `_redirects`. `netlify.toml` sets Node22/build/output for source-based Netlify deployment; the folder itself is ready for direct upload.

**Actual verified hosted URL: none.** No authenticated deployment integration/CLI workflow was available; browser opening attempts timed out, and available extensions did not expose static deployment. All local build/security/testing work was finished rather than fabricating a URL.

**Remaining manual action:** publish the **`dist/` folder** through your own signed-in account at [Netlify Drop](https://app.netlify.com/drop). Upload only that folder, not this project root. This is the account/publication step needed to open the app in Chrome without a local server. After publication verify the resulting HTTPS site and refresh/navigation; the host's actual behavior is not yet certified here.

For existing data, export from the original localhost origin and explicitly import into the hosted origin **before** applying another fresh scaffold. Different hosts, ports and browser profiles have independent storage. Local source and backups remain intact; hosting is not synchronization.
