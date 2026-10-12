# StudyOS Nexus

**A clear mind. A little momentum. Your next chapter.**

An upgraded local-first learning and developer workspace, preserving the existing StudyOS Nexus application and its graphite/green identity. Built with React 19, strict TypeScript, Vite, IndexedDB, Lucide, and safe Markdown. No backend, accounts, API keys, analytics, telemetry, external AI, remote synchronization, or runtime font requests.

## Run it on this computer

From the workspace directory:

```sh
cd studyos-nexus
sh start.sh
```

Open **http://127.0.0.1:5173**. The launcher uses the project-local Node.js runtime if present; it does not install anything or change global settings. Dependencies are already installed in the delivered folder.

Node was missing from this machine's PATH. A macOS Apple Silicon Node 22 runtime was downloaded into the ignored `.tools/node/` directory and verified against the upstream SHA-256 manifest. This runtime is not a dependency on any other project.

To run npm commands using that runtime:

```sh
export PATH="$PWD/.tools/node/bin:$PATH"
npm run dev
```

### Fresh installation / another computer

Install **Node.js 22 LTS or newer** with npm. Then:

```sh
cd studyos-nexus
npm ci
npm run dev
```

Dependency installation initially needs internet access. All application code, icons, and fonts are bundled or system-provided. Once installed, the running local server does not need internet for core workflows. **There is no service worker or installable PWA:** keep the local server running; uncached pages will not load after it stops. External reference links naturally require internet.

**Use the same browser profile, hostname, and port.** `localhost:5173`, `127.0.0.1:5173`, and `127.0.0.1:4173` are different browser storage origins. They do not share a workspace. Use JSON export/import to move data between them.

### Production

```sh
npm run build
npm run preview
```

Vite writes the production bundle to `dist/`. Preview normally serves http://127.0.0.1:4173. To test production against the same storage origin, stop the development server and run `npm run preview -- --port 5173`. Do not run both on the same port. `file://` is not supported; serve the build over local HTTP or HTTPS.

### Static hosting

`netlify.toml`, `public/_headers`, and `public/_redirects` configure static hosting: Node 22, build command `npm run build`, publish directory `dist`, and SPA fallback to `index.html`. Vite copies the headers/fallback files into `dist/`, so folder uploads include them too. The app remains local-first after hosting, but **hosted storage is a different browser origin from localhost**. A public URL is not private. Browser notes/progress are not bundled or uploaded; hosting providers may still log ordinary asset requests. Hosting is not configured with a secret or token in this project.

