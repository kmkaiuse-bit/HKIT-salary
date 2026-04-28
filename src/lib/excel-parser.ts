import * as XLSX from "xlsx";
import type {
  ParsedExcelData,
  RateTableRow,
  TeacherRow,
  AssignmentRow,
  InstalmentPattern,
  EmploymentType,
  AssignmentStatus,
} from "@/types";

const VALID_PATTERNS = new Set<InstalmentPattern>([
  "T1_STD", "T1_LATE", "T2_STD", "FULL_YEAR", "FULL_YEAR_LATE", "LUMP_SUM",
]);

export function parseExcelBuffer(buffer: ArrayBuffer): ParsedExcelData {
  const workbook = XLSX.read(buffer, { type: "array" });
  const errors: string[] = [];

  const rateTable = parseRateTable(workbook, errors);
  const teachers = parseTeachers(workbook, errors);
  const assignments = parseAssignments(workbook, errors);

  return { rateTable, teachers, assignments, errors };
}

function sheetToRows(workbook: XLSX.WorkBook, sheetName: string, errors: string[]): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    errors.push(`找不到 Sheet：${sheetName}（請確認 Sheet 名稱正確）`);
    return [];
  }
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function num(v: unknown): number {
  const n = parseFloat(String(v ?? "0"));
  return isNaN(n) ? 0 : n;
}

function parseRateTable(workbook: XLSX.WorkBook, errors: string[]): RateTableRow[] {
  const rows = sheetToRows(workbook, "RateTable", errors);
  return rows
    .filter((r) => str(r.SubjectCode))
    .map((r) => ({
      subjectCode: str(r.SubjectCode),
      subjectName: str(r.SubjectName),
      category: str(r.Category),
      hourlyRate: num(r.HourlyRate),
    }));
}

function parseTeachers(workbook: XLSX.WorkBook, errors: string[]): TeacherRow[] {
  const rows = sheetToRows(workbook, "Teachers", errors);
  return rows
    .filter((r) => str(r.DisplayName))
    .map((r) => ({
      displayName: str(r.DisplayName),
      fullName: str(r.FullName),
      payTo: str(r.PayTo),
      employmentType: (str(r.EmploymentType) as EmploymentType) || "PT",
    }));
}

function parseAssignments(workbook: XLSX.WorkBook, errors: string[]): AssignmentRow[] {
  const rows = sheetToRows(workbook, "Assignments", errors);
  const result: AssignmentRow[] = [];

  rows
    .filter((r) => str(r.TeacherDisplayName) && str(r.SubjectCode))
    .forEach((r, i) => {
      const pattern = str(r.InstalmentPattern) as InstalmentPattern;
      if (!VALID_PATTERNS.has(pattern)) {
        errors.push(
          `第 ${i + 2} 行：InstalmentPattern "${pattern}" 無效，有效值：T1_STD / T1_LATE / T2_STD / FULL_YEAR / FULL_YEAR_LATE / LUMP_SUM`
        );
        return;
      }

      const isCombined = str(r.IsCombined).toUpperCase() === "Y";
      const status = str(r.Status).toUpperCase() === "FINAL" ? "FINAL" : "DRAFT";

      result.push({
        teacherDisplayName: str(r.TeacherDisplayName),
        subjectCode: str(r.SubjectCode),
        teachingHours: num(r.TeachingHours),
        isCombined,
        comHourlyRate: isCombined ? num(r.ComHourlyRate) : undefined,
        comTeachingHours: isCombined ? num(r.ComTeachingHours) : undefined,
        instalmentPattern: pattern,
        lumpSumMonth: str(r.LumpSumMonth) || undefined,
        incentive: num(r.Incentive),
        term: str(r.Term),
        status: status as AssignmentStatus,
      });
    });

  return result;
}
