import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Circle,
  Clock3,
  FolderKanban,
  Link2,
  Pencil,
  Repeat2,
  Trash2,
} from "lucide-react";
import { Badge, Button } from "../components/ui";
import type { Item, Settings } from "../lib/types";
import {
  cx,
  formatDate,
  isDone,
  navigate,
  safeUrl,
  today,
  routeFor,
} from "../lib/utils";
import {
  linkedRoute,
  minutesLabel,
  scheduledDate,
  timeLabel,
} from "./planningHelpers";

export function usePlanningHash(page: string, supplied?: string) {
  const read = () => {
    const [route, id] = window.location.hash.replace(/^#\/?/, "").split("/");
    return route === page ? id || "" : "";
  };
  const [hash, setHash] = useState(read);
  useEffect(() => {
    const change = () => setHash(read());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, [page]);
  return supplied ?? hash;
}

export function SafeRecordLink({
  url,
  children,
}: {
  url?: string;
  children: ReactNode;
}) {
  const safe = safeUrl(url);
  if (!safe) return null;
  return (
    <a
      className="planning-safe-link"
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={13} aria-hidden="true" />
    </a>
  );
}

export function RecordLinks({ item, items }: { item: Item; items: Item[] }) {
  const ids = [
    item.projectId,
    item.subjectId,
    item.noteId,
    item.topicId,
    item.cardId,
  ];
  const linked = ids
    .map((id) => items.find((record) => record.id === id))
    .filter((record): record is Item => Boolean(record));
  if (!linked.length && !safeUrl(item.url)) return null;
  return (
    <div className="planning-record-links">
      {linked.map((record) => (
        <button
          key={record.id}
          type="button"
          className="planning-inline-link"
          onClick={() => navigate(routeFor(record), record.id)}
        >
          {record.kind === "project" ? (
            <FolderKanban size={12} aria-hidden="true" />
          ) : record.kind === "subject" ? (
            <BookOpen size={12} aria-hidden="true" />
          ) : (
            <Link2 size={12} aria-hidden="true" />
          )}
          {record.title}
        </button>
      ))}
      <SafeRecordLink url={item.url}>Reference</SafeRecordLink>
    </div>
  );
}

type PlanningRecordProps = {
  item: Item;
  items: Item[];
  settings: Settings;
  readOnly: boolean;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onComplete?: (item: Item) => void;
  compact?: boolean;
  conflict?: boolean;
  occurrenceDate?: string;
  hideLinks?: boolean;
};

export function PlanningRecord({
  item,
  items,
  settings,
  readOnly,
  onEdit,
  onDelete,
  onComplete,
  compact,
  conflict,
  occurrenceDate,
  hideLinks,
}: PlanningRecordProps) {
  const done = isDone(item);
  const date = occurrenceDate || scheduledDate(item);
  const overdue = item.kind === "task" && !done && !!date && date < today();
  return (
    <article
      className={cx(
        "planning-record",
        compact && "planning-record-compact",
        done && "planning-record-done",
        conflict && "planning-record-conflict",
      )}
    >
      <div className="planning-record-top">
        {item.kind === "task" && onComplete ? (
          <button
            className={cx("planning-check", done && "is-checked")}
            type="button"
            disabled={readOnly}
            onClick={() => onComplete(item)}
            aria-label={`${done ? "Mark incomplete" : "Complete"}: ${item.title}`}
            aria-pressed={done}
          >
            {done ? (
              <Check size={14} aria-hidden="true" />
            ) : (
              <Circle size={17} aria-hidden="true" />
            )}
          </button>
        ) : (
          <span
            className={cx(
              "planning-event-dot",
              item.category === "time-block" && "planning-block-dot",
            )}
            aria-hidden="true"
          />
        )}
        <button
          type="button"
          className="planning-record-title"
          onClick={() => onEdit(item)}
        >
          {item.title}
        </button>
        {!compact && (
          <div className="planning-record-actions">
            <Button
              variant="ghost"
              aria-label={`Edit ${item.title}`}
              onClick={() => onEdit(item)}
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              disabled={readOnly}
              aria-label={`Delete ${item.title}`}
              onClick={() => onDelete(item)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </div>
      <div className="planning-record-meta">
        {item.startTime && (
          <span className="mono">
            <Clock3 size={11} aria-hidden="true" />
            {timeLabel(item.startTime, settings.timeFormat)}
            {item.endTime
              ? ` – ${timeLabel(item.endTime, settings.timeFormat)}`
              : ""}
          </span>
        )}
        {!compact && date && !item.startTime && (
          <span className={overdue ? "text-danger" : ""}>
            {formatDate(date)}
            {overdue ? " · overdue" : ""}
          </span>
        )}
        {item.priority && (
          <span
            className={`planning-priority planning-priority-${item.priority.toLowerCase()}`}
          >
            <i aria-hidden="true" />
            {item.priority}
          </span>
        )}
        {item.recurrence && item.recurrence !== "none" && (
          <span
            title={
              item.kind === "event"
                ? "Editing changes the recurring series"
                : "The next task is created when this one is completed"
            }
          >
            <Repeat2 size={11} aria-hidden="true" />
            {compact ? "" : item.recurrence}
          </span>
        )}
        {conflict && <Badge tone="warning">Conflict</Badge>}
        {item.status === "cancelled" && <Badge>Cancelled</Badge>}
      </div>
      {!compact && item.description && (
        <p className="planning-record-description">{item.description}</p>
      )}
      {!compact &&
        (item.duration !== undefined || item.actualMinutes !== undefined) && (
          <div className="planning-record-effort">
            <span>
              Est. <b>{minutesLabel(item.duration || 0)}</b>
            </span>
            <span>
              Actual <b>{minutesLabel(item.actualMinutes || 0)}</b>
            </span>
          </div>
        )}
      {!compact && !hideLinks && <RecordLinks item={item} items={items} />}
    </article>
  );
}