**Current deployment status: deployed manually to Netlify.** Live site: [https://nimble-piroshki-857849.netlify.app/](https://nimble-piroshki-857849.netlify.app/). This records a manual deployment, not an automated CI/CD deployment.

For future manual updates, publish **this project's `dist/` folder** to the existing Netlify project through your signed-in account. Do not upload the project root, source, `.tools`, browser backups, or test results. After each update, verify HTTPS, `/#schedule`, `/#roadmap`, `/#strategy`, refresh and a create/edit workflow at the live site. A provider dashboard URL or localhost preview is not proof of deployment.

After publishing, transfer existing data deliberately: export JSON from the original localhost origin in **Settings → Data & backups**, open the hosted origin, import the JSON, review the preview and confirm. Do this before applying a second fresh scaffold on the new origin to avoid creating independent copies with different record IDs. Keep the original backup; there is no sync.

## A quick first session

1. Set an optional first name and daily focus goal. Your workspace starts **empty**.
2. Open a learning studio and explicitly choose **Add curriculum** to add editable, unstarted roadmap topics. These are learning templates, not fake accomplishments.
3. Create a subject or project, then link a planned task to it.
4. Capture a note, make a flashcard, or log a coding problem.
5. Start a focus block and complete it to record actual elapsed time.
6. Use **Settings → Data & backups** to keep an external copy.

No example tasks, completed sessions, institutional records, or contest rankings are automatically seeded. Browser tests use isolated temporary browser contexts and do not populate your real workspace.

## Implemented workspaces

| Workspace          | Working functionality                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview           | Greeting, local date/live clock, calculated streak, daily task/focus/review metrics, real agenda, six learning paths, quick creation, recent items, daily reflections, manual daily/weekly goals, due-date-based next action. Widgets can be hidden, reordered with arrows, and made full-width.                                                            |
| Planner            | Day/week/month/agenda calendars; task and event CRUD; date navigation; today/upcoming/overdue/completed/subject/priority/type/search filters; time blocks and overlap detection; priorities, categories, tags, estimates, manual actual minutes, recurrence, and record associations; daily/weekly reviews.                                                 |
| Java Studio        | Editable, opt-in Java curriculum including OOP, arrays, strings, recursion, generics, collections, streams, exceptions, files, concurrency, JVM, and a Java-for-DSA checklist; five learning states; topic explanations/examples/references/revisions; syntax-highlighted snippet library; practice and mistake logs. Java is **not** compiled or executed. |
| DSA                | Editable roadmap; problem CRUD with platform/URL, language, difficulty, topic, attempts, time, approach, complexity, solution, mistakes, tags, and revision date; search/filter/sort/topic view/calendar; manually selected problem of the day; calculated solve rate and difficulty/topic coverage. Revised problems count as solved.                      |
| Competitive & ICPC | Editable topic roadmap, contest calendar, planned/registered/completed/missed contests, manually entered ranks/results/penalties, reflections, virtual practice, linked upsolves, revision queue, weak-topic views, and weekly goals calculated from logged activity. No platform APIs or fabricated live rankings.                                         |
| Web Development    | HTML through deployment roadmap, reusable snippets/patterns, project associations, and saved HTML/CSS/vanilla-JavaScript experiments. Actual browser preview runs inside two opaque-origin, restricted iframe sandboxes.                                                                                                                                    |
| Projects           | Board/list views, search/stage filtering, details, goals, technologies, repository/live URLs, informational local paths, dates/priorities, linked tasks/notes, editable milestones, and explicit web/Java/DSA/coursework/portfolio templates.                                                                                                               |
| Notes & knowledge  | Markdown editing and safe GFM preview, headings/lists/checklists/code/tables/links, notebooks/collections/tags, search, pin/favorite/archive, immediate local autosave with status, related notes/backlinks, linked tasks/projects/subjects/topics/problems/cards, and seven note templates.                                                                |
| Focus room         | Configurable focus/short/long breaks, start/pause/resume/reset/skip/complete, wall-clock countdown, actual-time session history, task/subject/project association, interruption tracking, daily/weekly goals, and optional synthesized sound. Every fourth completed focus block prepares a long break; blocks do not auto-start.                           |
| Flashcards         | CRUD, decks/types/tags/search, due/upcoming/all views, Markdown questions/answers/code, reveal, previous/next, shuffle, keyboard ratings, manual next-review dates, and persistent scheduling/review history.                                                                                                                                               |
| College            | Subjects, syllabus chapters, assignment/exam CRUD and status, notes, revision dates, attendance entries and target calculator, manual marks, calculated syllabus/attendance/weighted marks summaries. No college-portal integration.                                                                                                                        |
| Insights           | Daily/weekly/30-day ranges; subject/category filters; actual focused time, completed tasks, problem counts, current topic mastery and project progress; accessible exact-data tables; rule-based overdue/postponed/neglected-topic observations. No invented metrics or AI predictions.                                                                     |
| Settings           | Dark/light/system themes, lime/blue/violet accents, density, reduced motion, focus durations/goals, date/time format, week start, categories/priorities, global tag rename, JSON/CSV exports, validated merge/replace restore, recovery snapshot, durable-storage request, and confirmed reset.                                                             |

Global search indexes actual records, snippets/code, settings, and the new schedule/course/strategy records. It opens the corresponding editor or detail view. All navigation destinations are implemented.

## Personalized roadmap upgrade

The rebuilt **Study schedule** begins on **Sunday 11 October 2026** and runs through **31 March 2027**. Choose **Apply starting schedule** once to create 741 uncompleted local records in a single validated batch. It prioritizes GSoC/open-source evidence, then Java/DSA, then Web, while maintaining Maths/college and gating platform practice. It includes daily reviews, weekly recovery decisions, canonical topic links, revision days, optional Hacktoberfest records and rescheduling history. The new `study-schedule-v2` installation marker prevents silent regeneration; any legacy October-4 records remain untouched. Task completion does not automatically complete a course topic.

Dinner remains 20:00–21:00, so Web is adjusted to 21:00–22:15: 45 minutes learning/retrieval and 30 minutes independent implementation. Wednesday/Friday course questions use separate timed portions of the Java block, not a second overlapping night block. College remains protected on weekends because no weekend absence was verified; weekend targets are explicitly reduced rather than stealing meals, rest or sleep. Study stops at 22:45. Dates/clock use your device's local calendar; use your India time zone for this routine.

The dashboard follows today's date at midnight unless you explicitly browse another date. It shows remaining/completed work, overdue core tasks, original reschedule dates, actual college assignments, planned versus logged effort, weekly/monthly task progress and next lessons/revision. It changes views, never the stored schedule. Skipped optional tasks remain incomplete on their original dates without becoming compulsory overdue backlog.

The added **Personal course map** has two editable scaffolds:

- Java + DSA: fundamentals, arrays/2D arrays, searching/sorting/complexity, strings, bit manipulation, OOP, recursion/backtracking, linked lists, stacks/queues, trees/BST, heaps/hashing/tries, graphs/BFS/DFS, and DP. Modules show prerequisites, practice, independent exercises, mistakes, revision notes, and completion gates. Nothing is adopted or completed until you choose it.
- Sigma 8.0 Web Development: HTML Part 1–4/HTML levels, CSS Part 1–6, Mini Project/Bootstrap/Project, JavaScript Part 1–13, Terminal + Git & GitHub, Backend 1–4 Node/Express/EJS, SQL + MongoDB, Project Phases 1–3, React Part 1–6 + Major Project. Labels remain editable scaffolding; no exact lecture titles or official completeness are claimed.

LeetCode and Codeforces readiness cards use transparent, real completion records plus a manual self-assessment; no platform is connected or auto-enabled. Revised practice is not silently treated as independent mastery.

Both roadmap pages share the same latest readiness acknowledgement. Canonical completed/mastered topic records—not keywords in tasks/problems—satisfy gates. DP also requires recursion/backtracking, core structures and graph traversal. Problems explicitly separate independent, hints, editorial-assisted, assistance-unrecorded and unsolved outcomes; old solves are never assumed independent.

The added **GSoC & six-month plan** covers October 2026 through early April 2027, GSoC research/contribution preparation, ICPC readiness/virtual contests, platform gates, real organization research records, proposal milestones, and an unscheduled Micro MBA pending actual content. It does not invent GSoC 2027 dates, organizations, pull requests, rankings, or selection outcomes. Link real planner tasks and evidence as they happen.

The floating **Local study assistant** is an explicit rule-based fallback, not a real AI model. It reads the current IndexedDB workspace and can perform registered actions such as plan/progress summaries, today’s Java completion, named rescheduling, recovery, next-week balancing, priority ordering, revision notes/sessions, focus start, theme/accent/density/motion changes, daily-goal and focus-duration settings, dashboard-widget visibility/size/order changes, confirmed pending-task deletion, and custom-course/topic management. Custom courses can be created, renamed without changing their stable slug, listed with topic progress, archived or removed with confirmation; topics can be added, renamed, reordered, updated, archived or removed with confirmation while preserving their IDs and progress. Successful writes wait for IndexedDB persistence and show a **Saved and verified** receipt with a relevant view link; reads and no-ops are labelled separately. Hindi/English requests are parsed deterministically; unsupported questions are declined honestly. The in-app panel cannot access project files or source code: use the OmniRush coding-agent session when a request requires an actual React/CSS/TypeScript/file change, and it will apply and validate that change instead of pretending a setting changed the source. No external API, account or API key is required.

Full handoff: `docs/UPGRADE-REPORT.md`. Portable starting schedule: `docs/PERSONAL-PLAN.csv`. Detailed concepts, exercises, mistakes, revision and gates: `docs/COURSE-MAPS.md`. `npm run export:plan` regenerates these scaffold documents; it never reads personal browser data.

## Keyboard and accessibility

- **⌘K / Ctrl+K:** global search and command palette; arrows navigate, Enter opens.
- **?:** shortcut guide when not typing.
- **Escape:** close a dialog; modal focus is trapped and returned to the previous control or main content.
- **Left/right arrows:** shared tab navigation; all controls also support normal Tab navigation.
- **⌘B / Ctrl+B**, **⌘I / Ctrl+I** inside the note editor: wrap selected Markdown in bold/italic markers. Formatting buttons also insert headings, checklists, and code blocks.
- Flashcard review: **Space** reveals; **1–4** rate Again/Hard/Good/Easy; arrow controls change cards. Input fields are excluded from study shortcuts.
- Playground: Tab inserts spaces; **Shift+Tab leaves the editor**.

Includes semantic landmarks, labels, focus outlines, a skip link, responsive navigation, accessible progress values and chart data, reduced-motion support, and toasts. Automated axe checks cover all module empty states in both themes plus the task editor and tablet navigation. Automated checks complement, but do not replace, assistive-technology testing.

## Your data: export, restore, and recovery

### Export

1. Open **Settings → Data & backups**.
2. Choose **Export complete backup**.
3. Save the downloaded `studyos-nexus-YYYY-MM-DD.json` outside browser storage.

The JSON contains all records, IDs and associations, timestamps, review history, preferences, widget order, and a paused timer snapshot. It is plain text, **not encrypted**. Treat it as personal data. The application never uploads it. CSV exports for tasks, problems, and sessions are for spreadsheets, not app restoration; formula-like strings are escaped to avoid spreadsheet injection.

### Restore

1. Choose or drop a JSON backup on the data page.
2. The application validates app identity, schema version, IDs, field types, dates, URLs, numeric bounds, review history, settings, timer structure, and duplicate IDs before showing a preview.
3. Select **Merge** or **Replace**, then explicitly confirm.

**Merge** combines different IDs; for matching IDs, the later `updatedAt` wins. Local preferences and timer state are retained (the timer is paused). Identical edit timestamps keep the current record. There is no claim of automatic semantic conflict resolution.

**Replace** restores the entire backup, including preferences. Timers are paused so time spent away from the backup is never counted as focus.

Import limits: 30 MB and 50,000 records. Unsupported schema versions, unsafe URLs/properties, malformed data, and inconsistent attendance/marks/contest counts are rejected. Failed validation never writes to the database. The replacement and its recovery snapshot are committed in a single IndexedDB transaction, so a failed database write cannot partially replace your workspace.

### Recovery and reset

- Before each import or reset, the current workspace becomes a **single recovery copy** in IndexedDB.
- **Restore recovery copy** swaps that snapshot with the current workspace, after confirmation.
- **Reset workspace** requires typing `RESET`. It clears current records and resets preferences, retaining the before-change recovery copy.
- This safety copy is **not an external backup**. Clearing site data removes both copies. Export JSON regularly.
- Deleting a record clears direct incoming associations but preserves other records. Text links in Markdown remain ordinary text; they can point to a deleted record, in which case the app shows a not-found state.

### Persistence and concurrent tabs

The canonical data lives in IndexedDB database `studyos-nexus`, version 1, store `workspace`. Snapshots use explicit schema version 1. Preferences for first-paint appearance are mirrored to `localStorage`; personal records are not.

Writes are serialized and atomic. Synchronous batches are coalesced. Notes update immediately in memory and display **Saving locally… / Saved on this device** according to database completion. A warning appears on storage failure; export the current in-memory copy before closing the tab. A before-unload guard warns while writes are pending.

One tab holds the browser Web Lock for editing. Other tabs stay read-only and receive saved updates through BroadcastChannel. Close the writer and reload a secondary tab to take over. This deliberately avoids silent, conflicting autosaves. Browsers without Web Locks are read-only instead of risking data loss.

There are no historical schemas to migrate yet. Version 1 is validated on read; missing optional preferences receive safe defaults. Unknown future versions/record fields fail closed and leave the original stored data untouched. Add and test an explicit migration before changing the schema version.

## How calculations work

- **Focus:** running time is derived from a wall-clock deadline, not decremented interval ticks. Pauses are excluded. Actual minutes are capped at the configured block duration. Completion is deduplicated by persisted session start time. Switching/resetting an unfinished timer explicitly confirms discarding it; completing/skipping logs only actual elapsed focus time.
- **Task estimates and actuals:** task `duration` and `actualMinutes` are manual entries. Focus sessions are separate records with task/project/subject links; analytics focus totals come only from session logs. The app does not silently add timer minutes to a manual task total and double-count them.
- **Task recurrence:** completing a recurring task creates the next dated task. Daily/weekly/monthly schedules are supported. Monthly dates clamp to the next month's last valid day. Reopening and re-completing the same task does not duplicate an already-created occurrence. The next task is not removed when you reopen the original.
- **Event recurrence:** calendar occurrences are projected from one event record. Editing or completing an event changes the whole series; per-occurrence exceptions are not implemented.
- **Streak:** consecutive local dates with recorded focus time, completed tasks, or a saved review. Yesterday may be the latest active day so an unfinished current day does not prematurely end the streak.
- **DSA solve rate:** solved/revised problems divided by attempted problems, not the percentage of successful submissions. No private platform data is fetched.
- **Attendance:** sum of attended classes divided by sum of held classes. Enter non-overlapping class periods. Marks percentage is total earned marks divided by total possible marks, not an average of subject percentages.
- **Topic mastery and project progress:** based on entered topic states and linked tasks/milestones. These are current snapshots, labelled separately from date-filtered activity.
- **Goals:** dashboard intention values are explicitly manual. Focus/competitive weekly goals calculate from their respective dated records.

### Flashcard scheduling

A simple, documented day-based scheduler—not a scientific retention model:

| Rating | Next interval                                                        |
| ------ | -------------------------------------------------------------------- |
| Again  | Today (0 days)                                                       |
| Hard   | At least 1 day; previous interval × 1.2, rounded up                  |
| Good   | 1 day for a new card; otherwise previous interval × 2                |
| Easy   | 4 days for a new card; otherwise previous interval × 2.5, rounded up |

Intervals are capped at 3,650 days. Each rating appends timestamped history and a review activity record. You can manually edit a card's due date. Again leaves it due today. Dates use the device's local calendar, including across daylight-saving boundaries.

## Project structure

```text
studyos-nexus/
├── src/
│   ├── App.tsx                 # shell, hash routing, search, onboarding
│   ├── main.tsx                # bootstrap and appearance hydration
│   ├── styles.css              # tokens, components, shell, responsive styles
│   ├── components/ui.tsx       # shared accessible controls and record editor
│   ├── lib/                    # strict types, IndexedDB store, pure logic, hooks
│   ├── pages/                  # all module pages and scoped styles/helpers
│   └── tests/                  # original and upgrade logic regressions
├── e2e/                        # Playwright workflows and axe checks
├── public/                     # original mark, hosting headers and fallback
├── docs/                       # architecture/security/QA, upgrade report, CSV plan
├── scripts/                    # local production test server and scaffold exporter
├── dist/                       # generated production build
├── .tools/node/                # ignored local runtime on this computer
├── start.sh                    # portable convenience launcher
├── package.json
├── package-lock.json           # reproducible resolved dependencies
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── tsconfig.json
```

See `docs/ARCHITECTURE.md` for boundaries and `docs/QA.md` for final verification evidence. This upgrade modifies the existing StudyOS Nexus only; no separate app or earlier StudyOS project was substituted.

## Tests and maintenance

```sh
npm run typecheck
npm test
npx playwright install chromium   # one-time browser download on a fresh machine
npm run test:e2e
npm run test:production          # build + full browser suite with static hosting headers
npm run build
npm run format:check
```

Playwright uses isolated browser contexts and does not sign into anything. `test:e2e` exercises development; its two production-only checks are explicitly skipped there and run by `test:production` against the build with the exact hosting CSP/headers on port 4174. The current suite passed 29 production browser checks and 27 development checks (with two production-only skips). Unit tests have 89 cases, including schedule timing, shared gates, assistant parsing, preserved ISO focus timestamps and upgraded backups. Main workflows use real IndexedDB; supplemental gate tests use explicitly synthetic topic fixtures. Test screenshots/traces stay outside `dist/` in ignored `test-results/`.

## Deliberate limitations and troubleshooting

- **Java execution:** the browser does not have a JVM or safely broker arbitrary local processes. Save/highlight snippets here; run Java yourself in an installed JDK/IDE. Nothing is sent to a remote runner.
- **Playground:** vanilla browser HTML/CSS/JS only. No Node, Java, TypeScript compiler, npm imports, network assets, or access to the app's DOM/storage. HTML scripts/event handlers/embedding tags are removed; use the JS panel. Sandbox and CSP restrict capabilities, but are not CPU/memory resource isolation: run code you understand and avoid infinite loops. Saved experiments must be explicitly run again after reload. Unsaved scratchpad changes are not a backup.
- **Native files/screenshots:** local project paths are informational text. The app does not read your filesystem or upload attachments. Use notes, code, and reference URLs.
- **Alarms:** sound requires browser interaction and an active audio context. Closed/suspended apps cannot guarantee alarms or desktop notifications. An elapsed timer is reconciled when the app resumes.
- **Calendar:** recurring events have whole-series edits only. Cross-midnight blocks should be entered as two blocks. Week/month grids scroll inside their calendar region on small screens; the page itself does not horizontally overflow.
- **No cloud or account:** data does not transfer between devices/browsers automatically. Use export/restore. No collaboration or cross-device synchronization is claimed.
- **Storage error / missing records:** check that you are using the same origin and non-private browser profile. Do not clear site data. Retry saving, export the current copy, or restore a known backup. “Request durable storage” is a browser request, not a guarantee.
- **Read-only tab:** another tab holds editing rights. Close it and reload. Current Chrome, Edge, Firefox, and Safari support the required secure-context APIs; automated browser verification here uses Chromium, not a complete cross-browser certification.
- **Port already in use:** reuse the running app, stop the earlier server, or choose another port. A different port has separate data—export before switching.
- **No Node / npm command:** run `sh start.sh` on this delivered computer, or set the local PATH as shown above. On another machine, install Node 22+ and run `npm ci`.
- **Production page fails after an update:** reload while the local server is running; export before replacing or moving the app. There is no stale service-worker cache to clear.

This is a maintainable personal workspace, not an LMS, an institutional data feed, a code-execution service, or a scientifically exact learning predictor.
