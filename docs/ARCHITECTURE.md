# StudyOS Nexus architecture

An independent React 19 + TypeScript + Vite application. No backend, telemetry, remote fonts, accounts, or runtime APIs. CSS uses semantic design tokens and responsive grids. Lucide supplies locally bundled icons; React Markdown renders escaped Markdown with GFM.

## Boundaries

- `src/lib/types.ts`: versioned domain model and defaults.
- `src/lib/store.tsx`: React context; atomic IndexedDB snapshots; cross-tab write exclusion; lightweight appearance preferences in localStorage.
- `src/lib/logic.ts`: pure scheduling, analytics, validation, backup merge helpers.
- `src/components/ui.tsx`: accessible reusable primitives and generic record editor.
- `src/pages/`: implemented domain workflows.
- `src/pages/PersonalRoadmap.tsx`: editable Java + DSA and Sigma 8.0 course-map scaffolds with prerequisite/completion fields and manual platform gates.
- `src/pages/StudySchedule.tsx`: deterministic, apply-once `study-schedule-v2` records beginning 2026-10-11 through 2027-03-31, daily/weekly/monthly views, recovery and reschedule history; legacy October-4 records remain separate.
- `src/pages/StrategyRoadmap.tsx`: evidence-based GSoC/ICPC six-month strategy and intentionally unscheduled Micro MBA.
- `src/App.tsx`: hash router, application shell, onboarding, global search.
- `src/tests/`: critical pure logic regression tests.

All entities have stable UUIDs, timestamps, and a `kind`. Associations are IDs, not copied content. Delete removes incoming associations without deleting unrelated records. Curriculum templates and the dated schedule are offered explicitly; they never count as completed work until the user adopts/records them. The new 2026-10-11–2027-03-31 schedule has deterministic versioned `scheduleId` values and is never silently regenerated; the prior October-4 schedule is not rewritten. Statistics derive only from entered records. Safe Markdown never renders raw HTML. Web previews use an opaque-origin sandbox and restrictive CSP. Java snippets are stored, not executed. The local assistant resolves only registered validated actions and is not a general LLM.

An IndexedDB v1 object store holds a schema-versioned snapshot in one transaction. A browser Web Lock prevents simultaneous editing in separate tabs; secondary tabs are read-only until reloaded after the writer closes. Imports are validated before preview and confirmation. Future migration is explicit; newer schemas are rejected rather than guessed. Browser storage is not a backup.
