import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  Folder,
  Heart,
  Link2,
  NotebookPen,
  Pin,
  Plus,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Confirm,
  Empty,
  Field,
  Markdown,
  Modal,
  PageHeader,
  Tabs,
} from "../components/ui";
import { useStore } from "../lib/store";
import type { Item } from "../lib/types";
import { cx, formatDate, navigate, routeFor } from "../lib/utils";
import "./knowledge.css";

const templates = [
  {
    id: "debugging",
    label: "Debugging log",
    description: "Turn a frustrating bug into reusable knowledge.",
    body: "# Debugging log\n\n## Expected vs actual\n\n\n## Smallest reproduction\n\n```text\n\n```\n\n## Hypothesis & evidence\n\n\n## Root cause\n\n\n## Fix & regression test\n\n- [ ] Reproduce the failure\n- [ ] Verify the fix\n- [ ] Save the lesson\n",
  },
  {
    id: "daily-review",
    label: "Daily review",
    description: "A small win, a useful lesson, a clear next step.",
    body: "# Daily review\n\n## A small win\n\n\n## What I learned\n\n\n## What got in the way\n\n\n## Tomorrow’s one important thing\n\n- [ ] \n",
  },
  {
    id: "blank",
    label: "Blank page",
    description: "A little space to think.",
    body: "",
  },
  {
    id: "lecture",
    label: "Lecture notes",
    description: "Capture ideas, examples, and follow-ups.",
    body: "# Lecture notes\n\n## The big idea\n\n\n## Key concepts\n\n- \n\n## Examples\n\n\n## Questions to revisit\n\n- [ ] \n\n## In my own words\n\n",
  },
  {
    id: "cornell",
    label: "Cornell notes",
    description: "Turn cues into a clear summary.",
    body: "# Cornell notes\n\n## Essential question\n\n\n## Cues & questions\n\n- \n\n## Notes & evidence\n\n\n## Summary\n\nExplain what you learned without looking at the notes above.\n\n",
  },
  {
    id: "concept",
    label: "Concept breakdown",
    description: "Understand it. Connect it. Explain it.",
    body: "# Concept breakdown\n\n## What is it?\n\n\n## Why does it matter?\n\n\n## A worked example\n\n```text\n\n```\n\n## Common mistakes\n\n- \n\n## Related concepts\n\n\n## Check my understanding\n\n- [ ] Explain this without referring to my notes\n",
  },
  {
    id: "project",
    label: "Project thinking",
    description: "Decisions, trade-offs, and next steps.",
    body: "# Project thinking\n\n## Outcome\n\n\n## Approach\n\n\n## Decisions & trade-offs\n\n| Decision | Why |\n| --- | --- |\n| | |\n\n## Open questions\n\n- \n\n## Next steps\n\n- [ ] \n",
  },
];

