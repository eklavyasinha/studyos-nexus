import type { Item } from "../lib/types";
import { addDays, today } from "../lib/utils";

export type CodeToken = {
  text: string;
  kind: "plain" | "keyword" | "string" | "number" | "comment" | "type";
};
const JAVA_WORDS = new Set(
  "abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new package private protected public record return sealed short static strictfp super switch synchronized this throw throws transient try var void volatile while yield true false null non-sealed permits".split(
    " ",
  ),
);
const WEB_WORDS = new Set(
  "async await break case catch class const continue debugger default delete do else export extends false finally for from function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while with yield".split(
    " ",
  ),
);

// Tokens are rendered as React text nodes, never inserted as HTML or executed.
export function tokenizeCode(code: string, language = "java"): CodeToken[] {
  const pattern =
    /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)|"""[\s\S]*?(?:"""|$)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:0[xX][\da-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?[fFdDlL]?)\b|\b[A-Za-z_$][\w$]*\b/g;
  const tokens: CodeToken[] = [];
  const keywords = language.toLowerCase() === "java" ? JAVA_WORDS : WEB_WORDS;
  let previous = 0;
  for (const match of code.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > previous)
      tokens.push({ text: code.slice(previous, index), kind: "plain" });
    const text = match[0];
    const kind =
      text.startsWith("//") || text.startsWith("/*")
        ? "comment"
        : /^['"`]/.test(text)
          ? "string"
          : /^\d/.test(text)
            ? "number"
            : keywords.has(text)
              ? "keyword"
              : /^[A-Z][A-Za-z\d_$]*$/.test(text)
                ? "type"
                : "plain";
    tokens.push({ text, kind });
    previous = index + text.length;
  }
  if (previous < code.length)
    tokens.push({ text: code.slice(previous), kind: "plain" });
  return tokens;
}

export function localDay(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : today(date);
}

export function activityDay(item: Item): string | undefined {
  return item.date || localDay(item.completedAt);
}

export function weekBounds(day: string, weekStart = 1) {
  const date = new Date(`${day}T12:00:00`);
  const start = addDays(day, -((date.getDay() - weekStart + 7) % 7));
  return { start, end: addDays(start, 6) };
}

export function monthGrid(month: string, weekStart = 1): string[] {
  const first = `${month.slice(0, 7)}-01`;
  const firstDate = new Date(`${first}T12:00:00`);
  const offset = (firstDate.getDay() - weekStart + 7) % 7;
  return Array.from({ length: 42 }, (_, i) => addDays(first, i - offset));
}

export function moveMonth(month: string, delta: number): string {
  const date = new Date(`${month.slice(0, 7)}-01T12:00:00`);
  date.setMonth(date.getMonth() + delta);
  return today(date);
}

export function problemMetrics(problems: Item[]) {
  const solved = problems.filter((item) =>
    ["solved", "revised"].includes(item.status || ""),
  );
  const attempted = problems.filter(
    (item) =>
      ["solved", "revised", "attempted", "revising"].includes(
        item.status || "",
      ) || (item.attempts || 0) > 0,
  );
  const spent = problems.reduce(
    (sum, item) => sum + Math.max(0, item.actualMinutes || 0),
    0,
  );
  return {
    total: problems.length,
    solved: solved.length,
    attempted: attempted.length,
    independent: solved.filter((item) => item.solveMethod === "independent")
      .length,
    withHints: solved.filter((item) => item.solveMethod === "hints").length,
    editorialAssisted: solved.filter((item) => item.solveMethod === "editorial")
      .length,
    assistanceUnrecorded: solved.filter(
      (item) =>
        !["independent", "hints", "editorial"].includes(item.solveMethod || ""),
    ).length,
    unsolved: attempted.filter(
      (item) => !solved.some((entry) => entry.id === item.id),
    ).length,
    unattempted: problems.length - attempted.length,
    successRate: attempted.length
      ? Math.round((solved.length / attempted.length) * 100)
      : null,
    minutes: spent,
    due: problems.filter(
      (item) => item.nextRevision && item.nextRevision <= today(),
    ).length,
    difficulty: ["Easy", "Medium", "Hard"].map((name) => ({
      name,
      total: solved.filter((item) => item.difficulty === name).length,
    })),
  };
}

