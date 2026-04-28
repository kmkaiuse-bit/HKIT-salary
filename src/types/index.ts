export type EmploymentType = "FT" | "PT";

export type InstalmentPattern =
  | "T1_STD"
  | "T1_LATE"
  | "T2_STD"
  | "FULL_YEAR"
  | "FULL_YEAR_LATE"
  | "LUMP_SUM";

export type AssignmentStatus = "DRAFT" | "FINAL";

export interface RateTableRow {
  subjectCode: string;
  subjectName: string;
  category: string;
  hourlyRate: number;
}

export interface TeacherRow {
  displayName: string;
  fullName: string;
  payTo: string;
  employmentType: EmploymentType;
}

export interface AssignmentRow {
  teacherDisplayName: string;
  subjectCode: string;
  teachingHours: number;
  isCombined: boolean;
  comHourlyRate?: number;
  comTeachingHours?: number;
  instalmentPattern: InstalmentPattern;
  lumpSumMonth?: string; // YYYY-MM, only for LUMP_SUM
  incentive: number;
  term: string;
  status: AssignmentStatus;
}

export interface ParsedExcelData {
  rateTable: RateTableRow[];
  teachers: TeacherRow[];
  assignments: AssignmentRow[];
  errors: string[];
}

export interface InstalmentSchedule {
  month: string; // YYYY-MM
  monthLabel: string; // e.g. "September 2025"
  amount: number;
}

export interface CalculatedAssignment {
  assignment: AssignmentRow;
  teacher: TeacherRow;
  rateRow: RateTableRow;
  hourlyRate: number;
  totalSalary: number;
  instalments: InstalmentSchedule[];
  validationErrors: string[];
}

export const INSTALMENT_PATTERN_LABELS: Record<InstalmentPattern, string> = {
  T1_STD: "Term 1 標準（5 期 Sep–Jan）",
  T1_LATE: "Term 1 遲開課（4 期 Oct–Jan）",
  T2_STD: "Term 2 標準（5 期 Jan–May）",
  FULL_YEAR: "全年（10 期 Sep–Jun）",
  FULL_YEAR_LATE: "全年遲開課（9 期 Oct–Jun）",
  LUMP_SUM: "一筆過（指定月份）",
};

export const INSTALMENT_PATTERN_DESCRIPTIONS: Record<InstalmentPattern, string> = {
  T1_STD: "只教 Term 1，九月正常開課，分 5 期（Sep → Jan）平均發放",
  T1_LATE: "只教 Term 1，十月才開始，分 4 期（Oct → Jan）平均發放",
  T2_STD: "只教 Term 2，分 5 期（Jan → May）平均發放",
  FULL_YEAR: "橫跨全年 T1 + T2，九月開課，分 10 期（Sep → Jun）平均發放",
  FULL_YEAR_LATE: "橫跨全年 T1 + T2，十月才開始，分 9 期（Oct → Jun）平均發放",
  LUMP_SUM: "全部薪金在指定單一月份一次過發放，需填寫月份（YYYY-MM）",
};
