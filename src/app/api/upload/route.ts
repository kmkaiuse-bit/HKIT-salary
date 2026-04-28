import { NextRequest, NextResponse } from "next/server";
import { parseExcelBuffer } from "@/lib/excel-parser";
import { calculateAll } from "@/lib/calculator";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "請上傳 Excel 文件" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const parsed = parseExcelBuffer(buffer);

  const results = calculateAll(
    parsed.assignments,
    parsed.teachers,
    parsed.rateTable
  );

  return NextResponse.json({
    parsed: {
      teacherCount: parsed.teachers.length,
      subjectCount: parsed.rateTable.length,
      assignmentCount: parsed.assignments.length,
    },
    fullData: {
      rateTable: parsed.rateTable,
      teachers: parsed.teachers,
      assignments: parsed.assignments,
      errors: parsed.errors,
    },
    results,
    parseErrors: parsed.errors,
  });
}