function sortedUnique(values: (string | undefined)[]) {
  return [
    ...new Set(
      values.filter((value): value is string => Boolean(value?.trim())),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function NewNote({
  onClose,
  onCreated,
  notebook,
}: {
  onClose: () => void;
  onCreated: (item: Item) => void;
  notebook: string;
}) {
  const { create, readOnly, notify, items } = useStore();
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState("blank");
  const [book, setBook] = useState(notebook);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (readOnly)
      return notify(
        "This tab is read-only. Switch to the active editing tab.",
        "info",
      );
    const chosen = templates.find((item) => item.id === template)!;
    const note = create("note", {
      title:
        title.trim() || (template === "blank" ? "Untitled note" : chosen.label),
      body: chosen.body,
      notebook: book.trim(),
      collection: "",
      tags: [],
      pinned: false,
      favorite: false,
      archived: false,
    });
    onCreated(note);
    onClose();
  };
  return (
    <Modal title="Make room for an idea" onClose={onClose} wide>
      <form onSubmit={submit} className="stack">
        <fieldset disabled={readOnly} className="kn-fieldset stack">
          <div className="grid-2">
            <Field label="Note title">
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What are you thinking about?"
                maxLength={240}
              />
            </Field>
            <Field label="Notebook">
              <input
                list="kn-new-notebooks"
                value={book}
                onChange={(event) => setBook(event.target.value)}
                placeholder="e.g. Computer science"
                maxLength={100}
              />
              <datalist id="kn-new-notebooks">
                {sortedUnique(
                  items
                    .filter((item) => item.kind === "note")
                    .map((item) => item.notebook),
                ).map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="Start with a template">
            <div className="kn-template-grid">
              {templates.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cx(
                    "kn-template",
                    template === item.id && "is-selected",
                  )}
                  onClick={() => setTemplate(item.id)}
                  aria-pressed={template === item.id}
                >
                  <FileText size={19} />
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                  {template === item.id && (
                    <Check size={15} className="kn-template-check" />
                  )}
                </button>
              ))}
            </div>
          </Field>
          <div className="kn-modal-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              <Plus size={16} /> Create note
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

function NoteWorkspace({
  note,
  onDelete,
  onArchive,
}: {
  note: Item;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const { items, update, readOnly, saving, error, notify } = useStore();
  const [view, setView] = useState("split");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [tagText, setTagText] = useState((note.tags || []).join(", "));
  const change = (patch: Partial<Item>) => {
    if (readOnly)
      return notify(
        "This tab is read-only. Switch to the active editing tab.",
        "info",
      );
    update(note.id, patch);
  };
  const insert = (before: string, after = "") => {
    if (readOnly || !editorRef.current) return;
    const input = editorRef.current;
    const start = input.selectionStart,
      end = input.selectionEnd,
      body = note.body || "";
    change({
      body:
        body.slice(0, start) +
        before +
        body.slice(start, end) +
        after +
        body.slice(end),
    });
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + before.length, end + before.length);
    });
  };
  const associations = [
    note.taskId,
    note.problemId,
    note.cardId,
    note.projectId,
    note.subjectId,
    note.topicId,
    note.noteId,
  ].filter(Boolean);
  const backlinks = items.filter(
    (item) =>
      item.id !== note.id &&
      (item.noteId === note.id ||
        [item.body, item.question, item.answer, item.description].some((text) =>
          text?.includes(`#notes/${note.id}`),
        )),
  );
  const backlinkIds = new Set(backlinks.map((item) => item.id));
  const related = items
    .filter((item) => {
      if (item.id === note.id || item.archived || backlinkIds.has(item.id))
        return false;
      if (associations.includes(item.id)) return true;
      return (
        item.kind === "note" &&
        ((note.projectId && item.projectId === note.projectId) ||
          (note.subjectId && item.subjectId === note.subjectId) ||
          (note.topicId && item.topicId === note.topicId) ||
          (note.collection && item.collection === note.collection) ||
          item.tags?.some((tag) => note.tags?.includes(tag)))
      );
    })
    .slice(0, 8);
  const words = note.body?.trim().split(/\s+/).filter(Boolean).length || 0;
  const recordLink = (item: Item) => (
    <button
      key={item.id}
      className="kn-related-link"
      onClick={() => navigate(routeFor(item), item.id)}
    >
      <span>
        <span className="kn-mini-kind">{item.kind}</span>
        <strong>{item.title || "Untitled"}</strong>
      </span>
      <ArrowUpRight size={15} />
    </button>
  );
  return (
    <article className="kn-note-workspace">
      <div className="kn-note-topbar">
        <div className="kn-save-status" role="status">
          <span
            className={cx(
              "kn-status-dot",
              Boolean(error) && "has-error",
              saving && "is-saving",
            )}
          />
          {readOnly
            ? "Read-only tab"
            : error
              ? "Could not save — check storage"
              : saving
                ? "Saving locally…"
                : "Saved on this device"}
        </div>
        <div className="kn-icon-actions">
          <Button
            variant="ghost"
            className={cx("icon-button", note.pinned && "is-active")}
            title={note.pinned ? "Unpin note" : "Pin note"}
            aria-label={note.pinned ? "Unpin note" : "Pin note"}
            aria-pressed={Boolean(note.pinned)}
            disabled={readOnly}
            onClick={() => change({ pinned: !note.pinned })}
          >
            <Pin size={16} />
          </Button>
          <Button
            variant="ghost"
            className={cx("icon-button", note.favorite && "is-active")}
            title={note.favorite ? "Remove from favorites" : "Favorite note"}
            aria-label={
              note.favorite ? "Remove from favorites" : "Favorite note"
            }
            aria-pressed={Boolean(note.favorite)}
            disabled={readOnly}
            onClick={() => change({ favorite: !note.favorite })}
          >
            <Heart size={16} />
          </Button>
          <Button
            variant="ghost"
            className="icon-button"
            title={note.archived ? "Restore note" : "Archive note"}
            aria-label={note.archived ? "Restore note" : "Archive note"}
            disabled={readOnly}
            onClick={onArchive}
          >
            {note.archived ? (
              <ArchiveRestore size={16} />
            ) : (
              <Archive size={16} />
            )}
          </Button>
          <Button
            variant="ghost"
            className="icon-button text-danger"
            title="Delete note"
            aria-label="Delete note"
            disabled={readOnly}
            onClick={onDelete}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      {note.archived && (
        <div className="kn-notice">
          <Archive size={15} /> This note is archived. Restore it to return it
          to your active notebooks.
        </div>
      )}
      <div className="kn-note-heading">
        <label className="kn-sr-only" htmlFor="kn-note-title">
          Note title
        </label>
        <input
          id="kn-note-title"
          className="kn-note-title"
          value={note.title}
          disabled={readOnly}
          onChange={(event) => change({ title: event.target.value })}
          onBlur={() => {
            if (!note.title.trim() && !readOnly)
              change({ title: "Untitled note" });
          }}
          placeholder="Untitled note"
          maxLength={240}
        />
        <p className="kn-note-meta">
          <span>Edited {formatDate(note.updatedAt)}</span>
          <span>·</span>
          <span>{words.toLocaleString()} words</span>
          <span>·</span>
          <span>
            {words ? Math.max(1, Math.ceil(words / 200)) : 0} min read
          </span>
        </p>
      </div>
      <fieldset disabled={readOnly} className="kn-fieldset kn-note-properties">
        <Field label="Notebook">
          <input
            value={note.notebook || ""}
            onChange={(event) => change({ notebook: event.target.value })}
            placeholder="Loose notes"
            list="kn-notebooks"
            maxLength={100}
          />
        </Field>
        <Field label="Collection">
          <input
            value={note.collection || ""}
            onChange={(event) => change({ collection: event.target.value })}
            placeholder="Add a collection"
            list="kn-collections"
            maxLength={100}
          />
        </Field>
        <Field label="Tags" hint="Separate with commas">
          <input
            value={tagText}
            onChange={(event) => {
              setTagText(event.target.value);
              change({
                tags: [
                  ...new Set(
                    event.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  ),
                ],
              });
            }}
            placeholder="ideas, revision"
            maxLength={500}
          />
        </Field>
        <datalist id="kn-notebooks">
          {sortedUnique(
            items
              .filter((item) => item.kind === "note")
              .map((item) => item.notebook),
          ).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="kn-collections">
          {sortedUnique(
            items
              .filter((item) => item.kind === "note")
              .map((item) => item.collection),
          ).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </fieldset>
      <div className="kn-editor-toolbar">
        <Tabs
          options={[
            { id: "edit", label: "Write" },
            { id: "split", label: "Split view" },
            { id: "preview", label: "Preview" },
          ]}
          value={view}
          onChange={setView}
        />
        <span className="kn-markdown-label">Markdown supported</span>
      </div>
      {view !== "preview" && (
        <div className="note-format-tools" aria-label="Markdown formatting">
          <Button
            variant="ghost"
            disabled={readOnly}
            title="Bold (⌘B / Ctrl B in editor)"
            onClick={() => insert("**", "**")}
          >
            Bold
          </Button>
          <Button
            variant="ghost"
            disabled={readOnly}
            title="Italic (⌘I / Ctrl I in editor)"
            onClick={() => insert("*", "*")}
          >
            Italic
          </Button>
          <Button
            variant="ghost"
            disabled={readOnly}
            onClick={() => insert("\n## ")}
          >
            Heading
          </Button>
          <Button
            variant="ghost"
            disabled={readOnly}
            onClick={() => insert("\n- [ ] ")}
          >
            Checklist
          </Button>
          <Button
            variant="ghost"
            disabled={readOnly}
            onClick={() => insert("\n```text\n", "\n```\n")}
          >
            Code block
          </Button>
        </div>
      )}
      <div
        className={cx("kn-markdown-workspace", view === "split" && "is-split")}
      >
        {view !== "preview" && (
          <div className="kn-write-pane">
            <label className="kn-sr-only" htmlFor="kn-note-body">
              Markdown note content
            </label>
            <textarea
              ref={editorRef}
              id="kn-note-body"
              maxLength={1000000}
              onKeyDown={(event) => {
                if (
                  (event.metaKey || event.ctrlKey) &&
                  ["b", "i"].includes(event.key.toLowerCase())
                ) {
                  event.preventDefault();
                  const mark = event.key.toLowerCase() === "b" ? "**" : "*";
                  insert(mark, mark);
                }
              }}
              value={note.body || ""}
              disabled={readOnly}
              onChange={(event) => change({ body: event.target.value })}
              placeholder="Start with a thought. Use # headings, **bold**, lists, and code blocks. Your changes save automatically."
              spellCheck
            />
          </div>
        )}
        {view !== "edit" && (
          <div className="kn-preview-pane" aria-label="Note preview">
            {note.body?.trim() ? (
              <Markdown>{note.body}</Markdown>
            ) : (
              <div className="kn-preview-empty">
                <NotebookPen size={28} />
                <p>Your ideas, beautifully connected.</p>
                <span>Write a little. Your preview will appear here.</span>
              </div>
            )}
          </div>
        )}
      </div>
      <details
        className="kn-note-connections"
        open={associations.length > 0 || backlinks.length > 0}
      >
        <summary>
          <Link2 size={15} /> Connections{" "}
          <span>{associations.length + backlinks.length}</span>
        </summary>
        <fieldset
          disabled={readOnly}
          className="kn-fieldset kn-association-grid"
        >
          {(
            [
              { key: "projectId", kind: "project", label: "Project" },
              { key: "taskId", kind: "task", label: "Task" },
              { key: "problemId", kind: "problem", label: "Coding problem" },
              { key: "cardId", kind: "card", label: "Flashcard" },
              { key: "subjectId", kind: "subject", label: "Subject" },
              { key: "topicId", kind: "topic", label: "Learning topic" },
              { key: "noteId", kind: "note", label: "Related note" },
            ] as const
          ).map(({ key, kind, label }) => (
            <Field key={key} label={label}>
              <select
                value={note[key] || ""}
                onChange={(event) => change({ [key]: event.target.value })}
              >
                <option value="">No {label.toLowerCase()}</option>
                {items
                  .filter((item) => item.kind === kind && item.id !== note.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </select>
            </Field>
          ))}
        </fieldset>
        <div className="kn-connections-grid">
          <section>
            <h3>
              Backlinks <Badge>{backlinks.length}</Badge>
            </h3>
            {backlinks.length ? (
              backlinks.map(recordLink)
            ) : (
              <p className="muted small">
                No backlinks yet. Link this note from another record or use{" "}
                <code>[note](#notes/{note.id})</code> in Markdown.
              </p>
            )}
          </section>
          <section>
            <h3>Related knowledge</h3>
            {related.length ? (
              related.map(recordLink)
            ) : (
              <p className="muted small">
                Shared tags, collections, and associations bring related ideas
                here.
              </p>
            )}
          </section>
        </div>
      </details>
    </article>
  );
}

export default function Notes({ recordId }: { recordId?: string }) {
  const { items, remove, update, readOnly, ready, notify, touch } = useStore();
  const [search, setSearch] = useState("");
  const [notebook, setNotebook] = useState("");
  const [collection, setCollection] = useState("");
  const [tag, setTag] = useState("");
  const [filter, setFilter] = useState("active");
  const [selectedId, setSelectedId] = useState(
    recordId === "new" ? "" : recordId || "",
  );
  const [creating, setCreating] = useState(recordId === "new");
  const [confirm, setConfirm] = useState<{
    id: string;
    action: "delete" | "archive";
  } | null>(null);
  useEffect(() => {
    if (recordId === "new") setCreating(true);
    else setSelectedId(recordId || "");
  }, [recordId]);
  const notes = useMemo(
    () => items.filter((item) => item.kind === "note"),
    [items],
  );
  const notebooks = sortedUnique(notes.map((note) => note.notebook));
  const collections = sortedUnique(notes.map((note) => note.collection));
  const tags = sortedUnique(notes.flatMap((note) => note.tags || []));
  const visible = useMemo(
    () =>
      notes
        .filter((note) => {
          const inView =
            filter === "archived"
              ? note.archived
              : !note.archived && (filter !== "favorites" || note.favorite);
          const haystack = [
            note.title,
            note.body,
            note.notebook,
            note.collection,
            ...(note.tags || []),
          ]
            .join(" ")
            .toLocaleLowerCase();
          return (
            inView &&
            (!notebook || note.notebook === notebook) &&
            (!collection || note.collection === collection) &&
            (!tag || note.tags?.includes(tag)) &&
            haystack.includes(search.toLocaleLowerCase())
          );
        })
        .sort(
          (a, b) =>
            Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
            b.updatedAt.localeCompare(a.updatedAt),
        ),
    [notes, filter, notebook, collection, tag, search],
  );
  const selected = selectedId
    ? notes.find((note) => note.id === selectedId)
    : visible[0];
  const open = (note: Item) => {
    setSelectedId(note.id);
    navigate("notes", note.id);
    if (!readOnly && ready) touch(note.id);
  };
  const closeCreate = () => {
    setCreating(false);
    if (window.location.hash === "#notes/new") navigate("notes");
  };
  const confirmAction = () => {
    if (!confirm) return;
    if (readOnly) {
      setConfirm(null);
      return notify(
        "This tab is read-only. Switch to the active editing tab.",
        "info",
      );
    }
    if (confirm.action === "delete") {
      remove(confirm.id);
      setSelectedId("");
      navigate("notes");
      notify("Note deleted.", "success");
    } else {
      update(confirm.id, { archived: true });
      notify("Note archived. Find it in Archive.", "success");
    }
    setConfirm(null);
  };
  return (
    <div className="knowledge-page notes-page">
      <PageHeader
        eyebrow="YOUR SECOND BRAIN"
        title="Notes & knowledge"
        description="Capture the idea. Make the connection. Keep it yours."
        actions={
          <Button
            variant="primary"
            disabled={readOnly || !ready}
            onClick={() => setCreating(true)}
          >
            <Plus size={16} /> New note
          </Button>
        }
      />
      {readOnly && (
        <div className="kn-notice" role="status">
          This tab is read-only. Your notes remain available to read and search.
        </div>
      )}
      <div className="kn-notes-layout">
        <aside className="kn-notes-sidebar" aria-label="Note navigation">
          <div className="kn-sidebar-heading">
            <BookOpen size={17} />
            <span>YOUR LIBRARY</span>
          </div>
          {[
            {
              id: "active",
              label: "All notes",
              icon: FileText,
              count: notes.filter((note) => !note.archived).length,
            },
            {
              id: "favorites",
              label: "Favorites",
              icon: Heart,
              count: notes.filter((note) => !note.archived && note.favorite)
                .length,
            },
            {
              id: "archived",
              label: "Archive",
              icon: Archive,
              count: notes.filter((note) => note.archived).length,
            },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              className={cx(
                "kn-sidebar-button",
                filter === id && !notebook && "is-active",
              )}
              onClick={() => {
                setFilter(id);
                setNotebook("");
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
              <small>{count}</small>
            </button>
          ))}
          <div className="kn-sidebar-heading kn-sidebar-section">
            <span>NOTEBOOKS</span>
            <Badge>{notebooks.length}</Badge>
          </div>
          {notebooks.length ? (
            notebooks.map((value) => (
              <button
                key={value}
                className={cx(
                  "kn-sidebar-button",
                  notebook === value && "is-active",
                )}
                onClick={() => {
                  setNotebook(notebook === value ? "" : value);
                  setFilter("active");
                }}
              >
                <Folder size={15} />
                <span>{value}</span>
                <small>
                  {
                    notes.filter(
                      (note) => note.notebook === value && !note.archived,
                    ).length
                  }
                </small>
              </button>
            ))
          ) : (
            <p className="kn-sidebar-hint">
              Add a notebook name inside any note to organize your ideas.
            </p>
          )}
          <div className="kn-sidebar-foot">
            <NotebookPen size={23} />
            <strong>A thought worth keeping.</strong>
            <p>
              All your notes live on this device. A little clarity, whenever you
              need it.
            </p>
          </div>
        </aside>
        <section className="kn-note-list-pane" aria-label="Notes list">
          <div className="kn-note-list-tools">
            <div className="kn-search">
              <Search size={16} />
              <input
                aria-label="Search notes"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your notes…"
              />
            </div>
            <div className="kn-filter-selects">
              <select
                aria-label="Filter notes by collection"
                value={collection}
                onChange={(event) => setCollection(event.target.value)}
              >
                <option value="">All collections</option>
                {collections.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
              <select
                aria-label="Filter notes by tag"
                value={tag}
                onChange={(event) => setTag(event.target.value)}
              >
                <option value="">All tags</option>
                {tags.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="kn-list-label">
              <span>
                {notebook ||
                  (filter === "favorites"
                    ? "Favorites"
                    : filter === "archived"
                      ? "Archive"
                      : "All notes")}
              </span>
              <span>{visible.length}</span>
            </div>
          </div>
          <div className="kn-note-list">
            {!ready ? (
              <p className="kn-list-empty">Loading your notes…</p>
            ) : visible.length ? (
              visible.map((note) => (
                <button
                  key={note.id}
                  className={cx(
                    "kn-note-row",
                    selected?.id === note.id && "is-selected",
                  )}
                  onClick={() => open(note)}
                >
                  <div className="kn-note-row-title">
                    <strong>{note.title || "Untitled note"}</strong>
                    <span>
                      {note.pinned && <Pin size={12} />}
                      {note.favorite && <Heart size={12} />}
                    </span>
                  </div>
                  <p>
                    {note.body
                      ?.replace(/[#*`>\[\]]/g, "")
                      .trim()
                      .slice(0, 140) || "A blank page. A fresh start."}
                  </p>
                  <div className="kn-note-row-meta">
                    <span>{formatDate(note.updatedAt)}</span>
                    {note.tags?.[0] && (
                      <span>
                        <Tags size={11} />
                        {note.tags[0]}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="kn-list-empty">
                <Search size={24} />
                <strong>
                  {notes.length
                    ? "No matching notes"
                    : "Your first idea starts here"}
                </strong>
                <p>
                  {notes.length
                    ? "Try another search or clear a filter."
                    : "Create a note or start with a thoughtful template."}
                </p>
                {(search || notebook || collection || tag) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearch("");
                      setNotebook("");
                      setCollection("");
                      setTag("");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>
        {selected ? (
          <NoteWorkspace
            key={selected.id}
            note={selected}
            onDelete={() => setConfirm({ id: selected.id, action: "delete" })}
            onArchive={() => {
              if (readOnly) return;
              if (selected.archived) update(selected.id, { archived: false });
              else setConfirm({ id: selected.id, action: "archive" });
            }}
          />
        ) : (
          <div className="kn-note-blank">
            <Empty
              icon={<NotebookPen size={32} />}
              title={selectedId ? "Note not found" : "A home for your thinking"}
              description={
                selectedId
                  ? "This note may have been deleted or belongs to another local workspace."
                  : "Start a note, find an idea, and connect what you know."
              }
              action={
                <Button
                  variant="primary"
                  disabled={readOnly || !ready}
                  onClick={() => setCreating(true)}
                >
                  <Plus size={16} /> Create a note
                </Button>
              }
            />
          </div>
        )}
      </div>
      {creating && (
        <NewNote notebook={notebook} onClose={closeCreate} onCreated={open} />
      )}
      {confirm && (
        <Confirm
          title={
            confirm.action === "delete"
              ? "Delete this note?"
              : "Archive this note?"
          }
          message={
            confirm.action === "delete"
              ? "This permanently removes the note from this device. Links to it will no longer open a note."
              : "The note moves out of your active notebooks. You can restore it from Archive at any time."
          }
          onClose={() => setConfirm(null)}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
}
