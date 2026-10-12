import type { Item } from "../lib/types";
import { addDays, today } from "../lib/utils";

export type CardRating = "again" | "hard" | "good" | "easy";

/**
 * A deliberately simple, transparent day-based review schedule.
 * Again: today. Hard: at least 1 day, previous interval × 1.2 (rounded up).
 * Good: 1 day for a new card, otherwise previous interval × 2.
 * Easy: 4 days for a new card, otherwise previous interval × 2.5 (rounded up).
 * Intervals are capped at 3,650 days. This is a planning aid, not a retention model.
 * Pass `now` in tests; the due day follows the user's local calendar.
 */
export function scheduleCard(
  card: Partial<Item>,
  rating: CardRating,
  now = new Date(),
): Partial<Item> {
  if (!["again", "hard", "good", "easy"].includes(rating))
    throw new Error("Choose a valid review rating.");
  if (!Number.isFinite(now.getTime()))
    throw new Error("Choose a valid review date.");
  const previous = Number.isFinite(card.interval)
    ? Math.max(0, Math.floor(card.interval!))
    : 0;
  const interval = Math.min(
    3650,
    rating === "again"
      ? 0
      : rating === "hard"
        ? Math.max(1, Math.ceil(previous * 1.2))
        : rating === "good"
          ? Math.max(1, previous * 2)
          : previous === 0
            ? 4
            : Math.ceil(previous * 2.5),
  );
  const dueDate = addDays(today(now), interval);
  return {
    interval,
    dueDate,
    nextRevision: dueDate,
    reviews: Math.max(0, Number.isFinite(card.reviews) ? card.reviews! : 0) + 1,
    reviewHistory: [
      ...(card.reviewHistory || []),
      { date: now.toISOString(), rating, interval },
    ],
  };
}

export function cardDueDay(card: Item): string {
  return (card.dueDate || card.nextRevision || today()).slice(0, 10);
}

export function reviewIntervalLabel(interval: number): string {
  return interval === 0
    ? "Today"
    : interval === 1
      ? "1 day"
      : `${interval} days`;
}
