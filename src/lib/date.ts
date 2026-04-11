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

/** `YYYY-MM-DD` for `<input type="date" />` in Manila calendar. */
export function formatManilaYmd(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Manila calendar day from `YYYY-MM-DD` (UTC noon `@db.Date` row shape). */
export function manilaBusinessDateFromYmd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) {
    throw new Error("Invalid date.");
  }
  return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z`);
}

export function addCalendarDaysToBusinessDate(bd: Date, days: number): Date {
  const y = bd.getUTCFullYear();
  const mo = bd.getUTCMonth();
  const day = bd.getUTCDate() + days;
  return new Date(Date.UTC(y, mo, day, 12, 0, 0, 0));
}

export function formatManilaTime(d: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: STORE_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatManilaShortDate(d: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: STORE_TIMEZONE,
    month: "short",
    day: "numeric",
  }).format(d);
}