export function revisionItems(items: Item[], day = today()) {
  return items
    .filter(
      (item) =>
        Boolean(item.nextRevision) ||
        Boolean(item.mistakes?.trim()) ||
        item.status === "revising" ||
        item.status === "needs review",
    )
    .sort(
      (a, b) =>
        (a.nextRevision || "9999").localeCompare(b.nextRevision || "9999") ||
        a.title.localeCompare(b.title),
    )
    .map((item) => ({
      item,
      due: !!item.nextRevision && item.nextRevision <= day,
    }));
}

function inertMarkup(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content
    .querySelectorAll(
      "script, iframe, frame, frameset, object, embed, base, meta, link, portal",
    )
    .forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (
        name.startsWith("on") ||
        [
          "srcdoc",
          "srcset",
          "action",
          "formaction",
          "ping",
          "target",
          "download",
          "autofocus",
          "is",
        ].includes(name)
      )
        element.removeAttribute(attribute.name);
      if (["href", "xlink:href"].includes(name) && !value.startsWith("#"))
        element.removeAttribute(attribute.name);
      if (
        name === "src" &&
        !/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(value)
      )
        element.removeAttribute(attribute.name);
    }
  });
  return template.innerHTML;
}

/**
 * Two opaque-origin frames, both allow-scripts only. The fixed outer document's
 * frame-src 'none' additionally prevents the user frame from navigating itself
 * to a network URL. srcdoc documents are permitted without a network load.
 */
export function buildPlaygroundDocument(
  html: string,
  css: string,
  javascript: string,
  runId = "",
): string {
  const policy =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; media-src 'none'; connect-src 'none'; frame-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  const script = javascript.replace(/<\/script/gi, "<\\/script");
  const style = css.replace(/<\/style/gi, "<\\/style");
  const id = JSON.stringify(runId).replaceAll("<", "\\u003c");
  const reporter = `window.addEventListener('error',function(e){parent.postMessage({type:'studyos-preview-error',runId:${id},message:String(e.message).slice(0,500)},'*')});window.addEventListener('unhandledrejection',function(e){parent.postMessage({type:'studyos-preview-error',runId:${id},message:String(e.reason).slice(0,500)},'*')});`;
  const content = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{color-scheme:light}body{font-family:system-ui,sans-serif;padding:20px;margin:0;overflow-wrap:anywhere}*{box-sizing:border-box}</style><style>${style}</style></head><body>${inertMarkup(html)}<script>${reporter}document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(a)e.preventDefault()},true);document.addEventListener('submit',function(e){e.preventDefault()},true);<\/script><script>${script}\n<\/script></body></html>`;
  const escaped = content
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{display:block;width:100%;height:100%;border:0}</style></head><body><iframe id="preview-content" title="Isolated experiment document" sandbox="allow-scripts" referrerpolicy="no-referrer" srcdoc="${escaped}"></iframe><script>window.addEventListener('message',function(e){var d=e.data;if(e.source===document.getElementById('preview-content').contentWindow&&e.origin==='null'&&d&&d.type==='studyos-preview-error'&&d.runId===${id}&&typeof d.message==='string')parent.postMessage({type:d.type,runId:d.runId,message:d.message.slice(0,500)},'*')})<\/script></body></html>`;
}

export const PLAYGROUND_STARTER = {
  html: '<main class="card">\n  <span class="eyebrow">A LITTLE EXPERIMENT</span>\n  <h1>Ideas become interfaces.</h1>\n  <p>Start small. Change something. See what happens.</p>\n  <button id="hello">Make a little progress ↗</button>\n  <p id="message" aria-live="polite"></p>\n</main>',
  css: "body { min-height: 100vh; display: grid; place-items: center; background: #f3f3ee; color: #222821; }\n.card { max-width: 420px; padding: 36px; background: white; border: 1px solid #e1e3dc; border-radius: 20px; }\n.eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .14em; color: #5b7050; }\nh1 { font-size: 34px; line-height: 1.1; letter-spacing: -.05em; }\np { color: #737b6d; font-size: 14px; line-height: 1.7; }\nbutton { padding: 13px 18px; border: 0; border-radius: 9px; background: #d9f77e; color: #26301b; font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; }",
  javascript:
    'const button = document.querySelector("#hello");\nbutton.addEventListener("click", () => {\n  document.querySelector("#message").textContent = "One small step. Keep building.";\n});',
};
