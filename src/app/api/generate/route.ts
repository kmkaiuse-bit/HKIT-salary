import { NextRequest, NextResponse } from "next/server";
import { calculateAll } from "@/lib/calculator";
import {
  generateSalaryExcel,
  generateBudgetExcel,
  generatePaymentScheduleExcel,
} from "@/lib/excel-generator";
import { generateContractDoc } from "@/lib/word-generator";
import { Packer } from "docx";
import JSZip from "jszip";
import type { ParsedExcelData } from "@/types";

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    parsed: ParsedExcelData;
    outputType: "budget" | "full";
    term: string;
  };

  const { parsed, outputType, term } = body;
  const results = calculateAll(parsed.assignments, parsed.teachers, parsed.rateTable);

  // Block if any validation errors in FINAL mode
  if (outputType === "full") {
    const errors = results.flatMap((r) =>
      r.validationErrors.map((e) => `${r.teacher.displayName} / ${r.assignment.subjectCode}: ${e}`)
    );
    if (errors.length > 0) {
      return NextResponse.json({ error: "驗證失敗，請修正以下問題", details: errors }, { status: 422 });
    }
  }

  if (outputType === "budget") {
    const excelBuf = await generateBudgetExcel(results, term);
    return new NextResponse(excelBuf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Budget_${term}.xlsx"`,
      },
    });
  }

  // Full output: salary Excel + contracts zip + payment schedule
  const zip = new JSZip();

  const salaryBuf = await generateSalaryExcel(results, term);
  zip.file(`Salary_${term}.xlsx`, new Uint8Array(salaryBuf));

  const paymentBuf = await generatePaymentScheduleExcel(results, term);
  zip.file(`PaymentSchedule_${term}.xlsx`, new Uint8Array(paymentBuf));

  const contractsFolder = zip.folder("Contracts")!;
  for (const result of results) {
    const doc = generateContractDoc(result);
    const docBuf = await Packer.toBuffer(doc);
    const filename = `${result.teacher.displayName}_${result.assignment.subjectCode}_${term}.docx`
      .replace(/[/\\?%*:|"<>]/g, "_");
    contractsFolder.file(filename, new Uint8Array(docBuf));
  }

  const zipBuf = await zip.generateAsync({ type: "uint8array" });

  return new NextResponse(zipBuf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="DAE_Salary_${term}.zip"`,
    },
  });
}
