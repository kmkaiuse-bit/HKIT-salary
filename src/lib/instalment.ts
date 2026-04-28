import type { InstalmentPattern, InstalmentSchedule } from "@/types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function addMonths(yyyyMM: string, n: number): string {
  const [year, month] = yyyyMM.split("-").map(Number);
  const date = new Date(year, month - 1 + n, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// termStartYear: e.g. 2025 for T2025C
function getPatternMonths(
  pattern: InstalmentPattern,
  termStartYear: number,
  lumpSumMonth?: string
): string[] {
  const sep = `${termStartYear}-09`;
  const oct = `${termStartYear}-10`;
  const jan = `${termStartYear + 1}-01`;

  switch (pattern) {
    case "T1_STD":
      return Array.from({ length: 5 }, (_, i) => addMonths(sep, i));
    case "T1_LATE":
      return Array.from({ length: 4 }, (_, i) => addMonths(oct, i));
    case "T2_STD":
      return Array.from({ length: 5 }, (_, i) => addMonths(jan, i));
    case "FULL_YEAR":
      return Array.from({ length: 10 }, (_, i) => addMonths(sep, i));
    case "FULL_YEAR_LATE":
      return Array.from({ length: 9 }, (_, i) => addMonths(oct, i));
    case "LUMP_SUM":
      if (!lumpSumMonth) throw new Error("LUMP_SUM requires lumpSumMonth");
      return [lumpSumMonth];
  }
}

export function buildInstalmentSchedule(
  pattern: InstalmentPattern,
  totalSalary: number,
  termStartYear: number,
  lumpSumMonth?: string
): InstalmentSchedule[] {
  const months = getPatternMonths(pattern, termStartYear, lumpSumMonth);
  const perInstalment = Math.round((totalSalary / months.length) * 100) / 100;

  // distribute rounding remainder to last instalment
  const base = months.map((m, i) => ({
    month: m,
    monthLabel: monthLabel(m),
    amount: i < months.length - 1 ? perInstalment : 0,
  }));

  const distributed = base.slice(0, -1).reduce((s, x) => s + x.amount, 0);
  base[base.length - 1].amount =
    Math.round((totalSalary - distributed) * 100) / 100;

  return base;
}

export function extractTermStartYear(term: string): number {
  // e.g. "T2025C" → 2025, "T2026A" → 2025 (T2 starts Jan 2026, year ref is still 2025)
  const match = term.match(/T(\d{4})/);
  if (!match) throw new Error(`Cannot parse term year from: ${term}`);
  const year = parseInt(match[1]);
  // T2025A = Term 2 of 2024-25 academic year, starts Jan 2025...
  // Convention: T{YYYY}C = Term 1 (Sep {YYYY}), T{YYYY}A = Term 2 (Jan {YYYY})
  return year;
}
