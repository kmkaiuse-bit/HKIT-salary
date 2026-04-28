import ExcelJS from "exceljs";
import type { CalculatedAssignment } from "@/types";

const MAX_INSTALMENTS = 10;

export async function generateSalaryExcel(
  results: CalculatedAssignment[],
  term: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`DAE-FT ${term}`);

  // Header row
  const headers = [
    "Teacher Display Name",
    "Teacher Full Name",
    "Pay To",
    "FT/PT",
    "Term",
    "Subject Code",
    "Subject Name",
    "Teaching Hours",
    "Hourly Rate",
    "Is Combined",
    "Incentive",
    "Total Salary",
    "Instalment Count",
    ...Array.from({ length: MAX_INSTALMENTS }, (_, i) => `Month ${i + 1}`),
    ...Array.from({ length: MAX_INSTALMENTS }, (_, i) => `Amount ${i + 1}`),
    "Instalment Sum",
    "Check OK",
  ];

  ws.addRow(headers);

  // Style header
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD6E4BC" },
  };
  headerRow.alignment = { wrapText: true };

  // Data rows
  results.forEach((r) => {
    const instalmentSum = r.instalments.reduce((s, x) => s + x.amount, 0);
    const checkOk = Math.abs(instalmentSum - r.totalSalary) <= 0.01 ? "Y" : "ERROR";

    const months = Array.from(
      { length: MAX_INSTALMENTS },
      (_, i) => r.instalments[i]?.monthLabel ?? ""
    );
    const amounts = Array.from(
      { length: MAX_INSTALMENTS },
      (_, i) => r.instalments[i]?.amount ?? ""
    );

    ws.addRow([
      r.teacher.displayName,
      r.teacher.fullName,
      r.teacher.payTo,
      r.teacher.employmentType,
      r.assignment.term,
      r.assignment.subjectCode,
      r.rateRow.subjectName,
      r.assignment.isCombined ? r.assignment.comTeachingHours : r.assignment.teachingHours,
      r.hourlyRate,
      r.assignment.isCombined ? "Y" : "N",
      r.assignment.incentive || "",
      r.totalSalary,
      r.instalments.length,
      ...months,
      ...amounts,
      instalmentSum,
      checkOk,
    ]);
  });

  // Column widths
  ws.columns.forEach((col, i) => {
    col.width = i < 12 ? 20 : 14;
  });

  // Highlight errors
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const checkCell = row.getCell(headers.length);
    if (checkCell.value === "ERROR") {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFC7CE" },
      };
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function generateBudgetExcel(
  results: CalculatedAssignment[],
  term: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Budget Summary");

  const headers = [
    "Term",
    "Subject Code",
    "Subject Name",
    "Category",
    "Teacher Display Name",
    "FT/PT",
    "Teaching Hours",
    "Hourly Rate",
    "Budget Amount",
    "Incentive",
    "Total Salary",
  ];

  ws.addRow(headers);
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDCE6F1" },
  };

  let grandTotal = 0;

  results.forEach((r) => {
    const hours = r.assignment.isCombined
      ? r.assignment.comTeachingHours ?? 0
      : r.assignment.teachingHours;
    const budget = hours * r.hourlyRate;
    grandTotal += r.totalSalary;

    ws.addRow([
      r.assignment.term,
      r.assignment.subjectCode,
      r.rateRow.subjectName,
      r.rateRow.category,
      r.teacher.displayName,
      r.teacher.employmentType,
      hours,
      r.hourlyRate,
      budget,
      r.assignment.incentive || "",
      r.totalSalary,
    ]);
  });

  // Total row
  const totalRow = ws.addRow([
    "", "", "", "", "", "", "", "TOTAL", "", "", grandTotal,
  ]);
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF2CC" },
  };

  ws.columns.forEach((col) => { col.width = 20; });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function generatePaymentScheduleExcel(
  results: CalculatedAssignment[],
  term: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Payment Schedule");

  // Aggregate by month
  const monthMap = new Map<string, number>();
  results.forEach((r) => {
    r.instalments.forEach((inst) => {
      monthMap.set(inst.monthLabel, (monthMap.get(inst.monthLabel) ?? 0) + inst.amount);
    });
  });

  ws.addRow(["Month", "Total Payment (HKD)"]);
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2EFDA" },
  };

  let total = 0;
  monthMap.forEach((amount, month) => {
    ws.addRow([month, amount]);
    total += amount;
  });

  const totalRow = ws.addRow(["TOTAL", total]);
  totalRow.font = { bold: true };

  ws.columns = [{ width: 24 }, { width: 22 }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
