import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  History,
  Layers3,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shuffle,
  Sparkles,
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
  Panel,
  Tabs,
} from "../components/ui";
import { useStore } from "../lib/store";
import type { Item } from "../lib/types";
import { cx, formatDate, navigate, routeFor, today } from "../lib/utils";
import {
  cardDueDay,
  reviewIntervalLabel,
  scheduleCard,
  type CardRating,
} from "./repetition";
import "./knowledge.css";

const cardTypes = [
  { value: "basic", label: "Question & answer" },
  { value: "concept", label: "Concept" },
  { value: "code", label: "Code" },
  { value: "cloze", label: "Fill in the blank" },
];
const ratings: { id: CardRating; label: string; key: string; help: string }[] =
  [
    { id: "again", label: "Again", key: "1", help: "I need another look" },
    { id: "hard", label: "Hard", key: "2", help: "Recalled with effort" },
    { id: "good", label: "Good", key: "3", help: "I knew this" },
    { id: "easy", label: "Easy", key: "4", help: "Comfortably recalled" },
  ];

function CardEditor({
  card,
  deck,
  onClose,
  onSaved,
}: {
  card?: Item;
  deck: string;
  onClose: () => void;
  onSaved: (item: Item) => void;
}) {
  const store = useStore();
  const [values, setValues] = useState({
    title: card?.title || "",
    question: card?.question || "",
    answer: card?.answer || "",
    collection: card?.collection || deck || "General",
    cardType: card?.cardType || "basic",
    tags: (card?.tags || []).join(", "),
    dueDate: card ? cardDueDay(card) : today(),
    noteId: card?.noteId || "",
    subjectId: card?.subjectId || "",
    projectId: card?.projectId || "",
  });
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState("");
  const change = (key: keyof typeof values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (store.readOnly)
      return store.notify(
        "This tab is read-only. Switch to the active editing tab.",
        "info",
      );
    if (!values.question.trim() || !values.answer.trim()) {
      setError("Add both a question and an answer before saving.");
      setPreview(false);
      return;
    }
    const patch: Partial<Item> = {
      title:
        values.title.trim() ||
        values.question
          .trim()
          .split("\n")[0]
          .replace(/[#*`]/g, "")
          .slice(0, 120) ||
        "Untitled card",
      question: values.question,
      answer: values.answer,
      collection: values.collection.trim() || "General",
      cardType: values.cardType,
      tags: [
        ...new Set(
          values.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ],
      dueDate: values.dueDate || today(),
      nextRevision: values.dueDate || today(),
      noteId: values.noteId,
      subjectId: values.subjectId,
      projectId: values.projectId,
    };
    let saved: Item;
    if (card) {
      store.update(card.id, patch);
      saved = { ...card, ...patch };
    } else
      saved = store.create("card", {
        ...patch,
        interval: 0,
        reviews: 0,
        reviewHistory: [],
      });
    store.notify(
      card ? "Card updated." : "Card added to your deck.",
      "success",
    );
    onSaved(saved);
    onClose();
  };
  return (
    <Modal
      title={card ? "Refine this card" : "A little knowledge, kept"}
      onClose={onClose}
      wide
    >
      <form className="stack" onSubmit={submit}>
        <fieldset className="kn-fieldset stack" disabled={store.readOnly}>
          {error && (
            <div className="kn-form-error" role="alert">
              {error}
            </div>
          )}
          <Field
            label="Short title"
            hint="Optional. The first line of your question is used when left blank."
          >
            <input
              autoFocus
              value={values.title}
              onChange={(event) => change("title", event.target.value)}
              placeholder="e.g. When should I use a HashMap?"
              maxLength={240}
            />
          </Field>
          <div className="grid-2">
            <Field label="Deck">
              <input
                list="kn-card-decks"
                value={values.collection}
                onChange={(event) => change("collection", event.target.value)}
                placeholder="General"
                maxLength={100}
              />
              <datalist id="kn-card-decks">
                {[
                  ...new Set(
                    store.items
                      .filter((item) => item.kind === "card")
                      .map((item) => item.collection)
                      .filter(Boolean),
                  ),
                ].map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </Field>
            <Field label="Card type">
              <select
                value={values.cardType}
                onChange={(event) => change("cardType", event.target.value)}
              >
                {cardTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="kn-editor-toolbar">
            <strong>Question & answer</strong>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPreview(!preview)}
            >
              {preview ? <Pencil size={14} /> : <Eye size={14} />}
              {preview ? "Edit Markdown" : "Preview Markdown"}
            </Button>
          </div>
          {values.cardType === "cloze" && (
            <p className="muted small">
              Write a blank such as “___” in the question, then put the missing
              text and explanation in the answer.
            </p>
          )}
          {preview ? (
            <div className="kn-card-edit-preview">
              <section>
                <span className="eyebrow">FRONT</span>
                <Markdown>
                  {values.question || "*Your question will appear here.*"}
                </Markdown>
              </section>
              <section>
                <span className="eyebrow">BACK</span>
                <Markdown>
                  {values.answer || "*Your answer will appear here.*"}
                </Markdown>
              </section>
            </div>
          ) : (
            <div className="grid-2">
              <Field
                label="Question / front"
                hint="Markdown and fenced code blocks supported."
              >
                <textarea
                  required
                  rows={8}
                  value={values.question}
                  onChange={(event) => change("question", event.target.value)}
                  placeholder="One clear question…"
                />
              </Field>
              <Field
                label="Answer / back"
                hint="Keep it memorable. Add an example if it helps."
              >
                <textarea
                  required
                  rows={8}
                  value={values.answer}
                  onChange={(event) => change("answer", event.target.value)}
                  placeholder="Explain it in your own words…"
                />
              </Field>
            </div>
          )}
          <div className="grid-2">
            <Field label="Tags" hint="Separate with commas">
              <input
                value={values.tags}
                onChange={(event) => change("tags", event.target.value)}
                placeholder="revision, foundations"
                maxLength={500}
              />
            </Field>
            <Field label="Next review">
              <input
                type="date"
                required
                value={values.dueDate}
                onChange={(event) => change("dueDate", event.target.value)}
              />
            </Field>
          </div>
          <details className="kn-editor-connections">
            <summary>Connect to your knowledge</summary>
            <div className="kn-association-grid">
              {(
                [
                  { key: "noteId", kind: "note", label: "Source note" },
                  { key: "subjectId", kind: "subject", label: "Subject" },
                  { key: "projectId", kind: "project", label: "Project" },
                ] as const
              ).map((field) => (
                <Field key={field.key} label={field.label}>
                  <select
                    value={values[field.key]}
                    onChange={(event) => change(field.key, event.target.value)}
                  >
                    <option value="">No association</option>
                    {store.items
                      .filter((item) => item.kind === field.kind)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                  </select>
                </Field>
              ))}
            </div>
          </details>
          <div className="kn-modal-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              <Check size={16} />
              {card ? "Save changes" : "Create card"}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export default function Cards({ recordId }: { recordId?: string }) {
  const store = useStore();
  const { items, readOnly, ready, notify, touch } = store;
  const [search, setSearch] = useState("");
  const [deck, setDeck] = useState("");
  const [type, setType] = useState("");
  const [tag, setTag] = useState("");
  const [filter, setFilter] = useState("due");
  const [selectedId, setSelectedId] = useState(
    recordId && recordId !== "new" ? recordId : "",
  );
  const [revealed, setRevealed] = useState(false);
  const [editor, setEditor] = useState<Item | "new" | null>(
    recordId === "new" ? "new" : null,
  );
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [sessionReviews, setSessionReviews] = useState(0);
  const ratingLock = useRef(false);
  const currentStore = useRef(store);
  currentStore.current = store;
  useEffect(() => {
    if (recordId === "new") setEditor("new");
    else {
      setSelectedId(recordId || "");
      setRevealed(false);
    }
  }, [recordId]);
  const allCards = useMemo(
    () => items.filter((item) => item.kind === "card"),
    [items],
  );
  const day = today();
  const decks = [
    ...new Set(allCards.map((card) => card.collection || "General")),
  ].sort();
  const tags = [...new Set(allCards.flatMap((card) => card.tags || []))].sort();
  const matching = allCards.filter(
    (card) =>
      (!deck || (card.collection || "General") === deck) &&
      (!type ||
        card.cardType === type ||
        (type === "basic" && !card.cardType)) &&
      (!tag || card.tags?.includes(tag)) &&
      [
        card.title,
        card.question,
        card.answer,
        card.collection,
        ...(card.tags || []),
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const due = matching.filter((card) => cardDueDay(card) <= day);
  const upcoming = matching.filter((card) => cardDueDay(card) > day);
  const ordered = [
    ...(filter === "due" ? due : filter === "upcoming" ? upcoming : matching),
  ].sort((a, b) => {
    const first = order.indexOf(a.id),
      second = order.indexOf(b.id);
    if (first !== -1 || second !== -1)
      return (
        (first === -1 ? Infinity : first) - (second === -1 ? Infinity : second)
      );
    return (
      cardDueDay(a).localeCompare(cardDueDay(b)) ||
      a.createdAt.localeCompare(b.createdAt)
    );
  });
  const active = selectedId
    ? allCards.find((card) => card.id === selectedId)
    : ordered[0];
  const activeIndex = active
    ? ordered.findIndex((card) => card.id === active.id)
    : -1;
  const totalDue = allCards.filter((card) => cardDueDay(card) <= day).length;
  const reviewRecords = items.filter(
    (item) =>
      item.kind === "review" && (item.domain === "cards" || item.cardId),
  );
  const reviewedToday =
    reviewRecords.filter(
      (item) =>
        (item.date || today(new Date(item.completedAt || item.createdAt))) ===
        day,
    ).length +
    allCards.reduce(
      (sum, card) =>
        sum +
        (card.reviewHistory || []).filter(
          (review) =>
            today(new Date(review.date)) === day &&
            !reviewRecords.some(
              (record) =>
                record.cardId === card.id && record.completedAt === review.date,
            ),
        ).length,
      0,
    );
  const open = (card: Item) => {
    setSelectedId(card.id);
    setRevealed(false);
    navigate("cards", card.id);
    if (!readOnly && ready) touch(card.id);
  };
  const resetSelection = () => {
    setSelectedId("");
    setRevealed(false);
    setOrder([]);
    navigate("cards");
  };
  const changeFilter = (value: string) => {
    setFilter(value);
    resetSelection();
  };
  const advance = (direction: number) => {
    if (!ordered.length) return;
    const index =
      activeIndex < 0
        ? 0
        : (activeIndex + direction + ordered.length) % ordered.length;
    open(ordered[index]);
  };
  const shuffle = () => {
    const cards = [...ordered];
    for (let index = cards.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [cards[index], cards[other]] = [cards[other], cards[index]];
    }
    setOrder(cards.map((card) => card.id));
    if (cards[0]) open(cards[0]);
    notify("Review order shuffled.", "info");
  };
  const rate = (rating: CardRating) => {
    const current = currentStore.current;
    if (
      !active ||
      !revealed ||
      ratingLock.current ||
      current.readOnly ||
      !current.ready
    )
      return;
    const card = current.items.find(
      (item) => item.id === active.id && item.kind === "card",
    );
    if (!card) return;
    ratingLock.current = true;
    const at = new Date();
    const patch = scheduleCard(card, rating, at);
    current.update(card.id, patch);
    current.create("review", {
      title: `Reviewed · ${card.title}`,
      domain: "cards",
      category: "Flashcards",
      cardId: card.id,
      date: today(at),
      completedAt: at.toISOString(),
      status: rating,
      interval: patch.interval,
      collection: card.collection,
      subjectId: card.subjectId,
      projectId: card.projectId,
    });
    setSessionReviews((count) => count + 1);
    setRevealed(false);
    const next =
      ordered.slice(activeIndex + 1).find((item) => item.id !== card.id) ||
      ordered.find((item) => item.id !== card.id);
    if (next) open(next);
    else if (filter === "due" && patch.dueDate! > day) {
      setSelectedId("");
      navigate("cards");
    }
    notify(
      `${ratings.find((value) => value.id === rating)!.label} · next review ${patch.interval === 0 ? "today" : `in ${reviewIntervalLabel(patch.interval!)}`}.`,
      "success",
    );
    window.setTimeout(() => {
      ratingLock.current = false;
    }, 200);
  };
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        editor ||
        deleting ||
        event.defaultPrevented ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target?.closest(
          'input,textarea,select,a,[contenteditable="true"],[role="dialog"]',
        )
      )
        return;
      if (!active) return;
      if (event.key === " " || event.key === "Enter") {
        if (target?.closest("button")) return;
        event.preventDefault();
        setRevealed((value) => !value);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        advance(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        advance(1);
      } else {
        const rating = ratings.find((value) => value.key === event.key);
        if (rating && revealed && !readOnly) {
          event.preventDefault();
          rate(rating.id);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });
  const closeEditor = () => {
    setEditor(null);
    if (window.location.hash === "#cards/new") navigate("cards");
  };
  const deleteCard = () => {
    const current = currentStore.current;
    if (!deleting || current.readOnly) return;
    current.remove(deleting.id);
    if (active?.id === deleting.id) resetSelection();
    setDeleting(null);
    current.notify("Card deleted.", "success");
  };
  const association = active
    ? items.filter((item) =>
        [active.noteId, active.projectId, active.subjectId].includes(item.id),
      )
    : [];
  return (
    <div className="knowledge-page cards-page">
      <PageHeader
        eyebrow="A LITTLE RECALL GOES A LONG WAY"
        title="Keep what you learn"
        description="Thoughtful flashcards. A simple rhythm. Knowledge that stays within reach."
        actions={
          <Button
            variant="primary"
            disabled={readOnly || !ready}
            onClick={() => setEditor("new")}
          >
            <Plus size={16} /> New card
          </Button>
        }
      />
      {readOnly && (
        <div className="kn-notice" role="status">
          This tab is read-only. You can browse and reveal cards; editing and
          review ratings are paused.
        </div>
      )}
      <div className="kn-card-stats">
        <div>
          <span className="kn-stat-icon">
            <Clock3 size={19} />
          </span>
          <span>
            <strong>{totalDue}</strong>
            <small>Ready to review</small>
          </span>
          <Badge tone={totalDue ? "warning" : "success"}>
            {totalDue ? "Your next small step" : "All caught up"}
          </Badge>
        </div>
        <div>
          <span className="kn-stat-icon">
            <Check size={19} />
          </span>
          <span>
            <strong>{reviewedToday}</strong>
            <small>Reviews today</small>
          </span>
        </div>
        <div>
          <span className="kn-stat-icon">
            <Layers3 size={19} />
          </span>
          <span>
            <strong>{allCards.length}</strong>
            <small>
              Cards across {decks.length}{" "}
              {decks.length === 1 ? "deck" : "decks"}
            </small>
          </span>
        </div>
      </div>
      <div className="kn-cards-layout">
        <section className="kn-card-library" aria-label="Flashcard library">
          <div className="kn-card-library-heading">
            <h2>Your decks</h2>
            <Badge>{allCards.length}</Badge>
          </div>
          <div className="kn-search">
            <Search size={16} />
            <input
              aria-label="Search flashcards"
              placeholder="Search your cards…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetSelection();
              }}
            />
          </div>
          <div className="kn-card-filters">
            <Field label="Deck">
              <select
                value={deck}
                onChange={(event) => {
                  setDeck(event.target.value);
                  resetSelection();
                }}
              >
                <option value="">All decks</option>
                {decks.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <div className="kn-filter-selects">
              <select
                aria-label="Filter card type"
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  resetSelection();
                }}
              >
                <option value="">All types</option>
                {cardTypes.map((value) => (
                  <option key={value.value} value={value.value}>
                    {value.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter card tags"
                value={tag}
                onChange={(event) => {
                  setTag(event.target.value);
                  resetSelection();
                }}
              >
                <option value="">All tags</option>
                {tags.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>
          <Tabs
            value={filter}
            onChange={changeFilter}
            options={[
              { id: "due", label: "Due", count: due.length },
              { id: "upcoming", label: "Upcoming", count: upcoming.length },
              { id: "all", label: "All", count: matching.length },
            ]}
          />
          <div className="kn-card-library-list">
            {!ready ? (
              <p className="kn-list-empty">Loading your cards…</p>
            ) : ordered.length ? (
              ordered.map((card) => (
                <button
                  key={card.id}
                  className={cx(
                    "kn-library-card",
                    active?.id === card.id && "is-selected",
                  )}
                  onClick={() => open(card)}
                >
                  <span className="kn-library-card-icon">
                    <CreditCard size={16} />
                  </span>
                  <span>
                    <strong>
                      {card.title ||
                        card.question?.slice(0, 70) ||
                        "Untitled card"}
                    </strong>
                    <small>
                      {card.collection || "General"} ·{" "}
                      {cardDueDay(card) <= day
                        ? "Due now"
                        : formatDate(cardDueDay(card))}
                    </small>
                  </span>
                  <ChevronRight size={14} />
                </button>
              ))
            ) : (
              <div className="kn-list-empty">
                <Layers3 size={24} />
                <strong>
                  {allCards.length
                    ? "No cards in this view"
                    : "Build your first deck"}
                </strong>
                <p>
                  {allCards.length
                    ? "Try another deck or switch to All."
                    : "Start with a single idea you want to remember."}
                </p>
                {(search || deck || tag || type) && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearch("");
                      setDeck("");
                      setTag("");
                      setType("");
                      resetSelection();
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="kn-library-foot">
            <History size={14} />
            <span>
              {sessionReviews} {sessionReviews === 1 ? "review" : "reviews"} in
              this visit
            </span>
          </div>
        </section>
        <div className="kn-review-column">
          {active ? (
            <>
              <section
                className="kn-review-stage"
                aria-label="Flashcard review"
              >
                <div className="kn-review-topbar">
                  <div>
                    <Badge>{active.collection || "General"}</Badge>
                    <span>
                      {activeIndex >= 0
                        ? `${activeIndex + 1} / ${ordered.length}`
                        : "Opened by link"}
                    </span>
                  </div>
                  <div className="kn-icon-actions">
                    <Button
                      variant="ghost"
                      className="icon-button"
                      aria-label="Shuffle review cards"
                      title="Shuffle"
                      disabled={ordered.length < 2}
                      onClick={shuffle}
                    >
                      <Shuffle size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="icon-button"
                      aria-label="Edit card"
                      title="Edit card"
                      disabled={readOnly}
                      onClick={() => setEditor(active)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="icon-button text-danger"
                      aria-label="Delete card"
                      title="Delete card"
                      disabled={readOnly}
                      onClick={() => setDeleting(active)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                <div className="kn-flashcard">
                  <div className="kn-flashcard-label">
                    <span className="kn-small-line" />
                    <span>{revealed ? "THE ANSWER" : "THINK IT THROUGH"}</span>
                    <span className="kn-small-line" />
                  </div>
                  {revealed && (
                    <div className="kn-question-recap">
                      <Markdown>{active.question || active.title}</Markdown>
                    </div>
                  )}
                  <div
                    className={cx(
                      "kn-flashcard-content",
                      revealed && "is-answer",
                    )}
                  >
                    <Markdown>
                      {revealed
                        ? active.answer ||
                          "*No answer yet. Edit this card to add one.*"
                        : active.question || active.title}
                    </Markdown>
                  </div>
                  {!revealed && (
                    <p className="kn-recall-hint">
                      Try recalling the answer before you reveal it.
                    </p>
                  )}
                </div>
                <div className="kn-review-controls">
                  <Button
                    className="kn-round-control"
                    aria-label="Previous card"
                    title="Previous card"
                    disabled={ordered.length < 2}
                    onClick={() => advance(-1)}
                  >
                    <ChevronLeft size={19} />
                  </Button>
                  <Button
                    variant={revealed ? "secondary" : "primary"}
                    className="kn-reveal-button"
                    onClick={() => setRevealed(!revealed)}
                  >
                    {revealed ? <RotateCcw size={17} /> : <Eye size={17} />}
                    {revealed ? "Show question" : "Reveal answer"}
                    <kbd>Space</kbd>
                  </Button>
                  <Button
                    className="kn-round-control"
                    aria-label="Next card"
                    title="Next card"
                    disabled={ordered.length < 2}
                    onClick={() => advance(1)}
                  >
                    <ChevronRight size={19} />
                  </Button>
                </div>
                {revealed ? (
                  <div className="kn-rating-area">
                    <p>How did that feel?</p>
                    <div className="kn-rating-grid">
                      {ratings.map((rating) => (
                        <button
                          key={rating.id}
                          className={`kn-rating kn-rating-${rating.id}`}
                          disabled={readOnly}
                          title={`${rating.help}. Keyboard: ${rating.key}`}
                          onClick={() => rate(rating.id)}
                        >
                          <span>
                            <strong>{rating.label}</strong>
                            <kbd>{rating.key}</kbd>
                          </span>
                          <small>
                            {reviewIntervalLabel(
                              scheduleCard(active, rating.id).interval!,
                            )}
                          </small>
                        </button>
                      ))}
                    </div>
                    {readOnly && (
                      <p className="muted small">
                        Ratings are disabled in this read-only tab.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="kn-review-shortcuts">
                    <span>
                      <kbd>←</kbd>
                      <kbd>→</kbd> navigate
                    </span>
                    <span>
                      <kbd>1</kbd>–<kbd>4</kbd> rate after reveal
                    </span>
                  </div>
                )}
              </section>
              <div className="kn-card-context">
                <span>
                  <CalendarDays size={14} />
                  Next review:{" "}
                  {cardDueDay(active) <= day
                    ? "Today"
                    : formatDate(cardDueDay(active), true)}
                </span>
                <span>{active.reviews || 0} reviews</span>
                <Badge>
                  {cardTypes.find((type) => type.value === active.cardType)
                    ?.label || "Question & answer"}
                </Badge>
                {active.tags?.map((value) => (
                  <Badge key={value}>{value}</Badge>
                ))}
              </div>
              {association.length > 0 && (
                <div className="kn-card-associations">
                  {association.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(routeFor(item), item.id)}
                    >
                      <span className="kn-mini-kind">{item.kind}</span>
                      {item.title}
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
                </div>
              )}
              <details className="kn-review-history">
                <summary>
                  <History size={15} />
                  Review history{" "}
                  <Badge>{active.reviewHistory?.length || 0}</Badge>
                </summary>
                {active.reviewHistory?.length ? (
                  <div className="kn-review-history-list">
                    {[...active.reviewHistory]
                      .reverse()
                      .map((review, index) => (
                        <div key={`${review.date}-${index}`}>
                          <span>
                            {formatDate(review.date)}{" "}
                            <small>
                              {new Date(review.date).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </small>
                          </span>
                          <Badge>
                            {review.rating[0]?.toUpperCase()}
                            {review.rating.slice(1)}
                          </Badge>
                          <span>{reviewIntervalLabel(review.interval)}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="muted small">
                    No ratings yet. Your first review will appear here.
                  </p>
                )}
              </details>
            </>
          ) : (
            <section className="kn-review-stage kn-review-empty">
              <Empty
                icon={
                  allCards.length ? (
                    <Sparkles size={36} />
                  ) : (
                    <CreditCard size={36} />
                  )
                }
                title={
                  selectedId
                    ? "Card not found"
                    : filter === "due" &&
                        allCards.length &&
                        !search &&
                        !deck &&
                        !tag &&
                        !type
                      ? "A little space to let it settle"
                      : allCards.length
                        ? "Nothing in this view yet"
                        : "Make something worth remembering"
                }
                description={
                  selectedId
                    ? "This card may have been deleted or belongs to another local workspace."
                    : filter === "due" && allCards.length
                      ? "No cards are due in this view. Explore another deck or preview an upcoming review."
                      : "Create a question, write a thoughtful answer, and come back when it’s due."
                }
                action={
                  <div className="kn-empty-actions">
                    {allCards.length > 0 && (
                      <Button onClick={() => changeFilter("all")}>
                        Browse all cards <ArrowRight size={15} />
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      disabled={readOnly || !ready}
                      onClick={() => setEditor("new")}
                    >
                      <Plus size={15} /> New card
                    </Button>
                  </div>
                }
              />
            </section>
          )}
          <Panel className="kn-schedule-explainer">
            <details>
              <summary>
                <Sparkles size={15} />A simple schedule, no mystery
              </summary>
              <p>
                Again keeps a card due today. Hard gives it at least 1 day, then
                grows its interval by 1.2× (rounded up). Good starts at 1 day
                and doubles the previous interval. Easy starts at 4 days and
                grows it by 2.5× (rounded up). The maximum is 3,650 days.
              </p>
              <p>
                This is a transparent planning aid, not a scientific estimate of
                memory or retention. Ratings move the due date from today;
                reviewing an upcoming card also reschedules it.
              </p>
              <p>
                Outside form fields, move with arrow keys and rate with 1–4.
                Space reveals the answer when a button is not focused.
              </p>
            </details>
          </Panel>
        </div>
      </div>
      {editor && (
        <CardEditor
          key={typeof editor === "string" ? "new" : editor.id}
          card={typeof editor === "string" ? undefined : editor}
          deck={deck}
          onClose={closeEditor}
          onSaved={open}
        />
      )}
      {deleting && (
        <Confirm
          title="Delete this card?"
          message={`“${deleting.title}” and its card-level review history will be permanently removed. Past review activity remains in your progress history.`}
          onClose={() => setDeleting(null)}
          onConfirm={deleteCard}
        />
      )}
    </div>
  );
}
