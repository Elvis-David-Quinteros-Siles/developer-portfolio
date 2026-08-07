import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

/** "2023-04-01" → "abr 2023". Devuelve "Actualidad" si es null. */
export function formatMonth(date: string | null): string {
  if (!date) return "Actualidad";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return `${MONTHS_ES[d.getUTCMonth()] ?? ""} ${d.getUTCFullYear()}`;
}

/** "2024-05-12T..." → "12 may 2024". */
export function formatDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return `${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()] ?? ""} ${d.getUTCFullYear()}`;
}

/** Iniciales para covers placeholder: "Event-Driven Orders" → "EO". */
export function initials(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? "").toUpperCase())
    .join("");
}
