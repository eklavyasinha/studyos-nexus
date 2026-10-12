import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  ListChecks,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "./ui";
import {
  ASSISTANT_CAPABILITIES,
  ASSISTANT_EXAMPLES,
  ASSISTANT_LABEL,
  type AssistantExecution,
  buildProgressSummary,
  parseAssistantRequest,
  type AssistantAction,
} from "../lib/assistant";
import {
  snapshotChanged,
  verifyPersistedSnapshot,
} from "../lib/assistant-receipt";
import { useStore } from "../lib/store";
import { cx, formatDate, uid } from "../lib/utils";
import "./assistant.css";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  tone?: "info" | "error" | "success";
  details?: string[];
  actionId?: string;
  savedVerified?: boolean;
  view?: { label: string; href: string };
};

type BufferedNotification = {
  message: string;
  tone: "info" | "error" | "success";
};

function initialMessage(): ChatMessage {
  return {
    id: "assistant-welcome",
    role: "assistant",
    tone: "info",
    text: "I can read this local workspace and run a small, validated set of study actions. I do not answer arbitrary questions or call an external API.",
  };
}

function minutesLabel(minutes: number) {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded}m`;
  return `${Math.floor(rounded / 60)}h${rounded % 60 ? ` ${rounded % 60}m` : ""}`;
}

function Receipt({ message }: { message: ChatMessage }) {
  return (
    <div
      className={cx(
        "assistant-receipt",
        message.tone === "error" && "is-error",
      )}
    >
      <span className="assistant-receipt-icon" aria-hidden="true">
        {message.tone === "error" ? (
          <CircleAlert size={14} />
        ) : (
          <Check size={14} />
        )}
      </span>
      <div>
        <strong>
          {message.tone === "error"
            ? "Action needs attention"
            : message.savedVerified
              ? "Saved and verified"
              : "Result · no saved change"}
        </strong>
        <p>{message.text}</p>
        {message.details?.length ? (
          <ul>
            {message.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
        {message.view && (
          <a className="assistant-receipt-link" href={message.view.href}>
            {message.view.label}
          </a>
        )}
      </div>
    </div>
  );
}

function ProgressCard() {
  const store = useStore();
  const summary = buildProgressSummary(store.snapshot());
  const percentage = summary.taskTotal
    ? Math.round((summary.taskDone / summary.taskTotal) * 100)
    : 0;
  return (
    <section className="assistant-progress" aria-label="Local progress summary">
      <div className="assistant-section-heading">
        <span>
          <ListChecks size={15} /> Today from your data
        </span>
        <small>{formatDate(summary.date)}</small>
      </div>
      <div className="assistant-progress-grid">
        <div>
          <strong>
            {summary.taskDone}/{summary.taskTotal}
          </strong>
          <span>tasks complete</span>
        </div>
        <div>
          <strong>{minutesLabel(summary.focusedMinutes)}</strong>
          <span>focus logged</span>
        </div>
        <div>
          <strong>{summary.overdueTasks}</strong>
          <span>overdue pending</span>
        </div>
      </div>
      <div className="assistant-progress-track" aria-hidden="true">
        <span style={{ width: `${Math.min(100, percentage)}%` }} />
      </div>
      <p className="assistant-progress-caption">
        {summary.taskTotal
          ? `${percentage}% of today’s dated tasks complete.`
          : "No dated tasks are saved for today yet."}
      </p>
    </section>
  );
}

function CapabilitySection() {
  const { settings, widgets, sourceCodeBoundary } = ASSISTANT_CAPABILITIES;
  const widgetLabels = widgets.map((widget) => widget.label).join(", ");

  return (
    <section
      className="assistant-capabilities"
      aria-labelledby="assistant-capabilities-title"
    >
      <div className="assistant-section-heading">
        <h3 id="assistant-capabilities-title">
          <Sparkles size={15} aria-hidden="true" /> What this assistant can
          change
        </h3>
        <small>Local workspace only</small>
      </div>
      <div className="assistant-capability-grid">
        <details className="assistant-capability is-local">
          <summary className="assistant-capability-summary">
            <span>
              <Check size={14} aria-hidden="true" /> Apply in this panel
            </span>
            <small>Settings, widgets, tasks, notes, focus</small>
            <ChevronDown size={13} aria-hidden="true" />
          </summary>
          <p>
            Changes apply to saved local workspace data and settings; existing
            confirmations still apply when an action needs review.
          </p>
          <ul>
            <li>
              Theme ({settings.themes.join(", ")}), accent (
              {settings.accents.join(", ")}), density (
              {settings.densities.join(", ")}), and reduced motion (
              {settings.motion.join(", ")}).
            </li>
            <li>
              Daily goal ({settings.dailyGoalMinutes.min}–
              {settings.dailyGoalMinutes.max} min) and focus duration (
              {settings.focusDurationMinutes.min}–
              {settings.focusDurationMinutes.max} min).
            </li>
            <li>
              Dashboard widget visibility, size, and order ({widgetLabels}).
            </li>
            <li>
              Tasks and schedules: complete today’s Java tasks, reschedule or
              delete pending tasks, recover missed days, balance next week, or
              priority-sort.
            </li>
            <li>Add revision notes or sessions and start a focus session.</li>
          </ul>
          <p className="assistant-capability-help">
            Try: “Change theme to light”, “Hide the focus widget”, “Move the
            goals widget before agenda”, “Add a revision note about binary
            search”, or “Start a focus session for 25 minutes”.
          </p>
        </details>
        <div className="assistant-capability is-boundary" role="note">
          <h4>
            <CircleAlert size={14} aria-hidden="true" /> Source-code edits
          </h4>
          <p>{sourceCodeBoundary}</p>
        </div>
      </div>
    </section>
  );
}

function actionView(action: AssistantAction) {
  switch (action.id) {
    case "change-theme":
    case "change-accent":
    case "change-density":
    case "change-reduced-motion":
    case "change-daily-goal":
    case "change-focus-duration":
    case "set-widget-visibility":
    case "set-widget-size":
    case "move-widget":
      return { label: "View updated dashboard", href: "#dashboard" };
    case "start-focus":
      return { label: "View focus", href: "#focus" };
    case "add-revision":
      return action.args.kind === "note"
        ? { label: "View notes", href: "#notes" }
        : { label: "View focus", href: "#focus" };
    case "balance-next-week":
    case "recovery":
    case "replace-maths-with-dsa":
      return { label: "View schedule", href: "#schedule" };
    case "today-plan":
    case "progress-summary":
      return undefined;
    default:
      return { label: "View planner", href: "#planner" };
  }
}

function causeMessage(cause: unknown) {
  return cause instanceof Error
    ? cause.message
    : "The local action could not run.";
}

function actionFailureMessage(cause: unknown, changed: boolean) {
  const detail = causeMessage(cause);
  return changed
    ? `The action could not be completed. In-memory data may have changed; saved state was not verified. ${detail}`
    : `The action could not be completed. No saved change was verified. ${detail}`;
}

function persistenceFailureMessage(cause: unknown) {
  return `The action was not confirmed. In-memory data may have changed; saved state was not verified. ${causeMessage(cause)}`;
}

export default function StudyAssistant() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage()]);
  const [pending, setPending] = useState<AssistantAction | null>(null);
  const [error, setError] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const actionRunning = useRef(false);
  const assistantBusy = savingAction || store.saving;

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const focusInput = () => inputRef.current?.focus();
    requestAnimationFrame(focusInput);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      if (previousFocus.current?.isConnected)
        previousFocus.current.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (open)
      logRef.current?.scrollTo({
        top: logRef.current.scrollHeight,
        behavior:
          document.documentElement.dataset.motion === "reduce"
            ? "auto"
            : "smooth",
      });
  }, [messages, open]);

  const addMessage = (message: Omit<ChatMessage, "id">) =>
    setMessages((current) => [...current, { ...message, id: uid() }]);

  const publishNotifications = (
    notifications: BufferedNotification[],
    allowSuccess: boolean,
  ) => {
    for (const notification of notifications) {
      if (!allowSuccess && notification.tone === "success") continue;
      store.notify(notification.message, notification.tone);
    }
  };

  const runAction = async (action: AssistantAction) => {
    if (actionRunning.current || assistantBusy) return;
    actionRunning.current = true;
    setError("");
    const before = store.snapshot();
    let after = before;
    let result: AssistantExecution | null = null;
    let notifications: BufferedNotification[] = [];
    store.beginNotificationBuffer();
    try {
      try {
        result = action.execute(store);
        after = store.snapshot();
        notifications = store.endNotificationBuffer();
      } catch (cause) {
        after = store.snapshot();
        notifications = store.endNotificationBuffer();
        const message = actionFailureMessage(
          cause,
          snapshotChanged(before, after),
        );
        publishNotifications(notifications, false);
        setError(message);
        addMessage({
          role: "assistant",
          tone: "error",
          text: message,
          actionId: action.id,
        });
        return;
      }

      const changed = snapshotChanged(before, after);
      if (!changed) {
        publishNotifications(notifications, false);
        const text =
          (result.changed || 0) > 0
            ? "No saved change was detected, so this action was not reported as changed."
            : result.message;
        addMessage({
          role: "assistant",
          tone: result.ok ? "info" : "error",
          text,
          details: result.details,
          actionId: action.id,
        });
        if (!result.ok) setError(result.message);
        return;
      }

      setSavingAction(true);
      try {
        const persisted = await store.flushSaved();
        const verification = verifyPersistedSnapshot(before, after, persisted);
        if (!verification.verified)
          throw new Error(
            "The saved workspace did not match the action result.",
          );
        if (!result.ok) {
          publishNotifications(notifications, false);
          const message =
            "The action returned a blocked result after changing in-memory data; no success receipt was issued.";
          setError(message);
          addMessage({
            role: "assistant",
            tone: "error",
            text: message,
            details: result.details,
            actionId: action.id,
          });
          return;
        }
        publishNotifications(notifications, true);
        addMessage({
          role: "assistant",
          tone: "success",
          text: result.message,
          details: result.details,
          actionId: action.id,
          savedVerified: true,
          view: actionView(action),
        });
      } catch (cause) {
        publishNotifications(notifications, false);
        const message = persistenceFailureMessage(cause);
        setError(message);
        addMessage({
          role: "assistant",
          tone: "error",
          text: message,
          actionId: action.id,
        });
      }
    } finally {
      actionRunning.current = false;
      setSavingAction(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const submitPrompt = (value = input) => {
    if (assistantBusy || actionRunning.current) return;
    const text = value.trim();
    if (!text) {
      setError("Type a request or choose an example.");
      inputRef.current?.focus();
      return;
    }
    setInput("");
    setError("");
    setPending(null);
    addMessage({ role: "user", text });
    const parsed = parseAssistantRequest(text, store.snapshot());
    if (parsed.kind === "message") {
      setError(parsed.tone === "error" ? parsed.message : "");
      addMessage({
        role: "assistant",
        tone: parsed.tone,
        text: parsed.message,
      });
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (parsed.action.confirmation.required) {
      setPending(parsed.action);
      addMessage({
        role: "assistant",
        tone: "info",
        text:
          parsed.action.confirmation.message ||
          `I prepared “${parsed.action.label}”. Review it below before applying it.`,
      });
    } else void runAction(parsed.action);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const confirmPending = () => {
    if (!pending || assistantBusy || actionRunning.current) return;
    const action = pending;
    setPending(null);
    void runAction(action);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          className="assistant-launcher"
          type="button"
          aria-label="Open local study assistant"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <MessageCircle size={19} />
          <span>Study assistant</span>
        </button>
      )}
      {open && (
        <aside
          className="assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="assistant-title"
          aria-busy={assistantBusy}
        >
          <header className="assistant-header">
            <div className="assistant-title-wrap">
              <span className="assistant-icon" aria-hidden="true">
                <Bot size={18} />
              </span>
              <div>
                <h2 id="assistant-title">Local study assistant</h2>
                <p>{ASSISTANT_LABEL}</p>
              </div>
            </div>
            <button
              className="assistant-close"
              type="button"
              aria-label="Close study assistant"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
          </header>

          <div className="assistant-body">
            <div className="assistant-honesty" role="note">
              <ShieldCheck size={14} />
              <span>
                Runs on saved IndexedDB data only. No general LLM, external API,
                or arbitrary code execution.
              </span>
            </div>
            {store.readOnly && store.ready && (
              <div className="assistant-readonly" role="status">
                <CircleAlert size={14} /> Read-only tab: I can show summaries,
                but changes must run from the active editing tab.
              </div>
            )}
            {!store.ready && (
              <div className="assistant-readonly" role="status">
                <Clock3 size={14} /> Opening your local workspace…
              </div>
            )}
            {error && (
              <div className="assistant-error" role="alert">
                <CircleAlert size={14} /> {error}
              </div>
            )}
            {assistantBusy && (
              <div
                className="assistant-saving"
                role="status"
                aria-live="polite"
              >
                <Clock3 size={14} />
                {savingAction
                  ? "Saving this local change and verifying it…"
                  : "Saving the local workspace…"}
              </div>
            )}
            <ProgressCard />
            <CapabilitySection />

            <div className="assistant-examples">
              <div className="assistant-section-heading">
                <span>
                  <Sparkles size={15} /> Try a supported request
                </span>
                <small>Exact local actions</small>
              </div>
              <div className="assistant-example-list">
                {ASSISTANT_EXAMPLES.map((example) => (
                  <button
                    type="button"
                    key={example}
                    onClick={() => submitPrompt(example)}
                    disabled={!store.ready || assistantBusy}
                  >
                    {example}
                    <ChevronDown size={13} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            <div
              className="assistant-log"
              ref={logRef}
              role="log"
              aria-live="polite"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cx("assistant-message", `is-${message.role}`)}
                >
                  {message.role === "assistant" && message.actionId ? (
                    <Receipt message={message} />
                  ) : (
                    <p>{message.text}</p>
                  )}
                </div>
              ))}
            </div>

            {pending && (
              <section
                className="assistant-confirm"
                aria-label="Pending action confirmation"
              >
                <div>
                  <span className="assistant-confirm-label">
                    Review before applying
                  </span>
                  <strong>{pending.label}</strong>
                  <p>{pending.confirmation.message}</p>
                </div>
                <div className="assistant-confirm-actions">
                  <Button
                    variant="ghost"
                    disabled={assistantBusy}
                    onClick={() => {
                      setPending(null);
                      addMessage({
                        role: "assistant",
                        tone: "info",
                        text: "Action cancelled. No saved data changed.",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!store.ready || store.readOnly || assistantBusy}
                    onClick={confirmPending}
                  >
                    <Check size={15} /> Confirm action
                  </Button>
                </div>
              </section>
            )}
          </div>

          <form
            className="assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              submitPrompt();
            }}
          >
            <label className="assistant-sr-only" htmlFor="assistant-input">
              Ask the local study assistant
            </label>
            <input
              ref={inputRef}
              id="assistant-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Try: reschedule Java arrays tomorrow"
              autoComplete="off"
              maxLength={500}
              disabled={!store.ready || assistantBusy}
            />
            <Button
              type="submit"
              variant="primary"
              className="assistant-send"
              aria-label="Send request"
              disabled={!store.ready || assistantBusy || !input.trim()}
            >
              <Send size={16} />
            </Button>
          </form>
          <p className="assistant-footer-note">
            <ShieldCheck size={12} /> Changes are reported as saved only after
            local persistence is verified.
          </p>
        </aside>
      )}
    </>
  );
}
