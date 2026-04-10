/** Store operates on a single timezone for “today” boundaries. */
export const STORE_TIMEZONE = "Asia/Manila";

/**
 * Calendar date in Manila as a `Date` at UTC noon (safe for Prisma `@db.Date`).
 */
export function getManilaBusinessDate(d = new Date()): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return new Date(`${y}-${m}-${day}T12:00:00.000Z`);
}

export function startOfManilaDayUtc(d = new Date()): Date {
  const bd = getManilaBusinessDate(d);
  const y = bd.getUTCFullYear();
  const m = bd.getUTCMonth();
  const day = bd.getUTCDate();
  return new Date(Date.UTC(y, m, day, 0, 0, 0, 0));
}

export function endOfManilaDayUtc(d = new Date()): Date {
  const bd = getManilaBusinessDate(d);
  const y = bd.getUTCFullYear();
  const m = bd.getUTCMonth();
  const day = bd.getUTCDate();
  return new Date(Date.UTC(y, m, day, 23, 59, 59, 999));
}
