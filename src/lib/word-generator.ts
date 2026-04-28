import {
  Document,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
} from "docx";
import type { CalculatedAssignment } from "@/types";

const MAX_INSTALMENTS = 10;

function cell(text: string, bold = false, width = 50): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 22 })],
      }),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
}

function labelValueRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [cell(label, true), cell(value)],
  });
}

export function generateContractDoc(result: CalculatedAssignment): Document {
  const { teacher, assignment, rateRow, hourlyRate, totalSalary, instalments } = result;

  const hours = assignment.isCombined
    ? (assignment.comTeachingHours ?? 0)
    : assignment.teachingHours;

  const instalmentRows = Array.from({ length: MAX_INSTALMENTS }, (_, i) => {
    const inst = instalments[i];
    if (!inst) return null;
    return labelValueRow(inst.monthLabel, `HK$${inst.amount.toFixed(2)}`);
  }).filter(Boolean) as TableRow[];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "TEACHING CONTRACT",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Term: ${assignment.term}`,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Term: ${assignment.term}`, size: 24 })],
          }),
          new Paragraph({ text: "" }),

          // Teacher & Subject Info
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              labelValueRow("Teacher Name", teacher.fullName),
              labelValueRow("Display Name", teacher.displayName),
              labelValueRow("Payment To", teacher.payTo || teacher.fullName),
              labelValueRow("Employment Type", teacher.employmentType),
              labelValueRow("Subject Code", assignment.subjectCode),
              labelValueRow("Subject Name", rateRow.subjectName),
              labelValueRow("Teaching Hours", String(hours)),
              labelValueRow("Hourly Rate", `HK$${hourlyRate.toFixed(2)}`),
              ...(assignment.incentive
                ? [labelValueRow("Incentive", `HK$${assignment.incentive.toFixed(2)}`)]
                : []),
              labelValueRow("Total Salary", `HK$${totalSalary.toFixed(2)}`),
              labelValueRow("Instalment Count", String(instalments.length)),
            ],
          }),

          new Paragraph({ text: "" }),
          new Paragraph({
            children: [new TextRun({ text: "Payment Schedule", bold: true, size: 24 })],
          }),
          new Paragraph({ text: "" }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  cell("Month", true),
                  cell("Amount (HKD)", true),
                ],
              }),
              ...instalmentRows,
            ],
          }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "" }),

          // Signature section
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  cell("Teacher Signature:", true),
                  cell("Date:", true),
                ],
              }),
              new TableRow({
                children: [cell("", false), cell("", false)],
              }),
              new TableRow({
                children: [
                  cell("Authorized Signature:", true),
                  cell("Date:", true),
                ],
              }),
              new TableRow({
                children: [cell("", false), cell("", false)],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return doc;
}
