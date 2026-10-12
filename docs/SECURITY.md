# Local-first security boundaries

## What leaves the device

Nothing is uploaded by application code. There are no remote APIs, telemetry, analytics, remote fonts, account providers, or synchronization. External reference links open only after a click, with `noopener noreferrer`. Dependencies and test browsers need internet for initial installation. Local development uses Vite's local hot-reload connection.

`public/_headers` and `public/_redirects` are copied into `dist/`. They add `nosniff`, a strict referrer policy, restrictive permissions, a same-origin network/frame CSP and an SPA fallback. These exact headers were exercised by the local production browser suite. They do not make a public deployment private, encrypt IndexedDB, or restrict who can open the URL. A hosted origin has separate storage from localhost.

The shell CSP permits inline script/style compatibility because `srcdoc` frames inherit parent restrictions. This is **not a strict nonce-based script CSP**. User-authored code is inserted only into the opaque-origin sandbox, whose additional policy denies network/storage capabilities. React escaping and safe Markdown remain the parent-content boundary; do not describe the headers as perfect protection.

Publishing serves the app's generic supplied roadmap/routine scaffold publicly, not personal IndexedDB notes/progress. A static host may log IP addresses, user agents and ordinary asset requests. There is no app telemetry or synchronization. Deploy only `dist/`, not source, test results, `.tools`, or browser backup files.

## Storage and backup

IndexedDB is the canonical store. Personal records are not copied to logs or localStorage. Appearance preferences alone are mirrored to localStorage. Data and JSON exports are **not encrypted**. Anyone with access to the browser profile or backup file may read them. Do not use this app as a password manager or secret vault.

Backup validation is an allowlisted v1 schema with size limits, unique IDs, known fields, safe URL protocols, bounded numbers/settings, valid dates, and review/timer checks. New schedule/module/prerequisite/readiness/assistance metadata round-trips with validation. Existing focus-session ISO start/end timestamps remain supported alongside planner HH:mm blocks. Dangerous property names are rejected while parsing JSON. Failed imports do not overwrite storage. Replacement and its recovery snapshot use one transaction; editing pauses during the transaction.

Only one tab writes, enforced by a browser Web Lock. Missing lock support fails into read-only mode. Browser storage eviction, disk failure, or clearing site data can still remove data: keep external backups.

## Rendered user content

React escapes titles and code. Markdown uses React Markdown + GFM without raw HTML support. External Markdown images are rendered as explicit links rather than fetched automatically. Safe links allow only `http:` and `https:`; internal Markdown fragment links navigate the workspace. Java syntax highlighting creates text tokens, not HTML strings or executable scripts.

## Browser playground

User-authored HTML/CSS/JavaScript is deliberately executable only inside two nested opaque-origin `srcdoc` iframes, both with `sandbox="allow-scripts"`. Neither frame has `allow-same-origin`, popups, downloads, forms, top navigation, or permissions-policy grants. A restrictive CSP denies network loads, connections, external scripts/styles, workers, child-frame network navigation, and form submission; inline browser JavaScript and styles are enabled within the sandbox only.

HTML embedding tags, scripts, inline event handlers, remote resource attributes, form targets, and automatic navigation markup are removed. The JS panel is the explicit execution surface. Parent messages are accepted only from the active iframe, with opaque origin and a matching run token; only bounded error text is displayed.

This is not a CPU/memory-limited code runner or a substitute for browser security updates. Infinite loops can freeze a rendering process. Run code you understand. Java, Node.js, native commands, filesystem access, npm modules, and TypeScript compilation are not available. No code is executed remotely.

## Verification boundaries

Automated browser tests verify host DOM isolation, denied localStorage access inside the preview, and CSP-blocked remote fetch/HTML resources with no external requests. These checks are not a comprehensive security audit. Production dependency audit results and final functional checks are recorded in `QA.md`.

The 11 October 2026 production scan found no matching private-key/API-token patterns in `src/`, `public/` or `dist/`. The output contains only HTML, bundled JS/CSS, the original icon, `_headers` and `_redirects`; no source maps, development runtime, reports, private notes or credentials were included. A pattern scan is not exhaustive secret detection. No deployment account was available, so HTTPS and real-provider header behavior remain unverified until publication.
