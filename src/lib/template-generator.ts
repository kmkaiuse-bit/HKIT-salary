import * as XLSX from "xlsx";
import type { RateTableRow, TeacherRow, InstalmentPattern } from "@/types";
import { INSTALMENT_PATTERN_LABELS } from "@/types";

export function generateAssignmentsTemplate(
  teachers: TeacherRow[],
  rateTable: RateTableRow[],
  term: string,
  prefillRows?: Array<{
    teacherDisplayName: string;
    subjectCode: string;
    teachingHours: number;
    instalmentPattern: InstalmentPattern;
  }>
): Uint8Array {
  const wb = XLSX.utils.book_new();

  // ── Assignments sheet ──────────────────────────────────────────────
  const patternOptions = Object.entries(INSTALMENT_PATTERN_LABELS)
    .map(([code, label]) => `${code} — ${label}`)
    .join("\n");

  const headers = [
    "TeacherDisplayName",
    "SubjectCode",
    "TeachingHours",
    "IsCombined",
    "ComHourlyRate",
    "ComTeachingHours",
    "InstalmentPattern",
    "LumpSumMonth",
    "Incentive",
    "Term",
    "Status",
  ];

  const rows: (string | number)[][] = [headers];

  if (prefillRows && prefillRows.length > 0) {
    prefillRows.forEach((r) => {
      rows.push([
        r.teacherDisplayName,
        r.subjectCode,
        r.teachingHours,
        "N", "", "",
        r.instalmentPattern,
        "", "", term, "DRAFT",
      ]);
    });
  } else {
    // One blank example row
    rows.push(["", "", 60, "N", "", "", "T1_STD", "", "", term, "DRAFT"]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
    { wch: 13 }, { wch: 16 }, { wch: 18 }, { wch: 13 },
    { wch: 10 }, { wch: 10 }, { wch: 8 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Assignments");

  // ── Reference sheet (read-only guide) ─────────────────────────────
  const refRows: (string | number)[][] = [
    ["=== 分期模式代碼參考 ===", ""],
    ["代碼", "說明"],
    ...Object.entries(INSTALMENT_PATTERN_LABELS).map(([code, label]) => [code, label]),
    ["", ""],
    ["=== 老師名單 ===", ""],
    ["DisplayName", "FullName"],
    ...teachers.map((t) => [t.displayName, t.fullName]),
    ["", ""],
    ["=== 科目費率 ===", ""],
    ["SubjectCode", "SubjectName", "HourlyRate"],
    ...rateTable.map((r) => [r.subjectCode, r.subjectName, r.hourlyRate]),
  ];

  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  wsRef["!cols"] = [{ wch: 24 }, { wch: 40 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsRef, "Reference");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(buf);
}
