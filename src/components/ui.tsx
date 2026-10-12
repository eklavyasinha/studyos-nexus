import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowRight,
  Check,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useStore } from "../lib/store";
import type { Item, Kind } from "../lib/types";
import { cx, formatDate, navigate, safeUrl } from "../lib/utils";
import { validDay } from "../lib/logic";
import { progressionError } from "../lib/readiness";

export function Button({
  variant = "secondary",
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      type={type}
      className={cx("button", `button-${variant}`, className)}
      {...props}
    >
      {children}
    </button>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
export function Panel({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cx("panel", className)}>
      {(title || action) && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Empty({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon || <FileText size={23} />}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const array = Children.toArray(children);
  const first = array[0];
  const isControl =
    isValidElement(first) &&
    typeof first.type === "string" &&
    ["input", "select", "textarea"].includes(first.type);
  const node = isControl
    ? (first as ReactElement<{ id?: string; "aria-describedby"?: string }>)
    : null;
  const controlId = node?.props.id || id;
  return (
    <div className="field">
      <label htmlFor={isControl ? controlId : undefined}>{label}</label>
      {node
        ? array.map((c, i) =>
            i === 0
              ? cloneElement(node, {
                  id: controlId,
                  ...(hint ? { "aria-describedby": `${id}-hint` } : {}),
                })
              : c,
          )
        : children}
      {hint && (
        <small id={`${id}-hint`} className="field-hint">
          {hint}
        </small>
      )}
    </div>
  );
}
export function Tabs({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      className="tabs"
      role="tablist"
      ref={ref}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const n = options.findIndex((i) => i.id === value);
        const i =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? options.length - 1
              : (n + (event.key === "ArrowRight" ? 1 : -1) + options.length) %
                options.length;
        onChange(options[i].id);
        (ref.current?.children[i] as HTMLButtonElement)?.focus();
      }}
    >
      {options.map((option) => (
        <button
          type="button"
          role="tab"
          aria-selected={value === option.id}
          tabIndex={value === option.id ? 0 : -1}
          key={option.id}
          className={cx("tab", value === option.id && "is-active")}
          onClick={() => onChange(option.id)}
        >
          {option.label}
          {option.count !== undefined && <span>{option.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Progress({ value, label }: { value: number; label?: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label || "Progress"}
      aria-valuenow={Math.round(Math.min(100, Math.max(0, value)))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="stat">
      <div className="stat-label">
        {label}
        {icon}
      </div>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          input: ({ checked }) => (
            <input
              type="checkbox"
              checked={Boolean(checked)}
              disabled
              aria-label={
                checked
                  ? "Completed checklist item"
                  : "Incomplete checklist item"
              }
            />
          ),
          a: ({ href, children }) =>
            href?.startsWith("#") ? (
              <a href={href}>{children}</a>
            ) : safeUrl(href) ? (
              <a
                href={safeUrl(href)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ src, alt }) =>
            safeUrl(typeof src === "string" ? src : undefined) ? (
              <a
                href={safeUrl(String(src))!}
                target="_blank"
                rel="noopener noreferrer"
              >
                [Image: {alt || "open external image"}]
              </a>
            ) : (
              <span>[{alt || "Image not loaded"}]</span>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

const modalStack: string[] = [];
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const id = useId(),
    ref = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    modalStack.push(id);
    document.body.style.overflow = "hidden";
    if (!ref.current?.contains(document.activeElement)) {
      const target =
        ref.current?.querySelector<HTMLElement>(
          "input:not(:disabled),textarea:not(:disabled),select:not(:disabled)",
        ) || ref.current?.querySelector<HTMLElement>("button:not(:disabled)");
      target?.focus();
    }
    const key = (e: KeyboardEvent) => {
      if (modalStack.at(-1) !== id) return;
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        close.current();
      }
      if (e.key === "Tab") {
        const controls = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',
          ) || [],
        ).filter((el) => el.getClientRects().length > 0);
        const first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      modalStack.splice(modalStack.indexOf(id), 1);
      if (!modalStack.length) document.body.style.overflow = "";
      document.removeEventListener("keydown", key, true);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
      else
        document
          .querySelector<HTMLElement>("main")
          ?.focus({ preventScroll: true });
    };
  }, [id]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && modalStack.at(-1) === id) onClose();
      }}
    >
      <div
        className={cx("modal", wide && "modal-wide")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        ref={ref}
        tabIndex={-1}
      >
        <header className="modal-heading">
          <h2 id={`${id}-title`}>{title}</h2>
          <Button
            className="icon-button"
            variant="ghost"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </Button>
        </header>
        <div className="modal-content">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}
export function Confirm({
  title,
  message,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="confirm-message">{message}</p>
      <div className="modal-actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </Modal>
  );
}

export type FieldDef = {
  key: keyof Item;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "time"
    | "select"
    | "url"
    | "tags"
    | "checkbox"
    | "code";
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  full?: boolean;
};
export function ItemEditor({
  kind,
  initial = {},
  fields,
  onClose,
  onSaved,
  title,
  allowDelete = false,
}: {
  kind: Kind;
  initial?: Partial<Item>;
  fields: FieldDef[];
  onClose: () => void;
  onSaved?: (item: Item) => void;
  title?: string;
  allowDelete?: boolean;
}) {
  const store = useStore();
  const [deleting, setDeleting] = useState(false);
  const allowUnlinked = (f: FieldDef) =>
    !f.required && (f.key.endsWith("Id") || f.key === "collection");
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
      const v: Record<string, string | boolean> = {
        title: initial.title || "",
      };
      for (const f of fields) {
        const value = initial[f.key];
        v[f.key] =
          f.type === "checkbox"
            ? Boolean(value)
            : Array.isArray(value)
              ? value.join(", ")
              : value !== undefined
                ? String(value)
                : f.type === "select"
                  ? allowUnlinked(f)
                    ? ""
                    : f.options?.[0]?.value || ""
                  : "";
      }
      return v;
    }),
    [error, setError] = useState("");
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (store.readOnly) return;
    setError("");
    try {
      const data: Partial<Item> = {
        ...initial,
        title: String(values.title).trim(),
      };
      if (!data.title) throw new Error("Give this record a title.");
      if (data.title.length > 240)
        throw new Error("Keep the title under 240 characters.");
      for (const f of fields) {
        const value = values[f.key];
        if (f.required && (value === "" || value === undefined))
          throw new Error(`${f.label} is required.`);
        let parsed: unknown = value;
        if (f.type === "number") {
          parsed = value === "" ? undefined : Number(value);
          if (
            parsed !== undefined &&
            [
              "attempts",
              "rank",
              "attempted",
              "solved",
              "order",
              "attended",
              "total",
              "interruptions",
            ].includes(f.key) &&
            !Number.isInteger(parsed)
          )
            throw new Error(`${f.label}: use a whole number.`);
          if (
            parsed !== undefined &&
            (!Number.isFinite(parsed) ||
              Number(parsed) < (f.min ?? 0) ||
              (f.max !== undefined && Number(parsed) > f.max))
          )
            throw new Error(
              `${f.label}: enter a number from ${f.min ?? 0}${f.max !== undefined ? ` to ${f.max}` : " or greater"}.`,
            );
        } else if (f.type === "tags")
          parsed = [
            ...new Set(
              String(value || "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            ),
          ];
        else if (f.type === "url" && value && !safeUrl(String(value)))
          throw new Error(`${f.label} must start with https:// or http://.`);
        else if (f.type === "date" && value && !validDay(String(value)))
          throw new Error(`${f.label} needs a valid date.`);
        (data as Record<string, unknown>)[f.key] = parsed;
      }
      if (
        data.attended !== undefined &&
        data.total !== undefined &&
        data.attended > data.total
      )
        throw new Error("Attended classes cannot exceed total classes.");
      if (
        data.marks !== undefined &&
        data.maxMarks !== undefined &&
        data.marks > data.maxMarks
      )
        throw new Error("Marks cannot exceed maximum marks.");
      if (
        data.solved !== undefined &&
        data.attempted !== undefined &&
        data.solved > data.attempted
      )
        throw new Error("Solved problems cannot exceed attempted problems.");
      if (
        data.startTime &&
        data.endTime &&
        ["task", "event", "exam"].includes(kind) &&
        data.endTime <= data.startTime
      )
        throw new Error(
          "End time must be after start time. Use a separate block for the next day.",
        );
      if (data.startDate && data.targetDate && data.targetDate < data.startDate)
        throw new Error("Target date cannot be before the start date.");
      if (
        data.status !== initial.status &&
        ((kind === "task" &&
          ["done", "completed"].includes(data.status || "")) ||
          (kind === "topic" &&
            [
              "learning",
              "practicing",
              "revising",
              "completed",
              "mastered",
            ].includes(data.status || "")))
      ) {
        const warning = progressionError(data, store.items);
        if (warning) throw new Error(warning);
      }
      if (
        initial.id &&
        initial.dueDate &&
        data.dueDate &&
        data.dueDate > initial.dueDate
      )
        data.postponed = (initial.postponed || 0) + 1;
      let item: Item;
      if (initial.id) {
        store.update(initial.id, data);
        item = { ...initial, ...data } as Item;
      } else item = store.create(kind, data);
      store.notify(
        initial.id
          ? "Changes saved."
          : `${kind.charAt(0).toUpperCase() + kind.slice(1)} created.`,
      );
      onSaved?.(item);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    }
  };
  return (
    <Modal
      title={title || `${initial.id ? "Edit" : "New"} ${kind}`}
      onClose={onClose}
      wide={fields.length > 4}
    >
      <form onSubmit={save} noValidate>
        <fieldset disabled={store.readOnly} className="editor-fieldset">
          <div className="form-grid">
            <div className="full-width">
              <Field label="Title">
                <input
                  autoFocus
                  value={String(values.title)}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, title: e.target.value }))
                  }
                  placeholder={`Name this ${kind}…`}
                  maxLength={240}
                  required
                />
              </Field>
            </div>
            {fields.map((f) => (
              <div key={f.key} className={cx(f.full && "full-width")}>
                <Field label={f.label + (f.required ? " *" : "")}>
                  {f.type === "select" ? (
                    <select
                      value={String(values[f.key] ?? "")}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.key]: e.target.value }))
                      }
                    >
                      {allowUnlinked(f) &&
                        !f.options?.some((o) => o.value === "") && (
                          <option value="">No association</option>
                        )}
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" || f.type === "code" ? (
                    <textarea
                      className={f.type === "code" ? "code-input" : ""}
                      rows={f.type === "code" ? 7 : 4}
                      maxLength={1000000}
                      value={String(values[f.key] ?? "")}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.key]: e.target.value }))
                      }
                    />
                  ) : f.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      checked={Boolean(values[f.key])}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.key]: e.target.checked }))
                      }
                    />
                  ) : (
                    <input
                      type={f.type === "tags" ? "text" : f.type || "text"}
                      value={String(values[f.key] ?? "")}
                      min={f.min ?? (f.type === "number" ? 0 : undefined)}
                      max={f.max}
                      step={f.type === "number" ? "any" : undefined}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.key]: e.target.value }))
                      }
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
        </fieldset>
        {store.readOnly && <p className="muted">This tab is read-only.</p>}
        <div className="modal-actions">
          {allowDelete && initial.id && (
            <Button
              variant="danger"
              disabled={store.readOnly}
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={14} />
              Delete {kind}
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={store.readOnly}>
            <Check size={16} />
            {initial.id ? "Save changes" : `Create ${kind}`}
          </Button>
        </div>
      </form>
      {deleting && initial.id && (
        <Confirm
          title={`Delete ${kind}?`}
          message={`“${initial.title}” will be removed. Other records will be kept.`}
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            store.remove(initial.id!);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

export function RecordManager({
  kind,
  title,
  description,
  fields,
  filter,
  defaults = {},
  statuses,
  empty,
}: {
  kind: Kind;
  title: string;
  description?: string;
  fields: FieldDef[];
  filter?: (item: Item) => boolean;
  defaults?: Partial<Item>;
  statuses?: string[];
  empty?: string;
}) {
  const { items, remove, readOnly, touch, ready } = useStore();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [editor, setEditor] = useState<Partial<Item> | null>(null),
    [deleting, setDeleting] = useState<Item | null>(null);
  const seen = useRef("");
  useEffect(() => {
    const check = () => {
      const id = window.location.hash.split("/")[1] || "";
      if (!id) {
        seen.current = "";
        return;
      }
      if (id === seen.current) return;
      const item = items.find(
        (i) => i.id === id && i.kind === kind && (!filter || filter(i)),
      );
      if (item) {
        seen.current = id;
        setEditor(item);
        touch(id);
      }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [items, kind, filter, touch]);
  const records = items.filter(
    (i) => i.kind === kind && (!filter || filter(i)),
  );
  const visible = records
    .filter(
      (i) =>
        (!status || i.status === status) &&
        [i.title, i.body, i.description, i.category, ...(i.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const close = () => {
    setEditor(null);
    if (window.location.hash.split("/")[1] === seen.current)
      navigate(window.location.hash.slice(1).split("/")[0]);
  };
  return (
    <div className="record-manager">
      <div className="row-between record-manager-heading">
        <div>
          <h2>{title}</h2>
          {description && <p className="muted small">{description}</p>}
        </div>
        <Button
          variant="primary"
          onClick={() => setEditor({ ...defaults })}
          disabled={readOnly || !ready}
        >
          <Plus size={15} />
          New {kind}
        </Button>
      </div>
      <div className="toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label={`Search ${title.toLowerCase()}`}
            placeholder={`Search ${title.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {statuses && (
          <select
            aria-label={`Filter ${kind} status`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
        <span className="muted small">{visible.length} records</span>
      </div>
      {visible.length ? (
        <div className="record-list">
          {visible.map((item) => (
            <article className="list-row" key={item.id}>
              <button
                className="record-main"
                onClick={() => {
                  setEditor(item);
                  touch(item.id);
                }}
              >
                <span className="record-title">{item.title}</span>
                <span className="muted small">
                  {[
                    item.category,
                    item.subjectId &&
                      items.find((i) => i.id === item.subjectId)?.title,
                    item.date && formatDate(item.date),
                    item.dueDate && `Due ${formatDate(item.dueDate)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || formatDate(item.updatedAt)}
                  {item.tags?.length ? ` · ${item.tags.join(", ")}` : ""}
                </span>
              </button>
              {item.status && (
                <Badge
                  tone={
                    ["done", "completed", "mastered", "solved"].includes(
                      item.status,
                    )
                      ? "success"
                      : "neutral"
                  }
                >
                  {item.status}
                </Badge>
              )}
              <Button
                className="icon-button"
                variant="ghost"
                aria-label={`Open ${item.title}`}
                onClick={() => {
                  setEditor(item);
                  touch(item.id);
                }}
              >
                <ArrowRight size={16} />
              </Button>
              <Button
                className="icon-button"
                variant="ghost"
                aria-label={`Delete ${item.title}`}
                disabled={readOnly}
                onClick={() => setDeleting(item)}
              >
                <Trash2 size={15} />
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={
            records.length
              ? "Nothing matches just yet"
              : empty || `Your ${title.toLowerCase()} start here`
          }
          description={
            records.length
              ? "Try a different search or filter."
              : `Add your first ${kind}. Your data stays on this device.`
          }
          action={
            records.length ? (
              <Button
                onClick={() => {
                  setSearch("");
                  setStatus("");
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button
                disabled={readOnly}
                onClick={() => setEditor({ ...defaults })}
              >
                <Plus size={15} />
                Create {kind}
              </Button>
            )
          }
        />
      )}{" "}
      {editor && (
        <ItemEditor
          kind={kind}
          initial={editor}
          fields={fields}
          onClose={close}
        />
      )}{" "}
      {deleting && (
        <Confirm
          title={`Delete ${kind}?`}
          message={`“${deleting.title}” will be permanently removed. Other records are kept and their association to this record is cleared.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            remove(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
