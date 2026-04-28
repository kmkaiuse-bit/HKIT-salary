import * as XLSX from "xlsx";
import type { RateTableRow, TeacherRow, InstalmentPattern } from "@/types";
import { INSTALMENT_PATTERN_LABELS } from "@/types";

export function generateMasterTemplate(
  existing?: { rateTable: RateTableRow[]; teachers: TeacherRow[] }
): Uint8Array {
  const wb = XLSX.utils.book_new();

  // ── RateTable sheet ───────────────────────────────────────────────
  const rateHeaders = ["SubjectCode", "SubjectName", "Category", "HourlyRate"];
  const rateExample = existing?.rateTable.length
    ? existing.rateTable.map((r) => [r.subjectCode, r.subjectName, r.category, r.hourlyRate])
    : [
        ["DAE101", "中文", "Core Subjects", 340],
        ["DAE201", "應急救護", "Core Subjects", 340],
        ["DAE225", "機電工程職安健", "Engineering related", 400],
      ];

  const wsRate = XLSX.utils.aoa_to_sheet([rateHeaders, ...rateExample]);
  wsRate["!cols"] = [{ wch: 16 }, { wch: 28 }, { wch: 24 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsRate, "RateTable");

  // ── Teachers sheet ────────────────────────────────────────────────
  const teacherHeaders = ["DisplayName", "FullName", "PayTo", "EmploymentType"];
  const teacherExample = existing?.teachers.length
    ? existing.teachers.map((t) => [t.displayName, t.fullName, t.payTo, t.employmentType])
    : [
        ["Mr. Keith Kwok", "Kwok Siu Ming Keith", "Kwok Siu Ming Keith", "PT"],
        ["Ms. Alice Chan", "Chan Mei Lin Alice", "Chan Mei Lin Alice", "FT"],
        ["Mr. Mark Yu", "Yu Chun Kit Mark", "Altitude Education Limited", "PT"],
      ];

  const wsTeacher = XLSX.utils.aoa_to_sheet([teacherHeaders, ...teacherExample]);
  wsTeacher["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 32 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsTeacher, "Teachers");

  // ── Instructions sheet ────────────────────────────────────────────
  const instructions: (string | number)[][] = [
    ["DAE 薪金系統 — Master Data 填寫說明"],
    [""],
    ["【RateTable 費率表】"],
    ["欄位", "說明", "例子"],
    ["SubjectCode", "科目編號（必填）", "DAE201"],
    ["SubjectName", "科目名稱（選填）", "應急救護"],
    ["Category", "科目類別（選填）", "Core Subjects"],
    ["HourlyRate", "每小時薪酬（必填，數字）", "340"],
    [""],
    ["【Teachers 老師名單】"],
    ["欄位", "說明", "例子"],
    ["DisplayName", "系統顯示名稱，Assignments 填寫時要完全一樣（必填）", "Mr. Keith Kwok"],
    ["FullName", "合同用全名（必填）", "Kwok Siu Ming Keith"],
    ["PayTo", "付款對象，個人或公司名稱（必填）", "Altitude Education Limited"],
    ["EmploymentType", "FT（全職）或 PT（兼職）（必填）", "PT"],
    [""],
    ["注意："],
    ["- 上傳後系統會儲存在瀏覽器，每年費率更新時重新上傳即可"],
    ["- DisplayName 必須與 Assignments 表完全一致（大小寫、空格）"],
    ["- EmploymentType 只接受 FT 或 PT（大寫）"],
  ];

  const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
  wsInstr["!cols"] = [{ wch: 20 }, { wch: 48 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "填寫說明");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Uint8Array(buf);
}

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
