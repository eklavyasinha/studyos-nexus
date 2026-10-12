import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  Database,
  Download,
  HardDrive,
  Info,
  Monitor,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Badge,
  Button,
  Confirm,
  Field,
  Modal,
  PageHeader,
  Panel,
  Tabs,
} from "../components/ui";
import { useStore } from "../lib/store";
import { DEFAULT_SETTINGS, type Snapshot } from "../lib/types";
import { parseBackup, serializeBackup } from "../lib/logic";
import { csv, download, navigate, today } from "../lib/utils";

export default function Settings({ recordId }: { recordId?: string }) {
  const store = useStore(),
    { settings, setSettings, items, readOnly, notify } = store;
  const [tab, setTab] = useState(
      ["data", "appearance", "preferences", "organize"].includes(recordId || "")
        ? recordId!
        : "appearance",
    ),
    [preview, setPreview] = useState<Snapshot | null>(null),
    [importMode, setImportMode] = useState<"merge" | "replace">("merge"),
    [busy, setBusy] = useState(false),
    [fileError, setFileError] = useState(""),
    [confirm, setConfirm] = useState<"import" | "recovery" | "layout" | null>(
      null,
    ),
    [resetOpen, setResetOpen] = useState(false),
    [resetText, setResetText] = useState(""),
    [storage, setStorage] = useState<{
      usage?: number;
      quota?: number;
      persisted?: boolean;
    }>({});
  const file = useRef<HTMLInputElement>(null),
    [categories, setCategories] = useState(settings.categories.join("\n")),
    [priorities, setPriorities] = useState(settings.priorities.join("\n")),
    [renameTag, setRenameTag] = useState(""),
    [newTag, setNewTag] = useState("");
  useEffect(() => {
    if (
      recordId &&
      ["data", "appearance", "preferences", "organize"].includes(recordId)
    )
      setTab(recordId);
  }, [recordId]);
  useEffect(() => {
    void (async () => {
      try {
        const estimate = await navigator.storage?.estimate();
        const persisted = await navigator.storage?.persisted();
        setStorage({ ...estimate, persisted });
      } catch {
        /* Browser may deny an estimate. */
      }
    })();
  }, [items.length]);
  const readFile = async (f: File | undefined) => {
    if (!f) return;
    setFileError("");
    setBusy(true);
    try {
      if (f.size > 30 * 1024 * 1024)
        throw new Error("Choose a JSON backup under 30 MB.");
      const incoming = parseBackup(await f.text());
      setPreview(incoming);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Unable to read backup.");
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };
  const perform = async (action: () => Promise<void>, message: string) => {
    setBusy(true);
    try {
      await action();
      notify(message);
      setPreview(null);
      setConfirm(null);
      setResetOpen(false);
      setResetText("");
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : "Action failed. Existing data is kept.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  const bytes = (n?: number) =>
    n === undefined ? "Unavailable" : `${(n / 1024 / 1024).toFixed(2)} MB`;
  return (
    <div className="stack settings-page">
      <PageHeader
        eyebrow="MAKE IT YOURS"
        title="Your space. Your rules."
        description="A few thoughtful defaults. Plenty of room to make yourself at home."
      />
      <Tabs
        options={[
          { id: "appearance", label: "Appearance" },
          { id: "preferences", label: "Study preferences" },
          { id: "organize", label: "Organization" },
          { id: "data", label: "Data & backups" },
        ]}
        value={tab}
        onChange={(t) => {
          setTab(t);
          navigate("settings", t);
        }}
      />
      {tab === "appearance" && (
        <>
          <Panel
            title="A comfortable place to think"
            action={<Badge>Personal workspace</Badge>}
          >
            <fieldset disabled={readOnly} className="editor-fieldset stack">
              <Field label="Appearance">
                <div className="theme-options">
                  {[
                    {
                      id: "dark",
                      label: "After hours",
                      subtitle: "Dark",
                      icon: Moon,
                    },
                    {
                      id: "light",
                      label: "Morning light",
                      subtitle: "Light",
                      icon: Sun,
                    },
                    {
                      id: "system",
                      label: "Your rhythm",
                      subtitle: "Follow system",
                      icon: Monitor,
                    },
                  ].map(({ id, label, subtitle, icon: Icon }) => (
                    <button
                      className={`theme-option ${id} ${settings.theme === id ? "selected" : ""}`}
                      key={id}
                      aria-pressed={settings.theme === id}
                      onClick={() =>
                        setSettings({ theme: id as typeof settings.theme })
                      }
                    >
                      <div className="theme-preview">
                        <span />
                        <div>
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                      <span>
                        <Icon size={15} />
                        <strong>{label}</strong>
                        {settings.theme === id && <Check size={15} />}
                      </span>
                      <small>{subtitle}</small>
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid-2">
                <Field label="Accent color">
                  <div className="accent-options">
                    {(["lime", "blue", "violet"] as const).map((accent) => (
                      <button
                        key={accent}
                        className={`accent-swatch ${accent}`}
                        aria-label={`${accent} accent`}
                        aria-pressed={settings.accent === accent}
                        onClick={() => setSettings({ accent })}
                      >
                        {settings.accent === accent && <Check size={16} />}
                        <span>{accent}</span>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Workspace density">
                  <select
                    value={settings.density}
                    onChange={(e) =>
                      setSettings({
                        density: e.target.value as "comfortable" | "compact",
                      })
                    }
                  >
                    <option value="comfortable">
                      Comfortable · room to think
                    </option>
                    <option value="compact">Compact · more in view</option>
                  </select>
                </Field>
              </div>
              <label className="setting-toggle">
                <div>
                  <strong>Reduce motion</strong>
                  <p>
                    Use fewer transitions. Your system’s reduced-motion
                    preference is always respected.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(e) =>
                    setSettings({ reducedMotion: e.target.checked })
                  }
                />
              </label>
            </fieldset>
          </Panel>
          <Panel title="Your command center">
            <div className="setting-row">
              <div>
                <strong>Dashboard widgets</strong>
                <p>
                  Reorder, resize, and hide widgets from the dashboard’s
                  Customize menu.
                </p>
              </div>
              <Button onClick={() => navigate("dashboard")}>
                Open dashboard <ArrowRight size={15} />
              </Button>
            </div>
            <div className="setting-row">
              <div>
                <strong>Reset dashboard layout</strong>
                <p>
                  Bring back the default widget order and visibility. Your
                  records are not affected.
                </p>
              </div>
              <Button disabled={readOnly} onClick={() => setConfirm("layout")}>
                <RotateCcw size={15} />
                Reset layout
              </Button>
            </div>
          </Panel>
        </>
      )}
      {tab === "preferences" && (
        <Panel title="Find a sustainable rhythm">
          <fieldset className="editor-fieldset stack" disabled={readOnly}>
            <div className="grid-2">
              <Field label="What should we call you?">
                <input
                  value={settings.name}
                  maxLength={60}
                  onChange={(e) => setSettings({ name: e.target.value })}
                  placeholder="Your first name"
                />
              </Field>
              <Field label="Daily focus goal (minutes)">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  defaultValue={settings.dailyGoal}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 1 && n <= 1440)
                      setSettings({ dailyGoal: n });
                    else {
                      e.target.value = String(settings.dailyGoal);
                      notify(
                        "Choose a daily goal between 1 and 1440 minutes.",
                        "error",
                      );
                    }
                  }}
                />
              </Field>
            </div>
            <div className="grid-3">
              {[
                { key: "focusMinutes", label: "Focus block" },
                { key: "shortBreak", label: "Short break" },
                { key: "longBreak", label: "Long break" },
              ].map(({ key, label }) => (
                <Field key={key} label={`${label} (minutes)`}>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    defaultValue={settings[key as "focusMinutes"]}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isInteger(n) && n >= 1 && n <= 180)
                        setSettings({ [key]: n });
                      else {
                        e.target.value = String(
                          settings[key as "focusMinutes"],
                        );
                        notify(
                          "Durations must be whole minutes from 1 to 180.",
                          "error",
                        );
                      }
                    }}
                  />
                </Field>
              ))}
            </div>
            <div className="grid-3">
              <Field label="Week starts on">
                <select
                  value={settings.weekStart}
                  onChange={(e) =>
                    setSettings({ weekStart: Number(e.target.value) })
                  }
                >
                  {[
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date format">
                <select
                  value={settings.dateFormat}
                  onChange={(e) =>
                    setSettings({
                      dateFormat: e.target.value as "short" | "long",
                    })
                  }
                >
                  <option value="short">3 Oct · concise</option>
                  <option value="long">3 October · long month</option>
                </select>
              </Field>
              <Field label="Time format">
                <select
                  value={settings.timeFormat}
                  onChange={(e) =>
                    setSettings({ timeFormat: e.target.value as "12" | "24" })
                  }
                >
                  <option value="24">24-hour · 14:30</option>
                  <option value="12">12-hour · 2:30 pm</option>
                </select>
              </Field>
            </div>
            <p className="info-line">
              <Info size={14} />
              All calendar dates use your device’s local timezone. Duration
              changes apply to your next block.
            </p>
          </fieldset>
        </Panel>
      )}
      {tab === "organize" && (
        <>
          <Panel title="Keep your own vocabulary">
            <fieldset className="editor-fieldset stack" disabled={readOnly}>
              <div className="grid-2">
                <Field
                  label="Task categories"
                  hint="One per line. Existing records keep their previous labels."
                >
                  <textarea
                    rows={6}
                    value={categories}
                    onChange={(e) => setCategories(e.target.value)}
                  />
                </Field>
                <Field
                  label="Priorities"
                  hint="One per line. High, Medium, and Low work well."
                >
                  <textarea
                    rows={6}
                    value={priorities}
                    onChange={(e) => setPriorities(e.target.value)}
                  />
                </Field>
              </div>
              <div>
                <Button
                  variant="primary"
                  onClick={() => {
                    const parse = (s: string) => [
                      ...new Set(
                        s
                          .split("\n")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      ),
                    ];
                    const c = parse(categories),
                      p = parse(priorities);
                    if (
                      !c.length ||
                      !p.length ||
                      c.length > 30 ||
                      p.length > 15 ||
                      [...c, ...p].some((v) => v.length > 80)
                    )
                      return notify(
                        "Use 1–30 categories and 1–15 priorities, each under 80 characters.",
                        "error",
                      );
                    setSettings({ categories: c, priorities: p });
                    notify("Organization preferences saved.");
                  }}
                >
                  Save labels
                  <Check size={15} />
                </Button>
              </div>
            </fieldset>
          </Panel>
          <Panel title="Bring related ideas together">
            <div className="grid-2">
              <Field label="Existing tag">
                <select
                  value={renameTag}
                  onChange={(e) => setRenameTag(e.target.value)}
                >
                  <option value="">Choose a tag</option>
                  {[...new Set(items.flatMap((i) => i.tags || []))]
                    .sort()
                    .map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                </select>
              </Field>
              <Field label="Rename to">
                <input
                  value={newTag}
                  maxLength={100}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="A clearer name"
                />
              </Field>
            </div>
            <Button
              disabled={readOnly || !renameTag || !newTag.trim()}
              onClick={() => {
                items
                  .filter((i) => i.tags?.includes(renameTag))
                  .forEach((i) =>
                    store.update(i.id, {
                      tags: [
                        ...new Set(
                          i.tags!.map((t) =>
                            t === renameTag ? newTag.trim() : t,
                          ),
                        ),
                      ],
                    }),
                  );
                setRenameTag("");
                setNewTag("");
                notify("Tag updated across linked records.");
              }}
            >
              Rename tag everywhere
            </Button>
          </Panel>
          <Panel title="Shape your learning">
            <div className="setting-row">
              <div>
                <strong>Subjects and curricula</strong>
                <p>
                  Add, edit, and reorder topics inside their learning workspace.
                  Nothing is marked learned for you.
                </p>
              </div>
              <Button onClick={() => navigate("college")}>
                Manage subjects
                <ArrowRight size={15} />
              </Button>
            </div>
            <div className="row">
              {["java", "dsa", "competitive", "web"].map((route) => (
                <Button key={route} onClick={() => navigate(route)}>
                  {
                    (
                      {
                        java: "Java",
                        dsa: "DSA",
                        competitive: "Competitive",
                        web: "Web development",
                      } as Record<string, string>
                    )[route]
                  }
                  <ArrowRight size={13} />
                </Button>
              ))}
            </div>
          </Panel>
        </>
      )}
      {tab === "data" && (
        <>
          <div className="data-ownership">
            <div className="ownership-icon">
              <ShieldCheck size={29} />
            </div>
            <div>
              <span className="eyebrow">
                LOCAL BY DESIGN. YOURS BY DEFAULT.
              </span>
              <h2>Your knowledge isn’t our business model.</h2>
              <p>
                No account. No analytics. No cloud copy. Your workspace lives in
                this browser, on this device.
              </p>
            </div>
            <Badge tone="success">100% local data</Badge>
          </div>
          <div className="grid-2">
            <Panel title="Take a copy with you" action={<Download size={18} />}>
              <p className="muted">
                Export your complete workspace, preferences, links, and review
                history as a versioned JSON file.
              </p>
              <div className="backup-summary">
                <strong>{items.length.toLocaleString()}</strong>
                <span>records in your workspace</span>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  download(
                    `studyos-nexus-${today()}.json`,
                    serializeBackup(store.snapshot()),
                  );
                  notify(
                    "Backup download started. Keep a copy outside browser storage.",
                  );
                }}
              >
                <ArrowDownToLine size={16} />
                Export complete backup
              </Button>
              <p className="small muted">
                Keep backups somewhere safe. They include the personal content
                you’ve entered.
              </p>
            </Panel>
            <Panel
              title="Pick up where you left off"
              action={<Upload size={18} />}
            >
              <p className="muted">
                Choose a StudyOS Nexus backup. You’ll review its contents before
                anything changes.
              </p>
              <input
                ref={file}
                type="file"
                accept=".json,application/json"
                className="file-input-hidden"
                aria-label="Choose backup file"
                onChange={(e) => void readFile(e.target.files?.[0])}
              />
              <button
                disabled={readOnly || busy}
                className="import-drop"
                onClick={() => file.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!readOnly && !busy)
                    void readFile(e.dataTransfer.files[0]);
                }}
              >
                <Upload size={23} />
                <strong>
                  {busy ? "Validating…" : "Choose or drop a JSON backup"}
                </strong>
                <span>Validated locally · up to 30 MB</span>
              </button>
              {fileError && (
                <p className="form-error" role="alert">
                  {fileError} Your existing data has not changed.
                </p>
              )}
            </Panel>
          </div>
          <Panel title="Useful, portable tables">
            <p className="muted small">
              CSV exports are for analysis in a spreadsheet. Use a JSON backup
              to restore the app.
            </p>
            <div className="row">
              {(["task", "problem", "session"] as const).map((kind) => (
                <Button
                  key={kind}
                  onClick={() =>
                    download(
                      `studyos-${kind}s-${today()}.csv`,
                      csv(
                        items.filter((i) => i.kind === kind),
                        kind === "task"
                          ? [
                              "title",
                              "status",
                              "priority",
                              "category",
                              "dueDate",
                              "originalDate",
                              "rescheduleCount",
                              "course",
                              "stage",
                              "startTime",
                              "endTime",
                              "completionCriteria",
                              "prerequisites",
                              "milestone",
                              "official",
                              "duration",
                              "actualMinutes",
                              "tags",
                            ]
                          : kind === "problem"
                            ? [
                                "title",
                                "status",
                                "difficulty",
                                "platform",
                                "solveMethod",
                                "url",
                                "date",
                                "attempts",
                                "actualMinutes",
                                "complexity",
                                "mistakes",
                              ]
                            : [
                                "title",
                                "date",
                                "actualMinutes",
                                "duration",
                                "interruptions",
                                "status",
                              ],
                      ),
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  <Download size={15} />
                  {kind === "task"
                    ? "Tasks"
                    : kind === "problem"
                      ? "Problems"
                      : "Study sessions"}
                  .csv
                </Button>
              ))}
            </div>
          </Panel>
          <Panel title="A little extra peace of mind">
            <div className="setting-row">
              <div>
                <strong>
                  <HardDrive size={16} />
                  Browser storage
                </strong>
                <p>
                  {bytes(storage.usage)} used ·{" "}
                  {storage.persisted
                    ? "Protected from automatic eviction"
                    : "Best-effort storage; your browser may clear it"}
                </p>
              </div>
              <Button
                onClick={async () => {
                  try {
                    const allowed = await navigator.storage?.persist();
                    setStorage((s) => ({ ...s, persisted: allowed }));
                    notify(
                      allowed
                        ? "Persistent storage granted. Backups are still recommended."
                        : "The browser did not grant persistent storage. Keep regular backups.",
                      allowed ? "success" : "info",
                    );
                  } catch {
                    notify(
                      "Persistent storage is unavailable in this browser.",
                      "info",
                    );
                  }
                }}
              >
                Request durable storage
              </Button>
            </div>
            <div className="setting-row">
              <div>
                <strong>Before-change recovery copy</strong>
                <p>
                  A safety snapshot is saved before each import or reset.
                  Restoring it swaps the current workspace with that snapshot.
                </p>
              </div>
              <Button
                disabled={readOnly || busy}
                onClick={() => setConfirm("recovery")}
              >
                <RotateCcw size={15} />
                Restore recovery copy
              </Button>
            </div>
            <p className="info-line">
              <Info size={15} />
              Clearing site data, using private browsing, or changing the site’s
              port can make this workspace unavailable. Export before changing
              browsers or moving machines.
            </p>
          </Panel>
          <Panel title="Start over, deliberately" className="danger-panel">
            <div className="setting-row">
              <div>
                <strong>Reset this workspace</strong>
                <p>
                  Remove all current records and return preferences to defaults.
                  Export a backup first.
                </p>
              </div>
              <Button
                variant="danger"
                disabled={readOnly || busy}
                onClick={() => setResetOpen(true)}
              >
                <Trash2 size={15} />
                Reset workspace
              </Button>
            </div>
          </Panel>
        </>
      )}
      {preview && (
        <Modal
          title="Review your backup"
          onClose={() => !busy && setPreview(null)}
        >
          <div className="stack">
            <p>
              {preview.items.length} records · backup saved{" "}
              {new Date(preview.savedAt).toLocaleString()}
            </p>
            <div className="backup-counts">
              {[...new Set(preview.items.map((i) => i.kind))].map((kind) => (
                <Badge key={kind}>
                  {kind}: {preview.items.filter((i) => i.kind === kind).length}
                </Badge>
              ))}
            </div>
            <Field label="How should this data be restored?">
              <select
                value={importMode}
                disabled={busy}
                onChange={(e) =>
                  setImportMode(e.target.value as "merge" | "replace")
                }
              >
                <option value="merge">
                  Merge records · keep current preferences
                </option>
                <option value="replace">Replace entire workspace</option>
              </select>
            </Field>
            <p className="muted small">
              {importMode === "merge"
                ? "Matching IDs keep whichever record was edited more recently. Other records are combined."
                : "All current records and preferences will be replaced by this backup."}{" "}
              A recovery copy is saved first. Restored timers are paused.
            </p>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => setConfirm("import")}
            >
              Continue to confirmation
              <ArrowRight size={15} />
            </Button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Confirm
          title={
            confirm === "import"
              ? `${importMode === "merge" ? "Merge" : "Replace"} this workspace?`
              : confirm === "recovery"
                ? "Restore the recovery snapshot?"
                : "Reset dashboard layout?"
          }
          message={
            confirm === "import"
              ? `You are about to ${importMode} ${preview?.items.length} records. The change is applied only after the validated backup is saved successfully.`
              : confirm === "recovery"
                ? "The stored safety copy will become the active workspace. Your current workspace becomes the new recovery copy."
                : "Your widgets will return to the default arrangement. No learning data is deleted."
          }
          onClose={() => !busy && setConfirm(null)}
          onConfirm={() => {
            if (busy) return;
            if (confirm === "import" && preview)
              void perform(
                () => store.importData(preview, importMode),
                "Backup restored successfully.",
              );
            else if (confirm === "recovery")
              void perform(store.recover, "Recovery snapshot restored.");
            else {
              setSettings({
                widgets: structuredClone(DEFAULT_SETTINGS.widgets),
              });
              setConfirm(null);
              notify("Dashboard layout reset.");
            }
          }}
        />
      )}
      {resetOpen && (
        <Modal
          title="Reset your workspace?"
          onClose={() => !busy && setResetOpen(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (resetText === "RESET" && !busy)
                void perform(
                  store.reset,
                  "Workspace reset. A recovery copy was kept.",
                );
            }}
          >
            <p className="confirm-message">
              This clears all {items.length} records and preferences. Your
              current workspace will be kept as a single recovery copy. Type{" "}
              <strong>RESET</strong> to confirm.
            </p>
            <Field label="Type RESET">
              <input
                autoFocus
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <div className="modal-actions">
              <Button onClick={() => setResetOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                disabled={resetText !== "RESET" || busy}
              >
                Reset workspace
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
